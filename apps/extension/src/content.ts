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

                        // Extract channel name, cleaning up duplicates and newlines
                        let channelName = "Unknown Channel";
                        if (channelElement) {
                            // Try innerText first (it excludes hidden elements)
                            channelName =
                                channelElement.innerText?.trim() || "";

                            // If innerText is empty or has issues, try textContent and clean it
                            if (!channelName || channelName.includes("\n")) {
                                const text =
                                    channelElement.textContent?.trim() || "";
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

                            // Fallback to attributes
                            if (!channelName || channelName === "") {
                                channelName =
                                    channelElement
                                        .getAttribute("title")
                                        ?.trim() ||
                                    channelElement
                                        .getAttribute("aria-label")
                                        ?.trim() ||
                                    "Unknown Channel";
                            }
                        }

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

                        // Extract channel name, cleaning up duplicates and newlines
                        let channelName = "Unknown Channel";
                        if (channelElement) {
                            // Try innerText first (it excludes hidden elements)
                            channelName =
                                channelElement.innerText?.trim() || "";

                            // If innerText is empty or has issues, try textContent and clean it
                            if (!channelName || channelName.includes("\n")) {
                                const text =
                                    channelElement.textContent?.trim() || "";
                                // Remove duplicate channel names and extra whitespace/newlines
                                const parts = text
                                    .split(/\s*\n\s*/)
                                    .filter((p) => p.trim().length > 0);
                                if (parts.length > 0) {
                                    channelName = parts[0].trim();
                                }
                            }

                            // Fallback to attributes
                            if (!channelName || channelName === "") {
                                channelName =
                                    channelElement
                                        .getAttribute("title")
                                        ?.trim() ||
                                    channelElement
                                        .getAttribute("aria-label")
                                        ?.trim() ||
                                    "Unknown Channel";
                            }
                        }

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

        // Try to get channel name
        const channelElement = document.querySelector(
            "ytd-channel-name a, #channel-name a, ytd-video-owner-renderer a",
        ) as HTMLElement;

        // Extract channel name, cleaning up duplicates and newlines
        let channelName = "Unknown Channel";
        if (channelElement) {
            // Try innerText first (it excludes hidden elements)
            channelName = channelElement.innerText?.trim() || "";

            // If innerText is empty or has issues, try textContent and clean it
            if (!channelName || channelName.includes("\n")) {
                const text = channelElement.textContent?.trim() || "";
                // Remove duplicate channel names and extra whitespace/newlines
                const parts = text
                    .split(/\s*\n\s*/)
                    .filter((p) => p.trim().length > 0);
                if (parts.length > 0) {
                    channelName = parts[0].trim();
                }
            }

            // Fallback to attributes
            if (!channelName || channelName === "") {
                channelName =
                    channelElement.getAttribute("title")?.trim() ||
                    channelElement.getAttribute("aria-label")?.trim() ||
                    "Unknown Channel";
            }
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

console.log("Content script loaded and ready");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    return handleMessage(message, sender, sendResponse);
});

// Export nothing to avoid module conflicts
export {};
