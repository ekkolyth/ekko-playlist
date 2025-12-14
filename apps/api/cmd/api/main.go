package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpserver"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/lua"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/joho/godotenv"
)

var StartTime = time.Now()

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	if _, err := os.Stat(".env.local"); err == nil {
		if err := godotenv.Load(".env.local"); err != nil {
			log.Println("Warning: .env present but could not be loaded:", err)
		}
	}

	port := getenvDefault("API_PORT", "1337")
	if _, err := strconv.Atoi(port); err != nil {
		log.Fatal("Invalid API_PORT value:", port)
	}

	ctx := context.Background()

	// DB init
	dbService, err := db.NewService(ctx)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer dbService.DB.Close()
	logging.Info("Database connection established")

	// Lua service init
	luaService, err := lua.NewService()
	if err != nil {
		log.Fatal("Failed to initialize Lua service:", err)
	}
	defer luaService.Close()
	logging.Info("Lua service initialized")

	router := httpserver.NewRouter(dbService, luaService)
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logging.Info("✅ API listening on :%s (all interfaces)", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logging.Fatal("%s", err)
		}
	}()

	<-quit
	log.Println("Server is shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logging.Fatal("Server forced to shutdown:", err)
	}
	log.Println("Server exited")
}

