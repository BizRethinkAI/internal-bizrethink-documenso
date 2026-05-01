import { z } from 'zod';

import { ZSiteSettingsBaseSchema } from '@documenso/lib/server-only/site-settings/schemas/_base';

// Phase I (overlay 017): site.webhook site-setting.
//
// Holds the SSRF bypass host list used by webhook delivery to allow private
// or loopback targets (e.g. Docker-internal services). Replaces the
// NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS env var.

export const SITE_SETTINGS_WEBHOOK_ID = 'site.webhook';

export const ZSiteSettingsWebhookSchema = ZSiteSettingsBaseSchema.extend({
  id: z.literal(SITE_SETTINGS_WEBHOOK_ID),
  data: z
    .object({
      ssrfBypassHosts: z.array(z.string().min(1)).default([]),
    })
    .optional()
    .default({ ssrfBypassHosts: [] }),
});

export type TSiteSettingsWebhookSchema = z.infer<typeof ZSiteSettingsWebhookSchema>;
