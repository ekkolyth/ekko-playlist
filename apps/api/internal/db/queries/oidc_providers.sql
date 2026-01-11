-- name: ListEnabledOIDCProviders :many
SELECT id, provider_id, name, discovery_url, client_id, client_secret, scopes, enabled, created_at, updated_at
FROM oidc_providers
WHERE enabled = true
ORDER BY name;

-- name: ListAllOIDCProviders :many
SELECT id, provider_id, name, discovery_url, client_id, client_secret, scopes, enabled, created_at, updated_at
FROM oidc_providers
ORDER BY name;

-- name: GetOIDCProvider :one
SELECT id, provider_id, name, discovery_url, client_id, client_secret, scopes, enabled, created_at, updated_at
FROM oidc_providers
WHERE id = $1;

-- name: GetOIDCProviderByProviderID :one
SELECT id, provider_id, name, discovery_url, client_id, client_secret, scopes, enabled, created_at, updated_at
FROM oidc_providers
WHERE provider_id = $1;

-- name: CreateOIDCProvider :one
INSERT INTO oidc_providers (provider_id, name, discovery_url, client_id, client_secret, scopes, enabled)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, provider_id, name, discovery_url, client_id, client_secret, scopes, enabled, created_at, updated_at;

-- name: UpdateOIDCProvider :one
UPDATE oidc_providers
SET name = $2,
    discovery_url = $3,
    client_id = $4,
    client_secret = $5,
    scopes = $6,
    enabled = $7,
    updated_at = now()
WHERE id = $1
RETURNING id, provider_id, name, discovery_url, client_id, client_secret, scopes, enabled, created_at, updated_at;

-- name: DeleteOIDCProvider :exec
DELETE FROM oidc_providers
WHERE id = $1;
