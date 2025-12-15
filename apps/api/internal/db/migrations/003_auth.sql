-- +goose Up
-- Users table
create table users (
    id bigserial primary key,
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_users_email on users(email);

-- Sessions table for storing active sessions
create table sessions (
    id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index idx_sessions_token on sessions(token);
create index idx_sessions_user_id on sessions(user_id);
create index idx_sessions_expires_at on sessions(expires_at);

-- +goose Down
drop table if exists sessions;
drop table if exists users;

