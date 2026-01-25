// Inline types and YouTube URL parser to avoid CommonJS module issues
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

    // Extract video ID first (even if there's a playlist parameter)
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

    // If we have a video ID, validate and normalize it (even if there's a playlist parameter)
    if (videoId) {
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

    // If no video ID but has playlist parameter, it's a playlist-only URL
    const playlistPattern = /[?&]list=([a-zA-Z0-9_-]+)/;
    const playlistMatch = trimmedUrl.match(playlistPattern);
    if (playlistMatch) {
        // This is a playlist URL without a specific video, which is valid for scanning
        return {
            isValid: true,
            videoId: null,
            normalizedUrl: trimmedUrl,
        };
    }

    // No video ID and no playlist - invalid
    return {
        isValid: false,
        videoId: null,
        normalizedUrl: null,
        error: "Invalid URL: Could not extract video ID from YouTube URL",
    };
}

// Helper function to find the scrollable playlist container
function findPlaylistContainer(): HTMLElement | null {
    // Try multiple selectors for the playlist container
    const containerSelectors = [
        "ytd-playlist-video-list-renderer",
        "#contents.ytd-playlist-video-list-renderer",
        "ytd-playlist-video-list-renderer #contents",
        "#playlist-items",
        "ytd-two-column-browse-results-renderer #primary",
        "#primary ytd-playlist-video-list-renderer",
    ];

    for (const selector of containerSelectors) {
        const container = document.querySelector(selector) as HTMLElement;
        if (container) {
            console.log(`Found playlist container using selector: ${selector}`);
            return container;
        }
    }

    // Fallback to main window
    return null;
}

// Helper function to scroll and wait for content to load
async function scrollToLoadContent(maxScrolls: number = 100): Promise<void> {
    const container = findPlaylistContainer();

    // Count current playlist items
    const countItems = (): number => {
        const items = document.querySelectorAll("ytd-playlist-video-renderer");
        return items.length;
    };

    let lastItemCount = countItems();
    console.log(`Initial item count: ${lastItemCount}`);

    // Try to find and click "Load more" button if it exists
    const tryClickLoadMore = (): boolean => {
        const loadMoreSelectors = [
            'button[aria-label*="Load more"]',
            'button[aria-label*="Show more"]',
            "yt-button-renderer#more button",
            "#more button",
            "ytd-continuation-item-renderer button",
        ];

        for (const selector of loadMoreSelectors) {
            const button = document.querySelector(
                selector,
            ) as HTMLButtonElement;
            if (button && button.offsetParent !== null) {
                console.log(`Clicking "Load more" button: ${selector}`);
                button.click();
                return true;
            }
        }
        return false;
    };

    for (let scrolls = 0; scrolls < maxScrolls; scrolls++) {
        // Try clicking "Load more" button first
        const clickedLoadMore = tryClickLoadMore();

        // Scroll within the container or window
        if (container) {
            // Scroll the container to its bottom
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            container.scrollTop = scrollHeight - clientHeight;

            // Also scroll the window
            window.scrollTo(0, document.documentElement.scrollHeight);
        } else {
            // Scroll the window
            window.scrollTo(0, document.documentElement.scrollHeight);
        }

        // Wait for content to load
        await new Promise((resolve) =>
            setTimeout(resolve, clickedLoadMore ? 2000 : 1500),
        );

        const currentItemCount = countItems();
        console.log(
            `Scroll ${scrolls + 1}: Found ${currentItemCount} items (was ${lastItemCount})`,
        );

        // Check if new items were loaded
        if (currentItemCount > lastItemCount) {
            lastItemCount = currentItemCount;
            // Continue scrolling to load more
        } else {
            // No new items, check a few more times to be sure
            let stableCount = 0;
            for (let check = 0; check < 3; check++) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                const checkCount = countItems();
                if (checkCount === currentItemCount) {
                    stableCount++;
                } else {
                    lastItemCount = checkCount;
                    break; // New items found, continue scrolling
                }
            }

            if (stableCount >= 3) {
                // Content has stabilized
                console.log(
                    `Content stabilized after ${scrolls + 1} scrolls with ${currentItemCount} items`,
                );
                return;
            }
        }
    }

    console.log(
        `Reached max scrolls (${maxScrolls}) with ${lastItemCount} items`,
    );
}

