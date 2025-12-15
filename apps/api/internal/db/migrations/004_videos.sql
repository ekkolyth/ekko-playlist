-- +goose Up
create table videos (
    id bigserial primary key,
    video_id text not null unique,
    normalized_url text not null unique,
    original_url text not null,
    title text not null,
    channel text not null,
    created_at timestamptz not null default now()
);

create index idx_videos_video_id on videos(video_id);
create index idx_videos_normalized_url on videos(normalized_url);
create index idx_videos_channel on videos(channel);

-- +goose Down
drop table if exists videos;

