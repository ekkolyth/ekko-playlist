package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/email"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type ConfigHandler struct {
	dbService *db.Service
}

func NewConfigHandler(dbService *db.Service) *ConfigHandler {
	return &ConfigHandler{
		dbService: dbService,
	}
}

type SmtpConfigRequest struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password,omitempty"` // Optional - only update if provided
	FromEmail string `json:"from_email"`
	FromName  string `json:"from_name"`
}

type SmtpConfigResponse struct {
	Host      string `json:"host"`
	Port      int    `json:"port"`
	Username  string `json:"username"`
	Password  string `json:"password"` // Will be masked in response
	FromEmail string `json:"from_email"`
	FromName  string `json:"from_name"`
}

type TestEmailRequest struct {
	Email string `json:"email"`
}

// GetSmtpConfig handles GET /api/config/smtp - Retrieve SMTP configuration
func (h *ConfigHandler) GetSmtpConfig(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	configService := db.NewConfigService(h.dbService.Queries)

	// Read all SMTP config keys from database
	configKeys := []string{"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email", "smtp_from_name"}
	configMap := make(map[string]string)

	for _, key := range configKeys {
		config, err := configService.GetConfig(ctx, key)
		if err != nil {
			logging.Info("Error reading config key %s: %v", key, err)
			continue
		}
		if config != nil {
			configMap[key] = config.Value
		}
	}

	// Build response
	response := SmtpConfigResponse{}

	if host, ok := configMap["smtp_host"]; ok {
		response.Host = host
	}
	if portStr, ok := configMap["smtp_port"]; ok {
		if port, err := strconv.Atoi(portStr); err == nil {
			response.Port = port
		}
	}
	if username, ok := configMap["smtp_username"]; ok {
		response.Username = username
	}
	if password, ok := configMap["smtp_password"]; ok {
		// Mask password - show only first 2 characters and mask the rest
		if len(password) > 2 {
			response.Password = password[:2] + strings.Repeat("*", len(password)-2)
		} else {
			response.Password = strings.Repeat("*", len(password))
		}
	}
	if fromEmail, ok := configMap["smtp_from_email"]; ok {
		response.FromEmail = fromEmail
	}
	if fromName, ok := configMap["smtp_from_name"]; ok {
		response.FromName = fromName
	}

	httpx.RespondJSON(w, http.StatusOK, response)
}

// UpdateSmtpConfig handles PUT /api/config/smtp - Update SMTP configuration
func (h *ConfigHandler) UpdateSmtpConfig(w http.ResponseWriter, r *http.Request) {
	var req SmtpConfigRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate required fields
	if strings.TrimSpace(req.Host) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "host is required")
		return
	}
	if req.Port < 1 || req.Port > 65535 {
		httpx.RespondError(w, http.StatusBadRequest, "port must be between 1 and 65535")
		return
	}
	if strings.TrimSpace(req.Username) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "username is required")
		return
	}
	if strings.TrimSpace(req.FromEmail) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "from_email is required")
		return
	}

	// Validate email format
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.FromEmail) {
		httpx.RespondError(w, http.StatusBadRequest, "invalid from_email format")
		return
	}

	ctx := r.Context()
	configService := db.NewConfigService(h.dbService.Queries)

	// Store each config value
	configs := map[string]string{
		"smtp_host":      strings.TrimSpace(req.Host),
		"smtp_port":      strconv.Itoa(req.Port),
		"smtp_username":   strings.TrimSpace(req.Username),
		"smtp_from_email": strings.TrimSpace(req.FromEmail),
	}

	// Only update password if provided (allows keeping existing password)
	if strings.TrimSpace(req.Password) != "" {
		configs["smtp_password"] = req.Password // Store as-is (no trimming for password)
	}

	if strings.TrimSpace(req.FromName) != "" {
		configs["smtp_from_name"] = strings.TrimSpace(req.FromName)
	}

	// Upsert each config value
	for key, value := range configs {
		_, err := configService.UpsertConfig(ctx, key, value)
		if err != nil {
			logging.Info("Error updating config key %s: %v", key, err)
			httpx.RespondError(w, http.StatusInternalServerError, "failed to update configuration")
			return
		}
	}

	logging.Info("SMTP configuration updated successfully")
	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "SMTP configuration updated successfully",
	})
}

// SendTestEmail handles POST /api/config/smtp/test - Send test email
func (h *ConfigHandler) SendTestEmail(w http.ResponseWriter, r *http.Request) {
	var req TestEmailRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate email format
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if strings.TrimSpace(req.Email) == "" {
		httpx.RespondError(w, http.StatusBadRequest, "email is required")
		return
	}
	if !emailRegex.MatchString(req.Email) {
		httpx.RespondError(w, http.StatusBadRequest, "invalid email format")
		return
	}

	ctx := r.Context()
	configService := db.NewConfigService(h.dbService.Queries)

	// Read SMTP config from database
	configKeys := []string{"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email", "smtp_from_name"}
	configMap := make(map[string]string)

	for _, key := range configKeys {
		config, err := configService.GetConfig(ctx, key)
		if err != nil {
			logging.Info("Error reading config key %s: %v", key, err)
			continue
		}
		if config != nil {
			configMap[key] = config.Value
		}
	}

	// Check if required config is present
	requiredKeys := []string{"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email"}
	for _, key := range requiredKeys {
		if _, ok := configMap[key]; !ok || configMap[key] == "" {
			httpx.RespondError(w, http.StatusBadRequest, "SMTP configuration is incomplete. Please configure SMTP settings first.")
			return
		}
	}

	// Create email service from config
	emailService, err := email.NewServiceFromConfig(configMap)
	if err != nil {
		logging.Info("Error creating email service from config: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to initialize email service: "+err.Error())
		return
	}

	// Send test email
	if err := emailService.SendTestEmail(req.Email); err != nil {
		logging.Info("Error sending test email: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to send test email: "+err.Error())
		return
	}

	logging.Info("Test email sent successfully to %s", req.Email)
	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "Test email sent successfully",
	})
}

