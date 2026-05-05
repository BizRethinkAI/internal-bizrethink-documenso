/**
 * Sentry server-side instrumentation for Pacta backend.
 *
 * This file is imported FIRST in main.js so Sentry can hook Node's
 * exception/rejection handlers and HTTP module before anything else loads.
 *
 * Per Sentry's docs:
 *   "Sentry should be initialized as early as possible in your application's
 *    lifecycle. This is so that the SDK is able to capture all errors that
 *    might occur."
 *
 * Init runs only when:
 *   - NEXT_PRIVATE_SENTRY_DSN is set (operator opted in)
 *   - NODE_ENV === 'production' (no dev noise)
 *
 * Browser-side errors are captured by PostHog (apps/remix/app/entry.client.tsx
 * configures `capture_exceptions: true`). Server-side previously had nothing —
 * this fills that gap.
 *
 * Bundled as .mjs (not .ts) so it works without compilation: copied verbatim
 * from server/instrument.mjs to build/server/instrument.mjs by .bin/build.sh
 * (same pattern as main.js).
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.NEXT_PRIVATE_SENTRY_DSN;
const nodeEnv = process.env.NODE_ENV;

// Deny-list pattern: capture in production OR when NODE_ENV is unset
// (Documenso's docker image doesn't set NODE_ENV at runtime; the
// react-router build sets it only during compilation). Skip explicitly
// on development/test where Sentry events would be noise.
const shouldEnable = dsn && nodeEnv !== 'development' && nodeEnv !== 'test';

if (shouldEnable) {
  Sentry.init({
    dsn,

    environment: process.env.NODE_ENV,

    // Capture 100% of errors (5K/mo free Sentry quota easily covers this
    // for Pacta volume).
    sampleRate: 1.0,

    // Capture 10% of transactions for performance baseline. Mirrors
    // CircularPay's setting.
    tracesSampleRate: 0.1,

    // Source maps not uploaded yet — set SENTRY_AUTH_TOKEN later for
    // readable stack traces. Until then, traces show minified names.
    // (Same trade-off CircularPay made.)
    sendDefaultPii: false,

    // Scrub sensitive data — fintech/PCI hygiene.
    beforeSend(event) {
      // Query strings can contain signing tokens (e.g. /sign/:token URLs)
      // that would be leaked into Sentry events otherwise.
      if (event.request?.query_string) {
        event.request.query_string = '[Filtered]';
      }

      // Cookies can contain session tokens — strip server-side.
      if (event.request?.cookies) {
        event.request.cookies = {};
      }

      // Authorization headers are session-bearing.
      if (event.request?.headers) {
        const headers = event.request.headers;

        if (typeof headers === 'object' && !Array.isArray(headers)) {
          if ('authorization' in headers) {
            headers.authorization = '[Filtered]';
          }

          if ('cookie' in headers) {
            headers.cookie = '[Filtered]';
          }
        }
      }

      return event;
    },
  });
}
