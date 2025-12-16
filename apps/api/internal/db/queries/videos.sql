-- name: CreateVideo :one
INSERT INTO videos (video_id, normalized_url, original_url, title, channel, user_id)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (normalized_url) DO NOTHING
RETURNING id, video_id, normalized_url, original_url, title, channel, user_id, created_at;

-- name: GetVideoByURL :one
SELECT id, video_id, normalized_url, original_url, title, channel, user_id, created_at
FROM videos
WHERE normalized_url = $1;

-- name: GetVideoByID :one
SELECT id, video_id, normalized_url, original_url, title, channel, user_id, created_at
FROM videos
WHERE id = $1;

-- name: ListVideos :many
SELECT id, video_id, normalized_url, original_url, title, channel, user_id, created_at
FROM videos
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: ListVideosFiltered :many
SELECT id, video_id, normalized_url, original_url, title, channel, user_id, created_at
FROM videos
WHERE user_id = $1
  AND channel = ANY($2::text[])
ORDER BY created_at DESC;

-- name: DeleteVideo :exec
DELETE FROM videos
WHERE id = $1 AND user_id = $2;

-- name: DeleteVideos :exec
DELETE FROM videos
WHERE id = ANY($1::bigint[]) AND user_id = $2;

