# Ekko Playlist API

A Go API server built with chi router, PostgreSQL, and sqlc.

## Structure

- `cmd/api/` - Main application entry point
- `internal/api/` - HTTP handlers and server setup
- `internal/db/` - Database connection, migrations, queries, and services
- `internal/config/` - Configuration constants
- `internal/logging/` - Logging utilities

## Setup

1. Install dependencies:
   ```bash
   go mod tidy
   ```

2. Set up environment variables (create `.env.local`):
   ```
   DB_URL=postgres://user:password@localhost:5432/ekko_playlist?sslmode=disable
   API_PORT=1337
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

3. Run database migrations:
   ```bash
   # Using goose (install: go install github.com/pressly/goose/v3/cmd/goose@latest)
   goose -dir internal/db/migrations postgres "your-db-url" up
   ```

4. Generate sqlc code (if you modify queries):
   ```bash
   # Install sqlc: go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
   sqlc generate
   ```

5. Run the server:
   ```bash
   go run cmd/api/main.go
   ```

## Endpoints

- `GET /api/healthz` - Health check endpoint

## Database

The API uses PostgreSQL with sqlc for type-safe SQL queries. Migrations are in `internal/db/migrations/` and queries are in `internal/db/queries/`.

### Config Schema

The `config` table stores key-value configuration pairs:
- `key` (text, primary key)
- `value` (text, not null)
- `updated_at` (timestamptz, default now())



