# Ekko Playlist Web

A TanStack Start web application for managing music playlists with Better Auth authentication.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
Create a `.env` file in the `apps/web` directory with:
```
DB_URL=postgres://user:password@localhost:5432/ekko_playlist?sslmode=disable
VITE_API_URL=http://localhost:1337
```

3. Set up the database:
The app uses Better Auth which requires its own database tables. Run the database migrations:
```bash
bun run db:push
```
This will create the required tables (`user`, `session`, `account`, `verification`) in your database.

4. Run the development server:
```bash
bun run dev
```

The app will be available at `http://localhost:3000`

## Features

- Better Auth email/password authentication
- Simple home page with login/signup
- User dashboard after authentication
- Modern UI with Tailwind CSS v4

## Database Scripts

- `bun run db:push` - Push schema changes to database (for development)
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Run migrations

## Building

To build for production:
```bash
npm run build
```

To preview the production build:
```bash
npm run serve
```

