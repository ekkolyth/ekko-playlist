package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type UserPreferencesHandler struct {
	dbService *db.Service
}

func NewUserPreferencesHandler(dbService *db.Service) *UserPreferencesHandler {
	return &UserPreferencesHandler{
		dbService: dbService,
	}
}

type UpdateUserPreferencesRequest struct {
	PrimaryColor string `json:"primaryColor"`
}

type UserPreferencesResponse struct {
	UserID       string `json:"userId"`
	PrimaryColor string `json:"primaryColor"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

// Get handles GET /api/preferences
// Returns user preferences
func (h *UserPreferencesHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	prefs, err := h.dbService.Queries.GetUserPreferences(ctx, userID)
	if err != nil {
		// If preferences don't exist, create default ones
		prefs, err = h.dbService.Queries.UpsertUserPreferences(ctx, &db.UpsertUserPreferencesParams{
			UserID:       userID,
			PrimaryColor: "blue",
		})
		if err != nil {
			logging.Info("Error creating default preferences: %s", err.Error())
			httpx.RespondError(w, http.StatusInternalServerError, "Failed to fetch preferences")
			return
		}
	}

	createdAt := ""
	if prefs.CreatedAt.Valid {
		createdAt = prefs.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if prefs.UpdatedAt.Valid {
		updatedAt = prefs.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusOK, UserPreferencesResponse{
		UserID:       prefs.UserID,
		PrimaryColor: prefs.PrimaryColor,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	})
}

// Update handles PATCH /api/preferences
// Updates user preferences
func (h *UserPreferencesHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	var req UpdateUserPreferencesRequest
	if err := httpx.DecodeJSON(w, r, &req, 1024); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.PrimaryColor == "" {
		httpx.RespondError(w, http.StatusBadRequest, "primaryColor is required")
		return
	}

	prefs, err := h.dbService.Queries.UpsertUserPreferences(ctx, &db.UpsertUserPreferencesParams{
		UserID:       userID,
		PrimaryColor: req.PrimaryColor,
	})
	if err != nil {
		logging.Info("Error updating preferences: %s", err.Error())
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to update preferences")
		return
	}

	createdAt := ""
	if prefs.CreatedAt.Valid {
		createdAt = prefs.CreatedAt.Time.Format(time.RFC3339)
	}
	updatedAt := ""
	if prefs.UpdatedAt.Valid {
		updatedAt = prefs.UpdatedAt.Time.Format(time.RFC3339)
	}

	httpx.RespondJSON(w, http.StatusOK, UserPreferencesResponse{
		UserID:       prefs.UserID,
		PrimaryColor: prefs.PrimaryColor,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	})
}