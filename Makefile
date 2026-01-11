.PHONY: build build/api build/ext build/web dev install install/go db/up db/down db/migrate db/status db/reset db/create db/drop db/gen docker/build docker/tag docker/push

# Docker configuration
IMAGE_NAME ?= ekkolyth/ekko-playlist
IMAGE_TAG ?= dev

# Build all applications
build: build/api build/ext build/web

# Build the Go API
build/api:
	@echo "Building Go API..."
	cd apps/api && go build -o bin/api-server ./cmd/api
	@echo "✅ API built successfully"

# Build the Chrome extension
build/ext:
	@echo "Building Chrome extension..."
	cd apps/extension && bun run build
	@echo "✅ Extension built successfully"

# Build the web app
build/web:
	@echo "Building web app..."
	cd apps/web && bun run build
	@echo "✅ Web app built successfully"

# Install dependencies for all projects
install: install/go
	@echo "Installing dependencies for extension..."
	cd apps/extension && bun install
	@echo "✅ Extension dependencies installed"
	@echo "Installing dependencies for web app..."
	cd apps/web && bun install
	@echo "✅ Web app dependencies installed"

# Install Go dependencies and tools
install/go:
	@echo "Installing Go module dependencies..."
	cd apps/api && go mod download
	@echo "✅ Go module dependencies installed"
	@echo "Installing goose (database migration tool)..."
	@go install github.com/pressly/goose/v3/cmd/goose@latest || (echo "⚠️  Failed to install goose. Make sure Go is installed and GOPATH/bin is in your PATH." && exit 1)
	@echo "✅ goose installed"
	@echo "Installing sqlc (SQL code generator)..."
	@go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest || (echo "⚠️  Failed to install sqlc. Make sure Go is installed and GOPATH/bin is in your PATH." && exit 1)
	@echo "✅ sqlc installed"
	@echo "✅ All Go dependencies and tools installed"

# Run development servers (builds extension first, then runs API and web app)
dev: build/ext
	@echo "Starting development servers..."
	@echo "Starting Go API and web app..."
	@trap 'kill 0' EXIT; \
	(cd apps/api && go run ./cmd/api) & \
	(cd apps/web && bun run dev) & \
	wait

