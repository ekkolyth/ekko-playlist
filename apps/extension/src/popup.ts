// Inline all types and functions to avoid ES module issues in Chrome extension popup

// Types
interface AuthTokenResponse {
    token: string;
    userId?: string;
    sessionId?: string;
    error?: string;
}
interface VideoInfo {
    channel: string;
    url: string;
    title: string;
}

interface ScanMessage {
    type: "SCAN_PLAYLIST";
}

interface ScanResponse {
    type: "SCAN_RESULT";
    videos: VideoInfo[];
    error?: string;
}

interface GetCurrentVideoInfoMessage {
    type: "GET_CURRENT_VIDEO_INFO";
}

interface CurrentVideoInfoResponse {
    type: "CURRENT_VIDEO_INFO";
    title: string;
    channel: string;
    error?: string;
}

interface ProcessPlaylistResponse {
    processed: Array<{
        channel: string;
        originalUrl: string;
        normalizedUrl: string;
        title: string;
        isValid: boolean;
        error?: string;
    }>;
    total: number;
    valid: number;
    invalid: number;
}

interface ParsedYouTubeUrl {
    isValid: boolean;
    videoId: string | null;
    normalizedUrl: string | null;
    error?: string;
}

function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
    if (!url || typeof url !== "string") {
        return {
            isValid: false,
            videoId: null,
            normalizedUrl: null,
            error: "Invalid URL: URL must be a non-empty string",
        };
    }

    const trimmedUrl = url.trim();
    const youtubeDomainPattern =
        /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be)/i;
    if (!youtubeDomainPattern.test(trimmedUrl)) {
        return {
            isValid: false,
            videoId: null,
            normalizedUrl: null,
            error: "Invalid URL: Not a YouTube URL",
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
            normalizedUrl: trimmedUrl,
        };
    }

    let videoId: string | null = null;
    const watchPattern = /[?&]v[i]?=([a-zA-Z0-9_-]{11})/;
    const watchMatch = trimmedUrl.match(watchPattern);
    if (watchMatch) {
        videoId = watchMatch[1];
    }

    if (!videoId) {
        const shortPattern = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
        const shortMatch = trimmedUrl.match(shortPattern);
        if (shortMatch) {
            videoId = shortMatch[1];
        }
    }

    if (!videoId) {
        const embedPattern = /\/(?:v|embed)\/([a-zA-Z0-9_-]{11})/;
        const embedMatch = trimmedUrl.match(embedPattern);
        if (embedMatch) {
            videoId = embedMatch[1];
        }
    }

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
            error: "Invalid URL: Could not extract video ID from YouTube URL",
        };
    }

    if (videoId.length !== 11) {
        return {
            isValid: false,
            videoId: null,
            normalizedUrl: null,
            error: "Invalid URL: Video ID must be 11 characters",
        };
    }

    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
        isValid: true,
        videoId: videoId,
        normalizedUrl: normalizedUrl,
    };
}

function isValidYouTubeUrl(url: string): boolean {
    const trimmedUrl = url.trim();
    const youtubeDomainPattern =
        /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be)/i;

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

const scanButton = document.getElementById("scanButton") as HTMLButtonElement;
const saveUrlButton = document.getElementById(
    "saveUrlButton",
) as HTMLButtonElement;
const urlInput = document.getElementById("urlInput") as HTMLInputElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;

function setStatus(
    message: string,
    type: "success" | "error" | "info" = "info",
): void {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

function clearStatus(): void {
    statusDiv.textContent = "";
    statusDiv.className = "status";
}

// Default configuration
const DEFAULT_API_BASE_URL = "http://localhost:1337";
const WEB_APP_URL = "http://localhost:3000";

// Storage keys
const STORAGE_KEY_TOKEN = "auth_token";
const STORAGE_KEY_SERVER_URL = "server_url";

interface AuthResponse {
    token: string;
    user_id: number;
    email: string;
}

// Authentication functions
async function getStoredToken(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_TOKEN], (result) => {
            resolve(result[STORAGE_KEY_TOKEN] || null);
        });
    });
}

async function storeToken(token: string): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token }, () => {
            resolve();
        });
    });
}

async function clearStoredToken(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.remove([STORAGE_KEY_TOKEN], () => {
            resolve();
        });
    });
}

async function getStoredServerUrl(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_SERVER_URL], (result) => {
            resolve(result[STORAGE_KEY_SERVER_URL] || null);
        });
    });
}

