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

-- name: GetVerificationByValue :one
select id, identifier, value, expires_at, created_at, updated_at
from "verification"
where value = $1
  and expires_at > now()
limit 1;

-- name: GetVerificationByIdentifier :one
select id, identifier, value, expires_at, created_at, updated_at
from "verification"
where identifier = $1
  and expires_at > now()
limit 1;

-- name: ListRecentVerifications :many
select id, identifier, value, expires_at, created_at, updated_at
from "verification"
where expires_at > now()
order by created_at desc
limit 10;

-- name: GetUserByVerificationToken :one
select u.id, u.name, u.email, u.email_verified, u.image, u.created_at, u.updated_at
from "verification" v
join "user" u on v.identifier = u.id::text or v.identifier = u.email
where v.value = $1
  and v.expires_at > now()
limit 1;

