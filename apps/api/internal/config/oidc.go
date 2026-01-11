package config

import (
	"context"
	"encoding/json"
	"os"
	"strings"

	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"log"
)

// OIDCProviderConfig contains OIDC provider configuration with source metadata
type OIDCProviderConfig struct {
	ProviderID   string
	Name         string
	DiscoveryURL string
	ClientID     string
	ClientSecret string
	Scopes       []string
	Enabled      bool
	// Source metadata - indicates where each field came from
	Source        map[string]string // "env" or "db" for each field
	EnvConfigured bool              // true if any ENV vars are present
}

// OIDCProviderEnvEntry represents a single provider from ENV JSON
type OIDCProviderEnvEntry struct {
	ProviderID   string `json:"provider_id"`
	Name         string `json:"name"`
	DiscoveryURL string `json:"discovery_url"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Scopes       string `json:"scopes"` // Comma-separated string
	Enabled      bool   `json:"enabled"`
}

// GetOIDCProviders retrieves OIDC provider configurations with ENV priority over database
func GetOIDCProviders(ctx context.Context, dbService *db.Service) ([]OIDCProviderConfig, error) {
	// Check for ENV variables first
	envProvidersJSON := os.Getenv("OIDC_PROVIDERS")
	hasEnvConfig := envProvidersJSON != ""

	if hasEnvConfig {
		// Parse JSON from ENV
		var envProviders []OIDCProviderEnvEntry
		if err := json.Unmarshal([]byte(envProvidersJSON), &envProviders); err != nil {
			log.Printf("Error parsing OIDC_PROVIDERS JSON: %v", err)
			// Fall through to DB config if JSON parsing fails
			hasEnvConfig = false
		} else {
			// Convert ENV entries to OIDCProviderConfig
			configs := make([]OIDCProviderConfig, 0, len(envProviders))
			for _, provider := range envProviders {
				scopes := parseScopes(provider.Scopes)
				config := OIDCProviderConfig{
					ProviderID:   provider.ProviderID,
					Name:         provider.Name,
					DiscoveryURL: provider.DiscoveryURL,
					ClientID:     provider.ClientID,
					ClientSecret: provider.ClientSecret,
					Scopes:       scopes,
					Enabled:      provider.Enabled,
					Source:       make(map[string]string),
					EnvConfigured: true,
				}
				// Mark all fields as coming from ENV
				config.Source["provider_id"] = SourceEnv
				config.Source["name"] = SourceEnv
				config.Source["discovery_url"] = SourceEnv
				config.Source["client_id"] = SourceEnv
				config.Source["client_secret"] = SourceEnv
				config.Source["scopes"] = SourceEnv
				config.Source["enabled"] = SourceEnv
				configs = append(configs, config)
			}
			return configs, nil
		}
	}

	// Load from database if no ENV config
	var providers []OIDCProviderConfig
	if !hasEnvConfig {
		// Get all enabled providers from database
		dbProviders, err := dbService.Queries.ListAllOIDCProviders(ctx)
		if err != nil {
			log.Printf("Error loading OIDC providers from database: %v", err)
			return []OIDCProviderConfig{}, nil // Return empty slice on error
		}

		providers = make([]OIDCProviderConfig, 0, len(dbProviders))
		for _, p := range dbProviders {
			scopes := []string{}
			if len(p.Scopes) > 0 {
				scopes = p.Scopes
			} else {
				scopes = []string{"openid", "profile", "email"}
			}

			config := OIDCProviderConfig{
				ProviderID:   p.ProviderID,
				Name:         p.Name,
				DiscoveryURL: p.DiscoveryUrl,
				ClientID:     p.ClientID,
				ClientSecret: p.ClientSecret,
				Scopes:       scopes,
				Enabled:      p.Enabled,
				Source:       make(map[string]string),
				EnvConfigured: false,
			}
			// Mark all fields as coming from DB
			config.Source["provider_id"] = SourceDB
			config.Source["name"] = SourceDB
			config.Source["discovery_url"] = SourceDB
			config.Source["client_id"] = SourceDB
			config.Source["client_secret"] = SourceDB
			config.Source["scopes"] = SourceDB
			config.Source["enabled"] = SourceDB
			providers = append(providers, config)
		}
	}

	return providers, nil
}

// HasEnvOIDCConfig checks if any OIDC environment variables are set
func HasEnvOIDCConfig() bool {
	return os.Getenv("OIDC_PROVIDERS") != ""
}

// parseScopes parses a comma-separated string of scopes into a slice
func parseScopes(scopesStr string) []string {
	if scopesStr == "" {
		return []string{"openid", "profile", "email"}
	}
	parts := strings.Split(scopesStr, ",")
	scopes := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			scopes = append(scopes, trimmed)
		}
	}
	if len(scopes) == 0 {
		return []string{"openid", "profile", "email"}
	}
	return scopes
}
