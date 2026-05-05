import { z } from 'zod';

import { ZSiteSettingsBaseSchema } from '@documenso/lib/server-only/site-settings/schemas/_base';

// Phase J (overlay 032): site.security-headers site-setting.
//
// Extends Documenso's existing CSP middleware (apps/remix/server/security-
// headers.ts) with the headers it doesn't ship by default:
//   - Strict-Transport-Security (HSTS)
//   - Permissions-Policy
//
// Also globalizes nosniff + Referrer-Policy (upstream sets them only on
// /embed routes; we want them on every page for defense-in-depth).
//
// Defaults are intentionally conservative:
//   - HSTS off — operator must opt in after verifying their cert chain
//     and zone layout (includeSubdomains can break HTTP-only siblings).
//   - Permissions-Policy on with sane denylist (camera, mic, geolocation,
//     interest-cohort) — these are never used by a contract-signing app.
//   - nosniff/referrer always on (no downside, just better baseline).

export const SITE_SETTINGS_SECURITY_HEADERS_ID = 'site.security-headers';

const ZHstsSchema = z
  .object({
    enabled: z.boolean().default(false),
    maxAgeSeconds: z.number().int().min(0).default(31536000),
    includeSubdomains: z.boolean().default(false),
    preload: z.boolean().default(false),
  })
  .default({
    enabled: false,
    maxAgeSeconds: 31536000,
    includeSubdomains: false,
    preload: false,
  });

const ZPermissionsPolicySchema = z
  .object({
    enabled: z.boolean().default(true),
    value: z.string().default('camera=(), microphone=(), geolocation=(), interest-cohort=()'),
  })
  .default({
    enabled: true,
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  });

export const ZSiteSettingsSecurityHeadersSchema = ZSiteSettingsBaseSchema.extend({
  id: z.literal(SITE_SETTINGS_SECURITY_HEADERS_ID),
  data: z
    .object({
      hsts: ZHstsSchema,
      permissionsPolicy: ZPermissionsPolicySchema,
    })
    .optional()
    .default({
      hsts: {
        enabled: false,
        maxAgeSeconds: 31536000,
        includeSubdomains: false,
        preload: false,
      },
      permissionsPolicy: {
        enabled: true,
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    }),
});

export type TSiteSettingsSecurityHeadersSchema = z.infer<typeof ZSiteSettingsSecurityHeadersSchema>;
