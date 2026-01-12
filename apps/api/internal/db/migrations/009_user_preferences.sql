-- +goose Up
-- +goose StatementBegin
create table if not exists user_preferences (
    user_id uuid primary key references "user"(id) on delete cascade,
    primary_color text not null default 'blue',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
drop table if exists user_preferences;
-- +goose StatementEnd