package httpserver

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/handlers"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/lua"
)

func NewRouter(dbService *db.Service, luaService *lua.Service) http.Handler {
	router := chi.NewRouter()

	// standard middleware
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(15 * time.Second))

	allowedOrigins := envList("CORS_ALLOWED_ORIGINS")

	// cors
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins: allowedOrigins,
		// Allow any chrome-extension:// origin for browser extension testing
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			// Check if origin is in the allowed list
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			// Allow chrome-extension:// origins for testing
			if strings.HasPrefix(origin, "chrome-extension://") {
				return true
			}
			return false
		},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{
			"Accept",
			"Accept-Language",
			"Content-Type",
			"Authorization",
			"Origin",
			"Referer",
		},
		ExposedHeaders: []string{"Location",
			"X-Request-ID",
			"Retry-After",
			"RateLimit-Limit",
			"RateLimit-Remaining",
			"RateLimit-Reset"},
		AllowCredentials: false,
		MaxAge:           1800, // 1 Hour
	}))

	// Healthcheck
	router.Get("/api/healthz", handlers.Health)

	router.Route("/api", func(api chi.Router) {
		// Process routes (playlist and video)
		processHandler := handlers.NewProcessHandler(luaService, dbService)
		api.Route("/process", func(process chi.Router) {
			process.Post("/playlist", processHandler.Playlist)
			process.Post("/video", processHandler.Video)
		})
	})

	return router
}

func envList(key string) []string {
	v := os.Getenv(key)
	if v == "" {
		return nil
	}
	parts := strings.Split(v, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	return parts
}

