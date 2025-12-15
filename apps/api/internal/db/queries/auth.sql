-- name: CreateUser :one
insert into users (email, password_hash)
values ($1, $2)
returning *;

-- name: GetUserByEmail :one
select * from users
where email = $1
limit 1;

-- name: GetUserByID :one
select * from users
where id = $1
limit 1;

-- name: CreateSession :one
insert into sessions (user_id, token, expires_at)
values ($1, $2, $3)
returning *;

-- name: GetSessionByToken :one
select s.*, u.id as user_id, u.email as user_email
from sessions s
join users u on s.user_id = u.id
where s.token = $1
  and s.expires_at > now()
limit 1;

-- name: DeleteSession :exec
delete from sessions
where token = $1;

-- name: DeleteUserSessions :exec
delete from sessions
where user_id = $1;

-- name: CleanExpiredSessions :exec
delete from sessions
where expires_at < now();

