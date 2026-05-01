import { router } from '@documenso/trpc/server/trpc';

import { instanceSigningRouter } from './instance-signing-router';
import { orgSmtpRouter } from './org-smtp-router';

// Top-level BizRethink TRPC router. Wired into the main `appRouter` via
// overlay 010 (modifies `packages/trpc/server/router.ts` to add a
// `bizrethink: bizrethinkRouter` namespace).
//
// Convention: every namespace under `bizrethink.*` is an additive feature
// from this package — none of them touch upstream Documenso routes.
//
// Phase B added `organisationSmtp` (per-org SMTP credentials).
// Phase C adds `instanceSigning` (instance-wide cert + TSA + contact info).

export const bizrethinkRouter = router({
  organisationSmtp: orgSmtpRouter,
  instanceSigning: instanceSigningRouter,
});
