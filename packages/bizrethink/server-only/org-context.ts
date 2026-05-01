import { AsyncLocalStorage } from 'node:async_hooks';

// Phase B (overlay 010): per-request org context via AsyncLocalStorage.
//
// The mailer Proxy in packages/email/mailer.ts reads this storage at
// `sendMail` time to decide which transporter to use. The storage is
// populated by `getEmailContext` (packages/lib/server-only/email/
// get-email-context.ts) — every email-sending code path goes through there
// to resolve sender + reply-to, so by setting the ALS in that function we
// cover all 26 mailer.sendMail call sites without modifying any of them.
//
// Why ALS:
//   - Zero changes to existing mailer.sendMail callers
//   - Async-aware (propagates through await boundaries automatically)
//   - Falls through to env-default mailer cleanly when ALS is empty
//
// Why globalThis singleton:
//   The Remix/vite bundler emits MULTIPLE COPIES of this module
//   (build/server/assets/org-context-*.js + build/server/hono/...). Each
//   copy gets its own AsyncLocalStorage instance, so `enterWith` on one
//   instance is invisible to `getStore` on the other. Pin the instance
//   to globalThis so all copies see the same storage. Verified failure
//   mode: shipped 2026-04-30 v1 with naive `new AsyncLocalStorage()` —
//   ALS appeared not to propagate; Postmark Activity log showed all org
//   mail going through env-default account regardless of per-org SMTP
//   config. Fixed by this globalThis pattern.

export type OrgContext = {
  orgId: string | undefined;
};

declare global {
  // eslint-disable-next-line no-var
  var __bizrethinkOrgContextStorage: AsyncLocalStorage<OrgContext> | undefined;
}

// NOTE: This module is currently UNUSED by overlay 010 v2 (the explicit-arg
// approach in mailer.ts replaces the ALS dance). It is retained as a stub
// because per-org-mailer.ts still imports from this directory. If a future
// per-request orgContext use case appears (e.g. webhook signing tracking),
// this storage is ready — but be aware enterWith doesn't propagate UP the
// async stack. Use AsyncLocalStorage.run() for scoping, never enterWith
// inside an awaited callee.
export const orgContextStorage: AsyncLocalStorage<OrgContext> =
  globalThis.__bizrethinkOrgContextStorage ??
  (globalThis.__bizrethinkOrgContextStorage = new AsyncLocalStorage<OrgContext>());
