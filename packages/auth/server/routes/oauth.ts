import { sValidator } from '@hono/standard-validator';
import { Hono } from 'hono';
import { z } from 'zod';

// MODIFIED for BizRethink (overlay 014): use async getters.
import { getGoogleAuthOptions, getMicrosoftAuthOptions, getOidcAuthOptions } from '../config';
import { handleOAuthAuthorizeUrl } from '../lib/utils/handle-oauth-authorize-url';
import { getOrganisationAuthenticationPortalOptions } from '../lib/utils/organisation-portal';
import type { HonoAuthContext } from '../types/context';

const ZOAuthAuthorizeSchema = z.object({
  redirectPath: z.string().optional(),
});

export const oauthRoute = new Hono<HonoAuthContext>()
  /**
   * Google authorize endpoint.
   */
  .post('/authorize/google', sValidator('json', ZOAuthAuthorizeSchema), async (c) => {
    const { redirectPath } = c.req.valid('json');

    return handleOAuthAuthorizeUrl({
      c,
      clientOptions: await getGoogleAuthOptions(),
      redirectPath,
    });
  })

  /**
   * Microsoft authorize endpoint.
   */
  .post('/authorize/microsoft', sValidator('json', ZOAuthAuthorizeSchema), async (c) => {
    const { redirectPath } = c.req.valid('json');

    return handleOAuthAuthorizeUrl({
      c,
      clientOptions: await getMicrosoftAuthOptions(),
      redirectPath,
    });
  })

  /**
   * OIDC authorize endpoint.
   */
  .post('/authorize/oidc', sValidator('json', ZOAuthAuthorizeSchema), async (c) => {
    const { redirectPath } = c.req.valid('json');

    return handleOAuthAuthorizeUrl({
      c,
      clientOptions: await getOidcAuthOptions(),
      redirectPath,
    });
  })
  /**
   * Organisation OIDC authorize endpoint.
   */
  .post('/authorize/oidc/org/:orgUrl', async (c) => {
    const orgUrl = c.req.param('orgUrl');

    const { clientOptions } = await getOrganisationAuthenticationPortalOptions({
      type: 'url',
      organisationUrl: orgUrl,
    });

    return await handleOAuthAuthorizeUrl({
      c,
      clientOptions,
      prompt: 'select_account',
    });
  });
