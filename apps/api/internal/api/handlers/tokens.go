package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/jackc/pgx/v5/pgtype"
)

type TokensHandler struct {
	dbService *db.Service
}

func NewTokensHandler(dbService *db.Service) *TokensHandler {
	return &TokensHandler{
		dbService: dbService,
	}
}

type CreateTokenRequest struct {
	Name  string `json:"name"`
	Token string `json:"token"`
}

type CreateTokenResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	TokenPrefix string    `json:"token_prefix"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

type TokenResponse struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	TokenPrefix string     `json:"token_prefix"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
}

type ListTokensResponse struct {
	Tokens []TokenResponse `json:"tokens"`
}

// CreateToken handles POST /api/tokens - creates a new API token
func (h *TokensHandler) CreateToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateTokenRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Name == "" {
		httpx.RespondError(w, http.StatusBadRequest, "name is required")
		return
	}

	if req.Token == "" {
		httpx.RespondError(w, http.StatusBadRequest, "token is required")
		return
	}

	ctx := r.Context()

	// Hash the token using SHA-256
	hash := sha256.Sum256([]byte(req.Token))
	tokenHash := hex.EncodeToString(hash[:])

	// Store first 8 characters as prefix for display
	tokenPrefix := req.Token
	if len(tokenPrefix) > 8 {
		tokenPrefix = tokenPrefix[:8]
	}

	// Parse JWT to get expiration (if it's a JWT)
	var expiresAt *time.Time
	if len(req.Token) > 100 { // Likely a JWT
		// JWT tokens from Better Auth expire in 90 days
		exp := time.Now().Add(90 * 24 * time.Hour)
		expiresAt = &exp
	}

	var expiresAtPg pgtype.Timestamptz
	if expiresAt != nil {
		expiresAtPg = pgtype.Timestamptz{
			Time:  *expiresAt,
			Valid: true,
		}
	}

	apiToken, err := h.dbService.Queries.CreateAPIToken(ctx, &db.CreateAPITokenParams{
		UserID:      userID,
		Name:        req.Name,
		TokenHash:   tokenHash,
		TokenPrefix: tokenPrefix,
		ExpiresAt:   expiresAtPg,
	})
	if err != nil {
		logging.Info("Error creating API token: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create token")
		return
	}

	expiresAtResp := (*time.Time)(nil)
	if apiToken.ExpiresAt.Valid {
		expiresAtResp = &apiToken.ExpiresAt.Time
	}

	httpx.RespondJSON(w, http.StatusCreated, CreateTokenResponse{
		ID:          apiToken.ID.String(),
		Name:        apiToken.Name,
		TokenPrefix: apiToken.TokenPrefix,
		CreatedAt:   apiToken.CreatedAt.Time,
		ExpiresAt:   expiresAtResp,
	})
}

// ListTokens handles GET /api/tokens - lists all API tokens for the current user
func (h *TokensHandler) ListTokens(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ctx := r.Context()
	tokens, err := h.dbService.Queries.ListAPITokensByUser(ctx, userID)
	if err != nil {
		logging.Info("Error listing API tokens: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to list tokens")
		return
	}

	tokenResponses := make([]TokenResponse, 0, len(tokens))
	for _, token := range tokens {
		var expiresAt *time.Time
		if token.ExpiresAt.Valid {
			expiresAt = &token.ExpiresAt.Time
		}

		var lastUsedAt *time.Time
		if token.LastUsedAt.Valid {
			lastUsedAt = &token.LastUsedAt.Time
		}

		tokenResponses = append(tokenResponses, TokenResponse{
			ID:          token.ID.String(),
			Name:        token.Name,
			TokenPrefix: token.TokenPrefix,
			CreatedAt:   token.CreatedAt.Time,
			ExpiresAt:   expiresAt,
			LastUsedAt:  lastUsedAt,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, ListTokensResponse{
		Tokens: tokenResponses,
	})
}

// UpdateToken handles PUT /api/tokens/:id - updates an API token's name
func (h *TokensHandler) UpdateToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tokenID := r.PathValue("id")
	if tokenID == "" {
		httpx.RespondError(w, http.StatusBadRequest, "token id is required")
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Name == "" {
		httpx.RespondError(w, http.StatusBadRequest, "name is required")
		return
	}

	ctx := r.Context()

	// Parse UUID
	var id pgtype.UUID
	if err := id.Scan(tokenID); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "invalid token id")
		return
	}

	err := h.dbService.Queries.UpdateAPITokenName(ctx, &db.UpdateAPITokenNameParams{
		Name:   req.Name,
		ID:     id,
		UserID: userID,
	})
	if err != nil {
		logging.Info("Error updating API token: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to update token")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "token updated"})
}

// DeleteToken handles DELETE /api/tokens/:id - deletes an API token
func (h *TokensHandler) DeleteToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tokenID := r.PathValue("id")
	if tokenID == "" {
		httpx.RespondError(w, http.StatusBadRequest, "token id is required")
		return
	}

	ctx := r.Context()

	// Parse UUID
	var id pgtype.UUID
	if err := id.Scan(tokenID); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "invalid token id")
		return
	}

	err := h.dbService.Queries.DeleteAPIToken(ctx, &db.DeleteAPITokenParams{
		ID:     id,
		UserID: userID,
	})
	if err != nil {
		logging.Info("Error deleting API token: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to delete token")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "token deleted"})
}
