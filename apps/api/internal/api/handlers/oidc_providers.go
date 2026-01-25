package handlers

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/config"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/jackc/pgx/v5/pgtype"
)

type OIDCProviderHandler struct {
	dbService *db.Service
}

func NewOIDCProviderHandler(dbService *db.Service) *OIDCProviderHandler {
	return &OIDCProviderHandler{
		dbService: dbService,
	}
}

type OIDCProviderRequest struct {
	ProviderID   string   `json:"provider_id"`
	Name         string   `json:"name"`
	DiscoveryURL string   `json:"discovery_url"`
	ClientID     string   `json:"client_id"`
	ClientSecret string   `json:"client_secret"`
	Scopes       []string `json:"scopes"`
	Enabled      bool     `json:"enabled"`
}

type OIDCProviderPublicResponse struct {
	ProviderID string `json:"provider_id"`
	Name       string `json:"name"`
	Enabled    bool   `json:"enabled"`
}

type OIDCProviderResponse struct {
	ID            string            `json:"id"`
	ProviderID    string            `json:"provider_id"`
	Name          string            `json:"name"`
	DiscoveryURL  string            `json:"discovery_url"`
	ClientID      string            `json:"client_id"`
	ClientSecret  string            `json:"client_secret"` // Masked
	Scopes        []string          `json:"scopes"`
	Enabled       bool              `json:"enabled"`
	Source        map[string]string `json:"source"`        // "env" or "db"
	EnvConfigured bool              `json:"env_configured"` // true if any ENV vars present
	CreatedAt     string            `json:"created_at,omitempty"`
	UpdatedAt     string            `json:"updated_at,omitempty"`
}

