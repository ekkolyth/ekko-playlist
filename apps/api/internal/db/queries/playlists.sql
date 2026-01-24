-- name: CreatePlaylist :one
insert into playlists (user_id, name)
values ($1, $2)
returning id, user_id, name, created_at, updated_at;

-- name: GetPlaylistByName :one
select id, user_id, name, created_at, updated_at
from playlists
where user_id = $1 and name = $2;

-- name: ListPlaylistsByUser :many
select id, user_id, name, created_at, updated_at
from playlists
where user_id = $1
order by created_at desc;

-- name: UpdatePlaylistByName :one
update playlists
set name = $3, updated_at = now()
where user_id = $1 and name = $2
returning id, user_id, name, created_at, updated_at;

-- name: DeletePlaylist :exec
delete from playlists
where user_id = $1 and name = $2;

-- name: GetPlaylistVideoCount :one
select count(*) as count
from playlist_videos pv
join playlists p on pv.playlist_id = p.id
where p.user_id = $1 and p.name = $2;

-- name: GetPlaylistIDByName :one
select id from playlists
where user_id = $1 and name = $2;

-- name: AddVideoToPlaylist :one
insert into playlist_videos (playlist_id, video_id, position)
values ($1, $2, $3)
on conflict (playlist_id, video_id) do nothing
returning playlist_id, video_id, position, created_at;

-- name: AddVideoToPlaylistByName :exec
insert into playlist_videos (playlist_id, video_id, position)
select p.id, $2, $3
from playlists p
where p.user_id = $1 and p.name = $4
on conflict (playlist_id, video_id) do nothing;

-- name: RemoveVideoFromPlaylist :exec
delete from playlist_videos pv
using playlists p
where pv.playlist_id = p.id
  and p.user_id = $1
  and p.name = $2
  and pv.video_id = $3;

-- name: GetPlaylistVideos :many
select v.id, v.video_id, v.normalized_url, v.original_url, v.title, v.channel, v.user_id, v.created_at, pv.position, pv.created_at as added_at
from playlist_videos pv
join videos v on pv.video_id = v.id
join playlists p on pv.playlist_id = p.id
where p.user_id = $1 and p.name = $2
order by pv.position, pv.created_at;

-- name: GetPlaylistVideosWithSearch :many
select v.id, v.video_id, v.normalized_url, v.original_url, v.title, v.channel, v.user_id, v.created_at, pv.position, pv.created_at as added_at
from playlist_videos pv
join videos v on pv.video_id = v.id
join playlists p on pv.playlist_id = p.id
where p.user_id = $1 and p.name = $2
  and (v.title ILIKE $3 OR v.channel ILIKE $3)
order by pv.position, pv.created_at;