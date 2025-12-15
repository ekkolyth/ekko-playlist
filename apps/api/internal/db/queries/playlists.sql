-- name: CreatePlaylist :one
insert into playlists (user_id, name)
values ($1, $2)
returning id, user_id, name, created_at, updated_at;

-- name: GetPlaylistByID :one
select id, user_id, name, created_at, updated_at
from playlists
where id = $1;

-- name: ListPlaylistsByUser :many
select id, user_id, name, created_at, updated_at
from playlists
where user_id = $1
order by created_at desc;

-- name: UpdatePlaylist :one
update playlists
set name = $2, updated_at = now()
where id = $1 and user_id = $3
returning id, user_id, name, created_at, updated_at;

-- name: DeletePlaylist :exec
delete from playlists
where id = $1 and user_id = $2;

-- name: GetPlaylistVideoCount :one
select count(*) as count
from playlist_videos
where playlist_id = $1;

-- name: AddVideoToPlaylist :one
insert into playlist_videos (playlist_id, video_id, position)
values ($1, $2, $3)
on conflict (playlist_id, video_id) do nothing
returning playlist_id, video_id, position, created_at;

-- name: RemoveVideoFromPlaylist :exec
delete from playlist_videos
where playlist_id = $1 and video_id = $2;

-- name: GetPlaylistVideos :many
select v.id, v.video_id, v.normalized_url, v.original_url, v.title, v.channel, v.user_id, v.created_at, pv.position, pv.created_at as added_at
from playlist_videos pv
join videos v on pv.video_id = v.id
where pv.playlist_id = $1
order by pv.position, pv.created_at;