// ListOIDCProviders handles GET /api/oidc-providers - List all enabled providers (public)
func (h *OIDCProviderHandler) ListOIDCProviders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get enabled providers from database
	providers, err := h.dbService.Queries.ListEnabledOIDCProviders(ctx)
	if err != nil {
		logging.Info("Error listing enabled OIDC providers: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to list OIDC providers")
		return
	}

	// Convert to public response (no secrets)
	response := make([]OIDCProviderPublicResponse, 0, len(providers))
	for _, p := range providers {
		response = append(response, OIDCProviderPublicResponse{
			ProviderID: p.ProviderID,
			Name:       p.Name,
			Enabled:    p.Enabled,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// ListAllOIDCProviders handles GET /api/oidc-providers/all - List all providers (admin)
func (h *OIDCProviderHandler) ListAllOIDCProviders(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get config to determine source
	configs, err := config.GetOIDCProviders(ctx, h.dbService)
	if err != nil {
		logging.Info("Error getting OIDC providers config: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to load OIDC providers configuration")
		return
	}

	// Get all providers from database (for IDs and timestamps)
	dbProviders, err := h.dbService.Queries.ListAllOIDCProviders(ctx)
	if err != nil {
		logging.Info("Error listing all OIDC providers: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to list OIDC providers")
		return
	}

	// Create a map of provider_id to DB provider for matching
	dbProviderMap := make(map[string]*db.OidcProvider)
	for _, p := range dbProviders {
		dbProviderMap[p.ProviderID] = p
	}

	// Convert configs to response format
	response := make([]OIDCProviderResponse, 0, len(configs))
	envConfigured := config.HasEnvOIDCConfig()

	for _, cfg := range configs {
		var id string
		var createdAt, updatedAt string

		// Try to get ID from DB if available
		if dbProvider, ok := dbProviderMap[cfg.ProviderID]; ok {
			if dbProvider.ID.Valid {
				id = dbProvider.ID.String()
			}
			if dbProvider.CreatedAt.Valid {
				createdAt = dbProvider.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			}
			if dbProvider.UpdatedAt.Valid {
				updatedAt = dbProvider.UpdatedAt.Time.Format("2006-01-02T15:04:05Z07:00")
			}
		}

		// Mask client secret
		maskedSecret := maskSecret(cfg.ClientSecret)

		resp := OIDCProviderResponse{
			ID:            id,
			ProviderID:    cfg.ProviderID,
			Name:          cfg.Name,
			DiscoveryURL:  cfg.DiscoveryURL,
			ClientID:      cfg.ClientID,
			ClientSecret:  maskedSecret,
			Scopes:        cfg.Scopes,
			Enabled:       cfg.Enabled,
			Source:        cfg.Source,
			EnvConfigured: envConfigured,
			CreatedAt:     createdAt,
			UpdatedAt:     updatedAt,
		}
		response = append(response, resp)
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// ListOIDCProvidersForAuth handles GET /api/oidc-providers/internal - List providers with unmasked secrets for Better Auth (internal only)
// This endpoint is only accessible from localhost and returns unmasked client secrets
func (h *OIDCProviderHandler) ListOIDCProvidersForAuth(w http.ResponseWriter, r *http.Request) {
	// Only allow requests from localhost for security
	host := r.RemoteAddr
	if r.Header.Get("X-Forwarded-For") != "" {
		host = r.Header.Get("X-Forwarded-For")
	}
	// Check if request is from localhost (127.0.0.1 or ::1)
	if host != "" && !strings.HasPrefix(host, "127.0.0.1") && !strings.HasPrefix(host, "::1") && !strings.HasPrefix(host, "[::1]") && !strings.Contains(host, "localhost") {
		logging.Info("OIDC providers internal endpoint accessed from non-localhost: %s", host)
		httpx.RespondError(w, http.StatusForbidden, "This endpoint is only accessible from localhost")
		return
	}

	ctx := r.Context()

	// Get config to determine source (this returns unmasked secrets)
	configs, err := config.GetOIDCProviders(ctx, h.dbService)
	if err != nil {
		logging.Info("Error getting OIDC providers config: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to load OIDC providers configuration")
		return
	}

	// Convert to Better Auth format (only enabled providers, with unmasked secrets)
	type AuthProviderResponse struct {
		ProviderID   string   `json:"provider_id"`
		ClientID     string   `json:"client_id"`
		ClientSecret string   `json:"client_secret"`
		DiscoveryURL string   `json:"discovery_url"`
		Scopes       []string `json:"scopes"`
	}

	response := make([]AuthProviderResponse, 0, len(configs))
	for _, cfg := range configs {
		if !cfg.Enabled {
			continue // Skip disabled providers
		}

		scopes := cfg.Scopes
		if len(scopes) == 0 {
			scopes = []string{"openid", "profile", "email"}
		}

		response = append(response, AuthProviderResponse{
			ProviderID:   cfg.ProviderID,
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret, // Unmasked for Better Auth
			DiscoveryURL: cfg.DiscoveryURL,
			Scopes:       scopes,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// CreateOIDCProvider handles POST /api/oidc-providers - Create new provider (admin)
func (h *OIDCProviderHandler) CreateOIDCProvider(w http.ResponseWriter, r *http.Request) {
	// Check if ENV vars are present - if so, block updates
	if config.HasEnvOIDCConfig() {
		httpx.RespondError(w, http.StatusBadRequest, "Configuration is managed via environment variables. Cannot create via API.")
		return
	}

	var req OIDCProviderRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate required fields
	if strings.TrimSpace(req.ProviderID) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "provider_id is required")
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(req.DiscoveryURL) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "discovery_url is required")
		return
	}
	if strings.TrimSpace(req.ClientID) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "client_id is required")
		return
	}
	if strings.TrimSpace(req.ClientSecret) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "client_secret is required")
		return
	}

	// Default scopes if not provided
	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = []string{"openid", "profile", "email"}
	}

	ctx := r.Context()

	// Create provider
	provider, err := h.dbService.Queries.CreateOIDCProvider(ctx, &db.CreateOIDCProviderParams{
		ProviderID:   strings.TrimSpace(req.ProviderID),
		Name:         strings.TrimSpace(req.Name),
		DiscoveryUrl: strings.TrimSpace(req.DiscoveryURL),
		ClientID:     strings.TrimSpace(req.ClientID),
		ClientSecret: req.ClientSecret, // Store as-is (no trimming for secrets)
		Scopes:       scopes,
		Enabled:      req.Enabled,
	})
	if err != nil {
		logging.Info("Error creating OIDC provider: %v", err)
		// Check if it's a unique constraint violation
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			httpx.RespondError(w, http.StatusConflict, "provider with this provider_id already exists")
			return
		}
		httpx.RespondError(w, http.StatusInternalServerError, "failed to create OIDC provider")
		return
	}

	// Mask client secret in response
	maskedSecret := maskSecret(provider.ClientSecret)

	id := provider.ID.String()

	response := OIDCProviderResponse{
		ID:            id,
		ProviderID:    provider.ProviderID,
		Name:          provider.Name,
		DiscoveryURL:  provider.DiscoveryUrl,
		ClientID:      provider.ClientID,
		ClientSecret:  maskedSecret,
		Scopes:        provider.Scopes,
		Enabled:       provider.Enabled,
		Source:        make(map[string]string),
		EnvConfigured: false,
	}

	httpx.RespondJSON(w, http.StatusCreated, response)
}

