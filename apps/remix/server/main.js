/**
 * This is the main entry point for the server which will launch the RR7 application
 * and spin up auth, api, etc.
 *
 * Note:
 *  This file will be copied to the build folder during build time.
 *  Running this file will not work without a build.
 */
// MODIFIED for BizRethink (overlay 033): Sentry instrumentation MUST be
// imported before anything else so it can hook Node's exception/rejection
// handlers and HTTP module before they're loaded by other modules. The init
// is a no-op unless NEXT_PRIVATE_SENTRY_DSN is set AND NODE_ENV=production,
// so this import is harmless on fresh installs.
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import handle from 'hono-react-router-adapter/node';

import { getLoadContext } from './hono/server/load-context.js';
import server from './hono/server/router.js';
import * as build from './index.js';
import './instrument.mjs';

server.use(
  serveStatic({
    root: 'build/client',
    onFound: (path, c) => {
      if (path.startsWith('build/client/assets')) {
        // Hard cache assets with hashed file names.
        c.header('Cache-Control', 'public, immutable, max-age=31536000');
      } else {
        // Cache with revalidation for rest of static files.
        c.header('Cache-Control', 'public, max-age=0, stale-while-revalidate=86400');
      }
    },
  }),
);

const handler = handle(build, server, { getLoadContext });

const port = parseInt(process.env.PORT || '3000', 10);

serve({ fetch: handler.fetch, port });
