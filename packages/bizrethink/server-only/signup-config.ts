import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

import { ZSiteSettingsSignupSchema } from './site-settings/schemas/signup';

// Phase D (overlay 012): DB-aware getters for signup-related settings.
//
// Replace direct env reads in upstream signup/signin/complete loaders. The
// DB row (id="site.signup") takes precedence; if absent or disabled, falls
// back to the env-var path so a fresh instance with no row still respects
// the bootstrap config.

const readDbConfig = async () => {
  const row = await prisma.siteSettings.findFirst({
    where: { id: 'site.signup' },
  });

  if (!row || !row.enabled) {
    return null;
  }

  const parsed = ZSiteSettingsSignupSchema.safeParse(row);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.data;
};

/**
 * True if signup is disabled instance-wide. DB takes precedence;
 * `NEXT_PUBLIC_DISABLE_SIGNUP === 'true'` is the env fallback.
 */
export const isSignupDisabled = async (): Promise<boolean> => {
  const dbConfig = await readDbConfig();
  if (dbConfig) {
    return dbConfig.signupDisabled;
  }
  return env('NEXT_PUBLIC_DISABLE_SIGNUP') === 'true';
};

/**
 * List of email domains permitted to sign up. Empty array means all
 * domains allowed. DB takes precedence; `NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS`
 * (CSV) is the env fallback.
 */
export const getAllowedSignupDomains = async (): Promise<string[]> => {
  const dbConfig = await readDbConfig();
  if (dbConfig && dbConfig.allowedDomains.length > 0) {
    return dbConfig.allowedDomains;
  }

  const envDomains = env('NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS');
  if (!envDomains) {
    return [];
  }

  return envDomains
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
};
