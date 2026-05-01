import { prisma } from '@documenso/prisma';

import { ZSiteSettingsWebhookSchema } from './site-settings/schemas/webhook';

// Phase I (overlay 017): DB-aware webhook SSRF bypass hosts loader.
//
// Returns the union of (DB-row hosts when enabled) ∪ (env-var hosts).
// Both sources contribute. The DB row is the operator-managed list; env
// is the bootstrap fallback for fresh instances. Hosts are lowercased.

const cache: { value: Set<string> | null; built: boolean } = {
  value: null,
  built: false,
};

const setCache = (v: Set<string> | null) => {
  cache.value = v;
  cache.built = v !== null;
};

const parseEnvHosts = (): Set<string> => {
  const raw = process.env.NEXT_PRIVATE_WEBHOOK_SSRF_BYPASS_HOSTS ?? '';
  const out = new Set<string>();
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim().toLowerCase();
    if (trimmed.length > 0) {
      out.add(trimmed);
    }
  }
  return out;
};

export const getWebhookSsrfBypassHosts = async (): Promise<Set<string>> => {
  if (cache.built && cache.value) {
    return cache.value;
  }

  const merged = parseEnvHosts();

  const row = await prisma.siteSettings.findFirst({
    where: { id: 'site.webhook' },
  });

  if (row && row.enabled) {
    const parsed = ZSiteSettingsWebhookSchema.safeParse(row);
    if (parsed.success) {
      for (const host of parsed.data.data.ssrfBypassHosts) {
        merged.add(host.trim().toLowerCase());
      }
    }
  }

  setCache(merged);
  return merged;
};

export const invalidateWebhookConfig = () => {
  setCache(null);
  cache.built = false;
};
