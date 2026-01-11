package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"os"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/config"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/email"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/jackc/pgx/v5/pgtype"
)

type VerificationHandler struct {
	dbService *db.Service
	// Removed emailService field - create on-demand using shared config utility
}

func NewVerificationHandler(dbService *db.Service) *VerificationHandler {
	return &VerificationHandler{
		dbService: dbService,
	}
}

type VerifyEmailRequest struct {
	Token string `json:"token"`
}

// SendVerificationEmail handles POST /api/auth/send-verification
// Requires authentication - user must be logged in
func (h *VerificationHandler) SendVerificationEmail(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userEmail, ok := auth.GetUserEmail(r.Context())
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "user email not found")
		return
	}

	ctx := r.Context()

	// Check if user already has an unexpired verification token (rate limiting)
	existingVerification, err := h.dbService.Queries.GetVerificationByIdentifier(ctx, userEmail)
	if err == nil && existingVerification != nil {
		// Check if it's still valid (not expired)
		if existingVerification.ExpiresAt.Valid && existingVerification.ExpiresAt.Time.After(time.Now()) {
			logging.Info("Verification email already sent recently for %s", userEmail)
			httpx.RespondError(w, http.StatusTooManyRequests, "verification email already sent. please check your email or wait before requesting another")
			return
		}
	}

	// Generate secure random token (32 bytes = 256 bits)
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		logging.Info("Error generating verification token: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to generate verification token")
		return
	}

	// Base64 encode for URL-safe transmission
	token := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(tokenBytes)

	// Set expiration to 24 hours from now
	expiresAt := time.Now().Add(24 * time.Hour)
	expiresAtPg := pgtype.Timestamptz{
		Time:  expiresAt,
		Valid: true,
	}

	// Create verification record in Better Auth's verification table
	// identifier = user email (matches Better Auth pattern)
	_, err = h.dbService.Queries.CreateVerification(ctx, &db.CreateVerificationParams{
		Identifier: userEmail,
		Value:      token,
		ExpiresAt:  expiresAtPg,
	})
	if err != nil {
		logging.Info("Error creating verification record: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create verification record")
		return
	}

	// Build verification URL
	webAppURL := os.Getenv("WEB_APP_URL")
	if webAppURL == "" {
		webAppURL = "http://localhost:3000"
	}
	verificationURL := webAppURL + "/verify-email?token=" + token

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

	// Send verification email
	if err := emailService.SendVerificationEmail(userEmail, token, verificationURL); err != nil {
		logging.Info("Error sending verification email: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to send verification email")
		return
	}

	logging.Info("Verification email sent to %s for user %s", userEmail, userID)
	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "verification email sent successfully",
	})
}

// VerifyEmail handles POST /api/auth/verify-email
// Public endpoint - token provides authentication
func (h *VerificationHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req VerifyEmailRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Token == "" {
		httpx.RespondError(w, http.StatusBadRequest, "token is required")
		return
	}

	ctx := r.Context()

	// Validate token exists and hasn't expired using existing Better Auth query
	verification, err := h.dbService.Queries.GetVerificationByValue(ctx, req.Token)
	if err != nil || verification == nil {
		logging.Info("Invalid or expired verification token")
		httpx.RespondError(w, http.StatusBadRequest, "invalid or expired verification token")
		return
	}

	// Get user associated with this verification token
	user, err := h.dbService.Queries.GetUserByVerificationToken(ctx, req.Token)
	if err != nil || user == nil {
		logging.Info("User not found for verification token")
		httpx.RespondError(w, http.StatusBadRequest, "invalid verification token")
		return
	}

	// Check if email is already verified
	if user.EmailVerified {
		logging.Info("Email already verified for user %s", user.ID)
		httpx.RespondJSON(w, http.StatusOK, map[string]string{
			"message": "email already verified",
		})
		return
	}

	// Update user's email_verified status
	if err := h.dbService.Queries.UpdateUserEmailVerified(ctx, user.ID); err != nil {
		logging.Info("Error updating email_verified status: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to verify email")
		return
	}

	// Delete verification token after successful verification
	if err := h.dbService.Queries.DeleteVerification(ctx, req.Token); err != nil {
		logging.Info("Error deleting verification token: %v", err)
		// Don't fail the request if deletion fails - verification was successful
	}

	logging.Info("Email verified successfully for user %s (%s)", user.ID, user.Email)
	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "email verified successfully",
	})
}

