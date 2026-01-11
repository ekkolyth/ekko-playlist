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

type TagsHandler struct {
	dbService *db.Service
}

func NewTagsHandler(dbService *db.Service) *TagsHandler {
	return &TagsHandler{
		dbService: dbService,
	}
}

type CreateTagRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type UpdateTagRequest struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}

type TagResponse struct {
	ID        int64  `json:"id"`
	UserID    string `json:"userId"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type ListTagsResponse struct {
	Tags []TagResponse `json:"tags"`
}

type AssignTagsRequest struct {
	VideoIDs []int64 `json:"videoIds"`
	TagIDs   []int64 `json:"tagIds"`
}

type UnassignTagsRequest struct {
	VideoID int64   `json:"videoId"`
	TagIDs  []int64 `json:"tagIds"`
}

// Create handles POST /api/tags
// Creates a new tag for the authenticated user
func (h *TagsHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req CreateTagRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.Name == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Tag name is required")
		return
	}

	if req.Color == "" {
		httpx.RespondError(w, http.StatusBadRequest, "Tag color is required")
		return
	}

	tag, err := h.dbService.Queries.CreateTag(ctx, &db.CreateTagParams{
		UserID: userID,
		Name:   req.Name,
		Color:  req.Color,
	})
	if err != nil {
		logging.Info("Error creating tag: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to create tag")
		return
	}

	createdAt := ""
	if tag.CreatedAt.Valid {
		createdAt = tag.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if tag.UpdatedAt.Valid {
		updatedAt = tag.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusCreated, TagResponse{
		ID:        tag.ID,
		UserID:    tag.UserID,
		Name:      tag.Name,
		Color:     tag.Color,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	})
}

// List handles GET /api/tags
// Returns a list of all tags for the authenticated user
func (h *TagsHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	tags, err := h.dbService.Queries.ListTags(ctx, userID)
	if err != nil {
		logging.Info("Error listing tags: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch tags")
		return
	}

	response := ListTagsResponse{
		Tags: make([]TagResponse, 0, len(tags)),
	}

	for _, tag := range tags {
		createdAt := ""
		if tag.CreatedAt.Valid {
			createdAt = tag.CreatedAt.Time.Format(time.RFC3339)
		}
		updatedAt := ""
		if tag.UpdatedAt.Valid {
			updatedAt = tag.UpdatedAt.Time.Format(time.RFC3339)
		}

		response.Tags = append(response.Tags, TagResponse{
			ID:        tag.ID,
			UserID:    tag.UserID,
			Name:      tag.Name,
			Color:     tag.Color,
			CreatedAt: createdAt,
			UpdatedAt: updatedAt,
		})
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// Update handles PATCH /api/tags/:id
// Updates a tag's name and/or color
func (h *TagsHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	tagIDStr := chi.URLParam(r, "id")
	tagID, err := strconv.ParseInt(tagIDStr, 10, 64)
	if err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "Invalid tag ID")
		return
	}

	// Get existing tag to preserve values
	existingTag, err := h.dbService.Queries.GetTagByID(ctx, &db.GetTagByIDParams{
		ID:     tagID,
		UserID: userID,
	})
	if err != nil {
		logging.Info("Error getting tag: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Tag not found")
		return
	}

	var req UpdateTagRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Use existing values if not provided
	name := existingTag.Name
	if req.Name != nil {
		name = *req.Name
	}
	color := existingTag.Color
	if req.Color != nil {
		color = *req.Color
	}

	tag, err := h.dbService.Queries.UpdateTag(ctx, &db.UpdateTagParams{
		ID:     tagID,
		UserID: userID,
		Name:   name,
		Color:  color,
	})
	if err != nil {
		logging.Info("Error updating tag: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to update tag")
		return
	}

	createdAt := ""
	if tag.CreatedAt.Valid {
		createdAt = tag.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if tag.UpdatedAt.Valid {
		updatedAt = tag.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusOK, TagResponse{
		ID:        tag.ID,
		UserID:    tag.UserID,
		Name:      tag.Name,
		Color:     tag.Color,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	})
}

// Delete handles DELETE /api/tags/:id
// Deletes a tag (cascade deletes video_tags)
func (h *TagsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	tagIDStr := chi.URLParam(r, "id")
	tagID, err := strconv.ParseInt(tagIDStr, 10, 64)
	if err != nil {
		httpx.RespondError(w, http.StatusBadRequest, "Invalid tag ID")
		return
	}

	err = h.dbService.Queries.DeleteTag(ctx, &db.DeleteTagParams{
		ID:     tagID,
		UserID: userID,
	})
	if err != nil {
		logging.Info("Error deleting tag: %s", err.Error())
		httpx.RespondError(w, http.StatusNotFound, "Tag not found or you don't have permission")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "Tag deleted successfully"})
}

// AssignTags handles POST /api/tags/assign
// Bulk assigns tags to videos
func (h *TagsHandler) AssignTags(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req AssignTagsRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.VideoIDs) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "videoIds array is required and cannot be empty")
		return
	}

	if len(req.TagIDs) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "tagIds array is required and cannot be empty")
		return
	}

	// Verify all tags belong to user
	for _, tagID := range req.TagIDs {
		tag, err := h.dbService.Queries.GetTagByID(ctx, &db.GetTagByIDParams{
			ID:     tagID,
			UserID: userID,
		})
		if err != nil {
			httpx.RespondError(w, http.StatusNotFound, "Tag not found")
			return
		}
		if tag.UserID != userID {
			httpx.RespondError(w, http.StatusForbidden, "You don't have permission to use this tag")
			return
		}
	}

	// Verify all videos belong to user
	for _, videoID := range req.VideoIDs {
		video, err := h.dbService.Queries.GetVideoByID(ctx, videoID)
		if err != nil {
			httpx.RespondError(w, http.StatusNotFound, "Video not found")
			return
		}
		if video.UserID != userID {
			httpx.RespondError(w, http.StatusForbidden, "You don't have permission to tag this video")
			return
		}
	}

	// Bulk insert
	err := h.dbService.Queries.AddVideoTags(ctx, &db.AddVideoTagsParams{
		Column1: req.VideoIDs,
		Column2: req.TagIDs,
	})
	if err != nil {
		logging.Info("Error assigning tags: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to assign tags")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Tags assigned successfully",
	})
}

// UnassignTags handles DELETE /api/tags/unassign
// Bulk removes tags from videos
func (h *TagsHandler) UnassignTags(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req UnassignTagsRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.TagIDs) == 0 {
		httpx.RespondError(w, http.StatusBadRequest, "tagIds array is required and cannot be empty")
		return
	}

	// Verify video belongs to user
	video, err := h.dbService.Queries.GetVideoByID(ctx, req.VideoID)
	if err != nil {
		httpx.RespondError(w, http.StatusNotFound, "Video not found")
		return
	}
	if video.UserID != userID {
		httpx.RespondError(w, http.StatusForbidden, "You don't have permission to untag this video")
		return
	}

	err = h.dbService.Queries.RemoveVideoTags(ctx, &db.RemoveVideoTagsParams{
		VideoID: req.VideoID,
		Column2: req.TagIDs,
	})
	if err != nil {
		logging.Info("Error unassigning tags: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to unassign tags")
		return
	}

	httpx.RespondJSON(w, http.StatusOK, map[string]string{"message": "Tags unassigned successfully"})
}