package handlers

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"fmt"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/upload"
	"github.com/ekkolyth/ekko-playlist/api/internal/config"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/email"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/jackc/pgx/v5/pgtype"
)

type AuthHandler struct {
	dbService *db.Service
	// Removed emailService field - create on-demand using shared config utility
}

func NewAuthHandler(dbService *db.Service) *AuthHandler {
	return &AuthHandler{
		dbService: dbService,
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token  string `json:"token"`
	UserID string `json:"user_id"`
	Email  string `json:"email"`
}

type UserProfileResponse struct {
	ID    string  `json:"id"`
	Name  *string `json:"name"`
	Email string  `json:"email"`
	Image *string `json:"image"`
}

type UpdateUserProfileRequest struct {
	Name  *string `json:"name"`
	Email string  `json:"email"`
	Image *string `json:"image"`
}

// Register handles POST /api/auth/register
// Note: User registration is handled by Better Auth. This endpoint is kept for backward compatibility
// but should not be used - users should register through Better Auth.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	httpx.RespondError(w, http.StatusBadRequest, "Registration is handled by Better Auth. Please use the web app to sign up.")
}

// Login handles POST /api/auth/login
// Note: Authentication is handled by Better Auth. This endpoint is kept for backward compatibility
// but should not be used - users should authenticate through Better Auth to get Bearer tokens.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	httpx.RespondError(w, http.StatusBadRequest, "Authentication is handled by Better Auth. Please use the web app to sign in and get a Bearer token.")
}

// Logout handles POST /api/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	token := extractTokenFromRequest(r)
	if token == "" {
		httpx.RespondError(w, http.StatusBadRequest, "no token provided")
		return
	}

	ctx := r.Context()
	if err := h.dbService.Queries.DeleteSession(ctx, token); err != nil {
		logging.Info("Error deleting session: %s", err.Error())
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// Me handles GET /api/auth/me - returns current user info
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	token := extractTokenFromRequest(r)
	if token == "" {
		logging.Info("Me: No token provided")
		httpx.RespondError(w, http.StatusUnauthorized, "no token provided")
		return
	}

	ctx := r.Context()
	logging.Info("Me: Validating token (first 10 chars: %s...)", token[:min(10, len(token))])
	
	// First try to validate as session token
	session, err := h.dbService.Queries.GetSessionByToken(ctx, token)
	if err == nil && session != nil {
		logging.Info("Me: Session token validated - User ID: %s, Email: %s", session.UserID, session.UserEmail)
		httpx.RespondJSON(w, http.StatusOK, AuthResponse{
			Token:  session.Token,
			UserID: session.UserID,
			Email:  session.UserEmail,
		})
		return
	}
	logging.Info("Me: Not a session token (error: %v)", err)

	// If not a session token, try to validate as JWT token
	if auth.IsJWT(token) {
		claims, err := auth.VerifyJWT(ctx, token)
		if err == nil && claims != nil {
			// Extract user info from JWT claims
			userID, ok := claims["sub"].(string)
			if !ok {
				if id, ok := claims["id"].(string); ok {
					userID = id
				} else {
					logging.Info("Me: JWT validated but no user ID in claims")
					httpx.RespondError(w, http.StatusUnauthorized, "invalid token: missing user ID")
					return
				}
			}

			email, _ := claims["email"].(string)
			logging.Info("Me: JWT validated - User ID: %s, Email: %s", userID, email)
			httpx.RespondJSON(w, http.StatusOK, AuthResponse{
				Token:  token, // Return the JWT token itself
				UserID: userID,
				Email:  email,
			})
			return
		}
		logging.Info("Me: JWT verification failed: %v", err)
	}

	// If not a JWT, try to validate as one-time token (fallback)
	webAppURL := os.Getenv("WEB_APP_URL")
	if webAppURL == "" {
		webAppURL = "http://localhost:3000"
	}

	verifyURL := webAppURL + "/api/verify-token"
	logging.Info("Me: Verifying one-time token via Better Auth API: %s", verifyURL)

	reqBody := map[string]string{"token": token}
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		logging.Info("Me: Failed to marshal request body: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to verify token")
		return
	}

	req, err := http.NewRequestWithContext(ctx, "POST", verifyURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		logging.Info("Me: Failed to create request: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to verify token")
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		logging.Info("Me: Failed to call verify endpoint: %v", err)
		httpx.RespondError(w, http.StatusUnauthorized, "invalid or expired token")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		logging.Info("Me: Verify endpoint returned error: %d - %s", resp.StatusCode, string(body))
		httpx.RespondError(w, http.StatusUnauthorized, "invalid or expired token")
		return
	}

	var verifyResult struct {
		UserID string `json:"user_id"`
		Email  string `json:"email"`
		Name   string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&verifyResult); err != nil {
		logging.Info("Me: Failed to decode verify response: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to parse verify response")
		return
	}

	logging.Info("Me: One-time token validated - User ID: %s, Email: %s", verifyResult.UserID, verifyResult.Email)
	httpx.RespondJSON(w, http.StatusOK, AuthResponse{
		Token:  token, // Return the one-time token itself
		UserID: verifyResult.UserID,
		Email:  verifyResult.Email,
	})
	return
}


