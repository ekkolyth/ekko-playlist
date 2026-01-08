package email

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"

	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
)

type Service struct {
	dialer    *gomail.Dialer
	fromEmail string
	fromName  string
}

// NewService creates a new email service with SMTP configuration from environment variables
func NewService() (*Service, error) {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		return nil, fmt.Errorf("SMTP_HOST environment variable is required")
	}

	portStr := os.Getenv("SMTP_PORT")
	if portStr == "" {
		portStr = "587" // Default to TLS port
	}
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP_PORT: %w", err)
	}

	username := os.Getenv("SMTP_USERNAME")
	if username == "" {
		return nil, fmt.Errorf("SMTP_USERNAME environment variable is required")
	}

	password := os.Getenv("SMTP_PASSWORD")
	if password == "" {
		return nil, fmt.Errorf("SMTP_PASSWORD environment variable is required")
	}

	fromEmail := os.Getenv("SMTP_FROM_EMAIL")
	if fromEmail == "" {
		return nil, fmt.Errorf("SMTP_FROM_EMAIL environment variable is required")
	}

	fromName := os.Getenv("SMTP_FROM_NAME")
	if fromName == "" {
		fromName = "Ekko Playlist" // Default name
	}

	dialer := gomail.NewDialer(host, port, username, password)

	return &Service{
		dialer:    dialer,
		fromEmail: fromEmail,
		fromName:  fromName,
	}, nil
}

// SendVerificationEmail sends an email verification email to the specified address
func (s *Service) SendVerificationEmail(email, token, verificationURL string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", m.FormatAddress(s.fromEmail, s.fromName))
	m.SetHeader("To", email)
	m.SetHeader("Subject", "Verify your email address")

	// HTML email body with verification link
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #ffffff; border-radius: 8px; padding: 40px 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
		<h1 style="color: #000000; margin-top: 0;">Verify your email address</h1>
		<p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
		<div style="text-align: center; margin: 30px 0;">
			<a href="%s" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email</a>
		</div>
		<p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
		<p style="color: #666; font-size: 14px; word-break: break-all;">%s</p>
		<p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't request this verification, you can safely ignore this email.</p>
		<p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">This verification link will expire in 24 hours.</p>
	</div>
</body>
</html>
`, verificationURL, verificationURL)

	// Plain text fallback
	textBody := fmt.Sprintf(`
Verify your email address

Thank you for signing up! Please verify your email address by visiting the link below:

%s

If you didn't request this verification, you can safely ignore this email.

This verification link will expire in 24 hours.
`, verificationURL)

	m.SetBody("text/plain", textBody)
	m.AddAlternative("text/html", htmlBody)

	if err := s.dialer.DialAndSend(m); err != nil {
		logging.Error(fmt.Sprintf("Failed to send verification email: %v", err))
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	logging.Info("Verification email sent successfully to %s", email)
	return nil
}

