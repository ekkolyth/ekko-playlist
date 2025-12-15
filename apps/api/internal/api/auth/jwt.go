package auth

import (
	"context"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

var (
	jwksCache     jwk.Set
	jwksCacheTime time.Time
	jwksMutex     sync.RWMutex
	jwksCacheTTL  = 1 * time.Hour
)

// VerifyJWT verifies a JWT token using the JWKS endpoint from the web app
func VerifyJWT(ctx context.Context, tokenString string) (map[string]interface{}, error) {
	// Get JWKS from cache or fetch from web app
	jwks, err := getJWKS(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get JWKS: %w", err)
	}

	// Parse and verify the JWT
	webAppURL := os.Getenv("WEB_APP_URL")
	if webAppURL == "" {
		webAppURL = "http://localhost:3000"
	}

	parsedToken, err := jwt.Parse(
		[]byte(tokenString),
		jwt.WithKeySet(jwks),
		jwt.WithValidate(true),
		jwt.WithIssuer(webAppURL),
		jwt.WithAudience(webAppURL),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to verify JWT: %w", err)
	}

	// Extract claims
	claims := make(map[string]interface{})
	iter := parsedToken.Iterate(ctx)
	for iter.Next(ctx) {
		pair := iter.Pair()
		claims[pair.Key.(string)] = pair.Value
	}

	return claims, nil
}

// getJWKS fetches JWKS from the web app with caching
func getJWKS(ctx context.Context) (jwk.Set, error) {
	jwksMutex.RLock()
	if jwksCache != nil && time.Since(jwksCacheTime) < jwksCacheTTL {
		cached := jwksCache
		jwksMutex.RUnlock()
		return cached, nil
	}
	jwksMutex.RUnlock()

	// Fetch fresh JWKS
	jwksMutex.Lock()
	defer jwksMutex.Unlock()

	// Double-check after acquiring write lock
	if jwksCache != nil && time.Since(jwksCacheTime) < jwksCacheTTL {
		return jwksCache, nil
	}

	webAppURL := os.Getenv("WEB_APP_URL")
	if webAppURL == "" {
		webAppURL = "http://localhost:3000"
	}

	jwksURL := webAppURL + "/api/auth/jwks"
	logging.Info("Fetching JWKS from: %s", jwksURL)

	jwks, err := jwk.Fetch(ctx, jwksURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch JWKS: %w", err)
	}

	jwksCache = jwks
	jwksCacheTime = time.Now()

	return jwks, nil
}

// IsJWT checks if a token string looks like a JWT
func IsJWT(token string) bool {
	// JWT tokens have 3 parts separated by dots
	// They typically start with "eyJ" (base64 encoded JSON header)
	if len(token) < 10 {
		return false
	}
	
	// Count dots - JWT has exactly 2 dots
	dotCount := 0
	for _, char := range token {
		if char == '.' {
			dotCount++
		}
	}
	
	return dotCount == 2 && (token[0] == 'e' || token[0] == 'E')
}

