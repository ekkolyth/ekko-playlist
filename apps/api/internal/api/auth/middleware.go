package auth

import (
	"context"
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
				logging.Info("Auth: Session validated - User ID: %s, Email: %s", session.UserID, session.UserEmail)
				// Add user info to request context
				ctx = context.WithValue(ctx, userIDKey, session.UserID)
				ctx = context.WithValue(ctx, userEmailKey, session.UserEmail)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// If not a session token, try to validate as one-time token
			user, err := dbService.Queries.GetUserByVerificationToken(ctx, token)
			if err == nil && user != nil {
				logging.Info("Auth: One-time token validated - User ID: %s, Email: %s", user.ID, user.Email)
				// Add user info to request context
				ctx = context.WithValue(ctx, userIDKey, user.ID)
				ctx = context.WithValue(ctx, userEmailKey, user.Email)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Token not found in either session or verification table
			logging.Info("Auth: Failed to validate token - not found in session or verification table")
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return

			// Continue with the request
			next.ServeHTTP(w, r.WithContext(ctx))
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

