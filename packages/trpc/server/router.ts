// MODIFIED for BizRethink: import the bizrethink namespace router. All
// BizRethink-specific TRPC procedures (Phase B per-org SMTP, Phase C
// instance signing config, etc.) live under `bizrethink.*`. See overlay 010.
import { bizrethinkRouter } from '@bizrethink/customizations/server-only/trpc/router';

import { adminRouter } from './admin-router/router';
import { apiTokenRouter } from './api-token-router/router';
import { authRouter } from './auth-router/router';
import { documentRouter } from './document-router/router';
import { embeddingPresignRouter } from './embedding-router/_router';
import { enterpriseRouter } from './enterprise-router/router';
import { envelopeRouter } from './envelope-router/router';
import { fieldRouter } from './field-router/router';
import { folderRouter } from './folder-router/router';
import { organisationRouter } from './organisation-router/router';
import { profileRouter } from './profile-router/router';
import { recipientRouter } from './recipient-router/router';
import { teamRouter } from './team-router/router';
import { templateRouter } from './template-router/router';
import { router } from './trpc';
import { webhookRouter } from './webhook-router/router';

export const appRouter = router({
  // MODIFIED for BizRethink: bizrethink namespace for additive procedures.
  // See overlay 010.
  bizrethink: bizrethinkRouter,
  enterprise: enterpriseRouter,
  envelope: envelopeRouter,
  auth: authRouter,
  profile: profileRouter,
  document: documentRouter,
  field: fieldRouter,
  folder: folderRouter,
  recipient: recipientRouter,
  admin: adminRouter,
  organisation: organisationRouter,
  apiToken: apiTokenRouter,
  team: teamRouter,
  template: templateRouter,
  webhook: webhookRouter,
  embeddingPresign: embeddingPresignRouter,
});

export type AppRouter = typeof appRouter;
