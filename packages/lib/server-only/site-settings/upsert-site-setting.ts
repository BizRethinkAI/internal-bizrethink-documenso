import { prisma } from '@documenso/prisma';

import { type TSiteSettingSchema } from './schema';

// MODIFIED for BizRethink (overlay 032): bust the in-memory caches of any
// BizRethink-namespaced site-settings so admin UI saves take effect on
// the next request without a process restart.
const SITE_SETTINGS_SECURITY_HEADERS_ID = 'site.security-headers';

export type UpsertSiteSettingOptions = TSiteSettingSchema & {
  userId?: number | null;
};

export const upsertSiteSetting = async ({
  id,
  enabled,
  data,
  userId,
}: UpsertSiteSettingOptions) => {
  const result = await prisma.siteSettings.upsert({
    where: {
      id,
    },
    create: {
      id,
      enabled,
      data,
      lastModifiedByUserId: userId,
      lastModifiedAt: new Date(),
    },
    update: {
      enabled,
      data,
      lastModifiedByUserId: userId,
      lastModifiedAt: new Date(),
    },
  });

  // MODIFIED for BizRethink (overlay 032): cache invalidation for our
  // site-settings-backed configs. Done via dynamic import to break the
  // circular dependency between @documenso/lib and @bizrethink/customizations.
  if (id === SITE_SETTINGS_SECURITY_HEADERS_ID) {
    const { invalidateSecurityHeadersConfig } =
      await import('@bizrethink/customizations/server-only/security-headers-config');
    invalidateSecurityHeadersConfig();
  }

  return result;
};