async function storeServerUrl(url: string): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY_SERVER_URL]: url }, () => {
            resolve();
        });
    });
}

async function getApiBaseUrl(): Promise<string> {
    const storedUrl = await getStoredServerUrl();
    return storedUrl || DEFAULT_API_BASE_URL;
}

async function checkAuthentication(): Promise<boolean> {
    const token = await getStoredToken();
    if (!token) {
        return false;
    }

    // Check if we have a server URL configured
    const storedUrl = await getStoredServerUrl();
    if (!storedUrl) {
        // No server configured yet, can't check auth
        return false;
    }

    // Verify token is still valid by calling /api/auth/me
    try {
        const response = await fetch(`${storedUrl}/api/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            await clearStoredToken();
            return false;
        }

        return true;
    } catch (error) {
        // Network error - server might be down or unreachable
        // Don't clear token, just return false so user can reconfigure
        return false;
    }
}

function showLoginPrompt(): void {
    const loginPrompt = document.getElementById("loginPrompt");
    const mainContent = document.getElementById("mainContent");
    const loadingState = document.getElementById("loadingState");

    if (loginPrompt) loginPrompt.style.display = "block";
    if (mainContent) mainContent.style.display = "none";
    if (loadingState) loadingState.style.display = "none";
}

function showMainContent(): void {
    const loginPrompt = document.getElementById("loginPrompt");
    const mainContent = document.getElementById("mainContent");
    const loadingState = document.getElementById("loadingState");

    if (loginPrompt) loginPrompt.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
    if (loadingState) loadingState.style.display = "none";
}

function showLoadingState(): void {
    const loginPrompt = document.getElementById("loginPrompt");
    const mainContent = document.getElementById("mainContent");
    const loadingState = document.getElementById("loadingState");

    if (loginPrompt) loginPrompt.style.display = "none";
    if (mainContent) mainContent.style.display = "none";
    if (loadingState) loadingState.style.display = "block";
}

async function handleSaveConfig(): Promise<void> {
    const serverUrlInput = document.getElementById(
        "serverUrlInput",
    ) as HTMLInputElement;
    const apiTokenInput = document.getElementById(
        "apiTokenInput",
    ) as HTMLInputElement;

    if (!serverUrlInput || !apiTokenInput) {
        setStatus("Error: Configuration inputs not found", "error");
        return;
    }

    const serverUrl = serverUrlInput.value.trim();
    const token = apiTokenInput.value.trim();

    if (!serverUrl) {
        setStatus("Please enter a server URL", "error");
        return;
    }

    if (!token) {
        setStatus("Please enter an API token", "error");
        return;
    }

    // Validate server URL format
    try {
        new URL(serverUrl);
    } catch {
        setStatus("Invalid server URL format", "error");
        return;
    }

    showLoadingState();
    setStatus("Validating configuration...", "info");

    try {
        console.log("Testing token with URL:", `${serverUrl}/api/auth/me`);
        console.log("Token (first 10 chars):", token.substring(0, 10) + "...");

        // Test the token by calling /api/auth/me
        const response = await fetch(`${serverUrl}/api/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log("Response status:", response.status, response.statusText);
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        console.log("Response headers:", headers);

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(
                "Token validation failed:",
                response.status,
                errorText,
            );
            setStatus(
                `Invalid token or server URL (${response.status}): ${errorText || response.statusText}`,
                "error",
            );
            showLoginPrompt();
            return;
        }

        // Read the response body to ensure it's consumed
        const data = await response.json().catch((err) => {
            console.error("Failed to parse JSON response:", err);
            return null;
        });
        console.log("Token validation successful:", data);

        // Store configuration
        console.log("Storing server URL:", serverUrl);
        await storeServerUrl(serverUrl);
        console.log("Storing token...");
        await storeToken(token);
        console.log("Configuration stored successfully");

        // Clear input fields
        serverUrlInput.value = "";
        apiTokenInput.value = "";

        // Show main content and initialize
        showMainContent();
        await initializeUrlInput();
        setStatus("Configuration saved successfully!", "success");
        setTimeout(() => clearStatus(), 3000);
    } catch (error) {
        console.error("Error saving configuration:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        console.error("Error details:", {
            message: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
        });
        setStatus(
            `Error: ${errorMessage}. Check if the server is running and CORS is configured.`,
            "error",
        );
        showLoginPrompt();
    }
}

