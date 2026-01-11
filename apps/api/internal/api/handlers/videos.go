package handlers

import (
	"context"
	"net/http"
	"strconv"
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

	// Parse tag IDs filter from query parameters
	var tagIDs []int64
	tagsParam := r.URL.Query().Get("tags")
	if tagsParam != "" {
		tagStrs := strings.Split(tagsParam, ",")
		for _, tagStr := range tagStrs {
			tagStr = strings.TrimSpace(tagStr)
			if tagStr != "" {
				tagID, err := strconv.ParseInt(tagStr, 10, 64)
				if err == nil {
					tagIDs = append(tagIDs, tagID)
				}
			}
		}
	}

	// Parse search query parameter
	searchTerm := strings.TrimSpace(r.URL.Query().Get("search"))
	searchPattern := ""
	if searchTerm != "" {
		// Format search term for ILIKE pattern matching
		searchPattern = "%" + searchTerm + "%"
	}

	var videos []*db.Video
	var err error

	// Tag filtering uses AND logic (videos must have ALL selected tags)
	// If tags are specified, filter by tags first, then apply other filters
	if len(tagIDs) > 0 {
		// First filter by tags
		videos, err = h.dbService.Queries.FilterVideosByTagsAnd(ctx, &db.FilterVideosByTagsAndParams{
			UserID:  userID,
			Column2: tagIDs,
		})
		if err != nil {
			logging.Info("Error filtering videos by tags: %s", err.Error())
			httpx.RespondError(w, http.StatusInternalServerError, "Failed to filter videos by tags")
			return
		}

		// Then filter by channels if specified (in-memory filter)
		if len(channels) > 0 {
			filtered := videos[:0]
			for _, video := range videos {
				for _, channel := range channels {
					if video.Channel == channel {
						filtered = append(filtered, video)
						break
					}
				}
			}
			videos = filtered
		}

		// Then filter by unassigned if specified (in-memory filter)
		if showUnassigned {
			allVideoIDs := make([]int64, len(videos))
			for i, v := range videos {
				allVideoIDs[i] = v.ID
			}
			// Get videos that are in playlists
			var playlistVideoIDs []int64
			if len(allVideoIDs) > 0 {
				rows, err := h.dbService.DB.Pool.Query(ctx, "SELECT DISTINCT video_id FROM playlist_videos WHERE video_id = ANY($1)", allVideoIDs)
				if err == nil {
					defer rows.Close()
					for rows.Next() {
						var id int64
						if err := rows.Scan(&id); err == nil {
							playlistVideoIDs = append(playlistVideoIDs, id)
						}
					}
				}
			}
			playlistVideoIDSet := make(map[int64]bool)
			for _, id := range playlistVideoIDs {
				playlistVideoIDSet[id] = true
			}
			filtered := videos[:0]
			for _, video := range videos {
				if !playlistVideoIDSet[video.ID] {
					filtered = append(filtered, video)
				}
			}
			videos = filtered
		}

		// Search is not supported with tag filtering for now
		// (would require more complex SQL queries)
	} else if searchPattern != "" {
		// Use appropriate query based on filters
		// Search-enabled queries
		if showUnassigned {
			if len(channels) > 0 {
				// Unassigned videos with channel filter and search
				videos, err = h.dbService.Queries.ListVideosUnassignedFilteredWithSearch(ctx, &db.ListVideosUnassignedFilteredWithSearchParams{
					UserID:  userID,
					Column2: channels,
					Title:   searchPattern,
				})
			} else {
				// Unassigned videos with search only
				videos, err = h.dbService.Queries.ListVideosUnassignedWithSearch(ctx, &db.ListVideosUnassignedWithSearchParams{
					UserID: userID,
					Title:  searchPattern,
				})
			}
		} else {
			if len(channels) > 0 {
				// Regular videos with channel filter and search
				videos, err = h.dbService.Queries.ListVideosFilteredWithSearch(ctx, &db.ListVideosFilteredWithSearchParams{
					UserID:  userID,
					Column2: channels,
					Title:   searchPattern,
				})
			} else {
				// Regular videos with search only
				videos, err = h.dbService.Queries.ListVideosWithSearch(ctx, &db.ListVideosWithSearchParams{
					UserID: userID,
					Title:  searchPattern,
				})
			}
		}
	} else {
		// Non-search queries
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

