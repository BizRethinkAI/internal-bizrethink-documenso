import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';

import { env } from '@documenso/lib/utils/env';
import { ResendTransport } from '@documenso/nodemailer-resend';

import { MailChannelsTransport } from './transports/mailchannels';

/**
 * Creates a Nodemailer transport object for sending emails.
 *
 * This function uses various environment variables to configure the appropriate
 * email transport mechanism. It supports multiple types of email transports,
 * including MailChannels, Resend, and different SMTP configurations.
 *
 * @returns {Transporter} A configured Nodemailer transporter instance.
 *
 * Supported Transports:
 * - **mailchannels**: Uses MailChannelsTransport, requiring:
 *   - `NEXT_PRIVATE_MAILCHANNELS_API_KEY`: API key for MailChannels
 *   - `NEXT_PRIVATE_MAILCHANNELS_ENDPOINT`: Endpoint for MailChannels (optional)
 * - **resend**: Uses ResendTransport, requiring:
 *   - `NEXT_PRIVATE_RESEND_API_KEY`: API key for Resend
 * - **smtp-api**: Uses a custom SMTP API configuration, requiring:
 *   - `NEXT_PRIVATE_SMTP_HOST`: The SMTP server host
 *   - `NEXT_PRIVATE_SMTP_APIKEY`: The API key for SMTP authentication
 *   - `NEXT_PRIVATE_SMTP_APIKEY_USER`: The username for SMTP authentication (default: 'apikey')
 * - **smtp-auth** (default): Uses a standard SMTP configuration, requiring:
 *   - `NEXT_PRIVATE_SMTP_HOST`: The SMTP server host (default: 'localhost:2500')
 *   - `NEXT_PRIVATE_SMTP_PORT`: The port to connect to (default: 587)
 *   - `NEXT_PRIVATE_SMTP_SECURE`: Whether to use SSL/TLS (default: false)
 *   - `NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS`: Whether to ignore TLS (default: false)
 *   - `NEXT_PRIVATE_SMTP_USERNAME`: The username for SMTP authentication
 *   - `NEXT_PRIVATE_SMTP_PASSWORD`: The password for SMTP authentication
 *   - `NEXT_PRIVATE_SMTP_SERVICE`: The SMTP service provider (e.g., "gmail"). This option is used
 *     when integrating with well-known services (like Gmail), enabling simplified configuration.
 *
 * Example Usage:
 * ```env
 * NEXT_PRIVATE_SMTP_TRANSPORT='smtp-auth';
 * NEXT_PRIVATE_SMTP_HOST='smtp.example.com';
 * NEXT_PRIVATE_SMTP_PORT=587;
 * NEXT_PRIVATE_SMTP_SERVICE='gmail';
 * NEXT_PRIVATE_SMTP_SECURE='true';
 * NEXT_PRIVATE_SMTP_USERNAME='your-email@gmail.com';
 * NEXT_PRIVATE_SMTP_PASSWORD='your-password';
 * ```
 *
 * Notes:
 * - Ensure that the required environment variables for each transport type are set.
 * - If `NEXT_PRIVATE_SMTP_TRANSPORT` is not specified, the default is `smtp-auth`.
 * - `NEXT_PRIVATE_SMTP_SERVICE` is optional and used specifically for well-known services like Gmail.
 */
