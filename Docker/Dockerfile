# syntax=docker/dockerfile:1.7

###########################################
# Build Go Binary
###########################################
FROM golang:1.24-bookworm AS go-builder
WORKDIR /src

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential \
      pkg-config && \
    rm -rf /var/lib/apt/lists/*

ENV CGO_ENABLED=0
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build true

COPY apps/api/go.mod apps/api/go.sum ./apps/api/
RUN --mount=type=cache,target=/go/pkg/mod cd apps/api && go mod download

COPY apps/api/cmd/ ./apps/api/cmd/
COPY apps/api/internal/ ./apps/api/internal/
RUN --mount=type=cache,target=/root/.cache/go-build \
    cd apps/api && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s' \
    -o /out/api-server \
    ./cmd/api

###########################################
# Build Web UI
###########################################
FROM oven/bun:1 AS web-builder
WORKDIR /web

# Build args only for variables that need to be baked into client-side code
ARG VITE_API_URL

COPY apps/web/package.json apps/web/bun.lock ./
RUN bun install --frozen-lockfile

COPY apps/web/ ./
ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
RUN bun run build

###########################################
# Runtime (minimal, no build deps)
###########################################
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ca-certificates \
      curl && \
    rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash appuser

COPY --from=go-builder /out/api-server /app/bin/api-server

COPY --from=web-builder /web/.output /app/web/.output

ENV API_PORT=1337
ENV WEB_PORT=3000
ENV NODE_ENV=production

RUN <<'SH'
set -eu
cat <<'EOF' > /app/start.sh
#!/usr/bin/env bash
set -euo pipefail

: "${DB_URL:?DB_URL is required}"

API_PORT="${API_PORT:-1337}"
WEB_PORT="${WEB_PORT:-3000}"
API_URL="${API_URL:-http://localhost:${API_PORT}}"

shutdown() {
  kill $(jobs -p) 2>/dev/null || true
  wait || true
  exit 0
}
trap shutdown SIGTERM SIGINT

/app/bin/api-server &

export PORT="${WEB_PORT}"
export NITRO_PORT="${WEB_PORT}"
export NITRO_HOST="0.0.0.0"
export API_URL
export DB_URL
export BETTER_AUTH_SECRET
export BETTER_AUTH_URL
export TRUSTED_ORIGINS
node /app/web/.output/server/index.mjs &

wait
EOF
chmod +x /app/start.sh
SH

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 1337 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:1337/api/healthz || exit 1

CMD ["/app/start.sh"]
