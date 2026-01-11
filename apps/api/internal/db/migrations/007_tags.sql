-- +goose Up
-- +goose StatementBegin
create table tags (
    id bigserial primary key,
    user_id uuid not null references "user"(id) on delete cascade,
    name text not null,
    color text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_user_tag_name unique (user_id, name)
);

create index idx_tags_user_id on tags(user_id);

create table video_tags (
    video_id bigint not null references videos(id) on delete cascade,
    tag_id bigint not null references tags(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (video_id, tag_id)
);

create index idx_video_tags_video_id on video_tags(video_id);
create index idx_video_tags_tag_id on video_tags(tag_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
drop table if exists video_tags;
drop table if exists tags;
-- +goose StatementEnd