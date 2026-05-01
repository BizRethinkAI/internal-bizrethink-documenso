// MODIFIED for BizRethink (overlay 012): use DB-aware isSignupDisabled.
import { isSignupDisabled } from '@bizrethink/customizations/server-only/signup-config';
import { msg } from '@lingui/core/macro';
import { redirect } from 'react-router';

// MODIFIED for BizRethink (overlay 014): SSO enable flags are async getters now.
import {
  isGoogleSsoEnabled,
  isMicrosoftSsoEnabled,
  isOidcSsoEnabled,
} from '@documenso/lib/constants/auth';
import { isValidReturnTo, normalizeReturnTo } from '@documenso/lib/utils/is-valid-return-to';

import { SignUpForm } from '~/components/forms/signup';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/signup';

export function meta() {
  return appMetaTags(msg`Sign Up`);
}

export async function loader({ request }: Route.LoaderArgs) {
  // SSO enable flags via DB-aware getters.
  const [isGoogleSSOEnabled, isMicrosoftSSOEnabled, isOIDCSSOEnabled] = await Promise.all([
    isGoogleSsoEnabled(),
    isMicrosoftSsoEnabled(),
    isOidcSsoEnabled(),
  ]);

  if (await isSignupDisabled()) {
    throw redirect('/signin');
  }

  let returnTo = new URL(request.url).searchParams.get('returnTo') ?? undefined;

  returnTo = isValidReturnTo(returnTo) ? normalizeReturnTo(returnTo) : undefined;

  return {
    isGoogleSSOEnabled,
    isMicrosoftSSOEnabled,
    isOIDCSSOEnabled,
    returnTo,
  };
}

export default function SignUp({ loaderData }: Route.ComponentProps) {
  const { isGoogleSSOEnabled, isMicrosoftSSOEnabled, isOIDCSSOEnabled, returnTo } = loaderData;

  return (
    <SignUpForm
      className="w-screen max-w-screen-2xl px-4 md:px-16 lg:-my-16"
      isGoogleSSOEnabled={isGoogleSSOEnabled}
      isMicrosoftSSOEnabled={isMicrosoftSSOEnabled}
      isOIDCSSOEnabled={isOIDCSSOEnabled}
      returnTo={returnTo}
    />
  );
}
