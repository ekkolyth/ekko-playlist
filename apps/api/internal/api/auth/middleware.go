package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"

	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type contextKey string

const userIDKey contextKey = "userID"
const userEmailKey contextKey = "userEmail"

// AuthMiddleware creates a middleware that validates session tokens
func AuthMiddleware(dbService *db.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractTokenFromRequest(r)
			if token == "" {
				logging.Info("Auth: No token found in request")
				http.Error(w, "Authorization required", http.StatusUnauthorized)
				return
			}

			ctx := r.Context()
			
			// First try to validate as session token
			session, err := dbService.Queries.GetSessionByToken(ctx, token)
			if err == nil && session != nil {
				logging.Api("Auth: Session validated")
				// Add user info to request context
				ctx = context.WithValue(ctx, userIDKey, session.UserID)
				ctx = context.WithValue(ctx, userEmailKey, session.UserEmail)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// If not a session token, try to validate as stored API token
			hash := sha256.Sum256([]byte(token))
			tokenHash := hex.EncodeToString(hash[:])
			apiToken, err := dbService.Queries.GetAPITokenByHash(ctx, tokenHash)
			if err == nil && apiToken != nil {
				// Update last used timestamp
				dbService.Queries.UpdateAPITokenLastUsed(ctx, apiToken.ID)
				logging.Info("Auth: API token validated - User ID: %s, Email: %s", apiToken.UserID, apiToken.UserEmail)
				// Add user info to request context
				ctx = context.WithValue(ctx, userIDKey, apiToken.UserID)
				ctx = context.WithValue(ctx, userEmailKey, apiToken.UserEmail)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// If not a stored API token, try to validate as JWT token
			if IsJWT(token) {
				claims, err := VerifyJWT(ctx, token)
				if err == nil && claims != nil {
					// Extract user info from JWT claims
					// Better Auth JWT includes user info in the payload
					userID, ok := claims["sub"].(string)
					if !ok {
						// Try "id" field as fallback
						if id, ok := claims["id"].(string); ok {
							userID = id
						} else {
							logging.Info("Auth: JWT validated but no user ID in claims")
							http.Error(w, "Invalid token: missing user ID", http.StatusUnauthorized)
							return
						}
					}

					email, _ := claims["email"].(string)
					logging.Info("Auth: JWT validated - User ID: %s, Email: %s", userID, email)
					// Add user info to request context
					ctx = context.WithValue(ctx, userIDKey, userID)
					ctx = context.WithValue(ctx, userEmailKey, email)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				logging.Info("Auth: JWT verification failed: %v", err)
			}

			// If not a JWT, try to validate as one-time token
			user, err := dbService.Queries.GetUserByVerificationToken(ctx, token)
			if err == nil && user != nil {
				logging.Info("Auth: One-time token validated - User ID: %s, Email: %s", user.ID, user.Email)
				// Add user info to request context
				ctx = context.WithValue(ctx, userIDKey, user.ID)
				ctx = context.WithValue(ctx, userEmailKey, user.Email)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Token not found in session, JWT, or verification table
			logging.Info("Auth: Failed to validate token - not found in session, JWT, or verification table")
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		})
	}
}

// GetUserID extracts the user ID from the request context
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(userIDKey).(string)
	return userID, ok
}

// GetUserEmail extracts the user email from the request context
func GetUserEmail(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(userEmailKey).(string)
	return email, ok
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

