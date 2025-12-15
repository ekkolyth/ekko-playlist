package handlers

import (
	"net/http"

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
		httpx.RespondError(w, http.StatusUnauthorized, "no token provided")
		return
	}

	ctx := r.Context()
	session, err := h.dbService.Queries.GetSessionByToken(ctx, token)
	if err != nil {
		httpx.RespondError(w, http.StatusUnauthorized, "invalid or expired token")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, AuthResponse{
		Token:  session.Token,
		UserID: session.UserID,
		Email:  session.UserEmail,
	})
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

