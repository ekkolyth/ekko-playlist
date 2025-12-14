import { ScanMessage, ScanResponse, VideoInfo, GetCurrentVideoInfoMessage, CurrentVideoInfoResponse } from './types';
import { parseYouTubeUrl, isValidYouTubeUrl } from './youtube-url-parser';

const scanButton = document.getElementById('scanButton') as HTMLButtonElement;
const saveUrlButton = document.getElementById('saveUrlButton') as HTMLButtonElement;
const urlInput = document.getElementById('urlInput') as HTMLInputElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

function setStatus(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

function clearStatus(): void {
  statusDiv.textContent = '';
  statusDiv.className = 'status';
}

async function scanPlaylist(): Promise<void> {
  if (!scanButton || !statusDiv) {
    return;
  }

  scanButton.disabled = true;
  setStatus('Scanning playlist...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    if (!tab.url) {
      throw new Error('No URL found for current tab');
    }

    if (!isValidYouTubeUrl(tab.url)) {
      throw new Error('Current page is not a valid YouTube URL');
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PLAYLIST' } as ScanMessage);

    if (!response) {
      throw new Error('No response from content script');
    }

    const scanResponse = response as ScanResponse;

    if (scanResponse.error) {
      throw new Error(scanResponse.error);
    }

    if (!scanResponse.videos || scanResponse.videos.length === 0) {
      setStatus('No videos found on this page', 'error');
      scanButton.disabled = false;
      return;
    }

    const jsonData = JSON.stringify(scanResponse.videos, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube-playlist-${timestamp}.json`;

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    setStatus(`Saved ${scanResponse.videos.length} videos!`, 'success');
    
    setTimeout(() => {
      clearStatus();
    }, 3000);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    setStatus(`Error: ${errorMessage}`, 'error');
  } finally {
    scanButton.disabled = false;
  }
}

async function saveCurrentUrl(): Promise<void> {
  if (!saveUrlButton || !urlInput || !statusDiv) {
    return;
  }

  saveUrlButton.disabled = true;
  setStatus('Validating URL...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id || !tab.url) {
      throw new Error('No active tab found');
    }

    // Validate YouTube URL
    const parsedUrl = parseYouTubeUrl(tab.url);
    
    if (!parsedUrl.isValid || !parsedUrl.normalizedUrl) {
      throw new Error(parsedUrl.error || 'Invalid YouTube URL');
    }

    // Update input with current URL
    urlInput.value = parsedUrl.normalizedUrl;

    // Create a video info object for the current page
    // We'll need to get the title and channel from the page if possible
    let videoInfo: VideoInfo;
    
    try {
      // Try to get video info from the page
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_VIDEO_INFO' } as GetCurrentVideoInfoMessage) as CurrentVideoInfoResponse | undefined;
      
      if (response && response.type === 'CURRENT_VIDEO_INFO' && response.videoTitle && response.channelName) {
        videoInfo = {
          channelName: response.channelName,
          link: parsedUrl.normalizedUrl,
          videoTitle: response.videoTitle
        };
      } else {
        // Fallback: use page title or default values
        const pageTitle = tab.title?.replace(' - YouTube', '').trim() || 'Unknown Title';
        videoInfo = {
          channelName: 'Unknown Channel',
          link: parsedUrl.normalizedUrl,
          videoTitle: pageTitle
        };
      }
    } catch {
      // If content script fails, use fallback
      const pageTitle = tab.title?.replace(' - YouTube', '').trim() || 'Unknown Title';
      videoInfo = {
        channelName: 'Unknown Channel',
        link: parsedUrl.normalizedUrl,
        videoTitle: pageTitle
      };
    }

    // Save to JSON file
    const jsonData = JSON.stringify([videoInfo], null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `youtube-video-${timestamp}.json`;

    await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    setStatus('URL saved successfully!', 'success');
    
    setTimeout(() => {
      clearStatus();
    }, 3000);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    setStatus(`Error: ${errorMessage}`, 'error');
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url) {
      urlInput.value = tab.url;
    }
  } catch {
    // Ignore errors during initialization
  }
}

scanButton?.addEventListener('click', scanPlaylist);
saveUrlButton?.addEventListener('click', saveCurrentUrl);

// Initialize URL input when popup opens
initializeUrlInput();

