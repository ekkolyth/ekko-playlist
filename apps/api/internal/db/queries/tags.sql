-- name: CreateTag :one
insert into tags (user_id, name, color)
values ($1, $2, $3)
returning id, user_id, name, color, created_at, updated_at;

-- name: ListTags :many
select id, user_id, name, color, created_at, updated_at
from tags
where user_id = $1
order by created_at desc;

-- name: GetTagByID :one
select id, user_id, name, color, created_at, updated_at
from tags
where id = $1 and user_id = $2;

-- name: UpdateTag :one
update tags
set name = $3, color = $4, updated_at = now()
where id = $1 and user_id = $2
returning id, user_id, name, color, created_at, updated_at;

-- name: DeleteTag :exec
delete from tags
where id = $1 and user_id = $2;

-- name: AddVideoTags :exec
insert into video_tags (video_id, tag_id)
select v, t
from unnest($1::bigint[]) as v(video_id)
cross join unnest($2::bigint[]) as t(tag_id)
on conflict (video_id, tag_id) do nothing;

-- name: RemoveVideoTags :exec
delete from video_tags
where video_id = $1 and tag_id = ANY($2::bigint[]);

-- name: GetVideoTags :many
select t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at
from video_tags vt
join tags t on vt.tag_id = t.id
where vt.video_id = $1;

-- name: ListVideosWithTags :many
select v.id, v.video_id, v.normalized_url, v.original_url, v.title, v.channel, v.user_id, v.created_at,
       t.id as tag_id, t.name as tag_name, t.color as tag_color
from videos v
left join video_tags vt on v.id = vt.video_id
left join tags t on vt.tag_id = t.id
where v.user_id = $1
order by v.created_at desc;

-- name: FilterVideosByTags :many
select distinct v.id, v.video_id, v.normalized_url, v.original_url, v.title, v.channel, v.user_id, v.created_at
from videos v
join video_tags vt on v.id = vt.video_id
where v.user_id = $1 and vt.tag_id = ANY($2::bigint[])
order by v.created_at desc;

-- name: GetVideoTagsForVideos :many
select vt.video_id, t.id as tag_id, t.name as tag_name, t.color as tag_color
from video_tags vt
join tags t on vt.tag_id = t.id
where vt.video_id = ANY($1::bigint[]);