import { z } from 'zod';

import { ZSiteSettingsBaseSchema } from '@documenso/lib/server-only/site-settings/schemas/_base';

// Phase G (overlay 015): site.captcha site-setting.
//
// Cloudflare Turnstile config replacing NEXT_PUBLIC_TURNSTILE_SITE_KEY +
// NEXT_PRIVATE_TURNSTILE_SECRET_KEY. The secretKey is NOT encrypted with
// symmetric crypto here because SiteSettings.data is a JSON column accessed
// by the existing admin pipeline; we store it cleartext and rely on
// Postgres column-level access being restricted to the app role. Future
// hardening: move to BizrethinkInstanceCaptchaConfig with encrypted column.

export const SITE_SETTINGS_CAPTCHA_ID = 'site.captcha';

export const ZSiteSettingsCaptchaSchema = ZSiteSettingsBaseSchema.extend({
  id: z.literal(SITE_SETTINGS_CAPTCHA_ID),
  data: z
    .object({
      siteKey: z.string().default(''),
      secretKey: z.string().default(''),
    })
    .optional()
    .default({ siteKey: '', secretKey: '' }),
});

export type TSiteSettingsCaptchaSchema = z.infer<typeof ZSiteSettingsCaptchaSchema>;
