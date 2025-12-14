// Background service worker for the extension
// Currently minimal, but can be extended for future features

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Playlist Scanner extension installed');
});

