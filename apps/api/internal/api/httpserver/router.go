package httpserver

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
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
		AllowCredentials: true,
		MaxAge:           1800, // 1 Hour
	}))

	// Healthcheck (public, no auth required)
	router.Get("/api/healthz", handlers.Health)

	// Auth routes (public)
	authHandler := handlers.NewAuthHandler(dbService)
	router.Route("/api/auth", func(auth chi.Router) {
		auth.Post("/register", authHandler.Register)
		auth.Post("/login", authHandler.Login)
		auth.Post("/logout", authHandler.Logout)
		auth.Get("/me", authHandler.Me)
	})

	// Create auth middleware
	authMiddleware := auth.AuthMiddleware(dbService)

	// Token management routes - require authentication
	tokensHandler := handlers.NewTokensHandler(dbService)
	router.Route("/api/tokens", func(tokens chi.Router) {
		tokens.Use(authMiddleware)
		tokens.Post("/", tokensHandler.CreateToken)
		tokens.Get("/", tokensHandler.ListTokens)
		tokens.Put("/{id}", tokensHandler.UpdateToken)
		tokens.Delete("/{id}", tokensHandler.DeleteToken)
	})

	// Config routes - require authentication
	configHandler := handlers.NewConfigHandler(dbService)
	router.Route("/api/config", func(config chi.Router) {
		config.Use(authMiddleware)
		config.Route("/smtp", func(smtp chi.Router) {
			smtp.Get("/", configHandler.GetSmtpConfig)
			smtp.Put("/", configHandler.UpdateSmtpConfig)
			smtp.Post("/test", configHandler.SendTestEmail)
		})
	})

	router.Route("/api", func(api chi.Router) {
		// Process routes (playlist and video) - require authentication
		processHandler := handlers.NewProcessHandler(luaService, dbService)
		api.Route("/process", func(process chi.Router) {
			process.Use(authMiddleware)
			process.Post("/playlist", processHandler.Playlist)
			process.Post("/video", processHandler.Video)
		})

		// Videos routes - require authentication
		videosHandler := handlers.NewVideosHandler(dbService)
		api.Route("/videos", func(videos chi.Router) {
			videos.Use(authMiddleware)
			videos.Get("/", videosHandler.List)
			videos.Delete("/", videosHandler.Delete)
		})

		// Playlists routes - require authentication
		playlistsHandler := handlers.NewPlaylistsHandler(dbService)
		api.Route("/playlists", func(playlists chi.Router) {
			playlists.Use(authMiddleware)
			playlists.Post("/", playlistsHandler.Create)
			playlists.Get("/", playlistsHandler.List)
			playlists.Get("/{id}", playlistsHandler.Get)
			playlists.Put("/{id}", playlistsHandler.Update)
			playlists.Delete("/{id}", playlistsHandler.Delete)
		})

		// Playlist videos routes - require authentication
		playlistVideosHandler := handlers.NewPlaylistVideosHandler(dbService)
		api.Route("/playlists/{id}/videos", func(playlistVideos chi.Router) {
			playlistVideos.Use(authMiddleware)
			playlistVideos.Post("/bulk", playlistVideosHandler.BulkAddVideos)
			playlistVideos.Post("/", playlistVideosHandler.AddVideo)
			playlistVideos.Delete("/{videoId}", playlistVideosHandler.RemoveVideo)
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