func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}


// extractTokenFromRequest extracts the token from Authorization header or cookie
func extractTokenFromRequest(r *http.Request) string {
	// Try Authorization header first
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		return authHeader[7:]
	}

	// Try cookie
	cookie, err := r.Cookie("session_token")
	if err == nil && cookie != nil {
		return cookie.Value
	}

	return ""
}

// GetUserProfile handles GET /api/user/profile - returns current user profile
func (h *AuthHandler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	// Get user from database
	user, err := h.dbService.Queries.GetUserByID(ctx, userID)
	if err != nil {
		logging.Info("Error fetching user profile: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch user profile")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, UserProfileResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Image: user.Image,
	})
}

// UpdateUserProfile handles PUT /api/user/profile - updates current user profile
// Supports both multipart/form-data (for file uploads) and application/json (for backward compatibility)
func (h *AuthHandler) UpdateUserProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req UpdateUserProfileRequest
	var imagePath *string
	var oldImagePath *string

	// Check content type
	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Handle multipart form data
		if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
			logging.Info("Error parsing multipart form: %v", err)
			httpx.RespondError(w, http.StatusBadRequest, "Failed to parse form data")
			return
		}

		// Extract form fields
		email := r.FormValue("email")
		name := r.FormValue("name")

		// Validate email
		if email == "" {
			httpx.RespondError(w, http.StatusBadRequest, "email is required")
			return
		}

		emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
		if !emailRegex.MatchString(email) {
			httpx.RespondError(w, http.StatusBadRequest, "invalid email format")
			return
		}

		// Get current user to check for old image
		currentUser, err := h.dbService.Queries.GetUserByID(ctx, userID)
		if err == nil && currentUser.Image != nil && *currentUser.Image != "" {
			// Extract filename from old image path/URL
			oldImageFilename := upload.ExtractFilenameFromPath(*currentUser.Image)
			if oldImageFilename != "" {
				uploadDir := upload.GetUploadDir()
				oldImagePathStr := filepath.Join(uploadDir, oldImageFilename)
				oldImagePath = &oldImagePathStr
			}
		}

		// Handle image file upload if present
		file, fileHeader, err := r.FormFile("image")
		if err == nil {
			defer file.Close()

			// Validate file
			if err := upload.ValidateImageFile(fileHeader); err != nil {
				logging.Info("File validation failed: %v", err)
				httpx.RespondError(w, http.StatusBadRequest, err.Error())
				return
			}

			// Read file content
			fileContent, err := io.ReadAll(file)
			if err != nil {
				logging.Info("Error reading file content: %v", err)
				httpx.RespondError(w, http.StatusInternalServerError, "Failed to read file")
				return
			}

			// Generate filename
			filename := upload.GenerateFilename(userID, fileHeader.Filename, fileContent)

			// Check if this is the same file as the current one (same hash = same content)
			var newImageFilename string
			if currentUser != nil && currentUser.Image != nil && *currentUser.Image != "" {
				currentImageFilename := upload.ExtractFilenameFromPath(*currentUser.Image)
				if currentImageFilename == filename {
					// Same file content, no need to upload again or delete
					logging.Info("UpdateUserProfile: Same image content, keeping existing file")
					imagePath = currentUser.Image
					oldImagePath = nil // Don't delete, it's the same file
				} else {
					newImageFilename = filename
				}
			} else {
				newImageFilename = filename
			}

			// Only save if it's a new file
			if newImageFilename != "" {
				// Save file
				_, err = upload.SaveFile(userID, newImageFilename, fileContent)
				if err != nil {
					logging.Info("Error saving file: %v", err)
					httpx.RespondError(w, http.StatusInternalServerError, "Failed to save file")
					return
				}

				// Set image path to the URL path (not filesystem path)
				imageURL := fmt.Sprintf("/api/uploads/%s", newImageFilename)
				imagePath = &imageURL
				logging.Info("UpdateUserProfile: Image uploaded successfully, URL: %s", imageURL)
			}
		} else {
			// No file uploaded, check if image field was provided as a string (for clearing)
			imageValue := r.FormValue("image")
			if imageValue == "" {
				// Keep existing image if no new image and no explicit clear
				if currentUser != nil && currentUser.Image != nil {
					imagePath = currentUser.Image
				}
			} else {
				// Explicit image value provided (could be empty string to clear)
				if imageValue == "" {
					imagePath = nil
				} else {
					imagePath = &imageValue
				}
			}
		}

		// Build request
		req.Email = email
		if name != "" {
			req.Name = &name
		} else {
			req.Name = nil
		}
		req.Image = imagePath
	} else {
		// Handle JSON request (backward compatibility)
		if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
			httpx.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}

		// Validate email format
		if req.Email == "" {
			httpx.RespondError(w, http.StatusBadRequest, "email is required")
			return
		}

		emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
		if !emailRegex.MatchString(req.Email) {
			httpx.RespondError(w, http.StatusBadRequest, "invalid email format")
			return
		}

		// Get current user to check for old image
		currentUser, err := h.dbService.Queries.GetUserByID(ctx, userID)
		if err == nil && currentUser.Image != nil && *currentUser.Image != "" {
			// Extract filename from old image path/URL
			oldImageFilename := upload.ExtractFilenameFromPath(*currentUser.Image)
			if oldImageFilename != "" {
				uploadDir := upload.GetUploadDir()
				oldImagePathStr := filepath.Join(uploadDir, oldImageFilename)
				oldImagePath = &oldImagePathStr
			}
		}
	}

	// Update user profile
	err := h.dbService.Queries.UpdateUserProfile(ctx, &db.UpdateUserProfileParams{
		Name:  req.Name,
		Email: req.Email,
		Image: req.Image,
		ID:    userID,
	})

	if err != nil {
		logging.Info("Error updating user profile: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to update user profile")
		return
	}

	// Delete old image file if it exists and we uploaded a new one
	// Only delete if the old and new filenames are different (different content)
	if oldImagePath != nil && imagePath != nil && *oldImagePath != "" {
		// Extract filenames to compare
		oldFilename := upload.ExtractFilenameFromPath(*oldImagePath)
		newFilename := upload.ExtractFilenameFromPath(*imagePath)
		
		// Only delete if they're different files
		if oldFilename != "" && newFilename != "" && oldFilename != newFilename {
			logging.Info("UpdateUserProfile: Deleting old image file: %s (new: %s)", oldFilename, newFilename)
			if err := upload.DeleteFile(*oldImagePath); err != nil {
				logging.Info("Error deleting old image file: %v", err)
				// Don't fail the request if deletion fails
			}
		} else {
			logging.Info("UpdateUserProfile: Skipping deletion - same file (old: %s, new: %s)", oldFilename, newFilename)
		}
	}

	// Fetch updated user to return
	user, err := h.dbService.Queries.GetUserByID(ctx, userID)
	if err != nil {
		logging.Info("Error fetching updated user profile: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Profile updated but failed to fetch updated data")
		return
	}

	logging.Info("User profile updated successfully for user %s", userID)
	httpx.RespondJSON(w, http.StatusOK, UserProfileResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Image: user.Image,
	})
}

