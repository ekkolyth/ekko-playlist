package config

import (
	"context"
	"os"
	"strconv"

	"github.com/ekkolyth/ekko-playlist/api/internal/db"
	"log"
)

const (
	SourceEnv = "env"
	SourceDB  = "db"
)

// SmtpConfig contains SMTP configuration with source metadata
type SmtpConfig struct {
	Host      string
	Port      int
	Username  string
	Password  string
	FromEmail string
	FromName  string
	// Source metadata - indicates where each field came from
	Source        map[string]string // "env" or "db" for each field
	EnvConfigured bool              // true if any ENV vars are present
}

// GetSmtpConfig retrieves SMTP configuration with ENV priority over database
// Returns config map suitable for email.NewServiceFromConfig and source metadata
func GetSmtpConfig(ctx context.Context, dbService *db.Service) (*SmtpConfig, error) {
	config := &SmtpConfig{
		Source: make(map[string]string),
	}

	// Check for ENV variables first
	envHost := os.Getenv("SMTP_HOST")
	envPort := os.Getenv("SMTP_PORT")
	envUsername := os.Getenv("SMTP_USERNAME")
	envPassword := os.Getenv("SMTP_PASSWORD")
	envFromEmail := os.Getenv("SMTP_FROM_EMAIL")
	envFromName := os.Getenv("SMTP_FROM_NAME")

	// Track if any ENV vars are present
	hasEnvConfig := envHost != "" || envPort != "" || envUsername != "" || envPassword != "" || envFromEmail != "" || envFromName != ""
	config.EnvConfigured = hasEnvConfig

	// Load from database if needed
	var dbConfig map[string]string
	if !hasEnvConfig {
		// Only load from DB if no ENV vars present
		configService := db.NewConfigService(dbService.Queries)
		configKeys := []string{"smtp_host", "smtp_port", "smtp_username", "smtp_password", "smtp_from_email", "smtp_from_name"}
		dbConfig = make(map[string]string)

		for _, key := range configKeys {
			cfg, err := configService.GetConfig(ctx, key)
			if err != nil {
				log.Printf("Error reading config key %s: %v", key, err)
				continue
			}
			if cfg != nil {
				dbConfig[key] = cfg.Value
			}
		}
	}

	// Set values with priority: ENV > DB
	if envHost != "" {
		config.Host = envHost
		config.Source["host"] = SourceEnv
	} else if dbHost, ok := dbConfig["smtp_host"]; ok && dbHost != "" {
		config.Host = dbHost
		config.Source["host"] = SourceDB
	}

	if envPort != "" {
		if port, err := strconv.Atoi(envPort); err == nil {
			config.Port = port
			config.Source["port"] = SourceEnv
		}
	} else if dbPort, ok := dbConfig["smtp_port"]; ok && dbPort != "" {
		if port, err := strconv.Atoi(dbPort); err == nil {
			config.Port = port
			config.Source["port"] = SourceDB
		}
	}

	if envUsername != "" {
		config.Username = envUsername
		config.Source["username"] = SourceEnv
	} else if dbUsername, ok := dbConfig["smtp_username"]; ok && dbUsername != "" {
		config.Username = dbUsername
		config.Source["username"] = SourceDB
	}

	if envPassword != "" {
		config.Password = envPassword
		config.Source["password"] = SourceEnv
	} else if dbPassword, ok := dbConfig["smtp_password"]; ok && dbPassword != "" {
		config.Password = dbPassword
		config.Source["password"] = SourceDB
	}

	if envFromEmail != "" {
		config.FromEmail = envFromEmail
		config.Source["from_email"] = SourceEnv
	} else if dbFromEmail, ok := dbConfig["smtp_from_email"]; ok && dbFromEmail != "" {
		config.FromEmail = dbFromEmail
		config.Source["from_email"] = SourceDB
	}

	if envFromName != "" {
		config.FromName = envFromName
		config.Source["from_name"] = SourceEnv
	} else if dbFromName, ok := dbConfig["smtp_from_name"]; ok && dbFromName != "" {
		config.FromName = dbFromName
		config.Source["from_name"] = SourceDB
	} else {
		// Default value
		config.FromName = "Ekko Playlist"
		if hasEnvConfig {
			config.Source["from_name"] = SourceEnv
		} else {
			config.Source["from_name"] = SourceDB
		}
	}

	return config, nil
}

// GetSmtpConfigMap returns a config map suitable for email.NewServiceFromConfig
// This is a convenience function that extracts just the values
func GetSmtpConfigMap(ctx context.Context, dbService *db.Service) (map[string]string, error) {
	cfg, err := GetSmtpConfig(ctx, dbService)
	if err != nil {
		return nil, err
	}

	configMap := make(map[string]string)
	if cfg.Host != "" {
		configMap["smtp_host"] = cfg.Host
	}
	if cfg.Port > 0 {
		configMap["smtp_port"] = strconv.Itoa(cfg.Port)
	}
	if cfg.Username != "" {
		configMap["smtp_username"] = cfg.Username
	}
	if cfg.Password != "" {
		configMap["smtp_password"] = cfg.Password
	}
	if cfg.FromEmail != "" {
		configMap["smtp_from_email"] = cfg.FromEmail
	}
	if cfg.FromName != "" {
		configMap["smtp_from_name"] = cfg.FromName
	}

	return configMap, nil
}

// HasEnvSmtpConfig checks if any SMTP environment variables are set
func HasEnvSmtpConfig() bool {
	return os.Getenv("SMTP_HOST") != "" ||
		os.Getenv("SMTP_PORT") != "" ||
		os.Getenv("SMTP_USERNAME") != "" ||
		os.Getenv("SMTP_PASSWORD") != "" ||
		os.Getenv("SMTP_FROM_EMAIL") != "" ||
		os.Getenv("SMTP_FROM_NAME") != ""
}