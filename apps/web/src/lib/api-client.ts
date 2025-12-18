const BEARER_TOKEN_KEY = "better_auth_bearer_token";

// API requests now go through TanStack Start proxy routes
// All /api/* requests are handled by the web server (either Better Auth or Go API proxy)
// The browser always connects to the same origin (no CORS issues)
const API_URL = "";

export interface ApiAuthResponse {
  token: string;
  user_id: number;
  email: string;
}

/**
 * Get Bearer token from Better Auth (stored after sign in)
 * This token is used for API requests to the Go API
 * The web app itself uses cookie-based sessions
 */
export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BEARER_TOKEN_KEY);
}

/**
 * Clear the stored Bearer token
 */
export function clearBearerToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  }
}

/**
 * Make an authenticated request to the API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let token = getBearerToken();

  // If no token stored, try to get it from the current session
  if (!token) {
    try {
      const { getSessionToken } = await import("@/lib/auth-client");
      token = await getSessionToken();
      if (token && typeof window !== "undefined") {
        localStorage.setItem(BEARER_TOKEN_KEY, token);
      }
    } catch (err) {
      console.error("Error getting session token:", err);
    }
  }

  const headers = new Headers(options.headers);

  // Add Authorization header with Better Auth Bearer token
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    console.log("Sending API request with Bearer token");
  } else {
    console.warn("No Bearer token available for API request");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Read response body once (can only be read once)
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    if (response.status === 401) {
      // Clear invalid token
      clearBearerToken();
      throw new Error(
        "Your session has expired. Please refresh the page and log in again.",
      );
    }

    // Try to parse error message from response
    let errorMessage = `Request failed (${response.status} ${response.statusText})`;

    if (text) {
      try {
        if (contentType.includes("application/json")) {
          const errorData = JSON.parse(text);
          if (errorData && typeof errorData === "object") {
            errorMessage = errorData.message || errorData.error || errorMessage;
          }
        } else {
          // Use the text as error message if it's not JSON
          errorMessage =
            text.length > 200 ? text.substring(0, 200) + "..." : text;
        }
      } catch (parseErr) {
        // If we can't parse, use the raw text or status
        errorMessage = text || errorMessage;
      }
    }

    throw new Error(errorMessage);
  }

  // For DELETE requests or 204 No Content, return empty object
  if (options.method === "DELETE" || response.status === 204) {
    return {} as T;
  }

  // Handle empty responses
  if (!text || text.trim() === "") {
    if (contentType.includes("application/json")) {
      throw new Error("Server returned an empty response. Please try again.");
    }
    return {} as T;
  }

  // Try to parse JSON
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Provide a more helpful error message
      const preview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      throw new Error(
        `Server returned invalid data. Expected JSON but received: "${preview}". ` +
          `This usually means the server encountered an error. Please try again.`,
      );
    }
    throw err;
  }
}

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

// Playlist API functions
export async function fetchPlaylists(): Promise<ListPlaylistsResponse> {
  return apiRequest<ListPlaylistsResponse>("/api/playlists");
}

export async function createPlaylist(name: string): Promise<Playlist> {
  return apiRequest<Playlist>("/api/playlists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}

export async function getPlaylist(name: string): Promise<PlaylistDetail> {
  return apiRequest<PlaylistDetail>(
    `/api/playlists/${encodeURIComponent(name)}`,
  );
}

export async function updatePlaylist(
  name: string,
  newName: string,
): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/playlists/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: newName }),
  });
}

export async function deletePlaylist(name: string): Promise<void> {
  await apiRequest(`/api/playlists/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function addVideoToPlaylist(
  playlistName: string,
  videoId: number,
): Promise<void> {
  await apiRequest(
    `/api/playlists/${encodeURIComponent(playlistName)}/videos`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId }),
    },
  );
}

export async function removeVideoFromPlaylist(
  playlistName: string,
  videoId: number,
): Promise<void> {
  await apiRequest(
    `/api/playlists/${encodeURIComponent(playlistName)}/videos/${videoId}`,
    {
      method: "DELETE",
    },
  );
}

export async function bulkAddVideosToPlaylist(
  playlistName: string,
  videoIds: number[],
): Promise<void> {
  await apiRequest(
    `/api/playlists/${encodeURIComponent(playlistName)}/videos/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoIds }),
    },
  );
}

export async function deleteVideos(videoIds: number[]): Promise<void> {
  await apiRequest("/api/videos", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ videoIds }),
  });
}
