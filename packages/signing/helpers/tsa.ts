import { HttpTimestampAuthority } from '@libpdf/core';

import { NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY } from '@documenso/lib/constants/app';

// MODIFIED for BizRethink (overlay 011): replaced upstream's `once()` wrapper
// from `remeda` with a manual cache so we can expose a reset hook. The TSA
// list is read from `BizrethinkInstanceSigningConfig.tsaUrls` first, with
// env fallback. The cache-bust is invoked by the admin TRPC mutation via
// `resetSigningCaches()` in packages/signing/index.ts.

let cachedAuthorities: HttpTimestampAuthority[] | null = null;
let cacheProbed = false;

const buildAuthorities = (csv: string | null | undefined): HttpTimestampAuthority[] | null => {
  if (!csv) {
    return null;
  }
  const urls = csv
    .trim()
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length === 0) {
    return null;
  }
  return urls.map((url) => new HttpTimestampAuthority(url));
};

const setupTimestampAuthorities = (): HttpTimestampAuthority[] | null => {
  if (cacheProbed) {
    return cachedAuthorities;
  }

  // ENV-only fast path: synchronous setup is required by signPdf's call site
  // which reads `getTimestampAuthority()` synchronously. The DB-backed config
  // is loaded asynchronously elsewhere (by getSigner / getInstanceSigningConfig)
  // and feeds in via `seedTsaFromConfig()` below — that function is called
  // from packages/signing/index.ts:getSigner() before the first signPdf, so
  // by the time getTimestampAuthority() runs, the DB-sourced TSAs are
  // already in cache when applicable.
  const envCsv = NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY();
  cachedAuthorities = buildAuthorities(envCsv);
  cacheProbed = true;
  return cachedAuthorities;
};

/**
 * Seed the TSA cache from a DB-loaded config. Called by `getSigner()` in
 * `packages/signing/index.ts` before the first signPdf, so signPdf's
 * synchronous `getTimestampAuthority()` read sees the right values without
 * having to await.
 */
export const seedTsaFromConfig = (tsaUrls: string[] | null | undefined) => {
  if (!tsaUrls || tsaUrls.length === 0) {
    return;
  }
  cachedAuthorities = buildAuthorities(tsaUrls.join(','));
  cacheProbed = true;
};

/**
 * Drop the TSA cache. Used by the admin TRPC mutation after writing a new
 * config so subsequent signPdf calls re-evaluate the source.
 */
export const resetTimestampAuthorities = () => {
  cachedAuthorities = null;
  cacheProbed = false;
};

export const getTimestampAuthority = () => {
  const authorities = setupTimestampAuthorities();

  if (!authorities) {
    return null;
  }

  // Pick a random authority
  return authorities[Math.floor(Math.random() * authorities.length)];
};
