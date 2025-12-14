-- name: GetConfig :one
SELECT key, value, updated_at
FROM config
WHERE key = $1;

-- name: UpsertConfig :one
INSERT INTO config (key, value)
VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now()
RETURNING key, value, updated_at;

-- name: ListConfigs :many
SELECT key, value, updated_at
FROM config
ORDER BY key;

