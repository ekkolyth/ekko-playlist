-- +goose Up
-- Better Auth tables
-- Note: user table must be created first as it's referenced by foreign keys

-- User table (using UUIDs)
create table "user" (
    id uuid primary key default gen_random_uuid(),
    name text,
    email text not null,
    email_verified boolean default false not null,
    image text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint user_email_unique unique(email)
);

-- Session table
create table "session" (
    id uuid primary key default gen_random_uuid(),
    expires_at timestamptz not null,
    token text not null,
    ip_address text,
    user_agent text,
    user_id uuid not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint session_token_unique unique(token),
    constraint session_user_id_user_id_fk foreign key (user_id) references "user"(id) on delete cascade on update no action
);

-- Account table
create table "account" (
    id uuid primary key default gen_random_uuid(),
    account_id text not null,
    provider_id text not null,
    user_id uuid not null,
    access_token text,
    refresh_token text,
    id_token text,
    expires_at timestamptz,
    password text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    constraint account_user_id_user_id_fk foreign key (user_id) references "user"(id) on delete cascade on update no action
);

-- Verification table
create table "verification" (
    id uuid primary key default gen_random_uuid(),
    identifier text not null,
    value text not null,
    expires_at timestamptz not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Indexes for better performance
create index idx_user_email on "user"(email);
create index idx_session_token on "session"(token);
create index idx_session_user_id on "session"(user_id);
create index idx_session_expires_at on "session"(expires_at);
create index idx_account_user_id on "account"(user_id);
create index idx_account_provider_id on "account"(provider_id, account_id);
create index idx_verification_identifier on "verification"(identifier);
create index idx_verification_value on "verification"(value);

-- +goose Down
-- Drop indexes first
drop index if exists idx_verification_value;
drop index if exists idx_verification_identifier;
drop index if exists idx_account_provider_id;
drop index if exists idx_account_user_id;
drop index if exists idx_session_expires_at;
drop index if exists idx_session_user_id;
drop index if exists idx_session_token;
drop index if exists idx_user_email;

-- Drop tables (order matters due to foreign keys)
drop table if exists "verification";
drop table if exists "account";
drop table if exists "session";
drop table if exists "user";

