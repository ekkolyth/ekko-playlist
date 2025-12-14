package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/lua"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type ProcessHandler struct {
	luaService *lua.Service
}

func NewProcessHandler(luaService *lua.Service) *ProcessHandler {
	return &ProcessHandler{
		luaService: luaService,
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

// Playlist handles POST /api/process/playlist
// Receives a playlist of videos and normalizes all YouTube URLs using Lua
func (h *ProcessHandler) Playlist(w http.ResponseWriter, r *http.Request) {
	var req ProcessPlaylistRequest

	// Decode JSON request body (allow up to 10MB for large playlists)
	if err := httpx.DecodeJSON(w, r, &req, 10<<20); err != nil {
		logging.Warning("Invalid request body: " + err.Error())
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate videos array
	if len(req.Videos) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "videos array cannot be empty")
		return
	}

	// Create context with timeout (allow more time for processing multiple URLs)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	processed := make([]ProcessedVideoInfo, 0, len(req.Videos))
	validCount := 0
	invalidCount := 0

	// Process each video URL
	for i, video := range req.Videos {
		logging.Info("Processing video %d/%d: %s", i+1, len(req.Videos), video.Title)

		// Normalize URL using Lua script
		result, err := h.luaService.NormalizeURL(ctx, video.URL)
		if err != nil {
			logging.Info("Lua script error for video %d: %s", i+1, err.Error())
			processed = append(processed, ProcessedVideoInfo{
				Channel:       video.Channel,
				OriginalURL:   video.URL,
				NormalizedURL: "",
				Title:         video.Title,
				IsValid:       false,
				Error:         "Failed to normalize URL: " + err.Error(),
			})
			invalidCount++
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

		// Print to console in real time
		if isValid {
			logging.Info("✅ [%d/%d] Valid: %s -> %s", i+1, len(req.Videos), video.Title, normalizedURL)
			validCount++
		} else {
			logging.Info("❌ [%d/%d] Invalid: %s - %s", i+1, len(req.Videos), video.Title, errorMsg)
			invalidCount++
		}

		processed = append(processed, processedVideo)
	}

	// Create response
	response := ProcessPlaylistResponse{
		Processed: processed,
		Total:     len(req.Videos),
		Valid:     validCount,
		Invalid:   invalidCount,
	}

	logging.Info("Playlist processing complete: %d total, %d valid, %d invalid", response.Total, response.Valid, response.Invalid)
	httpx.RespondJSON(w, http.StatusOK, response)
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	logging.Info("Processing video: %s", req.Video.Title)

	// Normalize URL using Lua script
	result, err := h.luaService.NormalizeURL(ctx, req.Video.URL)
	if err != nil {
		logging.Info("Lua script error: %s", err.Error())
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

	// Print to console
	if isValid {
		logging.Info("✅ Valid: %s -> %s", req.Video.Title, normalizedURL)
	} else {
		logging.Info("❌ Invalid: %s - %s", req.Video.Title, errorMsg)
	}

	httpx.RespondJSON(w, http.StatusOK, ProcessVideoResponse{
		Processed: processedVideo,
	})
}

