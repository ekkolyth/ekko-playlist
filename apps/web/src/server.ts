// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from '@tanstack/react-start/server';

const handler = defineHandlerCallback(async (ctx) => {
  const res = await defaultStreamHandler(ctx);
  return res;
});

const fetch = createStartHandler(handler);
export default { fetch };

