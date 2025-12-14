export interface ParsedYouTubeUrl {
  isValid: boolean;
  videoId: string | null;
  normalizedUrl: string | null;
  error?: string;
}

/**
 * Validates and parses YouTube URLs
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error: 'Invalid URL: URL must be a non-empty string'
    };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check if it's a YouTube domain
  const youtubeDomainPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be)/i;
  if (!youtubeDomainPattern.test(trimmedUrl)) {
    return {
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error: 'Invalid URL: Not a YouTube URL'
    };
  }

  // Check for playlist URLs
  const playlistPattern = /[?&]list=([a-zA-Z0-9_-]+)/;
  const playlistMatch = trimmedUrl.match(playlistPattern);
  if (playlistMatch) {
    // This is a playlist URL, which is valid for scanning
    return {
      isValid: true,
      videoId: null,
      normalizedUrl: trimmedUrl
    };
  }

  let videoId: string | null = null;

  // Pattern 1: youtube.com/watch?v=VIDEO_ID or youtube.com/watch?vi=VIDEO_ID
  const watchPattern = /[?&]v[i]?=([a-zA-Z0-9_-]{11})/;
  const watchMatch = trimmedUrl.match(watchPattern);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Pattern 2: youtu.be/VIDEO_ID
  if (!videoId) {
    const shortPattern = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
    const shortMatch = trimmedUrl.match(shortPattern);
    if (shortMatch) {
      videoId = shortMatch[1];
    }
  }

  // Pattern 3: youtube.com/v/VIDEO_ID or youtube.com/embed/VIDEO_ID
  if (!videoId) {
    const embedPattern = /\/(?:v|embed)\/([a-zA-Z0-9_-]{11})/;
    const embedMatch = trimmedUrl.match(embedPattern);
    if (embedMatch) {
      videoId = embedMatch[1];
    }
  }

  // Pattern 4: youtube.com/VIDEO_ID (less common)
  if (!videoId) {
    const directPattern = /youtube\.com\/([a-zA-Z0-9_-]{11})(?:\?|$|&)/;
    const directMatch = trimmedUrl.match(directPattern);
    if (directMatch) {
      videoId = directMatch[1];
    }
  }

  if (!videoId) {
    return {
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error: 'Invalid URL: Could not extract video ID from YouTube URL'
    };
  }

  // Validate video ID format (YouTube video IDs are 11 characters)
  if (videoId.length !== 11) {
    return {
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error: 'Invalid URL: Video ID must be 11 characters'
    };
  }

  // Normalize URL to standard format
  const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    isValid: true,
    videoId: videoId,
    normalizedUrl: normalizedUrl
  };
}

/**
 * Validates if a URL is a valid YouTube URL (including playlists)
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const trimmedUrl = url.trim();
  const youtubeDomainPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be)/i;
  
  // First check if it's a YouTube domain
  if (!youtubeDomainPattern.test(trimmedUrl)) {
    return false;
  }
  
  // Check for playlist URLs
  const playlistPattern = /[?&]list=([a-zA-Z0-9_-]+)/;
  if (playlistPattern.test(trimmedUrl)) {
    return true;
  }
  
  // Otherwise, check if it's a valid video URL
  return parseYouTubeUrl(url).isValid;
}

