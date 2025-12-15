-- +goose Up
create table config (
    key text primary key,
    value text not null,
    updated_at timestamptz not null default now()
);

-- +goose Down
drop table if exists config;