type SendEmailVerificationRequest struct {
	Email string `json:"email"`
}

type VerifyEmailUpdateRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// SendEmailVerification handles POST /api/user/profile/send-verification
// Sends a 6-digit OTP code to the specified email address
func (h *AuthHandler) SendEmailVerification(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req SendEmailVerificationRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate email format
	if req.Email == "" {
		httpx.RespondError(w, http.StatusBadRequest, "email is required")
		return
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		httpx.RespondError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	// Get SMTP config using shared utility (ENV → DB fallback)
	configMap, err := config.GetSmtpConfigMap(ctx, h.dbService)
	if err != nil {
		logging.Info("Error getting SMTP config: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to load SMTP configuration")
		return
	}

	// Check if required config is present
	requiredKeys := []string{"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email"}
	for _, key := range requiredKeys {
		if _, ok := configMap[key]; !ok || configMap[key] == "" {
			httpx.RespondError(w, http.StatusBadRequest, "SMTP configuration is incomplete. Please configure SMTP settings first.")
			return
		}
	}

	// Create email service from config
	emailService, err := email.NewServiceFromConfig(configMap)
	if err != nil {
		logging.Info("Error creating email service from config: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to initialize email service: "+err.Error())
		return
	}

	// Check if user already has an unexpired verification code (rate limiting)
	// Use email as identifier for email change verification
	existingVerification, err := h.dbService.Queries.GetVerificationByIdentifier(ctx, req.Email)
	if err == nil && existingVerification != nil {
		// Check if it's still valid (not expired)
		if existingVerification.ExpiresAt.Valid && existingVerification.ExpiresAt.Time.After(time.Now()) {
			logging.Info("Verification code already sent recently for %s", req.Email)
			httpx.RespondError(w, http.StatusTooManyRequests, "verification code already sent. please check your email or wait before requesting another")
			return
		}
	}

	// Generate 6-digit OTP code using crypto/rand for security
	// Read 3 bytes and convert to a number between 0 and 999999
	otpBytes := make([]byte, 3)
	if _, err := rand.Read(otpBytes); err != nil {
		logging.Info("Error generating OTP code: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to generate verification code")
		return
	}
	// Combine bytes into a number and ensure it's in the 0-999999 range
	otpNum := (int(otpBytes[0])<<16 | int(otpBytes[1])<<8 | int(otpBytes[2])) % 1000000
	otpCode := fmt.Sprintf("%06d", otpNum)

	// Set expiration to 10 minutes from now
	expiresAt := time.Now().Add(10 * time.Minute)
	expiresAtPg := pgtype.Timestamptz{
		Time:  expiresAt,
		Valid: true,
	}

	// Create verification record in Better Auth's verification table
	// identifier = email address (for email change verification)
	_, err = h.dbService.Queries.CreateVerification(ctx, &db.CreateVerificationParams{
		Identifier: req.Email,
		Value:      otpCode,
		ExpiresAt:  expiresAtPg,
	})
	if err != nil {
		logging.Info("Error creating verification record: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create verification record")
		return
	}

	// Send OTP email
	if err := emailService.SendOTPEmail(req.Email, otpCode); err != nil {
		logging.Info("Error sending OTP email: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to send verification email")
		return
	}

	logging.Info("OTP verification email sent to %s for user %s", req.Email, userID)
	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "verification code sent successfully",
	})
}

