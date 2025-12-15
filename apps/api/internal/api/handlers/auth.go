package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/jackc/pgx/v5/pgtype"

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
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		httpx.RespondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	if len(req.Password) < 8 {
		httpx.RespondError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	ctx := r.Context()

	// Check if user already exists
	existingUser, err := h.dbService.Queries.GetUserByEmail(ctx, req.Email)
	if err == nil && existingUser != nil {
		httpx.RespondError(w, http.StatusConflict, "user with this email already exists")
		return
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		logging.Info("Error hashing password: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	// Create user
	user, err := h.dbService.Queries.CreateUser(ctx, &db.CreateUserParams{
		Email:        req.Email,
		PasswordHash: string(passwordHash),
	})
	if err != nil {
		logging.Info("Error creating user: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	// Create session
	token, err := generateSessionToken()
	if err != nil {
		logging.Info("Error generating session token: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	expiresAt := pgtype.Timestamptz{}
	expiresAt.Scan(time.Now().Add(30 * 24 * time.Hour))

	session, err := h.dbService.Queries.CreateSession(ctx, &db.CreateSessionParams{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		logging.Info("Error creating session: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	httpx.RespondJSON(w, http.StatusCreated, AuthResponse{
		Token:  session.Token,
		UserID: user.ID,
		Email:  user.Email,
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		httpx.RespondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	ctx := r.Context()

	// Get user by email
	user, err := h.dbService.Queries.GetUserByEmail(ctx, req.Email)
	if err != nil {
		httpx.RespondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		httpx.RespondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Create session
	token, err := generateSessionToken()
	if err != nil {
		logging.Info("Error generating session token: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	expiresAt := pgtype.Timestamptz{}
	expiresAt.Scan(time.Now().Add(30 * 24 * time.Hour))

	session, err := h.dbService.Queries.CreateSession(ctx, &db.CreateSessionParams{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		logging.Info("Error creating session: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, AuthResponse{
		Token:  session.Token,
		UserID: user.ID,
		Email:  user.Email,
	})
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

// generateSessionToken generates a random session token
func generateSessionToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
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

