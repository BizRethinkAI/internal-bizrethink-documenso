import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

/**
 * How long a session should live for in milliseconds.
 */
export const AUTH_SESSION_LIFETIME = 1000 * 60 * 60 * 24 * 30; // 30 days.

export type OAuthClientOptions = {
  id: string;
  scope: string[];
  clientId: string;
  clientSecret: string;
  wellKnownUrl: string;
  redirectUrl: string;
  bypassEmailVerification?: boolean;
};

// MODIFIED for BizRethink (overlay 014): the static `*AuthOptions` exports
// have been replaced with async getters that consult BizrethinkSsoProvider
// rows before falling back to env. This lets admins enable/rotate providers
// via /admin/sso-providers without redeploying.

export const getGoogleAuthOptions = async (): Promise<OAuthClientOptions> => {
  const { getProviderConfig } = await import(
    '@bizrethink/customizations/server-only/sso-provider-config'
  );
  const cfg = await getProviderConfig('google');
  return {
    id: 'google',
    scope: ['openid', 'email', 'profile'],
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    redirectUrl: `${NEXT_PUBLIC_WEBAPP_URL()}/api/auth/callback/google`,
    wellKnownUrl: 'https://accounts.google.com/.well-known/openid-configuration',
    bypassEmailVerification: false,
  };
};

export const getMicrosoftAuthOptions = async (): Promise<OAuthClientOptions> => {
  const { getProviderConfig } = await import(
    '@bizrethink/customizations/server-only/sso-provider-config'
  );
  const cfg = await getProviderConfig('microsoft');
  return {
    id: 'microsoft',
    scope: ['openid', 'email', 'profile'],
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    redirectUrl: `${NEXT_PUBLIC_WEBAPP_URL()}/api/auth/callback/microsoft`,
    wellKnownUrl: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    bypassEmailVerification: false,
  };
};

export const getOidcAuthOptions = async (): Promise<OAuthClientOptions> => {
  const { getProviderConfig } = await import(
    '@bizrethink/customizations/server-only/sso-provider-config'
  );
  const cfg = await getProviderConfig('oidc');
  return {
    id: 'oidc',
    scope: ['openid', 'email', 'profile'],
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    redirectUrl: `${NEXT_PUBLIC_WEBAPP_URL()}/api/auth/callback/oidc`,
    wellKnownUrl: cfg.oidcWellKnownUrl,
    bypassEmailVerification: cfg.oidcSkipVerify,
  };
};
