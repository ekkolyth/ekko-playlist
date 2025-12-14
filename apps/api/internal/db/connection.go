package db

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/ekkolyth/ekko-playlist/api/internal/logging"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB represents the database connection pool
type DB struct {
	*pgxpool.Pool
	*Queries
}

// Service wraps DB and provides additional services
type Service struct {
	DB      *DB
	Queries *Queries
	Config  *ConfigService
}

// NewDB creates a new database connection pool and returns a DB instance
func NewDB(ctx context.Context, databaseURL string) (*DB, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test the connection
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Log connection diagnostics
	var dbName, schemaName string
	if err := pool.QueryRow(ctx, "SELECT current_database(), current_schema()").Scan(&dbName, &schemaName); err == nil {
		logging.Info("Connected to database: %s, schema: %s", dbName, schemaName)
		
		// Check if videos table exists
		var tableExists bool
		checkQuery := `SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_schema = $1 
			AND table_name = 'videos'
		)`
		if err := pool.QueryRow(ctx, checkQuery, schemaName).Scan(&tableExists); err == nil {
			if !tableExists {
				logging.Info("⚠️  WARNING: 'videos' table does not exist in schema '%s'", schemaName)
			} else {
				logging.Info("✅ 'videos' table exists in schema '%s'", schemaName)
			}
		}
	}

	queries := New(pool)

	return &DB{
		Pool:    pool,
		Queries: queries,
	}, nil
}

// NewDBFromEnv creates a new database connection using DB_URL from environment
func NewDBFromEnv(ctx context.Context) (*DB, error) {
	databaseURL := os.Getenv("DB_URL")
	if databaseURL == "" {
		logging.Info("❌ DB_URL environment variable is not set")
		wd, err := os.Getwd()
		if err != nil {
			logging.Info("Current working directory: unknown")
		} else {
			logging.Info("Current working directory: %s", wd)
		}
		return nil, fmt.Errorf("DB_URL must be set")
	}

	// Log the connection URL (masked) for debugging
	maskedURL := maskDBURL(databaseURL)
	logging.Info("Connecting to database: %s", maskedURL)

	return NewDB(ctx, databaseURL)
}

// maskDBURL masks the password in a database URL for safe logging
func maskDBURL(url string) string {
	// Format: postgres://user:password@host:port/database
	// We want to show: postgres://user:***@host:port/database
	if idx := strings.Index(url, "@"); idx > 0 {
		beforeAt := url[:idx]
		afterAt := url[idx+1:]
		// Find the last : before @ (which separates user:password)
		if colonIdx := strings.LastIndex(beforeAt, ":"); colonIdx > 0 {
			// Check if there's a :// before this (protocol separator)
			if protocolIdx := strings.Index(beforeAt, "://"); protocolIdx >= 0 && colonIdx > protocolIdx+3 {
				// This is user:password
				user := beforeAt[:colonIdx]
				return user + ":***@" + afterAt
			}
		}
	}
	return "***"
}

// NewService creates a new Service instance with database connection
func NewService(ctx context.Context) (*Service, error) {
	db, err := NewDBFromEnv(ctx)
	if err != nil {
		return nil, err
	}

	return &Service{
		DB:      db,
		Queries: db.Queries,
		Config:  NewConfigService(db.Queries),
	}, nil
}

// Close closes the database connection pool
func (db *DB) Close() {
	db.Pool.Close()
}

// WithTx executes a function within a database transaction
func (db *DB) WithTx(ctx context.Context, fn func(*Queries) error) error {
	logging.Info("DB: Beginning transaction")
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		logging.Info("DB: Failed to begin transaction: %s", err.Error())
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	logging.Info("DB: Transaction begun successfully")
	
	committed := false
	defer func() {
		if !committed {
			if err := tx.Rollback(ctx); err != nil {
				logging.Info("DB: Error during transaction rollback: %s", err.Error())
			} else {
				logging.Info("DB: Transaction rolled back")
			}
		}
	}()

	queries := New(tx)
	if err := fn(queries); err != nil {
		logging.Info("DB: Transaction function returned error: %s", err.Error())
		return err
	}

	logging.Info("DB: Committing transaction")
	if err := tx.Commit(ctx); err != nil {
		logging.Info("DB: Failed to commit transaction: %s", err.Error())
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	committed = true
	logging.Info("DB: Transaction committed successfully")
	
	return nil
}

