-- name: CreateVideo :one
INSERT INTO videos (video_id, normalized_url, original_url, title, channel)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (normalized_url) DO NOTHING
RETURNING id, video_id, normalized_url, original_url, title, channel, created_at;

-- name: GetVideoByURL :one
SELECT id, video_id, normalized_url, original_url, title, channel, created_at
FROM videos
WHERE normalized_url = $1;

-- name: ListVideos :many
SELECT id, video_id, normalized_url, original_url, title, channel, created_at
FROM videos
ORDER BY created_at DESC;

