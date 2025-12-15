-- name: GetUserByEmail :one
select id, name, email, email_verified, image, created_at, updated_at
from "user"
where email = $1
limit 1;

-- name: GetUserByID :one
select id, name, email, email_verified, image, created_at, updated_at
from "user"
where id = $1
limit 1;

-- name: CreateSession :one
insert into "session" (expires_at, token, user_id, ip_address, user_agent)
values ($1, $2, $3, $4, $5)
returning id, expires_at, token, ip_address, user_agent, user_id, created_at, updated_at;

-- name: GetSessionByToken :one
select s.id, s.expires_at, s.token, s.ip_address, s.user_agent, s.user_id, s.created_at, s.updated_at, u.id as user_id, u.email as user_email
from "session" s
join "user" u on s.user_id = u.id
where s.token = $1
  and s.expires_at > now()
limit 1;

-- name: DeleteSession :exec
delete from "session"
where token = $1;

-- name: DeleteUserSessions :exec
delete from "session"
where user_id = $1;

-- name: CleanExpiredSessions :exec
delete from "session"
where expires_at < now();

