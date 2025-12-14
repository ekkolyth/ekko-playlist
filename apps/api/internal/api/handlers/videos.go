package handlers

import (
	"context"
	"net/http"
	"time"

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
	CreatedAt     string `json:"createdAt"`
}

type ListVideosResponse struct {
	Videos []VideoResponse `json:"videos"`
}

// List handles GET /api/videos
// Returns a list of all videos in the database
func (h *VideosHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	videos, err := h.dbService.Queries.ListVideos(ctx)
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
			CreatedAt:     createdAt,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

