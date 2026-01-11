package handlers

import (
	"net/http"

	"github.com/ekkolyth/ekko-playlist/api/internal/api/httpx"
	"github.com/ekkolyth/ekko-playlist/api/internal/config"
	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"github.com/ekkolyth/ekko-playlist/api/internal/email"
	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type EmailHandler struct {
	dbService *db.Service
}

func NewEmailHandler(dbService *db.Service) *EmailHandler {
	return &EmailHandler{
		dbService: dbService,
	}
}

type SendOTPEmailRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
	Type  string `json:"type,omitempty"` // "sign-in", "email-verification", or "forget-password"
}

// SendOTPEmail handles POST /api/email/send-otp
// Called from Better Auth's emailOTP plugin callback to send OTP emails
func (h *EmailHandler) SendOTPEmail(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var req SendOTPEmailRequest
	if err := httpx.DecodeJSON(w, r, &req, 1<<20); err != nil {
		httpx.RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate email format
	if req.Email == "" {
		httpx.RespondError(w, http.StatusBadRequest, "email is required")
		return
	}

	if req.OTP == "" {
		httpx.RespondError(w, http.StatusBadRequest, "otp is required")
		return
	}

	// Get SMTP config using shared utility (ENV → DB fallback)
	configMap, err := config.GetSmtpConfigMap(ctx, h.dbService)
	if err != nil {
		logging.Info("Error getting SMTP config: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to load SMTP configuration")
		return
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

	// Send OTP email
	if err := emailService.SendOTPEmail(req.Email, req.OTP); err != nil {
		logging.Info("Error sending OTP email: %v", err)
		httpx.RespondError(w, http.StatusInternalServerError, "failed to send OTP email")
		return
	}

	logging.Info("OTP email sent successfully to %s (type: %s)", req.Email, req.Type)
	httpx.RespondJSON(w, http.StatusOK, map[string]string{
		"message": "OTP email sent successfully",
	})
}
