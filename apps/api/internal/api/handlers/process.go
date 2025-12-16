package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/ekkolyth/ekko-playlist/api/internal/lua"
)

type ProcessHandler struct {
	luaService *lua.Service
	dbService  *db.Service
}

func NewProcessHandler(luaService *lua.Service, dbService *db.Service) *ProcessHandler {
	return &ProcessHandler{
		luaService: luaService,
		dbService:  dbService,
	}
}

type VideoInfo struct {
	Channel string `json:"channel"`
	URL     string `json:"url"`
	Title   string `json:"title"`
}

type ProcessPlaylistRequest struct {
	Videos []VideoInfo `json:"videos"`
}

type ProcessedVideoInfo struct {
	Channel       string `json:"channel"`
	OriginalURL   string `json:"originalUrl"`
	NormalizedURL string `json:"normalizedUrl"`
	Title         string `json:"title"`
	IsValid       bool   `json:"isValid"`
	Error         string `json:"error,omitempty"`
}

type ProcessPlaylistResponse struct {
	Processed []ProcessedVideoInfo `json:"processed"`
	Total     int                  `json:"total"`
	Valid     int                  `json:"valid"`
	Invalid   int                  `json:"invalid"`
}

// extractVideoID extracts the video ID from a normalized YouTube URL
// Expected format: https://www.youtube.com/watch?v=VIDEO_ID
func extractVideoID(normalizedURL string) string {
	// Extract video ID from normalized URL format: https://www.youtube.com/watch?v=VIDEO_ID
	parts := strings.Split(normalizedURL, "v=")
	if len(parts) == 2 {
		// Remove any query parameters after the video ID
		videoID := strings.Split(parts[1], "&")[0]
		return videoID
	}
	return ""
}

