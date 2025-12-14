# YouTube Playlist Scanner Chrome Extension

A Chrome extension that scans YouTube playlist pages and saves video information (channel name, link, video title) to a JSON file.

## Features

- Scans YouTube playlist pages for all video links
- Extracts channel name, video title, and link for each video
- Saves data to a downloadable JSON file
- Simple popup interface with "Scan Playlist" button

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Create extension icons:
   - Open `scripts/create-icons.html` in your browser
   - Click each "Download" button to save the icon files
   - Place the downloaded PNG files (icon16.png, icon48.png, icon128.png) in the `icons/` folder
   - Or create your own icons and place them in the `icons/` folder

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Usage

1. Navigate to a YouTube playlist page
2. Click the extension icon in the Chrome toolbar
3. Click "Scan Playlist" button
4. The extension will scan the page and download a JSON file with all video information

## Project Structure

```
├── src/
│   ├── types.ts          # TypeScript type definitions
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Popup styles
│   ├── popup.ts          # Popup logic
│   ├── content.ts        # Content script for page crawling
│   └── background.ts     # Background service worker
├── manifest.json         # Chrome extension manifest
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Building

The TypeScript files are compiled to JavaScript in the `dist` folder. Run:

```bash
npm run build
```

For development with auto-rebuild on changes:

```bash
npm run watch
```

## Notes

- The extension requires access to YouTube pages
- Make sure you're on a YouTube playlist page when scanning
- The JSON file will be saved with a timestamp in the filename

