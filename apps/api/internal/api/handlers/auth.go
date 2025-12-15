package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type AuthHandler struct {
	dbService *db.Service
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