// VerifyEmailUpdate handles POST /api/user/profile/verify-email
// Verifies the OTP code and updates the user's email address
func (h *AuthHandler) VerifyEmailUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req VerifyEmailUpdateRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Email == "" {
		httpx.RespondError(w, http.StatusBadRequest, "email is required")
		return
	}

	if req.Code == "" {
		httpx.RespondError(w, http.StatusBadRequest, "code is required")
		return
	}

	// Validate email format
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		httpx.RespondError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	// Validate OTP code format (6 digits)
	if len(req.Code) != 6 {
		httpx.RespondError(w, http.StatusBadRequest, "code must be 6 digits")
		return
	}

	// Get verification record by identifier (email) and value (OTP code)
	verification, err := h.dbService.Queries.GetVerificationByIdentifier(ctx, req.Email)
	if err != nil || verification == nil {
		logging.Info("Invalid or expired verification code for email %s", req.Email)
		httpx.RespondError(w, http.StatusBadRequest, "invalid or expired verification code")
		return
	}

	// Verify the OTP code matches
	if verification.Value != req.Code {
		logging.Info("Invalid OTP code for email %s", req.Email)
		httpx.RespondError(w, http.StatusBadRequest, "invalid verification code")
		return
	}

	// Get current user
	currentUser, err := h.dbService.Queries.GetUserByID(ctx, userID)
	if err != nil {
		logging.Info("Error fetching user: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to fetch user")
		return
	}

	// Update user's email address
	err = h.dbService.Queries.UpdateUserProfile(ctx, &db.UpdateUserProfileParams{
		Name:  currentUser.Name,
		Email: req.Email,
		Image: currentUser.Image,
		ID:    userID,
	})
	if err != nil {
		logging.Info("Error updating user email: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to update email")
		return
	}

	// Delete verification code after successful verification
	if err := h.dbService.Queries.DeleteVerification(ctx, req.Code); err != nil {
		logging.Info("Error deleting verification code: %v", err)
		// Don't fail the request if deletion fails - verification was successful
	}

	// Fetch updated user to return
	user, err := h.dbService.Queries.GetUserByID(ctx, userID)
	if err != nil {
		logging.Info("Error fetching updated user profile: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Email updated but failed to fetch updated data")
		return
	}

	logging.Info("Email updated successfully for user %s to %s", userID, req.Email)
	httpx.RespondJSON(w, http.StatusOK, UserProfileResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Image: user.Image,
	})
}
