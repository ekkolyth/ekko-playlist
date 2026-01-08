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

-- name: CreateAPIToken :one
insert into "api_tokens" (user_id, name, token_hash, token_prefix, expires_at)
values ($1, $2, $3, $4, $5)
returning id, user_id, name, token_hash, token_prefix, created_at, expires_at, last_used_at;

-- name: GetAPITokenByHash :one
select t.id, t.user_id, t.name, t.token_hash, t.token_prefix, t.created_at, t.expires_at, t.last_used_at, u.email as user_email
from "api_tokens" t
join "user" u on t.user_id = u.id
where t.token_hash = $1
  and (t.expires_at is null or t.expires_at > now())
limit 1;

-- name: ListAPITokensByUser :many
select id, user_id, name, token_prefix, created_at, expires_at, last_used_at
from "api_tokens"
where user_id = $1
  and (expires_at is null or expires_at > now())
order by created_at desc;

-- name: DeleteAPIToken :exec
delete from "api_tokens"
where id = $1 and user_id = $2;

-- name: UpdateAPITokenLastUsed :exec
update "api_tokens"
set last_used_at = now()
where id = $1;

-- name: UpdateAPITokenName :exec
update "api_tokens"
set name = $1
where id = $2 and user_id = $3;

-- name: CreateVerification :one
insert into "verification" (identifier, value, expires_at)
values ($1, $2, $3)
returning id, identifier, value, expires_at, created_at, updated_at;

-- name: UpdateUserEmailVerified :exec
update "user"
set email_verified = true, updated_at = now()
where id = $1;

-- name: DeleteVerification :exec
delete from "verification"
where value = $1;
