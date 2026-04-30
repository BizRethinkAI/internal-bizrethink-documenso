// MODIFIED for BizRethink: self-host has no functional EE gate per the paywall
// audit. The licence server returns UNAUTHORIZED for our BIZRETHINK tier
// (overlay 001) because it includes EE-flagged features, but no functionality
// is actually gated. The banner serves no purpose on this build, so it is
// suppressed unconditionally. PAST_DUE / EXPIRED states would also be silenced
// (we'd never see them — no Documenso billing relationship exists), so this is
// strictly less surface than the original. See overlays/005.

export type AdminLicenseStatusBannerProps = {
  license: unknown;
};

export const AdminLicenseStatusBanner = (_props: AdminLicenseStatusBannerProps) => {
  return null;
};
