# Ekko Playlist Web

A TanStack Start web application for managing music playlists with Clerk authentication.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the `apps/web` directory with:
```
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Features

- Clerk authentication integration
- Simple home page with login button
- User dashboard after authentication
- Modern UI with Tailwind CSS v4

## Building

To build for production:
```bash
npm run build
```

To preview the production build:
```bash
npm run serve
```

