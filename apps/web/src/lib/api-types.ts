// Playlist types
export interface Playlist {
  name: string;
  userId: string;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends Omit<Playlist, "videoCount"> {
  videos: Video[];
}

export interface Video {
  id: number;
  videoId: string;
  normalizedUrl: string;
  originalUrl: string;
  title: string;
  channel: string;
  userId: string;
  createdAt: string;
  tags?: TagInfo[];
}

export interface VideosResponse {
  videos: Video[];
}

export interface ListPlaylistsResponse {
  playlists: Playlist[];
}

// SMTP Config types
export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string; // Masked in response
  from_email: string;
  from_name?: string;
  source?: Record<string, "env" | "db">;
  env_configured?: boolean;
}

export interface SmtpConfigResponse {
  message: string;
}

export interface TestEmailResponse {
  message: string;
}

// User Profile types
export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface UpdateUserProfileRequest {
  name?: string | null;
  email: string;
  image?: string | null;
}

export interface VerifyEmailUpdateRequest {
  email: string;
  code: string;
}

// Tag types
export interface Tag {
  id: number;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListTagsResponse {
  tags: Tag[];
}

export interface CreateTagRequest {
  name: string;
  color: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface AssignTagsRequest {
  videoIds: number[];
  tagIds: number[];
}

export interface UnassignTagsRequest {
  videoId: number;
  tagIds: number[];
}

// User Preferences types
export interface UserPreferences {
  userId: string;
  primaryColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesRequest {
  primaryColor: string;
}

// Tag info for video responses
export interface TagInfo {
  id: number;
  name: string;
  color: string;
}
