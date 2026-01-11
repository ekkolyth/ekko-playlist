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

type TagInfo struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

type VideoResponse struct {
	ID            int64     `json:"id"`
	VideoID       string    `json:"videoId"`
	NormalizedURL string    `json:"normalizedUrl"`
	OriginalURL   string    `json:"originalUrl"`
	Title         string    `json:"title"`
	Channel       string    `json:"channel"`
	UserID        string    `json:"userId"`
	CreatedAt     string    `json:"createdAt"`
	Tags          []TagInfo `json:"tags"`
}

type ListVideosResponse struct {
	Videos []VideoResponse `json:"videos"`
}

// List handles GET /api/videos
// Returns a list of videos for the authenticated user
// Supports optional "channels" query parameter for filtering (comma-separated or array format)
// Supports optional "unassigned" query parameter to filter videos not in any playlist
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

	// Parse unassigned filter from query parameters
	unassignedParam := r.URL.Query().Get("unassigned")
	showUnassigned := unassignedParam == "true"

	var videos []*db.Video
	var err error

	// Use appropriate query based on filters
	if showUnassigned {
		if len(channels) > 0 {
			// Unassigned videos with channel filter
			videos, err = h.dbService.Queries.ListVideosUnassignedFiltered(ctx, &db.ListVideosUnassignedFilteredParams{
				UserID:  userID,
				Column2: channels,
			})
		} else {
			// Unassigned videos without channel filter
			videos, err = h.dbService.Queries.ListVideosUnassigned(ctx, userID)
		}
	} else {
		if len(channels) > 0 {
			// Regular videos with channel filter
			videos, err = h.dbService.Queries.ListVideosFiltered(ctx, &db.ListVideosFilteredParams{
				UserID:  userID,
				Column2: channels,
			})
		} else {
			// Regular videos without channel filter
			videos, err = h.dbService.Queries.ListVideos(ctx, userID)
		}
	}

	if err != nil {
		logging.Info("Error listing videos: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch videos")
		return
	}

	// Get video IDs
	videoIDs := make([]int64, len(videos))
	for i, video := range videos {
		videoIDs[i] = video.ID
	}

	// Fetch tags for all videos
	var videoTags []*db.GetVideoTagsForVideosRow
	if len(videoIDs) > 0 {
		videoTags, _ = h.dbService.Queries.GetVideoTagsForVideos(ctx, videoIDs)
	}

	// Group tags by video_id
	tagsByVideoID := make(map[int64][]TagInfo)
	for _, vt := range videoTags {
		tagsByVideoID[vt.VideoID] = append(tagsByVideoID[vt.VideoID], TagInfo{
			ID:    vt.TagID,
			Name:  vt.TagName,
			Color: vt.TagColor,
		})
	}

	response := ListVideosResponse{
		Videos: make([]VideoResponse, 0, len(videos)),
	}

	for _, video := range videos {
		createdAt := ""
		if video.CreatedAt.Valid {
			createdAt = video.CreatedAt.Time.Format(time.RFC3339)
		}

		tags := tagsByVideoID[video.ID]
		if tags == nil {
			tags = []TagInfo{}
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
			Tags:          tags,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

type DeleteVideoRequest struct {
	VideoIDs []int64 `json:"videoIds"`
}

// Delete handles DELETE /api/videos
// Deletes one or more videos for the authenticated user
func (h *VideosHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	// Parse request body
	var req DeleteVideoRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		logging.Warning("Invalid request body: " + err.Error())
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.VideoIDs) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "videoIds array is required and cannot be empty")
		return
	}

	// Delete videos
	err := h.dbService.Queries.DeleteVideos(ctx, &db.DeleteVideosParams{
		Column1: req.VideoIDs,
		UserID:  userID,
	})

	if err != nil {
		logging.Info("Error deleting videos: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to delete videos")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Videos deleted successfully",
		"deleted": len(req.VideoIDs),
	})
}