// Playlist handles POST /api/process/playlist
// Receives a playlist of videos and normalizes all YouTube URLs using Lua
func (h *ProcessHandler) Playlist(w http.ResponseWriter, r *http.Request) {
	logging.Info("Received POST /api/process/playlist request")

	// Check if user ID is available in request context (before creating new context)
	if userID, ok := auth.GetUserID(r.Context()); ok {
		logging.Info("Auth: User ID found in request context: %d", userID)
	} else {
		logging.Info("Auth: WARNING - No user ID found in request context!")
	}

	var req ProcessPlaylistRequest

	// Decode JSON request body (allow up to 10MB for large playlists)
	if err := httpx.DecodeJSON(w, r, &req, 10<<20); err != nil {
		logging.Warning("Invalid request body: " + err.Error())
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	logging.Info("Decoded request with %d videos", len(req.Videos))

	// Validate videos array
	if len(req.Videos) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "videos array cannot be empty")
		return
	}

	// Create context with timeout (allow more time for processing multiple URLs)
	// Use request context to preserve auth middleware's user ID
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	processed := make([]ProcessedVideoInfo, 0, len(req.Videos))
	validURLs := make([]string, 0)
	failedURLs := make([]string, 0)

	// Process each video URL
	for _, video := range req.Videos {
		// Normalize URL using Lua script
		result, err := h.luaService.NormalizeURL(ctx, video.URL)
		if err != nil {
			processed = append(processed, ProcessedVideoInfo{
				Channel:       video.Channel,
				OriginalURL:   video.URL,
				NormalizedURL: "",
				Title:         video.Title,
				IsValid:       false,
				Error:         "Failed to normalize URL: " + err.Error(),
			})
			failedURLs = append(failedURLs, video.URL)
			continue
		}

		// Extract values from Lua result
		isValid := false
		normalizedURL := ""
		errorMsg := ""

		if val, ok := result["isValid"].(bool); ok {
			isValid = val
		}

		if val, ok := result["normalizedUrl"].(string); ok && val != "" {
			normalizedURL = val
		} else if val, ok := result["normalizedUrl"]; ok && val != nil {
			if v, ok := val.(string); ok {
				normalizedURL = v
			}
		}

		if val, ok := result["error"].(string); ok && val != "" {
			errorMsg = val
		} else if val, ok := result["error"]; ok && val != nil {
			if v, ok := val.(string); ok {
				errorMsg = v
			}
		}

		// Create processed video info
		processedVideo := ProcessedVideoInfo{
			Channel:       video.Channel,
			OriginalURL:   video.URL,
			NormalizedURL: normalizedURL,
			Title:         video.Title,
			IsValid:       isValid,
		}

		if errorMsg != "" {
			processedVideo.Error = errorMsg
		}

		if isValid {
			validURLs = append(validURLs, normalizedURL)
		} else {
			failedURLs = append(failedURLs, video.URL)
		}

		processed = append(processed, processedVideo)
	}

	// Store valid videos in database using a transaction
	if len(validURLs) > 0 {
		logging.Info("Preparing to save %d valid videos to database", len(validURLs))
		validVideos := make([]ProcessedVideoInfo, 0)
		for _, p := range processed {
			if p.IsValid && p.NormalizedURL != "" {
				validVideos = append(validVideos, p)
			}
		}

		if len(validVideos) > 0 {
			logging.Info("Starting database transaction for %d videos", len(validVideos))
			// Use transaction for batch insert
			err := h.dbService.DB.WithTx(ctx, func(q *db.Queries) error {
				logging.Info("Inside transaction, processing %d videos", len(validVideos))
				savedCount := 0
				for i, video := range validVideos {
					videoID := extractVideoID(video.NormalizedURL)
					if videoID == "" {
						logging.Info("Warning: Could not extract video ID from URL: %s", video.NormalizedURL)
						continue
					}

					// Get user ID from context (set by auth middleware)
					userID, ok := auth.GetUserID(ctx)
					if !ok {
						logging.Info("DB: ERROR - No user ID in context, cannot save video: %s", video.Title)
						logging.Info("DB: Context details - checking if auth middleware ran")
						// This is a critical error - abort transaction
						return fmt.Errorf("user ID not found in context - auth middleware may not have run")
					}

					logging.Info("DB: Attempting to create video %d/%d: %s (ID: %s, URL: %s, User: %s)", i+1, len(validVideos), video.Title, videoID, video.NormalizedURL, userID)
					result, err := q.CreateVideo(ctx, &db.CreateVideoParams{
						VideoID:       videoID,
						NormalizedUrl: video.NormalizedURL,
						OriginalUrl:   video.OriginalURL,
						Title:         video.Title,
						Channel:       video.Channel,
						UserID:        userID,
					})

					if err != nil {
						// ON CONFLICT DO NOTHING returns no rows, which is expected for duplicates
						if errors.Is(err, pgx.ErrNoRows) {
							logging.Info("DB: Video already exists (duplicate, skipped): '%s' (normalized URL: %s)", video.Title, video.NormalizedURL)
							continue
						}
						// Log actual errors - these are real database errors
						logging.Info("DB: ERROR saving video '%s': %s (error type: %T)", video.Title, err.Error(), err)
						// Continue processing other videos, but log the error
						// Don't abort transaction on individual video errors
						continue
					}

					if result == nil {
						logging.Info("DB: WARNING - CreateVideo returned nil result for '%s' (this should not happen)", video.Title)
						continue
					}

					logging.Info("DB: ✅ Successfully saved video '%s' (DB ID: %d, normalized URL: %s)", video.Title, result.ID, result.NormalizedUrl)
					savedCount++
				}
				logging.Info("DB: Processed %d videos, successfully saved %d new videos, skipped %d duplicates", len(validVideos), savedCount, len(validVideos)-savedCount)
				return nil
			})

			if err != nil {
				logging.Info("DB: Database transaction error: %s", err.Error())
			} else {
				logging.Info("DB: Transaction completed successfully")
			}
		}
	}

	// Create response
	response := ProcessPlaylistResponse{
		Processed: processed,
		Total:     len(req.Videos),
		Valid:     len(validURLs),
		Invalid:   len(failedURLs),
	}

	// Log summary
	if len(validURLs) > 0 {
		logging.Api("[SUCCESS]")
		logging.Api("%d urls extracted successfully", len(validURLs))
		for _, url := range validURLs {
			logging.Info("%s", url)
		}
	}
	if len(failedURLs) > 0 {
		if len(validURLs) > 0 {
			logging.Info("")
		}
		logging.Info("[FAILED]")
		logging.Info("%d urls failed", len(failedURLs))
		for _, url := range failedURLs {
			logging.Info("%s", url)
		}
	}

	logging.Info("Sending response: %d total, %d valid, %d invalid", response.Total, response.Valid, response.Invalid)
	httpx.RespondJSON(w, http.StatusOK, response)
	logging.Info("Response sent successfully")
}

type ProcessVideoRequest struct {
	Video VideoInfo `json:"video"`
}

