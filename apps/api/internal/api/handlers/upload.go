package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/auth"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/api/upload"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

// UploadImage handles POST /api/user/profile/image - uploads a profile image
func (h *UploadHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	// Parse multipart form (max 10MB total)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		logging.Info("Error parsing multipart form: %v", err)
		httpx.RespondError(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	// Get file from form
	file, fileHeader, err := r.FormFile("image")
	if err != nil {
		logging.Info("Error getting file from form: %v", err)
		httpx.RespondError(w, http.StatusBadRequest, "No image file provided")
		return
	}
	defer file.Close()

	// Validate file
	if err := upload.ValidateImageFile(fileHeader); err != nil {
		logging.Info("File validation failed: %v", err)
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		logging.Info("Error reading file content: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to read file")
		return
	}

	// Generate filename
	filename := upload.GenerateFilename(userID, fileHeader.Filename, fileContent)

	// Save file
	_, err = upload.SaveFile(userID, filename, fileContent)
	if err != nil {
		logging.Info("Error saving file: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	// Return file path/URL
	// The path will be relative to the upload directory, and we'll serve it via /api/uploads/{filename}
	response := map[string]string{
		"filename": filename,
		"path":     fmt.Sprintf("/api/uploads/%s", filename),
	}

	logging.Info("Image uploaded successfully for user %s: %s", userID, filename)
	httpx.RespondJSON(w, http.StatusOK, response)
}

// ServeFile handles GET /api/uploads/{filename} - serves uploaded files
func (h *UploadHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get user ID from context (set by auth middleware)
	userID, ok := auth.GetUserID(ctx)
	if !ok {
		httpx.RespondError(w, http.StatusUnauthorized, "User ID not found in context")
		return
	}

	// Extract filename from URL parameter
	filename := chi.URLParam(r, "filename")
	if filename == "" {
		logging.Info("ServeFile: No filename provided in URL")
		httpx.RespondError(w, http.StatusBadRequest, "Filename is required")
		return
	}

	logging.Info("ServeFile: Requested filename: %s, User ID: %s", filename, userID)

	// Verify user has permission (user can only access their own files based on filename pattern)
	// Filename format: user-{userID}-{hash}.{ext}
	expectedPrefix := fmt.Sprintf("user-%s-", userID)
	if !strings.HasPrefix(filename, expectedPrefix) {
		logging.Info("ServeFile: Permission denied - filename '%s' does not start with '%s'", filename, expectedPrefix)
		httpx.RespondError(w, http.StatusForbidden, "You do not have permission to access this file")
		return
	}

	// Construct file path
	uploadDir := upload.GetUploadDir()
	filePath := filepath.Join(uploadDir, filename)

	// Read file
	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		if strings.Contains(err.Error(), "no such file") {
			httpx.RespondError(w, http.StatusNotFound, "File not found")
			return
		}
		logging.Info("Error reading file: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "Failed to read file")
		return
	}

	// Set content type and cache headers
	contentType := upload.GetContentType(filename)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(fileContent)))
	w.Header().Set("Cache-Control", "public, max-age=31536000") // Cache for 1 year

	logging.Info("ServeFile: Serving file %s (%d bytes, type: %s)", filename, len(fileContent), contentType)

	// Stream file
	if _, err := w.Write(fileContent); err != nil {
		logging.Info("Error writing file content: %v", err)
		return
	}
}
