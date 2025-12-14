package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/lua"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type URLHandler struct {
	luaService *lua.Service
}

func NewURLHandler(luaService *lua.Service) *URLHandler {
	return &URLHandler{
		luaService: luaService,
	}
}

type NormalizeURLRequest struct {
	URL string `json:"url"`
}

type NormalizeURLResponse struct {
	IsValid       bool   `json:"isValid"`
	VideoID       string `json:"videoId,omitempty"`
	NormalizedURL string `json:"normalizedUrl,omitempty"`
	Error         string `json:"error,omitempty"`
}

// NormalizeURL handles POST /api/url/normalize
func (h *URLHandler) NormalizeURL(w http.ResponseWriter, r *http.Request) {
	var req NormalizeURLRequest

	// Decode JSON request body
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		logging.Warning("Invalid request body: " + err.Error())
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate URL is provided
	if req.URL == "" {
		httpx.RespondError(w, http.StatusBadRequest, "url field is required")
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Call Lua script to normalize URL
	result, err := h.luaService.NormalizeURL(ctx, req.URL)
	if err != nil {
		logging.Warning("Lua script error: " + err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to normalize URL: "+err.Error())
		return
	}

	// Convert result to response
	response := NormalizeURLResponse{}

	// Extract values from Lua result
	if isValid, ok := result["isValid"].(bool); ok {
		response.IsValid = isValid
	}

	if videoID, ok := result["videoId"].(string); ok && videoID != "" {
		response.VideoID = videoID
	}

	if normalizedURL, ok := result["normalizedUrl"].(string); ok && normalizedURL != "" {
		response.NormalizedURL = normalizedURL
	}

	if errMsg, ok := result["error"].(string); ok && errMsg != "" {
		response.Error = errMsg
	}

	// Handle Lua's nil values (which might come through as nil interface{})
	if videoID, ok := result["videoId"]; ok && videoID != nil {
		if v, ok := videoID.(string); ok {
			response.VideoID = v
		}
	}

	if normalizedURL, ok := result["normalizedUrl"]; ok && normalizedURL != nil {
		if v, ok := normalizedURL.(string); ok {
			response.NormalizedURL = v
		}
	}

	if errMsg, ok := result["error"]; ok && errMsg != nil {
		if v, ok := errMsg.(string); ok {
			response.Error = v
		}
	}

	// Return appropriate status code based on validation result
	if !response.IsValid {
		logging.Api("URL normalization failed: " + response.Error)
		httpx.RespondJSON(w, http.StatusBadRequest, response)
		return
	}

	logging.Api("URL normalized: " + response.NormalizedURL)
	httpx.RespondJSON(w, http.StatusOK, response)
}

