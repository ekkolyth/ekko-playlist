-- name: UpsertUserPreferences :one
insert into user_preferences (user_id, primary_color)
values ($1, $2)
on conflict (user_id) do update
set primary_color = $2, updated_at = now()
returning user_id, primary_color, created_at, updated_at;

-- name: GetUserPreferences :one
select user_id, primary_color, created_at, updated_at
from user_preferences
where user_id = $1;