const getTransport = (): Transporter => {
  const transport = env('NEXT_PRIVATE_SMTP_TRANSPORT') ?? 'smtp-auth';

  if (transport === 'mailchannels') {
    return createTransport(
      MailChannelsTransport.makeTransport({
        apiKey: env('NEXT_PRIVATE_MAILCHANNELS_API_KEY'),
        endpoint: env('NEXT_PRIVATE_MAILCHANNELS_ENDPOINT'),
      }),
    );
  }

  if (transport === 'resend') {
    if (!env('NEXT_PRIVATE_RESEND_API_KEY')) {
      throw new Error('Resend transport requires NEXT_PRIVATE_RESEND_API_KEY');
    }

    return createTransport(
      ResendTransport.makeTransport({
        apiKey: env('NEXT_PRIVATE_RESEND_API_KEY'),
      }),
    );
  }

  if (transport === 'smtp-api') {
    if (!env('NEXT_PRIVATE_SMTP_HOST') || !env('NEXT_PRIVATE_SMTP_APIKEY')) {
      throw new Error(
        'SMTP API transport requires NEXT_PRIVATE_SMTP_HOST and NEXT_PRIVATE_SMTP_APIKEY',
      );
    }

    return createTransport({
      host: env('NEXT_PRIVATE_SMTP_HOST'),
      port: Number(env('NEXT_PRIVATE_SMTP_PORT')) || 587,
      secure: env('NEXT_PRIVATE_SMTP_SECURE') === 'true',
      auth: {
        user: env('NEXT_PRIVATE_SMTP_APIKEY_USER') ?? 'apikey',
        pass: env('NEXT_PRIVATE_SMTP_APIKEY') ?? '',
      },
    });
  }

  return createTransport({
    host: env('NEXT_PRIVATE_SMTP_HOST') ?? '127.0.0.1:2500',
    port: Number(env('NEXT_PRIVATE_SMTP_PORT')) || 587,
    secure: env('NEXT_PRIVATE_SMTP_SECURE') === 'true',
    ignoreTLS: env('NEXT_PRIVATE_SMTP_UNSAFE_IGNORE_TLS') === 'true',
    auth: env('NEXT_PRIVATE_SMTP_USERNAME')
      ? {
          user: env('NEXT_PRIVATE_SMTP_USERNAME'),
          pass: env('NEXT_PRIVATE_SMTP_PASSWORD') ?? '',
        }
      : undefined,
    ...(env('NEXT_PRIVATE_SMTP_SERVICE') ? { service: env('NEXT_PRIVATE_SMTP_SERVICE') } : {}),
  });
};

// MODIFIED for BizRethink (overlay 010): per-org SMTP via AsyncLocalStorage.
//
// The original `export const mailer = getTransport()` is replaced with a
// Proxy that intercepts `.sendMail` calls. At send time the Proxy reads
// `orgContextStorage` (set by getEmailContext for any org-scoped flow) and
// dispatches to the right transporter — per-org via getMailerForOrg, or
// env-default otherwise.
//
// Dynamic imports break what would otherwise be a circular dependency
// between @documenso/email and @bizrethink/customizations (per-org-mailer
// imports `mailer` from this file). Both bizrethink modules are loaded by
// the time the first sendMail call happens so the dynamic imports always
// hit the require cache.

const envDefaultMailer = getTransport();

export const mailer = new Proxy(envDefaultMailer, {
  get(target, prop, receiver) {
    if (prop === 'sendMail') {
      return async (opts: Parameters<typeof envDefaultMailer.sendMail>[0]) => {
        const { orgContextStorage } = await import(
          '@bizrethink/customizations/server-only/org-context'
        );
        const ctx = orgContextStorage.getStore();

        // DEBUG (overlay 010 troubleshooting): trace ALS read at sendMail time.
        // Remove after Phase B verification.
        // eslint-disable-next-line no-console
        console.log('[bizrethink][debug] mailer.sendMail proxy', {
          ctxOrgId: ctx?.orgId,
          ctxIsSet: !!ctx,
          dispatch: ctx?.orgId ? 'per-org' : 'env-default',
        });

        if (ctx?.orgId) {
          const { getMailerForOrg } = await import(
            '@bizrethink/customizations/server-only/per-org-mailer'
          );
          const transporter = await getMailerForOrg(ctx.orgId);
          return transporter.sendMail(opts);
        }

        return target.sendMail(opts);
      };
    }
    return Reflect.get(target, prop, receiver);
  },
}) as Transporter;
