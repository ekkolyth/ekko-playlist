package upload

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

const (
	// DefaultUploadDir is the default directory for uploads
	// Uses a relative path that will be created in the current working directory
	DefaultUploadDir = "./data/uploads"
	// MaxFileSize is the maximum file size in bytes (5MB)
	MaxFileSize = 5 * 1024 * 1024
)

// GetUploadDir returns the upload directory from environment variable or default
func GetUploadDir() string {
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = DefaultUploadDir
	}
	return uploadDir
}

// EnsureUploadDir ensures the upload directory exists, creating it if necessary
func EnsureUploadDir() error {
	uploadDir := GetUploadDir()
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return fmt.Errorf("failed to create upload directory: %w", err)
	}
	return nil
}

// ValidateImageFile validates that the file is an image and within size limits
func ValidateImageFile(fileHeader *multipart.FileHeader) error {
	// Check file size
	if fileHeader.Size > MaxFileSize {
		return fmt.Errorf("file size exceeds maximum allowed size of %d bytes", MaxFileSize)
	}

	// Open file to read content
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes to detect MIME type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Detect MIME type
	mimeType := http.DetectContentType(buffer[:n])
	if !strings.HasPrefix(mimeType, "image/") {
		return fmt.Errorf("file is not an image (detected MIME type: %s)", mimeType)
	}

	// Also check the Content-Type header if available
	if fileHeader.Header.Get("Content-Type") != "" {
		headerMimeType := fileHeader.Header.Get("Content-Type")
		if !strings.HasPrefix(headerMimeType, "image/") {
			return fmt.Errorf("file is not an image (Content-Type: %s)", headerMimeType)
		}
	}

	return nil
}

// GenerateFilename generates a unique filename for the uploaded file
// Format: user-{userID}-{hash}.{ext}
func GenerateFilename(userID, originalFilename string, fileContent []byte) string {
	// Calculate SHA256 hash of file content
	hash := sha256.Sum256(fileContent)
	hashStr := hex.EncodeToString(hash[:])[:8] // First 8 characters

	// Get file extension from original filename
	ext := filepath.Ext(originalFilename)
	if ext == "" {
		// Try to determine extension from MIME type
		// Default to .jpg if we can't determine
		ext = ".jpg"
	}

	// Remove leading dot from extension
	if strings.HasPrefix(ext, ".") {
		ext = ext[1:]
	}

	return fmt.Sprintf("user-%s-%s.%s", userID, hashStr, ext)
}

// SaveFile saves the uploaded file to the filesystem
func SaveFile(userID, filename string, fileContent []byte) (string, error) {
	// Ensure upload directory exists
	if err := EnsureUploadDir(); err != nil {
		return "", err
	}

	uploadDir := GetUploadDir()
	filePath := filepath.Join(uploadDir, filename)

	// Write file to disk
	if err := os.WriteFile(filePath, fileContent, 0644); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	logging.Info("File saved successfully: %s", filePath)
	return filePath, nil
}

// DeleteFile deletes a file from the filesystem
func DeleteFile(filePath string) error {
	if filePath == "" {
		return nil // Nothing to delete
	}

	// Only delete files in the upload directory for security
	uploadDir := GetUploadDir()
	absPath, err := filepath.Abs(filePath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	absUploadDir, err := filepath.Abs(uploadDir)
	if err != nil {
		return fmt.Errorf("failed to get absolute upload directory: %w", err)
	}

	if !strings.HasPrefix(absPath, absUploadDir) {
		return fmt.Errorf("file path is outside upload directory")
	}

	if err := os.Remove(filePath); err != nil {
		if !os.IsNotExist(err) {
			return fmt.Errorf("failed to delete file: %w", err)
		}
		// File doesn't exist, that's okay
		logging.Info("File does not exist, skipping deletion: %s", filePath)
	}

	logging.Info("File deleted successfully: %s", filePath)
	return nil
}

// ExtractFilenameFromPath extracts the filename from a full path or URL
func ExtractFilenameFromPath(path string) string {
	if path == "" {
		return ""
	}

	// If it's a URL, extract the filename
	if strings.Contains(path, "/") {
		parts := strings.Split(path, "/")
		return parts[len(parts)-1]
	}

	return path
}

// GetContentType returns the content type for a file based on its extension
func GetContentType(filename string) string {
	ext := filepath.Ext(filename)
	mimeType := mime.TypeByExtension(ext)
	if mimeType == "" {
		return "application/octet-stream"
	}
	return mimeType
}
