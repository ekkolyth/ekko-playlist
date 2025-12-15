package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type VideosHandler struct {
	dbService *db.Service
}

func NewVideosHandler(dbService *db.Service) *VideosHandler {
	return &VideosHandler{
		dbService: dbService,
	}
}

type VideoResponse struct {
	ID            int64  `json:"id"`
	VideoID       string `json:"videoId"`
	NormalizedURL string `json:"normalizedUrl"`
	OriginalURL   string `json:"originalUrl"`
	Title         string `json:"title"`
	Channel       string `json:"channel"`
	UserID        string `json:"userId"`
	CreatedAt     string `json:"createdAt"`
}

type ListVideosResponse struct {
	Videos []VideoResponse `json:"videos"`
}

// List handles GET /api/videos
// Returns a list of videos for the authenticated user
// Supports optional "channels" query parameter for filtering (comma-separated or array format)
func (h *VideosHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	// Parse channels filter from query parameters
	var channels []string
	channelsParam := r.URL.Query().Get("channels")
	if channelsParam != "" {
		// Support comma-separated format: ?channels=Channel1,Channel2,Channel3
		channels = strings.Split(channelsParam, ",")
		// Trim whitespace from each channel name
		for i := range channels {
			channels[i] = strings.TrimSpace(channels[i])
		}
		// Remove empty strings
		filtered := channels[:0]
		for _, ch := range channels {
			if ch != "" {
				filtered = append(filtered, ch)
			}
		}
		channels = filtered
	} else {
		// Support array format: ?channels[]=Channel1&channels[]=Channel2
		if channelsArray := r.URL.Query()["channels[]"]; len(channelsArray) > 0 {
			channels = channelsArray
			// Trim whitespace from each channel name
			for i := range channels {
				channels[i] = strings.TrimSpace(channels[i])
			}
			// Remove empty strings
			filtered := channels[:0]
			for _, ch := range channels {
				if ch != "" {
					filtered = append(filtered, ch)
				}
			}
			channels = filtered
		}
	}

	var videos []*db.Video
	var err error

	// Use filtered query if channels are provided, otherwise use regular query
	if len(channels) > 0 {
		videos, err = h.dbService.Queries.ListVideosFiltered(ctx, &db.ListVideosFilteredParams{
			UserID:  userID,
			Column2: channels,
		})
	} else {
		videos, err = h.dbService.Queries.ListVideos(ctx, userID)
	}

	if err != nil {
		logging.Info("Error listing videos: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch videos")
		return
	}

	response := ListVideosResponse{
		Videos: make([]VideoResponse, 0, len(videos)),
	}

	for _, video := range videos {
		createdAt := ""
		if video.CreatedAt.Valid {
			createdAt = video.CreatedAt.Time.Format(time.RFC3339)
		}

		response.Videos = append(response.Videos, VideoResponse{
			ID:            video.ID,
			VideoID:       video.VideoID,
			NormalizedURL: video.NormalizedUrl,
			OriginalURL:   video.OriginalUrl,
			Title:         video.Title,
			Channel:       video.Channel,
			UserID:        video.UserID,
			CreatedAt:     createdAt,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

