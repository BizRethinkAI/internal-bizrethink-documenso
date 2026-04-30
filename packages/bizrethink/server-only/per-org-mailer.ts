import { bytesToUtf8 } from '@noble/ciphers/utils';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';

import { mailer as envDefaultMailer } from '@documenso/email/mailer';
import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';

// Phase B (overlay 010 prerequisite): per-org SMTP transporter factory.
//
// Documenso's `mailer` is exported eagerly as a singleton at module load
// (packages/email/mailer.ts:111). Every email-sending caller currently
// imports that singleton, which means every tenant's mail authenticates
// with the same env-configured Postmark server token.
//
// This factory replaces that singleton on a per-org basis. `getMailerForOrg`
// looks up `BizrethinkOrganisationSmtpConfig` for the given org, decrypts the
// password, builds a per-org `nodemailer.Transporter`, caches it, and returns
// it. If no row exists for the org, it falls back to the env-default mailer
// (the original singleton). This means:
//   - BizRethink AI (no per-org SMTP config) sends through the env-default
//     Postmark token (Server Baba Inc's account).
//   - MFG / MORG CAP / future orgs each have their own row → each sends
//     through their own Postmark account.
//
// Overlay 010 (separate commit) wires this into `packages/email/mailer.ts`
// and threads `orgId` through `packages/lib/server-only/email/get-email-context.ts`
// so existing send-mail call sites pick up the per-org behaviour automatically.
//
// Cache invalidation: when admin updates a row via the UI, the upsert TRPC
// procedure should call `invalidateOrgMailer(orgId)` to evict the cache
// entry. Same for delete.

const orgMailerCache = new Map<string, Transporter>();

/**
 * Look up SMTP credentials for `orgId` in the DB, decrypt the password,
 * build a transporter, and cache it. Falls back to env-default if no row.
 */
export const getMailerForOrg = async (orgId: string | undefined): Promise<Transporter> => {
  if (!orgId) {
    return envDefaultMailer;
  }

  const cached = orgMailerCache.get(orgId);
  if (cached) {
    return cached;
  }

  const config = await prisma.bizrethinkOrganisationSmtpConfig.findUnique({
    where: {
      organisationId: orgId,
    },
  });

  if (!config) {
    return envDefaultMailer;
  }

  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot decrypt per-org SMTP password',
    });
  }

  const decryptedPasswordBytes = symmetricDecrypt({
    key: DOCUMENSO_ENCRYPTION_KEY,
    data: config.password,
  });
  const decryptedPassword = bytesToUtf8(decryptedPasswordBytes);

  // Phase B v1 only supports smtp-auth. Future expansion (smtp-api,
  // mailchannels, resend) should branch on `config.transport` here.
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: decryptedPassword,
    },
  });

  orgMailerCache.set(orgId, transporter);
  return transporter;
};

/**
 * Evict a cached transporter — call after upsert/delete of a per-org SMTP
 * config row, so the next send picks up the new credentials.
 */
export const invalidateOrgMailer = (orgId: string) => {
  const cached = orgMailerCache.get(orgId);
  if (cached) {
    // nodemailer transporters expose `.close()` but the type isn't strict;
    // call defensively to release any pooled SMTP connections.
    cached.close?.();
    orgMailerCache.delete(orgId);
  }
};

/**
 * Encrypt a plaintext password ready for storage in
 * `BizrethinkOrganisationSmtpConfig.password`. Use this in upsert TRPC
 * procedures before writing to the DB.
 */
export const encryptOrgSmtpPassword = (plaintext: string): string => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot encrypt per-org SMTP password',
    });
  }

  return symmetricEncrypt({
    key: DOCUMENSO_ENCRYPTION_KEY,
    data: plaintext,
  });
};
