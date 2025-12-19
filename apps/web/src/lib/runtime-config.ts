// Runtime configuration that can be set via environment variables
// This allows the same Docker image to work with different API URLs

let runtimeConfig: { apiUrl: string } | null = null;

export async function getRuntimeConfig(): Promise<{ apiUrl: string }> {
  // Return cached config if available
  if (runtimeConfig) {
    return runtimeConfig;
  }

  // Try to fetch runtime config from server endpoint
  try {
    const response = await fetch("/api/config");
    if (response.ok) {
      const config = await response.json();
      runtimeConfig = config;
      return config;
    }
  } catch (error) {
    console.warn("Failed to fetch runtime config, using defaults:", error);
  }

  // Fallback to build-time env var or default
  runtimeConfig = {
    apiUrl: import.meta.env.VITE_API_URL || "http://localhost:1337",
  };

  return runtimeConfig;
}

// Synchronous version for cases where we can't use async
// This will return the cached value or fallback
export function getRuntimeConfigSync(): { apiUrl: string } {
  if (runtimeConfig) {
    return runtimeConfig;
  }

  return {
    apiUrl: import.meta.env.VITE_API_URL || "http://localhost:1337",
  };
}
