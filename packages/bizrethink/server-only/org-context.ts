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
// Trade-off: code paths that DON'T go through getEmailContext (rare;
// internal/system emails) get the env-default mailer regardless of which
// org they're nominally about. Acceptable for v1 — if this becomes a real
// problem, callers can wrap their async work in
// `orgContextStorage.run({ orgId }, async () => ...)` explicitly.

export type OrgContext = {
  orgId: string | undefined;
};

export const orgContextStorage = new AsyncLocalStorage<OrgContext>();