type ProcessVideoResponse struct {
	Processed ProcessedVideoInfo `json:"processed"`
}

// Video handles POST /api/process/video
// Receives a video and normalizes the YouTube URL using Lua
func (h *ProcessHandler) Video(w http.ResponseWriter, r *http.Request) {
	var req ProcessVideoRequest

	// Decode JSON request body
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		logging.Warning("Invalid request body: " + err.Error())
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate video is provided
	if req.Video.URL == "" {
		httpx.RespondError(w, http.StatusBadRequest, "video.url field is required")
		return
	}

	// Create context with timeout
	// Use request context to preserve auth middleware's user ID
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Normalize URL using Lua script
	result, err := h.luaService.NormalizeURL(ctx, req.Video.URL)
	if err != nil {
		httpx.RespondJSON(w, http.StatusOK, ProcessVideoResponse{
			Processed: ProcessedVideoInfo{
				Channel:       req.Video.Channel,
				OriginalURL:   req.Video.URL,
				NormalizedURL: "",
				Title:         req.Video.Title,
				IsValid:       false,
				Error:         "Failed to normalize URL: " + err.Error(),
			},
		})
		logging.Info("[FAILED]")
		logging.Info("1 urls failed")
		logging.Info("%s", req.Video.URL)
		return
	}

	// Extract values from Lua result
	isValid := false
	normalizedURL := ""
	errorMsg := ""

	if val, ok := result["isValid"].(bool); ok {
		isValid = val
	}

	if val, ok := result["normalizedUrl"].(string); ok && val != "" {
		normalizedURL = val
	} else if val, ok := result["normalizedUrl"]; ok && val != nil {
		if v, ok := val.(string); ok {
			normalizedURL = v
		}
	}

	if val, ok := result["error"].(string); ok && val != "" {
		errorMsg = val
	} else if val, ok := result["error"]; ok && val != nil {
		if v, ok := val.(string); ok {
			errorMsg = v
		}
	}

	// Create processed video info
	processedVideo := ProcessedVideoInfo{
		Channel:       req.Video.Channel,
		OriginalURL:   req.Video.URL,
		NormalizedURL: normalizedURL,
		Title:         req.Video.Title,
		IsValid:       isValid,
	}

	if errorMsg != "" {
		processedVideo.Error = errorMsg
	}

	// Log result
	if isValid {
		logging.Info("[SUCCESS]")
		logging.Info("1 urls extracted successfully")
		logging.Info("%s", normalizedURL)
	} else {
		logging.Info("[FAILED]")
		logging.Info("1 urls failed")
		logging.Info("%s", req.Video.URL)
	}

	// Store valid video in database
	if isValid && normalizedURL != "" {
		videoID := extractVideoID(normalizedURL)
		if videoID != "" {
			// Get user ID from context (set by auth middleware)
			userID, ok := auth.GetUserID(ctx)
			if !ok {
				logging.Info("DB: Warning: No user ID in context, skipping video: %s", req.Video.Title)
			} else {
				logging.Info("DB: Creating video: %s (ID: %s, URL: %s, User: %d)", req.Video.Title, videoID, normalizedURL, userID)
				result, err := h.dbService.Queries.CreateVideo(ctx, &db.CreateVideoParams{
					VideoID:       videoID,
					NormalizedUrl: normalizedURL,
					OriginalUrl:   req.Video.URL,
					Title:         req.Video.Title,
					Channel:       req.Video.Channel,
					UserID:        userID,
				})

				if err != nil {
					// ON CONFLICT DO NOTHING returns no rows, which is expected for duplicates
					if errors.Is(err, pgx.ErrNoRows) {
						logging.Info("DB: Video already exists in database (duplicate, skipped): '%s' (normalized URL: %s)", req.Video.Title, normalizedURL)
					} else {
						logging.Info("DB: Error saving video to database: %s - %s (error type: %T)", req.Video.Title, err.Error(), err)
					}
				} else {
					logging.Info("DB: Successfully saved video '%s' (DB ID: %d, normalized URL: %s)", req.Video.Title, result.ID, result.NormalizedUrl)
				}
			}
		} else {
			logging.Info("Warning: Could not extract video ID from URL: %s", normalizedURL)
		}
	}

	httpx.RespondJSON(w, http.StatusOK, ProcessVideoResponse{
		Processed: processedVideo,
	})
}
