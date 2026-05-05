import { prisma } from '@documenso/prisma';

import {
  SITE_SETTINGS_SECURITY_HEADERS_ID,
  ZSiteSettingsSecurityHeadersSchema,
} from './site-settings/schemas/security-headers';

// Phase J (overlay 032): DB-aware getter for the extra security headers
// (HSTS + Permissions-Policy + globalized nosniff/Referrer) that
// Documenso's existing CSP middleware doesn't ship.
//
// The middleware in apps/remix/server/security-headers.ts hits this on
// every page response, so we cache aggressively. Cache is busted by
// the admin-UI mutation that updates the SiteSettings row (the existing
// site-settings tRPC route already triggers a per-process invalidate).

type SecurityHeadersData = {
  hsts: {
    enabled: boolean;
    maxAgeSeconds: number;
    includeSubdomains: boolean;
    preload: boolean;
  };
  permissionsPolicy: {
    enabled: boolean;
    value: string;
  };
};

const DEFAULTS: SecurityHeadersData = {
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
};

let cachedConfig: SecurityHeadersData | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 60_000;

const setCachedConfig = (v: SecurityHeadersData) => {
  cachedConfig = v;
  cachedAtMs = Date.now();
};

export const invalidateSecurityHeadersConfig = () => {
  cachedConfig = null;
  cachedAtMs = 0;
};

export const getSecurityHeadersConfig = async (): Promise<SecurityHeadersData> => {
  if (cachedConfig && Date.now() - cachedAtMs < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const row = await prisma.siteSettings.findFirst({
      where: { id: SITE_SETTINGS_SECURITY_HEADERS_ID },
    });

    if (!row || !row.enabled) {
      setCachedConfig(DEFAULTS);
      return DEFAULTS;
    }

    const parsed = ZSiteSettingsSecurityHeadersSchema.safeParse({
      id: row.id,
      enabled: row.enabled,
      data: row.data,
    });

    if (!parsed.success) {
      setCachedConfig(DEFAULTS);
      return DEFAULTS;
    }

    const data: SecurityHeadersData = {
      hsts: {
        enabled: parsed.data.data.hsts.enabled,
        maxAgeSeconds: parsed.data.data.hsts.maxAgeSeconds,
        includeSubdomains: parsed.data.data.hsts.includeSubdomains,
        preload: parsed.data.data.hsts.preload,
      },
      permissionsPolicy: {
        enabled: parsed.data.data.permissionsPolicy.enabled,
        value: parsed.data.data.permissionsPolicy.value,
      },
    };

    setCachedConfig(data);
    return data;
  } catch {
    // DB unreachable on cold start — fall back to defaults rather than 500.
    return DEFAULTS;
  }
};

export const buildHstsValue = (hsts: SecurityHeadersData['hsts']): string => {
  const parts = [`max-age=${hsts.maxAgeSeconds}`];

  if (hsts.includeSubdomains) {
    parts.push('includeSubDomains');
  }

  if (hsts.preload) {
    parts.push('preload');
  }

  return parts.join('; ');
};
