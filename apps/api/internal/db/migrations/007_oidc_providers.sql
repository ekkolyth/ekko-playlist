-- +goose Up
create table oidc_providers (
    id uuid primary key default gen_random_uuid(),
    provider_id text not null unique,
    name text not null,
    discovery_url text not null,
    client_id text not null,
    client_secret text not null,
    scopes text[] not null default array['openid', 'profile', 'email'],
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_oidc_providers_provider_id on oidc_providers(provider_id);
create index idx_oidc_providers_enabled on oidc_providers(enabled);

-- +goose Down
drop table if exists oidc_providers;
