// src/server.ts
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';

// TanStack Start will handle /api/auth routes via the file-based routing
// No need to manually handle auth routes here
const handler = defaultStreamHandler;

const fetch = createStartHandler(handler);
export default { fetch };
