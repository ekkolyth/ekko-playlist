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

type PlaylistsHandler struct {
	dbService *db.Service
}

func NewPlaylistsHandler(dbService *db.Service) *PlaylistsHandler {
	return &PlaylistsHandler{
		dbService: dbService,
	}
}

type CreatePlaylistRequest struct {
	Name string `json:"name"`
}

type UpdatePlaylistRequest struct {
	Name string `json:"name"`
}

type PlaylistResponse struct {
	ID        int64  `json:"id"`
	UserID    string `json:"userId"`
	Name      string `json:"name"`
	VideoCount int64  `json:"videoCount"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type PlaylistDetailResponse struct {
	ID        int64           `json:"id"`
	UserID    string          `json:"userId"`
	Name      string          `json:"name"`
	Videos    []VideoResponse `json:"videos"`
	CreatedAt string          `json:"createdAt"`
	UpdatedAt string          `json:"updatedAt"`
}

type ListPlaylistsResponse struct {
	Playlists []PlaylistResponse `json:"playlists"`
}

// Create handles POST /api/playlists
// Creates a new playlist for the authenticated user
func (h *PlaylistsHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req CreatePlaylistRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Name == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Playlist name is required")
		return
	}

	playlist, err := h.dbService.Queries.CreatePlaylist(ctx, &db.CreatePlaylistParams{
		UserID: userID,
		Name:   req.Name,
	})
	if err != nil {
		logging.Info("Error creating playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to create playlist")
		return
	}

	videoCount, _ := h.dbService.Queries.GetPlaylistVideoCount(ctx, playlist.ID)

	createdAt := ""
	if playlist.CreatedAt.Valid {
		createdAt = playlist.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if playlist.UpdatedAt.Valid {
		updatedAt = playlist.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusCreated, PlaylistResponse{
		ID:         playlist.ID,
		UserID:     playlist.UserID,
		Name:       playlist.Name,
		VideoCount: videoCount,
		CreatedAt:  createdAt,
		UpdatedAt:  updatedAt,
	})
}

// List handles GET /api/playlists
// Returns a list of all playlists for the authenticated user
func (h *PlaylistsHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	playlists, err := h.dbService.Queries.ListPlaylistsByUser(ctx, userID)
	if err != nil {
		logging.Info("Error listing playlists: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch playlists")
		return
	}

	response := ListPlaylistsResponse{
		Playlists: make([]PlaylistResponse, 0, len(playlists)),
	}

	for _, playlist := range playlists {
		videoCount, _ := h.dbService.Queries.GetPlaylistVideoCount(ctx, playlist.ID)

		createdAt := ""
		if playlist.CreatedAt.Valid {
			createdAt = playlist.CreatedAt.Time.Format(time.RFC3339)
		}
		updatedAt := ""
		if playlist.UpdatedAt.Valid {
			updatedAt = playlist.UpdatedAt.Time.Format(time.RFC3339)
		}

		response.Playlists = append(response.Playlists, PlaylistResponse{
			ID:         playlist.ID,
			UserID:     playlist.UserID,
			Name:       playlist.Name,
			VideoCount: videoCount,
			CreatedAt:  createdAt,
			UpdatedAt:  updatedAt,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// Get handles GET /api/playlists/:id
// Returns a playlist with its videos
func (h *PlaylistsHandler) Get(w http.ResponseWriter, r *http.Request) {
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

	playlist, err := h.dbService.Queries.GetPlaylistByID(ctx, playlistID)
	if err != nil {
		logging.Info("Error getting playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Playlist not found")
		return
	}

	// Verify ownership
	if playlist.UserID != userID {
		httpx.RespondError(w, http.StatusForbidden, "You don't have permission to access this playlist")
		return
	}

	// Get videos
	videoRows, err := h.dbService.Queries.GetPlaylistVideos(ctx, playlistID)
	if err != nil {
		logging.Info("Error getting playlist videos: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch playlist videos")
		return
	}

	videos := make([]VideoResponse, 0, len(videoRows))
	for _, videoRow := range videoRows {
		createdAt := ""
		if videoRow.CreatedAt.Valid {
			createdAt = videoRow.CreatedAt.Time.Format(time.RFC3339)
		}

		videos = append(videos, VideoResponse{
			ID:            videoRow.ID,
			VideoID:       videoRow.VideoID,
			NormalizedURL: videoRow.NormalizedUrl,
			OriginalURL:   videoRow.OriginalUrl,
			Title:         videoRow.Title,
			Channel:       videoRow.Channel,
			UserID:        videoRow.UserID,
			CreatedAt:     createdAt,
		})
	}

	createdAt := ""
	if playlist.CreatedAt.Valid {
		createdAt = playlist.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if playlist.UpdatedAt.Valid {
		updatedAt = playlist.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusOK, PlaylistDetailResponse{
		ID:        playlist.ID,
		UserID:    playlist.UserID,
		Name:      playlist.Name,
		Videos:    videos,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	})
}

// Update handles PUT /api/playlists/:id
// Updates a playlist's name
func (h *PlaylistsHandler) Update(w http.ResponseWriter, r *http.Request) {
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

	var req UpdatePlaylistRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Name == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Playlist name is required")
		return
	}

	playlist, err := h.dbService.Queries.UpdatePlaylist(ctx, &db.UpdatePlaylistParams{
		ID:     playlistID,
		Name:   req.Name,
		UserID: userID,
	})
	if err != nil {
		logging.Info("Error updating playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Playlist not found or you don't have permission")
		return
	}

	videoCount, _ := h.dbService.Queries.GetPlaylistVideoCount(ctx, playlist.ID)

	createdAt := ""
	if playlist.CreatedAt.Valid {
		createdAt = playlist.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if playlist.UpdatedAt.Valid {
		updatedAt = playlist.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusOK, PlaylistResponse{
		ID:         playlist.ID,
		UserID:     playlist.UserID,
		Name:       playlist.Name,
		VideoCount: videoCount,
		CreatedAt:  createdAt,
		UpdatedAt:  updatedAt,
	})
}

// Delete handles DELETE /api/playlists/:id
// Deletes a playlist (cascade deletes playlist_videos)
func (h *PlaylistsHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	err = h.dbService.Queries.DeletePlaylist(ctx, &db.DeletePlaylistParams{
		ID:     playlistID,
		UserID: userID,
	})
	if err != nil {
		logging.Info("Error deleting playlist: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Playlist not found or you don't have permission")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "Playlist deleted successfully"})
}

