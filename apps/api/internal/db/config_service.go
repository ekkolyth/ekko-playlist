package db

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
)

var (
	// ErrConfigKeyRequired indicates the config key cannot be empty.
	ErrConfigKeyRequired = errors.New("config key is required")
	// ErrConfigValueRequired indicates the config value cannot be empty.
	ErrConfigValueRequired = errors.New("config value is required")
)

// ConfigService exposes helpers for configuration features.
type ConfigService struct {
	queries *Queries
}

// NewConfigService builds a ConfigService.
func NewConfigService(queries *Queries) *ConfigService {
	return &ConfigService{queries: queries}
}

// GetConfig reads a configuration value by key. Returns nil when not found.
func (s *ConfigService) GetConfig(ctx context.Context, key string) (*Config, error) {
	k := strings.TrimSpace(key)
	if k == "" {
		return nil, ErrConfigKeyRequired
	}

	row, err := s.queries.GetConfig(ctx, k)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &Config{
		Key:       row.Key,
		Value:     row.Value,
		UpdatedAt: row.UpdatedAt,
	}, nil
}

// UpsertConfig creates or updates a configuration entry.
func (s *ConfigService) UpsertConfig(ctx context.Context, key, value string) (*Config, error) {
	k := strings.TrimSpace(key)
	if k == "" {
		return nil, ErrConfigKeyRequired
	}

	v := strings.TrimSpace(value)
	if v == "" {
		return nil, ErrConfigValueRequired
	}

	row, err := s.queries.UpsertConfig(ctx, &UpsertConfigParams{
		Key:   k,
		Value: v,
	})
	if err != nil {
		return nil, err
	}

	return &Config{
		Key:       row.Key,
		Value:     row.Value,
		UpdatedAt: row.UpdatedAt,
	}, nil
}

// ListConfigs returns all configuration entries.
func (s *ConfigService) ListConfigs(ctx context.Context) ([]*Config, error) {
	rows, err := s.queries.ListConfigs(ctx)
	if err != nil {
		return nil, err
	}

	configs := make([]*Config, len(rows))
	for i, row := range rows {
		configs[i] = &Config{
			Key:       row.Key,
			Value:     row.Value,
			UpdatedAt: row.UpdatedAt,
		}
	}

	return configs, nil
}