async function sendPlaylistToAPI(
    videos: VideoInfo[],
): Promise<ProcessPlaylistResponse> {
    // Get authentication token and server URL
    const token = await getStoredToken();
    const apiUrl = await getApiBaseUrl();

    // If no token, user needs to configure
    if (!token) {
        throw new Error(
            "Authentication required. Please configure your API connection.",
        );
    }

    try {
        const response = await fetch(`${apiUrl}/api/process/playlist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ videos }),
        });

        if (!response.ok) {
            // Handle 401 Unauthorized - token might be expired
            if (response.status === 401) {
                // Clear stored token and prompt for re-authentication
                await clearStoredToken();
                showLoginPrompt();
                throw new Error("Session expired. Please log in again.");
            }

            const errorData = await response
                .json()
                .catch(() => ({ message: "Unknown error" }));
            throw new Error(
                errorData.message || `HTTP error! status: ${response.status}`,
            );
        }

        const result = await response.json();
        return result;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
            const apiUrl = await getApiBaseUrl();
            throw new Error(
                "Failed to connect to API. Make sure the API server is running on " +
                    apiUrl,
            );
        }
        throw error;
    }
}

async function scanPlaylist(): Promise<void> {
    console.log("scanPlaylist called");
    if (!scanButton || !statusDiv) {
        console.error("Missing elements:", { scanButton, statusDiv });
        return;
    }

    console.log("Starting scan...");
    scanButton.disabled = true;
    setStatus("Scanning playlist...", "info");

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });

        if (!tab.id) {
            throw new Error("No active tab found");
        }

        if (!tab.url) {
            throw new Error("No URL found for current tab");
        }

        if (!isValidYouTubeUrl(tab.url)) {
            throw new Error("Current page is not a valid YouTube URL");
        }

        let response: ScanResponse | undefined;
        try {
            response = await chrome.tabs.sendMessage(tab.id, {
                type: "SCAN_PLAYLIST",
            } as ScanMessage);
        } catch (error) {
            // Content script might not be injected, try to inject it
            if (
                error instanceof Error &&
                error.message.includes("Could not establish connection")
            ) {
                // Try to inject the content script
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ["content.js"],
                    });
                    // Wait a bit for the script to initialize
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    // Try again
                    response = await chrome.tabs.sendMessage(tab.id, {
                        type: "SCAN_PLAYLIST",
                    } as ScanMessage);
                } catch (injectError) {
                    throw new Error(
                        "Failed to inject content script. Please refresh the page and try again.",
                    );
                }
            } else {
                throw error;
            }
        }

        if (!response) {
            throw new Error(
                "No response from content script. Please refresh the page and try again.",
            );
        }

        const scanResponse = response as ScanResponse;

        if (scanResponse.error) {
            throw new Error(scanResponse.error);
        }

        if (!scanResponse.videos || scanResponse.videos.length === 0) {
            setStatus("No videos found on this page", "error");
            scanButton.disabled = false;
            return;
        }

        // Send to API instead of downloading
        setStatus("Sending to API and normalizing URLs...", "info");

        const result = await sendPlaylistToAPI(scanResponse.videos);

        setStatus(
            `Processed ${result.total} videos: ${result.valid} valid, ${result.invalid} invalid`,
            "success",
        );

        setTimeout(() => {
            clearStatus();
        }, 5000);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        setStatus(`Error: ${errorMessage}`, "error");
    } finally {
        scanButton.disabled = false;
    }
}

async function saveCurrentUrl(): Promise<void> {
    if (!saveUrlButton || !urlInput || !statusDiv) {
        return;
    }

    saveUrlButton.disabled = true;
    setStatus("Validating URL...", "info");

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });

        if (!tab.id || !tab.url) {
            throw new Error("No active tab found");
        }

        // Validate YouTube URL
        const parsedUrl = parseYouTubeUrl(tab.url);

        if (!parsedUrl.isValid || !parsedUrl.normalizedUrl) {
            throw new Error(parsedUrl.error || "Invalid YouTube URL");
        }

        // Update input with current URL
        urlInput.value = parsedUrl.normalizedUrl;

        // Create a video info object for the current page
        // We'll need to get the title and channel from the page if possible
        let videoInfo: VideoInfo;

        try {
            // Try to get video info from the page
            const response = (await chrome.tabs.sendMessage(tab.id, {
                type: "GET_CURRENT_VIDEO_INFO",
            } as GetCurrentVideoInfoMessage)) as
                | CurrentVideoInfoResponse
                | undefined;

            if (
                response &&
                response.type === "CURRENT_VIDEO_INFO" &&
                response.title &&
                response.channel
            ) {
                videoInfo = {
                    channel: response.channel,
                    url: parsedUrl.normalizedUrl,
                    title: response.title,
                };
            } else {
                // Fallback: use page title or default values
                const pageTitle =
                    tab.title?.replace(" - YouTube", "").trim() ||
                    "Unknown Title";
                videoInfo = {
                    channel: "Unknown Channel",
                    url: parsedUrl.normalizedUrl,
                    title: pageTitle,
                };
            }
        } catch {
            // If content script fails, use fallback
            const pageTitle =
                tab.title?.replace(" - YouTube", "").trim() || "Unknown Title";
            videoInfo = {
                channel: "Unknown Channel",
                url: parsedUrl.normalizedUrl,
                title: pageTitle,
            };
        }

        // Save to JSON file
        const jsonData = JSON.stringify([videoInfo], null, 2);
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `youtube-video-${timestamp}.json`;

        await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true,
        });

        setStatus("URL saved successfully!", "success");

        setTimeout(() => {
            clearStatus();
        }, 3000);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        setStatus(`Error: ${errorMessage}`, "error");
    } finally {
        saveUrlButton.disabled = false;
    }
}

// Initialize URL input with current page URL
async function initializeUrlInput(): Promise<void> {
    if (!urlInput) {
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab.url) {
            urlInput.value = tab.url;
        }
    } catch {
        // Ignore errors during initialization
    }
}

// Add debug logging
console.log("Popup script loaded");
console.log("scanButton:", scanButton);
console.log("saveUrlButton:", saveUrlButton);

if (scanButton) {
    scanButton.addEventListener("click", (e) => {
        console.log("Scan button clicked!", e);
        scanPlaylist().catch((err) => {
            console.error("Error in scanPlaylist:", err);
        });
    });
} else {
    console.error("scanButton not found!");
}

if (saveUrlButton) {
    saveUrlButton.addEventListener("click", (e) => {
        console.log("Save URL button clicked!", e);
        saveCurrentUrl().catch((err) => {
            console.error("Error in saveCurrentUrl:", err);
        });
    });
} else {
    console.error("saveUrlButton not found!");
}

// Save configuration button event listener
const saveConfigButton = document.getElementById(
    "saveConfigButton",
) as HTMLButtonElement;
if (saveConfigButton) {
    saveConfigButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Save config button clicked!", e);
        handleSaveConfig().catch((err) => {
            console.error("Error in handleSaveConfig:", err);
            setStatus(
                `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
                "error",
            );
        });
    });
} else {
    console.error("saveConfigButton not found!");
}

