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

export const orgContextStorage: AsyncLocalStorage<OrgContext> =
  globalThis.__bizrethinkOrgContextStorage ??
  (globalThis.__bizrethinkOrgContextStorage = new AsyncLocalStorage<OrgContext>());

// DEBUG (Phase B Diagnostic — strip after bisection): tag the instance with
// a unique 6-char id at module-init so we can detect whether multiple
// bundled module copies actually share the singleton, vs each evaluating
// the file independently and creating distinct ALS instances.
if (!(orgContextStorage as unknown as { __id?: string }).__id) {
  (orgContextStorage as unknown as { __id: string }).__id = Math.random().toString(36).slice(2, 8);
}
// eslint-disable-next-line no-console
console.log('[bizrethink][als-init]', {
  id: (orgContextStorage as unknown as { __id: string }).__id,
  hasGlobal: !!globalThis.__bizrethinkOrgContextStorage,
  pid: process.pid,
});
