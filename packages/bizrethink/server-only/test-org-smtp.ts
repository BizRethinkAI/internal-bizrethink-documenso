import { createTransport } from 'nodemailer';

// Phase B (overlay 010 prerequisite): test SMTP credentials without saving.
//
// Used by the "Test connection" button on /o/<org>/settings/smtp. Builds a
// throwaway nodemailer transporter from the form values, calls
// `transporter.verify()` (which opens an SMTP connection, performs auth, and
// closes — does NOT send a message), and returns either ok or the error
// message.
//
// Decoupled from the persisted BizrethinkOrganisationSmtpConfig flow so the
// admin can verify creds BEFORE writing them to the DB.

export type TestSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string; // plaintext — never persisted from this path
};

export type TestSmtpResult = { ok: true } | { ok: false; error: string };

export const testOrgSmtp = async (config: TestSmtpConfig): Promise<TestSmtpResult> => {
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
    // Cap how long we wait for the SMTP server to respond. Without this,
    // a slow/unreachable host could hang the request for the default
    // nodemailer timeout (10 minutes).
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  } finally {
    transporter.close?.();
  }
};