// Logout button event listener
const logoutButton = document.getElementById(
    "logoutButton",
) as HTMLButtonElement;
if (logoutButton) {
    logoutButton.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Logout button clicked!", e);

        // Clear stored token and server URL
        await clearStoredToken();
        await storeServerUrl(""); // Clear server URL too

        // Show login prompt
        showLoginPrompt();

        // Clear input fields
        const serverUrlInput = document.getElementById(
            "serverUrlInput",
        ) as HTMLInputElement;
        const apiTokenInput = document.getElementById(
            "apiTokenInput",
        ) as HTMLInputElement;
        if (serverUrlInput) serverUrlInput.value = DEFAULT_API_BASE_URL;
        if (apiTokenInput) apiTokenInput.value = "";

        setStatus("Logged out successfully", "success");
        setTimeout(() => clearStatus(), 2000);
    });
} else {
    console.error("logoutButton not found!");
}

// Initialize authentication and UI when popup opens
async function initializePopup(): Promise<void> {
    showLoadingState();

    // Load stored configuration into input fields
    const serverUrlInput = document.getElementById(
        "serverUrlInput",
    ) as HTMLInputElement;

    if (serverUrlInput) {
        const storedUrl = await getStoredServerUrl();
        if (storedUrl) {
            serverUrlInput.value = storedUrl;
        } else {
            serverUrlInput.value = DEFAULT_API_BASE_URL;
        }
    }

    // Don't pre-fill the token for security reasons

    // Check authentication
    const authenticated = await checkAuthentication();

    if (authenticated) {
        showMainContent();
        // Initialize URL input
        await initializeUrlInput();
    } else {
        showLoginPrompt();
    }
}

// Initialize popup on load
initializePopup();
