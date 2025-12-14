.PHONY: build build/api build/ext build/web dev install

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

# Install dependencies for all TypeScript projects
install:
	@echo "Installing dependencies for extension..."
	cd apps/extension && bun install
	@echo "✅ Extension dependencies installed"
	@echo "Installing dependencies for web app..."
	cd apps/web && bun install
	@echo "✅ Web app dependencies installed"

# Run development servers (builds extension first, then runs API and web app)
dev: build/ext
	@echo "Starting development servers..."
	@echo "Starting Go API and web app..."
	@trap 'kill 0' EXIT; \
	(cd apps/api && go run ./cmd/api) & \
	(cd apps/web && bun run dev) & \
	wait
