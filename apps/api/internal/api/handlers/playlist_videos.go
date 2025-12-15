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

	playlistIDStr := chi.URLParam(r, "id")
	playlistID, err := strconv.ParseInt(playlistIDStr, 10, 64)
	if err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	// Verify playlist ownership
	playlist, err := h.dbService.Queries.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		logging.Info("Error getting playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Playlist not found")
		return
	}

	if playlist.UserID != userID {
		httpx.RespondError(w, http.StatusForbidden, "You don't have permission to modify this playlist")
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
	videoCount, _ := h.dbService.Queries.GetPlaylistVideoCount(ctx, playlistID)

	_, err = h.dbService.Queries.AddVideoToPlaylist(ctx, &db.AddVideoToPlaylistParams{
		PlaylistID: playlistID,
		VideoID:    req.VideoID,
		Position:   int32(videoCount),
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

	playlistIDStr := chi.URLParam(r, "id")
	playlistID, err := strconv.ParseInt(playlistIDStr, 10, 64)
	if err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "Invalid playlist ID")
		return
	}

	videoIDStr := chi.URLParam(r, "videoId")
	videoID, err := strconv.ParseInt(videoIDStr, 10, 64)
	if err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "Invalid video ID")
		return
	}

	// Verify playlist ownership
	playlist, err := h.dbService.Queries.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		logging.Info("Error getting playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Playlist not found")
		return
	}

	if playlist.UserID != userID {
		httpx.RespondError(w, http.StatusForbidden, "You don't have permission to modify this playlist")
		return
	}

	err = h.dbService.Queries.RemoveVideoFromPlaylist(ctx, &db.RemoveVideoFromPlaylistParams{
		PlaylistID: playlistID,
		VideoID:    videoID,
	})
	if err != nil {
		logging.Info("Error removing video from playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to remove video from playlist")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "Video removed from playlist successfully"})
}