# Database configuration
DB_URL ?= $(shell if [ -f apps/api/.env.local ]; then grep "^DB_URL=" apps/api/.env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'"; elif [ -f .env.local ]; then grep "^DB_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'"; fi)
MIGRATIONS_DIR = internal/db/migrations

# Check if goose is installed
check-goose:
	@which goose > /dev/null || (echo "❌ goose is not installed. Run 'make install/go' to install all Go dependencies and tools." && exit 1)

# Check if DB_URL is set
check-db-url:
	@if [ -z "$(DB_URL)" ]; then \
		echo "❌ DB_URL is not set. Set it in .env.local or as an environment variable."; \
		echo "Example: DB_URL=postgres://user:password@localhost:5432/ekko_playlist?sslmode=disable"; \
		exit 1; \
	fi

# Run all pending migrations
db/up: check-goose check-db-url
	@echo "Running database migrations..."
	@cd apps/api && goose -dir $(MIGRATIONS_DIR) postgres "$(DB_URL)" up
	@echo "✅ Migrations applied successfully"

# Rollback the last migration
db/down: check-goose check-db-url
	@echo "Rolling back last migration..."
	@cd apps/api && goose -dir $(MIGRATIONS_DIR) postgres "$(DB_URL)" down
	@echo "✅ Migration rolled back successfully"

# Check migration status
db/status: check-goose check-db-url
	@echo "Checking migration status..."
	@cd apps/api && goose -dir $(MIGRATIONS_DIR) postgres "$(DB_URL)" status

# Create a new migration file
db/migrate:
	@if [ -z "$(NAME)" ]; then \
		echo "❌ Migration name is required. Usage: make db/migrate NAME=migration_name"; \
		exit 1; \
	fi
	@echo "Creating new migration: $(NAME)..."
	@cd apps/api && goose -dir $(MIGRATIONS_DIR) create $(NAME) sql
	@echo "✅ Migration file created in $(MIGRATIONS_DIR)"

# Reset database (drop all tables and re-run migrations)
db/reset: check-goose check-db-url
	@echo "⚠️  WARNING: This will drop all tables and re-run migrations!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "Resetting database..."; \
		echo "Dropping all tables..."; \
		cd apps/api && psql "$(DB_URL)" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;" || true; \
		echo "Resetting goose migration tracking..."; \
		cd apps/api && psql "$(DB_URL)" -c "DROP TABLE IF EXISTS goose_db_version;" || true; \
		echo "Running migrations..."; \
		cd apps/api && goose -dir $(MIGRATIONS_DIR) postgres "$(DB_URL)" up; \
		echo "✅ Database reset successfully"; \
	else \
		echo "Cancelled."; \
	fi

# Create database (extracts database name from DB_URL and creates it)
db/create: check-db-url
	@echo "Extracting database name from DB_URL..."
	@DB_NAME=$$(echo "$(DB_URL)" | sed -n 's/.*\/\([^?]*\).*/\1/p'); \
	DB_URL_WITHOUT_DB=$$(echo "$(DB_URL)" | sed 's/\/[^?]*/\/postgres/'); \
	if [ -z "$$DB_NAME" ]; then \
		echo "❌ Could not extract database name from DB_URL"; \
		exit 1; \
	fi; \
	echo "Creating database: $$DB_NAME..."; \
	cd apps/api && psql "$$DB_URL_WITHOUT_DB" -c "CREATE DATABASE $$DB_NAME;" 2>/dev/null || echo "Database may already exist or connection failed"; \
	echo "✅ Database creation attempted"

# Drop database (extracts database name from DB_URL and drops it)
db/drop: check-db-url
	@echo "⚠️  WARNING: This will drop the entire database!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		DB_NAME=$$(echo "$(DB_URL)" | sed -n 's/.*\/\([^?]*\).*/\1/p'); \
		DB_URL_WITHOUT_DB=$$(echo "$(DB_URL)" | sed 's/\/[^?]*/\/postgres/'); \
		if [ -z "$$DB_NAME" ]; then \
			echo "❌ Could not extract database name from DB_URL"; \
			exit 1; \
		fi; \
		echo "Dropping database: $$DB_NAME..."; \
		cd apps/api && psql "$$DB_URL_WITHOUT_DB" -c "DROP DATABASE IF EXISTS $$DB_NAME;" || echo "Failed to drop database"; \
		echo "✅ Database drop attempted"; \
	else \
		echo "Cancelled."; \
	fi

# Generate Go code from SQL queries using sqlc
db/gen:
	@which sqlc > /dev/null || (echo "❌ sqlc is not installed. Run 'make install/go' to install all Go dependencies and tools." && exit 1)
	@echo "Generating Go code from SQL queries..."
	@cd apps/api/internal/db && sqlc generate
	@echo "✅ Go code generated successfully"

# ==========================================================
# Docker
# ==========================================================

docker/build:
	@$(eval IMAGE_TAG := $(or $(filter-out $@,$(MAKECMDGOALS)),$(IMAGE_TAG)))
	@echo "Building Docker image..."
	docker build --platform linux/amd64 \
		-t $(IMAGE_NAME):$(IMAGE_TAG) \
		-f Docker/Dockerfile .
	@echo "✅ Docker image built: $(IMAGE_NAME):$(IMAGE_TAG)"

docker/tag:
	@test -n "$(NEW_TAG)" || (echo "Usage: make docker/tag NEW_TAG=v0.1.0"; exit 1)
	@echo "Tagging Docker image..."
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(IMAGE_NAME):$(NEW_TAG)
	@echo "✅ Docker image tagged: $(IMAGE_NAME):$(NEW_TAG)"

docker/push:
	@$(eval IMAGE_TAG := $(or $(filter-out $@,$(MAKECMDGOALS)),$(IMAGE_TAG)))
	@echo "Pushing Docker image to registry..."
	docker push $(IMAGE_NAME):$(IMAGE_TAG)
	@echo "✅ Docker image pushed: $(IMAGE_NAME):$(IMAGE_TAG)"

# Catch-all target to prevent "No rule to make target" errors for tag arguments
%:
	@:
