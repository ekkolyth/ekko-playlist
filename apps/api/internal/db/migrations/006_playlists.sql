-- +goose Up
create table playlists (
    id bigserial primary key,
    user_id uuid not null references "user"(id) on delete cascade,
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_user_playlist_name unique (user_id, name)
);

create index idx_playlists_user_id on playlists(user_id);

create table playlist_videos (
    playlist_id bigint not null references playlists(id) on delete cascade,
    video_id bigint not null references videos(id) on delete cascade,
    position integer not null default 0,
    created_at timestamptz not null default now(),
    primary key (playlist_id, video_id)
);

create index idx_playlist_videos_playlist_id on playlist_videos(playlist_id);
create index idx_playlist_videos_video_id on playlist_videos(video_id);

-- +goose Down
drop table if exists playlist_videos;
drop table if exists playlists;

