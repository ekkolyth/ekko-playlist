package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type PlaylistVideosHandler struct {
	dbService *db.Service
}

func NewPlaylistVideosHandler(dbService *db.Service) *PlaylistVideosHandler {
	return &PlaylistVideosHandler{
		dbService: dbService,
	}
}

type AddVideoToPlaylistRequest struct {
	VideoID int64 `json:"videoId"`
}

type BulkAddVideosToPlaylistRequest struct {
	VideoIDs []int64 `json:"videoIds"`
}

// AddVideo handles POST /api/playlists/:id/videos
// Adds a video to a playlist
func (h *PlaylistVideosHandler) AddVideo(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	playlistName := chi.URLParam(r, "id")
	if playlistName == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Playlist name is required")
		return
	}

	var req AddVideoToPlaylistRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Verify video exists and belongs to user
	video, err := h.dbService.Queries.GetVideoByID(ctx, req.VideoID)
	if err != nil {
		logging.Info("Error getting video: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Video not found")
		return
	}

	if video.UserID != userID {
		httpx.RespondError(w, http.StatusForbidden, "You don't have permission to add this video")
		return
	}

	// Get current max position to append at the end
	videoCount, _ := h.dbService.Queries.GetPlaylistVideoCount(ctx, &db.GetPlaylistVideoCountParams{
		UserID: userID,
		Name:   playlistName,
	})

	err = h.dbService.Queries.AddVideoToPlaylistByName(ctx, &db.AddVideoToPlaylistByNameParams{
		UserID:   userID,
		VideoID:  req.VideoID,
		Position: int32(videoCount),
		Name:     playlistName,
	})
	if err != nil {
		logging.Info("Error adding video to playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to add video to playlist")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "Video added to playlist successfully"})
}

// RemoveVideo handles DELETE /api/playlists/:id/videos/:videoId
// Removes a video from a playlist
func (h *PlaylistVideosHandler) RemoveVideo(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	playlistName := chi.URLParam(r, "id")
	if playlistName == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Playlist name is required")
		return
	}

	videoIDStr := chi.URLParam(r, "videoId")
	videoID, err := strconv.ParseInt(videoIDStr, 10, 64)
	if err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "Invalid video ID")
		return
	}

	err = h.dbService.Queries.RemoveVideoFromPlaylist(ctx, &db.RemoveVideoFromPlaylistParams{
		UserID: userID,
		Name:   playlistName,
		VideoID: videoID,
	})
	if err != nil {
		logging.Info("Error removing video from playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to remove video from playlist")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "Video removed from playlist successfully"})
}

// BulkAddVideos handles POST /api/playlists/:id/videos/bulk
// Adds multiple videos to a playlist
func (h *PlaylistVideosHandler) BulkAddVideos(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	playlistName := chi.URLParam(r, "id")
	if playlistName == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Playlist name is required")
		return
	}

	var req BulkAddVideosToPlaylistRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.VideoIDs) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "videoIds array is required and cannot be empty")
		return
	}

	// Get current max position to append at the end
	videoCount, _ := h.dbService.Queries.GetPlaylistVideoCount(ctx, &db.GetPlaylistVideoCountParams{
		UserID: userID,
		Name:   playlistName,
	})
	addedCount := int64(0)
	failedCount := 0

	// Add each video
	for _, videoID := range req.VideoIDs {
		// Verify video exists and belongs to user
		video, err := h.dbService.Queries.GetVideoByID(ctx, videoID)
		if err != nil {
			logging.Info("Error getting video %d: %s", videoID, err.Error())
			failedCount++
			continue
		}

		if video.UserID != userID {
			logging.Info("Video %d does not belong to user", videoID)
			failedCount++
			continue
		}

		err = h.dbService.Queries.AddVideoToPlaylistByName(ctx, &db.AddVideoToPlaylistByNameParams{
			UserID:   userID,
			VideoID:  videoID,
			Position: int32(videoCount + addedCount),
			Name:     playlistName,
		})
		if err != nil {
			logging.Info("Error adding video %d to playlist: %s", videoID, err.Error())
			failedCount++
			continue
		}

		addedCount++
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Bulk add completed",
		"added":      addedCount,
		"failed":     failedCount,
		"requested":  len(req.VideoIDs),
	})
}

