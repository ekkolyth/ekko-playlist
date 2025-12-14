package db

import (
	"context"
	"fmt"
	"os"

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
		return nil, fmt.Errorf("DB_URL must be set")
	}

	return NewDB(ctx, databaseURL)
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
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	queries := New(tx)
	if err := fn(queries); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