// Shared function to extract channel name from a channel element
function extractChannelName(channelElement: HTMLElement | null): string {
    let channelName = "Unknown Channel";
    if (channelElement) {
        // Try innerText first (it excludes hidden elements)
        channelName = channelElement.innerText?.trim() || "";

        // If innerText is empty or has issues, try textContent and clean it
        if (!channelName || channelName.includes("\n")) {
            const text = channelElement.textContent?.trim() || "";
            // Remove duplicate channel names and extra whitespace/newlines
            // Split by newlines, filter out empty strings, get unique values
            const parts = text
                .split(/\s*\n\s*/)
                .filter((p) => p.trim().length > 0);
            if (parts.length > 0) {
                // Get the first non-empty part (usually the actual channel name)
                channelName = parts[0].trim();
            }
        }

        // If still empty, try looking in child elements (common on YouTube watch pages)
        if (!channelName || channelName === "") {
            // FIRST: Check for alt attributes on child elements (especially yt-img-shadow which contains the channel avatar)
            // The alt attribute on the avatar image often contains the actual channel display name
            const imgShadow = channelElement.querySelector("yt-img-shadow") as HTMLElement;
            if (imgShadow) {
                const altText = imgShadow.getAttribute("alt")?.trim();
                if (altText && altText.length > 0) {
                    channelName = altText;
                }
            }
            
            // Also check for alt on any img elements
            if (!channelName || channelName === "") {
                const imgElement = channelElement.querySelector("img") as HTMLImageElement;
                if (imgElement) {
                    const altText = imgElement.getAttribute("alt")?.trim();
                    if (altText && altText.length > 0) {
                        channelName = altText;
                    }
                }
            }
            
            // Try common child element selectors for text content
            if (!channelName || channelName === "") {
                const childSelectors = [
                    "yt-formatted-string",
                    "#text",
                    "span",
                    "ytd-channel-name #text",
                ];
                
                for (const selector of childSelectors) {
                    const childElement = channelElement.querySelector(selector) as HTMLElement;
                    if (childElement) {
                        const childText = childElement.innerText?.trim() || childElement.textContent?.trim() || "";
                        if (childText) {
                            channelName = childText;
                            break;
                        }
                    }
                }
            }

            // If still empty, try getting all direct children and find the one with text
            if (!channelName || channelName === "") {
                const children = Array.from(channelElement.children) as HTMLElement[];
                for (const child of children) {
                    const childText = child.innerText?.trim() || child.textContent?.trim() || "";
                    if (childText && childText.length > 0) {
                        // Clean up the text (remove extra whitespace, newlines)
                        const cleaned = childText.split(/\s*\n\s*/).filter(p => p.trim().length > 0)[0]?.trim();
                        if (cleaned && cleaned.length > 0) {
                            channelName = cleaned;
                            break;
                        }
                    }
                }
            }

            // Last attempt: try to find any element with text inside
            if (!channelName || channelName === "") {
                const allElements = channelElement.querySelectorAll("*");
                for (const el of Array.from(allElements)) {
                    const text = (el as HTMLElement).innerText?.trim() || (el as HTMLElement).textContent?.trim() || "";
                    if (text && text.length > 0 && text.length < 100) { // Reasonable channel name length
                        // Skip if it looks like a URL or handle
                        if (!text.startsWith("@") && !text.startsWith("/") && !text.includes("http")) {
                            const cleaned = text.split(/\s*\n\s*/).filter(p => p.trim().length > 0)[0]?.trim();
                            if (cleaned && cleaned.length > 0) {
                                channelName = cleaned;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Fallback to attributes
        if (!channelName || channelName === "") {
            channelName =
                channelElement.getAttribute("title")?.trim() ||
                channelElement.getAttribute("aria-label")?.trim() ||
                "";
        }

        // Last resort: try to extract from href if it's a YouTube channel URL
        if (!channelName || channelName === "") {
            const href = channelElement.getAttribute("href");
            if (href) {
                // Handle YouTube channel URLs like /@ChannelName or /c/ChannelName or /user/ChannelName
                const channelMatch = href.match(/\/(?:@|c\/|user\/)([^\/\?]+)/);
                if (channelMatch && channelMatch[1]) {
                    // Convert handle format to readable name (e.g., "ZeroTOMVP" -> "Zero to MVP")
                    // This is a simple heuristic - replace capital letters with space + lowercase
                    let readableName = channelMatch[1]
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^@/, "")
                        .trim();
                    // If it looks like a handle (all caps or mixed), try to format it better
                    if (readableName && readableName.length > 0) {
                        channelName = readableName;
                    }
                }
            }
        }

        // Final fallback
        if (!channelName || channelName === "") {
            channelName = "Unknown Channel";
        }
    }
    return channelName;
}

async function extractVideoInfo(): Promise<VideoInfo[]> {
    const videos: VideoInfo[] = [];
    const processedLinks = new Set<string>();

    console.log("Starting video extraction...");

    // First, try to scroll to load all lazy-loaded content
    // Increased max scrolls to handle large playlists
    await scrollToLoadContent(100);

    // Wait a bit for any animations/transitions to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Do one final scroll to make sure we got everything
    const container = findPlaylistContainer();
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Multiple selector strategies for YouTube playlist items
    // YouTube uses different structures, so we try multiple approaches
    const playlistSelectors = [
        "ytd-playlist-video-renderer",
        "ytd-playlist-video-list-renderer ytd-playlist-video-renderer",
        "#contents ytd-playlist-video-renderer",
        "ytd-playlist-video-list-renderer #contents ytd-playlist-video-renderer",
        "#playlist-items ytd-playlist-video-renderer",
    ];

    let playlistItems: NodeListOf<Element> | null = null;
    for (const selector of playlistSelectors) {
        playlistItems = document.querySelectorAll(selector);
        if (playlistItems.length > 0) {
            console.log(
                `Found ${playlistItems.length} playlist items using selector: ${selector}`,
            );
            break;
        }
    }

    // Fallback: also check for video links in the main content area
    const videoLinks = document.querySelectorAll('a[href*="/watch?v="]');

    // Process playlist items first (more reliable)
    if (playlistItems && playlistItems.length > 0) {
        console.log(`Processing ${playlistItems.length} playlist items...`);
        playlistItems.forEach((item, index) => {
            // Try multiple selectors for the link
            let linkElement = item.querySelector(
                'a[href*="/watch?v="]',
            ) as HTMLAnchorElement;

            // If no link found, try getting it from the item's href attribute
            if (!linkElement && (item as HTMLElement).querySelector) {
                // Try finding link in nested elements
                const allLinks = item.querySelectorAll('a[href*="/watch"]');
                for (const link of Array.from(allLinks)) {
                    const href = (link as HTMLAnchorElement).href;
                    if (href && href.includes("/watch?v=")) {
                        linkElement = link as HTMLAnchorElement;
                        break;
                    }
                }
            }

            if (linkElement && linkElement.href) {
                const fullUrl = linkElement.href.startsWith("http")
                    ? linkElement.href
                    : `https://www.youtube.com${linkElement.href}`;

                // Validate and normalize YouTube URL
                const parsedUrl = parseYouTubeUrl(fullUrl);
                if (
                    parsedUrl.isValid &&
                    parsedUrl.videoId &&
                    parsedUrl.normalizedUrl
                ) {
                    if (!processedLinks.has(parsedUrl.videoId)) {
                        // Try multiple selectors for title
                        const titleElement = item.querySelector(
                            '#video-title, #video-title-link, a#video-title, ytd-playlist-video-renderer #video-title, [id="video-title"], a[id*="video-title"]',
                        ) as HTMLElement;

                        // Try multiple selectors for channel
                        const channelElement = item.querySelector(
                            'a.yt-simple-endpoint.style-scope.yt-formatted-string, ytd-channel-name a, #channel-name a, ytd-channel-name #text, #channel-name #text, ytd-channel-name, [id="channel-name"]',
                        ) as HTMLElement;

                        let videoTitle =
                            titleElement?.textContent?.trim() ||
                            titleElement?.getAttribute("title")?.trim() ||
                            titleElement?.getAttribute("aria-label")?.trim() ||
                            "Unknown Title";

                        // If title is still unknown, try getting from link text
                        if (
                            videoTitle === "Unknown Title" &&
                            linkElement.textContent
                        ) {
                            videoTitle = linkElement.textContent.trim();
                        }

                        // Extract channel name using shared function
                        const channelName = extractChannelName(channelElement);

                        videos.push({
                            channel: channelName,
                            url: parsedUrl.normalizedUrl,
                            title: videoTitle,
                        });

                        processedLinks.add(parsedUrl.videoId);
                    } else {
                        console.log(
                            `Skipping duplicate video ID: ${parsedUrl.videoId}`,
                        );
                    }
                } else {
                    // Log why URL parsing failed
                    if (index < 10) {
                        console.warn(`Item ${index} URL parsing failed:`, {
                            url: fullUrl,
                            isValid: parsedUrl.isValid,
                            videoId: parsedUrl.videoId,
                            error: parsedUrl.error,
                        });
                    }
                }
            } else if (index < 10) {
                // Log first few items that don't have links for debugging
                console.warn(`Item ${index} has no valid link:`, item);
            }
        });
        console.log(
            `Processed ${videos.length} unique videos from playlist items`,
        );
    }

    // Fallback: if no playlist items found, try to extract from general video links
    // But only if we're on a playlist page
    if (
        videos.length === 0 &&
        window.location.href.includes("/playlist?list=")
    ) {
        console.log("No playlist items found, trying fallback method");
        videoLinks.forEach((link) => {
            const anchor = link as HTMLAnchorElement;
            if (anchor.href && anchor.href.includes("/watch?v=")) {
                const fullUrl = anchor.href.startsWith("http")
                    ? anchor.href
                    : `https://www.youtube.com${anchor.href}`;

                // Validate and normalize YouTube URL
                const parsedUrl = parseYouTubeUrl(fullUrl);
                if (
                    parsedUrl.isValid &&
                    parsedUrl.videoId &&
                    parsedUrl.normalizedUrl
                ) {
                    if (!processedLinks.has(parsedUrl.videoId)) {
                        // Try to find title and channel from nearby elements
                        const container = anchor.closest(
                            "ytd-playlist-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-list-renderer",
                        );

                        const titleElement = container?.querySelector(
                            '#video-title, #video-title-link, a#video-title, [id="video-title"]',
                        ) as HTMLElement;

                        const channelElement = container?.querySelector(
                            "a.yt-simple-endpoint.style-scope.yt-formatted-string, ytd-channel-name a, #channel-name a, ytd-channel-name #text",
                        ) as HTMLElement;

                        const videoTitle =
                            titleElement?.textContent?.trim() ||
                            titleElement?.getAttribute("title")?.trim() ||
                            anchor.textContent?.trim() ||
                            "Unknown Title";

                        // Extract channel name using shared function
                        const channelName = extractChannelName(channelElement);

                        videos.push({
                            channel: channelName,
                            url: parsedUrl.normalizedUrl,
                            title: videoTitle,
                        });

                        processedLinks.add(parsedUrl.videoId);
                    }
                }
            }
        });
    }

    console.log(`Extracted ${videos.length} videos from playlist`);

    // Final verification: log all found items for debugging
    const allPlaylistItems = document.querySelectorAll(
        "ytd-playlist-video-renderer",
    );
    console.log(
        `Total playlist items found in DOM: ${allPlaylistItems.length}`,
    );
    console.log(`Unique videos extracted: ${videos.length}`);

    if (allPlaylistItems.length > videos.length) {
        console.warn(
            `Warning: Found ${allPlaylistItems.length} playlist items but only extracted ${videos.length} videos. Some items may have been skipped.`,
        );
    }

    return videos;
}

function getCurrentVideoInfo(): CurrentVideoInfoResponse {
    try {
        // Try to get video title from the page
        const titleElement = document.querySelector(
            "h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer, #title h1, ytd-watch-metadata h1",
        ) as HTMLElement;
        const videoTitle =
            titleElement?.textContent?.trim() ||
            document.title.replace(" - YouTube", "").trim() ||
            "Unknown Title";

        // Try to get channel name - prioritize selectors that work on single video pages
        // Put ytd-video-owner-renderer selectors FIRST since they're most specific for watch pages
        // Prioritize <a> tags over container elements
        let channelElement = document.querySelector(
            'ytd-video-owner-renderer a.yt-simple-endpoint, ytd-video-owner-renderer #channel-name a, ytd-video-owner-renderer ytd-channel-name a, ytd-channel-name a, #channel-name a',
        ) as HTMLElement;

        // If we didn't find an <a> tag, try finding container and then the <a> inside it
        if (!channelElement || channelElement.tagName !== 'A') {
            const container = document.querySelector(
                'ytd-video-owner-renderer, ytd-channel-name, [id="channel-name"]',
            ) as HTMLElement;
            if (container) {
                // Try to find the <a> tag inside the container
                const linkInside = container.querySelector('a') as HTMLElement;
                if (linkInside) {
                    channelElement = linkInside;
                } else {
                    channelElement = container;
                }
            }
        }

        // Check parent container - it often contains the channel name even when the <a> tag is empty
        const parentContainer = channelElement?.closest('ytd-video-owner-renderer') as HTMLElement;
        let channelName = "Unknown Channel";
        
        // First, try to get channel name from the parent container's text content
        // This works for both single-channel and collaboration videos
        if (parentContainer) {
            const parentText = parentContainer.innerText?.trim() || parentContainer.textContent?.trim() || "";
            if (parentText && parentText.length > 0 && parentText.length < 200) {
                // Clean up the text - remove extra whitespace and newlines
                const cleaned = parentText.split(/\s*\n\s*/).filter(p => p.trim().length > 0)[0]?.trim();
                if (cleaned && cleaned.length > 0) {
                    channelName = cleaned;
                }
            }
        }
        
        // If parent container didn't have text, fall back to extracting from the channelElement
        if (!channelName || channelName === "Unknown Channel") {
            channelName = extractChannelName(channelElement);
        }

        return {
            type: "CURRENT_VIDEO_INFO",
            title: videoTitle,
            channel: channelName,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error
                ? error.message
                : "Failed to extract video information";
        return {
            type: "CURRENT_VIDEO_INFO",
            title: "Unknown Title",
            channel: "Unknown Channel",
            error: errorMessage,
        };
    }
}

function handleMessage(
    message: ScanMessage | GetCurrentVideoInfoMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ScanResponse | CurrentVideoInfoResponse) => void,
): boolean {
    console.log("handleMessage called with type:", message.type);
    if (message.type === "SCAN_PLAYLIST") {
        // Handle async operation
        (async () => {
            try {
                console.log("Starting playlist scan...");
                const videos = await extractVideoInfo();
                console.log(`Scan complete, found ${videos.length} videos`);
                const response: ScanResponse = {
                    type: "SCAN_RESULT",
                    videos: videos,
                };
                console.log("Sending response:", response);
                sendResponse(response);
            } catch (error) {
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Failed to extract video information";
                console.error("Error scanning playlist:", error, errorMessage);
                sendResponse({
                    type: "SCAN_RESULT",
                    videos: [],
                    error: errorMessage,
                });
            }
        })();
        return true; // Indicates we will send a response asynchronously
    } else if (message.type === "GET_CURRENT_VIDEO_INFO") {
        console.log("Getting current video info...");
        const response = getCurrentVideoInfo();
        console.log("Current video info response:", response);
        sendResponse(response);
        return true;
    }
    console.warn("Unknown message type:", message);
    return false;
}

// Storage keys (matching popup.ts)
const STORAGE_KEY_TOKEN = "auth_token";
const STORAGE_KEY_SERVER_URL = "server_url";
const DEFAULT_API_BASE_URL = "http://localhost:1337";

// Storage helper functions
async function getStoredToken(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_TOKEN], (result) => {
            resolve(result[STORAGE_KEY_TOKEN] || null);
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

async function getApiBaseUrl(): Promise<string> {
    const storedUrl = await getStoredServerUrl();
    return storedUrl || DEFAULT_API_BASE_URL;
}

// API communication function
interface ProcessVideoResponse {
    processed: {
        channel: string;
        originalUrl: string;
        normalizedUrl: string;
        title: string;
        isValid: boolean;
        error?: string;
    };
}

async function sendVideoToAPI(
    video: VideoInfo,
): Promise<ProcessVideoResponse> {
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
        const response = await fetch(`${apiUrl}/api/process/video`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ video }),
        });

        if (!response.ok) {
            // Handle 401 Unauthorized - token might be expired
            if (response.status === 401) {
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

// User feedback system (toast notification)
function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
    // Remove existing toast if any
    const existingToast = document.getElementById("ekko-playlist-toast");
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.id = "ekko-playlist-toast";
    toast.textContent = message;
    
    // Style the toast to match YouTube's design
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        font-family: "Roboto", "Arial", sans-serif;
        font-size: 14px;
        font-weight: 400;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        word-wrap: break-word;
        transition: opacity 0.3s ease;
        ${type === "success" 
            ? "background-color: #0f9d58; color: white;" 
            : type === "error" 
            ? "background-color: #ea4335; color: white;" 
            : "background-color: #1f1f1f; color: white;"
        }
    `;

    // Check if YouTube is in dark mode
    const htmlElement = document.documentElement;
    const isDarkMode = htmlElement.getAttribute("dark") !== null || 
                       window.getComputedStyle(htmlElement).colorScheme === "dark";
    
    if (!isDarkMode) {
        // Light mode adjustments
        if (type === "info") {
            toast.style.backgroundColor = "#f1f1f1";
            toast.style.color = "#030303";
        }
    }

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Extract video info from menu context
function extractVideoInfoFromMenu(menuElement: HTMLElement): VideoInfo | null {
    try {
        // Find the closest video container
        const videoContainers = [
            "ytd-video-renderer",
            "ytd-rich-item-renderer",
            "ytd-compact-video-renderer",
            "ytd-grid-video-renderer",
            "ytd-playlist-video-renderer",
            "ytd-watch-flexy", // For watch page
        ];

        let videoContainer: HTMLElement | null = null;
        for (const selector of videoContainers) {
            videoContainer = menuElement.closest(selector) as HTMLElement;
            if (videoContainer) break;
        }

        // If no container found, try finding from the menu's parent structure
        if (!videoContainer) {
            // Try to find video link in the menu's context
            const videoLink = menuElement.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement;
            if (videoLink) {
                videoContainer = videoLink.closest("ytd-menu-popup-renderer")?.parentElement as HTMLElement;
            }
        }

        // If still no container, try to find from document (for watch page)
        if (!videoContainer && window.location.pathname === "/watch") {
            videoContainer = document.querySelector("ytd-watch-flexy") as HTMLElement;
        }

        if (!videoContainer) {
            console.warn("Could not find video container for menu");
            return null;
        }

        // Extract video URL
        let videoUrl: string | null = null;
        const videoLink = videoContainer.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement;
        if (videoLink && videoLink.href) {
            videoUrl = videoLink.href;
        } else if (window.location.pathname === "/watch") {
            // On watch page, use current URL
            videoUrl = window.location.href;
        }

        if (!videoUrl) {
            console.warn("Could not extract video URL");
            return null;
        }

        // Normalize URL
        const parsedUrl = parseYouTubeUrl(videoUrl);
        if (!parsedUrl.isValid || !parsedUrl.normalizedUrl) {
            console.warn("Invalid YouTube URL:", parsedUrl.error);
            return null;
        }

        // Extract title
        let title = "Unknown Title";
        const titleSelectors = [
            "#video-title",
            "#video-title-link",
            "a#video-title",
            "h1.ytd-watch-metadata yt-formatted-string",
            "h1.ytd-video-primary-info-renderer",
        ];

        for (const selector of titleSelectors) {
            const titleElement = videoContainer.querySelector(selector) as HTMLElement;
            if (titleElement) {
                title = titleElement.textContent?.trim() || 
                        titleElement.getAttribute("title")?.trim() || 
                        titleElement.getAttribute("aria-label")?.trim() || 
                        "Unknown Title";
                if (title !== "Unknown Title") break;
            }
        }

        // Extract channel
        const channelName = extractChannelName(
            videoContainer.querySelector(
                'a.yt-simple-endpoint.style-scope.yt-formatted-string, ytd-channel-name a, #channel-name a, ytd-channel-name #text, ytd-video-owner-renderer a'
            ) as HTMLElement
        );

        return {
            channel: channelName,
            url: parsedUrl.normalizedUrl,
            title: title,
        };
    } catch (error) {
        console.error("Error extracting video info from menu:", error);
        return null;
    }
}

// Check if menu is associated with a video (not channel or other type)
function isVideoMenu(menuElement: HTMLElement): boolean {
    // Check if menu is near a video container
    const videoContainers = [
        "ytd-video-renderer",
        "ytd-rich-item-renderer",
        "ytd-compact-video-renderer",
        "ytd-grid-video-renderer",
        "ytd-playlist-video-renderer",
    ];

    // Check if we're on a watch page
    if (window.location.pathname === "/watch") {
        return true;
    }

    // Check if menu is within or near a video container
    for (const selector of videoContainers) {
        const container = menuElement.closest(selector);
        if (container) {
            return true;
        }
    }

    // Check if menu contains video-related links
    const videoLink = menuElement.querySelector('a[href*="/watch?v="]');
    if (videoLink) {
        return true;
    }

    return false;
}

// Inject menu item into YouTube dropdown menu
async function injectMenuItem(menuElement: HTMLElement): Promise<void> {
    // Check if user is logged in
    const token = await getStoredToken();
    if (!token) {
        // User not logged in, don't inject menu item
        return;
    }

    // Check if menu item already exists
    const existingItem = menuElement.querySelector("#ekko-playlist-menu-item");
    if (existingItem) {
        return; // Already injected
    }

    // Check if this is a video menu
    if (!isVideoMenu(menuElement)) {
        return; // Not a video menu, skip
    }

    try {
        // Find the menu items container
        // YouTube uses different structures, try multiple selectors
        const menuContainers = [
            "ytd-menu-popup-renderer #items",
            "ytd-menu-popup-renderer ytd-menu-service-item-renderer",
            "#items.ytd-menu-popup-renderer",
        ];

        let itemsContainer: HTMLElement | null = null;
        for (const selector of menuContainers) {
            itemsContainer = menuElement.querySelector(selector) as HTMLElement;
            if (itemsContainer) break;
        }

        // If no items container found, try to find any menu service item to clone
        if (!itemsContainer) {
            const firstMenuItem = menuElement.querySelector("ytd-menu-service-item-renderer") as HTMLElement;
            if (firstMenuItem && firstMenuItem.parentElement) {
                itemsContainer = firstMenuItem.parentElement as HTMLElement;
            }
        }

        if (!itemsContainer) {
            console.warn("Could not find menu items container");
            return;
        }

        // Create menu item element
        // Try to clone an existing menu item for structure
        const existingMenuItem = itemsContainer.querySelector("ytd-menu-service-item-renderer") as HTMLElement;
        let menuItem: HTMLElement;

        if (existingMenuItem) {
            // Clone existing structure
            menuItem = existingMenuItem.cloneNode(true) as HTMLElement;
            menuItem.id = "ekko-playlist-menu-item";
            menuItem.removeAttribute("role"); // Remove role to avoid conflicts
            
            // Clear content and add our content
            const linkElement = menuItem.querySelector("a, ytd-menu-service-item-renderer a") as HTMLElement;
            if (linkElement) {
                linkElement.textContent = "";
                linkElement.setAttribute("role", "menuitem");
                
                // Add icon (using + symbol)
                const icon = document.createElement("span");
                icon.textContent = "+";
                icon.style.cssText = "margin-right: 16px; font-size: 20px; font-weight: bold;";
                linkElement.appendChild(icon);
                
                // Add text
                const text = document.createTextNode("Add to Ekko Playlist");
                linkElement.appendChild(text);
            }
        } else {
            // Fallback: create simple menu item
            menuItem = document.createElement("div");
            menuItem.id = "ekko-playlist-menu-item";
            menuItem.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                font-family: "Roboto", "Arial", sans-serif;
                font-size: 14px;
            `;
            
            const icon = document.createElement("span");
            icon.textContent = "+";
            icon.style.cssText = "margin-right: 16px; font-size: 20px; font-weight: bold;";
            menuItem.appendChild(icon);
            
            const text = document.createTextNode("Add to Ekko Playlist");
            menuItem.appendChild(text);
        }

        // Add click handler
        menuItem.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Extract video info
            const videoInfo = extractVideoInfoFromMenu(menuElement);
            if (!videoInfo) {
                showToast("Failed to extract video information", "error");
                return;
            }

            // Show loading feedback
            showToast("Adding to Ekko Playlist...", "info");

            try {
                // Send to API
                await sendVideoToAPI(videoInfo);
                showToast("Video added to Ekko Playlist!", "success");
                
                // Close the menu (click outside or press escape)
                const menuPopup = menuElement.closest("ytd-menu-popup-renderer");
                if (menuPopup) {
                    // Try to close menu by clicking outside or dispatching escape
                    document.body.click();
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error("Error adding video to playlist:", error);
                showToast(`Error: ${errorMessage}`, "error");
            }
        });

        // Insert at the beginning of the menu (after "Add to queue" if it exists)
        const addToQueueItem = Array.from(itemsContainer.children).find(
            (item) => {
                const text = item.textContent?.toLowerCase() || "";
                return text.includes("add to queue") || text.includes("queue");
            }
        );

        if (addToQueueItem && addToQueueItem.nextSibling) {
            itemsContainer.insertBefore(menuItem, addToQueueItem.nextSibling);
        } else {
            // Insert at the beginning
            itemsContainer.insertBefore(menuItem, itemsContainer.firstChild);
        }
    } catch (error) {
        console.error("Error injecting menu item:", error);
    }
}

// MutationObserver to detect YouTube menu openings
let menuObserver: MutationObserver | null = null;
let debounceTimeout: NodeJS.Timeout | null = null;

function setupMenuObserver(): void {
    // Clean up existing observer
    if (menuObserver) {
        menuObserver.disconnect();
    }

    // Create new observer
    menuObserver = new MutationObserver((mutations) => {
        // Debounce to avoid multiple rapid calls
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        debounceTimeout = setTimeout(() => {
            // Look for YouTube menu popups
            const menuSelectors = [
                "ytd-menu-popup-renderer",
                "ytd-menu-service-item-renderer",
            ];

            for (const selector of menuSelectors) {
                const menus = document.querySelectorAll(selector);
                menus.forEach((menu) => {
                    const menuElement = menu as HTMLElement;
                    // Check if menu is visible
                    if (menuElement.offsetParent !== null) {
                        injectMenuItem(menuElement).catch((error) => {
                            console.error("Error in injectMenuItem:", error);
                        });
                    }
                });
            }
        }, 100); // 100ms debounce
    });

    // Start observing
    menuObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// Initialize menu observer when content script loads
setupMenuObserver();

console.log("Content script loaded and ready");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    return handleMessage(message, sender, sendResponse);
});

// Export nothing to avoid module conflicts
export {};