// UpdateOIDCProvider handles PUT /api/oidc-providers/{id} - Update provider (admin)
func (h *OIDCProviderHandler) UpdateOIDCProvider(w http.ResponseWriter, r *http.Request) {
	// Check if ENV vars are present - if so, block updates
	if config.HasEnvOIDCConfig() {
		httpx.RespondError(w, http.StatusBadRequest, "Configuration is managed via environment variables. Cannot update via API.")
		return
	}

	// Get ID from URL path
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		httpx.RespondError(w, http.StatusBadRequest, "provider id is required")
		return
	}

	// Parse UUID
	var id pgtype.UUID
	if err := id.Scan(idStr); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "invalid provider id format")
		return
	}

	var req OIDCProviderRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate required fields
	if strings.TrimSpace(req.Name) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(req.DiscoveryURL) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "discovery_url is required")
		return
	}
	if strings.TrimSpace(req.ClientID) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "client_id is required")
		return
	}
	if strings.TrimSpace(req.ClientSecret) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "client_secret is required")
		return
	}

	// Default scopes if not provided
	scopes := req.Scopes
	if len(scopes) == 0 {
		scopes = []string{"openid", "profile", "email"}
	}

	ctx := r.Context()

	// Update provider
	provider, err := h.dbService.Queries.UpdateOIDCProvider(ctx, &db.UpdateOIDCProviderParams{
		ID:           id,
		Name:         strings.TrimSpace(req.Name),
		DiscoveryUrl: strings.TrimSpace(req.DiscoveryURL),
		ClientID:     strings.TrimSpace(req.ClientID),
		ClientSecret: req.ClientSecret, // Store as-is
		Scopes:       scopes,
		Enabled:      req.Enabled,
	})
	if err != nil {
		logging.Info("Error updating OIDC provider: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to update OIDC provider")
		return
	}

	// Mask client secret in response
	maskedSecret := maskSecret(provider.ClientSecret)

	response := OIDCProviderResponse{
		ID:            provider.ID.String(),
		ProviderID:    provider.ProviderID,
		Name:          provider.Name,
		DiscoveryURL:  provider.DiscoveryUrl,
		ClientID:      provider.ClientID,
		ClientSecret:  maskedSecret,
		Scopes:        provider.Scopes,
		Enabled:       provider.Enabled,
		Source:        make(map[string]string),
		EnvConfigured: false,
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// DeleteOIDCProvider handles DELETE /api/oidc-providers/{id} - Delete provider (admin)
func (h *OIDCProviderHandler) DeleteOIDCProvider(w http.ResponseWriter, r *http.Request) {
	// Check if ENV vars are present - if so, block updates
	if config.HasEnvOIDCConfig() {
		httpx.RespondError(w, http.StatusBadRequest, "Configuration is managed via environment variables. Cannot delete via API.")
		return
	}

	// Get ID from URL path
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		httpx.RespondError(w, http.StatusBadRequest, "provider id is required")
		return
	}

	// Parse UUID
	var id pgtype.UUID
	if err := id.Scan(idStr); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "invalid provider id format")
		return
	}

	ctx := r.Context()

	// Delete provider
	if err := h.dbService.Queries.DeleteOIDCProvider(ctx, id); err != nil {
		logging.Info("Error deleting OIDC provider: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to delete OIDC provider")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "OIDC provider deleted successfully",
	})
}

// maskSecret masks a secret string, showing only first 2 characters
func maskSecret(secret string) string {
	if len(secret) > 2 {
		return secret[:2] + strings.Repeat("*", len(secret)-2)
	} else if len(secret) > 0 {
		return strings.Repeat("*", len(secret))
	}
	return ""
}
