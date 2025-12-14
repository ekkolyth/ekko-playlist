import { ScanMessage, ScanResponse, VideoInfo, GetCurrentVideoInfoMessage, CurrentVideoInfoResponse } from './types';
import { parseYouTubeUrl } from './youtube-url-parser';

function extractVideoInfo(): VideoInfo[] {
  const videos: VideoInfo[] = [];
  
  // YouTube playlist page structure - look for video links in the playlist container
  // Selector for playlist items (works for both old and new YouTube UI)
  const playlistItems = document.querySelectorAll('ytd-playlist-video-renderer, ytd-playlist-video-list-renderer ytd-playlist-video-renderer');
  
  // Fallback: also check for video links in the main content area
  const videoLinks = document.querySelectorAll('a[href*="/watch?v="]');
  
  const processedLinks = new Set<string>();

  // Process playlist items first (more reliable)
  playlistItems.forEach((item) => {
    const linkElement = item.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement;
    const titleElement = item.querySelector('#video-title, #video-title-link, a#video-title') as HTMLElement;
    const channelElement = item.querySelector('a.yt-simple-endpoint.style-scope.yt-formatted-string, ytd-channel-name a, #channel-name a') as HTMLElement;

    if (linkElement && linkElement.href) {
      const fullUrl = linkElement.href.startsWith('http') 
        ? linkElement.href 
        : `https://www.youtube.com${linkElement.href}`;
      
      // Validate and normalize YouTube URL
      const parsedUrl = parseYouTubeUrl(fullUrl);
      if (parsedUrl.isValid && parsedUrl.videoId && parsedUrl.normalizedUrl) {
        if (!processedLinks.has(parsedUrl.videoId)) {
          const videoTitle = titleElement?.textContent?.trim() || 'Unknown Title';
          const channelName = channelElement?.textContent?.trim() || 'Unknown Channel';

          videos.push({
            channelName: channelName,
            link: parsedUrl.normalizedUrl,
            videoTitle: videoTitle
          });

          processedLinks.add(parsedUrl.videoId);
        }
      }
    }
  });

  // Fallback: if no playlist items found, try to extract from general video links
  if (videos.length === 0) {
    videoLinks.forEach((link) => {
      const anchor = link as HTMLAnchorElement;
      if (anchor.href) {
        const fullUrl = anchor.href.startsWith('http') 
          ? anchor.href 
          : `https://www.youtube.com${anchor.href}`;
        
          // Validate and normalize YouTube URL
          const parsedUrl = parseYouTubeUrl(fullUrl);
          if (parsedUrl.isValid && parsedUrl.videoId && parsedUrl.normalizedUrl) {
            if (!processedLinks.has(parsedUrl.videoId)) {
              // Try to find title and channel from nearby elements
              const container = anchor.closest('ytd-playlist-video-renderer, ytd-video-renderer, ytd-grid-video-renderer');
              const titleElement = container?.querySelector('#video-title, #video-title-link, a#video-title') as HTMLElement;
              const channelElement = container?.querySelector('a.yt-simple-endpoint.style-scope.yt-formatted-string, ytd-channel-name a, #channel-name a') as HTMLElement;

              const videoTitle = titleElement?.textContent?.trim() || anchor.textContent?.trim() || 'Unknown Title';
              const channelName = channelElement?.textContent?.trim() || 'Unknown Channel';

              videos.push({
                channelName: channelName,
                link: parsedUrl.normalizedUrl,
                videoTitle: videoTitle
              });

              processedLinks.add(parsedUrl.videoId);
            }
          }
      }
    });
  }

  return videos;
}

function getCurrentVideoInfo(): CurrentVideoInfoResponse {
  try {
    // Try to get video title from the page
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer, #title h1, ytd-watch-metadata h1') as HTMLElement;
    const videoTitle = titleElement?.textContent?.trim() || document.title.replace(' - YouTube', '').trim() || 'Unknown Title';

    // Try to get channel name
    const channelElement = document.querySelector('ytd-channel-name a, #channel-name a, ytd-video-owner-renderer a') as HTMLElement;
    const channelName = channelElement?.textContent?.trim() || 'Unknown Channel';

    return {
      type: 'CURRENT_VIDEO_INFO',
      videoTitle: videoTitle,
      channelName: channelName
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to extract video information';
    return {
      type: 'CURRENT_VIDEO_INFO',
      videoTitle: 'Unknown Title',
      channelName: 'Unknown Channel',
      error: errorMessage
    };
  }
}

function handleMessage(
  message: ScanMessage | GetCurrentVideoInfoMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: ScanResponse | CurrentVideoInfoResponse) => void
): boolean {
  if (message.type === 'SCAN_PLAYLIST') {
    try {
      const videos = extractVideoInfo();
      sendResponse({
        type: 'SCAN_RESULT',
        videos: videos
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract video information';
      sendResponse({
        type: 'SCAN_RESULT',
        videos: [],
        error: errorMessage
      });
    }
    return true; // Indicates we will send a response asynchronously
  } else if (message.type === 'GET_CURRENT_VIDEO_INFO') {
    const response = getCurrentVideoInfo();
    sendResponse(response);
    return true;
  }
  return false;
}

chrome.runtime.onMessage.addListener(handleMessage);

