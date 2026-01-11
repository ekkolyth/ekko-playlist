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
