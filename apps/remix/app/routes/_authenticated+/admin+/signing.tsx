import { useEffect, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';

import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

// Phase C (overlay 011): admin UI for instance-wide signing config.
//
// Replaces the env-based workflow:
//   - NEXT_PRIVATE_SIGNING_TRANSPORT
//   - NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS / NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH
//   - NEXT_PRIVATE_SIGNING_PASSPHRASE
//   - NEXT_PRIVATE_SIGNING_GCLOUD_HSM_KEY_PATH
//   - NEXT_PRIVATE_SIGNING_GCLOUD_HSM_PUBLIC_CRT_FILE_CONTENTS
//   - NEXT_PRIVATE_SIGNING_GCLOUD_APPLICATION_CREDENTIALS_CONTENTS
//   - NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY
//   - NEXT_PUBLIC_SIGNING_CONTACT_INFO
//
// Singleton row pattern: there's exactly one BizrethinkInstanceSigningConfig
// row with id="singleton". UI shows current state with secrets redacted
// (hasLocalCert: true/false instead of returning the encrypted blob), and
// admin can upload a fresh cert.p12 / passphrase / TSA URL list / contact info.
// Saving busts the in-memory caches in packages/signing/* via the TRPC
// mutation's resetSigningCaches() call.

export function meta() {
  return appMetaTags(msg`Signing Config`);
}

type SigningFormState = {
  transport: 'local' | 'gcloud-hsm';
  localCertContentsBase64: string;
  localPassphrase: string;
  gcloudKeyPath: string;
  gcloudCredentialsJsonBase64: string;
  gcloudCertChainPemBase64: string;
  tsaUrls: string;
  signingContactInfo: string;
};

const DEFAULT_FORM: SigningFormState = {
  transport: 'local',
  localCertContentsBase64: '',
  localPassphrase: '',
  gcloudKeyPath: '',
  gcloudCredentialsJsonBase64: '',
  gcloudCertChainPemBase64: '',
  tsaUrls: '',
  signingContactInfo: '',
};

const fileToBase64 = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected file reader result'));
        return;
      }
      // result is a data URL; strip the prefix to get pure base64.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const fileToText = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected file reader result'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export default function AdminSigningConfigPage() {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: existing, isLoading } = trpc.bizrethink.instanceSigning.get.useQuery();
  const updateMutation = trpc.bizrethink.instanceSigning.update.useMutation();
  const resetMutation = trpc.bizrethink.instanceSigning.reset.useMutation();

  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (existing) {
      setForm({
        transport: existing.transport,
        localCertContentsBase64: '',
        localPassphrase: '',
        gcloudKeyPath: existing.gcloudKeyPath ?? '',
        gcloudCredentialsJsonBase64: '',
        gcloudCertChainPemBase64: '',
        tsaUrls: existing.tsaUrls ?? '',
        signingContactInfo: existing.signingContactInfo ?? '',
      });
    } else if (existing === null) {
      setForm(DEFAULT_FORM);
    }
  }, [existing]);

  const onCertFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setForm((prev) => ({ ...prev, localCertContentsBase64: base64 }));
    } catch (err) {
      toast({
        title: t`Failed to read cert file`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const onCredsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await fileToText(file);
      const base64 = btoa(text);
      setForm((prev) => ({ ...prev, gcloudCredentialsJsonBase64: base64 }));
    } catch (err) {
      toast({
        title: t`Failed to read credentials file`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const onCertChainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await fileToText(file);
      const base64 = btoa(text);
      setForm((prev) => ({ ...prev, gcloudCertChainPemBase64: base64 }));
    } catch (err) {
      toast({
        title: t`Failed to read cert chain file`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast({
        title: t`Signing config saved`,
        description: t`Signing caches reset. The next document signed will use this configuration.`,
      });
      // Clear secret-bearing fields (we never echo them back).
      setForm((prev) => ({
        ...prev,
        localCertContentsBase64: '',
        localPassphrase: '',
        gcloudCredentialsJsonBase64: '',
        gcloudCertChainPemBase64: '',
      }));
      await utils.bizrethink.instanceSigning.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        t`Reset the instance signing config? Signing will fall back to environment variables.`,
      )
    ) {
      return;
    }
    try {
      await resetMutation.mutateAsync();
      toast({
        title: t`Signing config reset`,
        description: t`The instance now signs using environment-variable configuration.`,
      });
      setForm(DEFAULT_FORM);
      await utils.bizrethink.instanceSigning.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to reset`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <SpinnerBox className="py-32" />;
  }

  return (
    <div>
      <SettingsHeader
        title={t`Signing Config`}
        subtitle={t`Configure the cryptographic certificate, time-stamp authorities, and contact info used for every signed PDF. Stored encrypted at rest.`}
      />

      <div className="mt-6 max-w-2xl space-y-6">
        {/* Transport selector */}
        <div className="space-y-2">
          <Label>
            <Trans>Signing transport</Trans>
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="transport"
                value="local"
                checked={form.transport === 'local'}
                onChange={() => setForm({ ...form, transport: 'local' })}
              />
              <Trans>Local cert (P12)</Trans>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="transport"
                value="gcloud-hsm"
                checked={form.transport === 'gcloud-hsm'}
                onChange={() => setForm({ ...form, transport: 'gcloud-hsm' })}
              />
              <Trans>Google Cloud HSM</Trans>
            </label>
          </div>
        </div>

        {/* Local cert section */}
        {form.transport === 'local' && (
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-2 text-sm font-semibold">
              <Trans>Local certificate</Trans>
            </legend>

            <div>
              <Label htmlFor="cert-file">
                <Trans>cert.p12 file</Trans>
              </Label>
              <Input id="cert-file" type="file" accept=".p12,.pfx" onChange={onCertFileChange} />
              <p className="mt-1 text-xs text-muted-foreground">
                {existing?.hasLocalCert ? (
                  <Trans>
                    A certificate is already stored. Upload a new file to replace; leave blank to
                    keep the existing.
                  </Trans>
                ) : (
                  <Trans>
                    No certificate stored yet. Without an upload, the instance falls back to the
                    NEXT_PRIVATE_SIGNING_LOCAL_FILE_* environment variable.
                  </Trans>
                )}
              </p>
            </div>

            <div>
              <Label htmlFor="passphrase">
                <Trans>Passphrase</Trans>
              </Label>
              <Input
                id="passphrase"
                type="password"
                value={form.localPassphrase}
                onChange={(e) => setForm({ ...form, localPassphrase: e.target.value })}
                placeholder={
                  existing?.hasLocalPassphrase
                    ? t`(leave empty to keep existing)`
                    : t`(empty if cert has no passphrase)`
                }
              />
            </div>
          </fieldset>
        )}

        {/* Gcloud-HSM section */}
        {form.transport === 'gcloud-hsm' && (
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-2 text-sm font-semibold">
              <Trans>Google Cloud HSM</Trans>
            </legend>

            <div>
              <Label htmlFor="key-path">
                <Trans>KMS key version path</Trans>
              </Label>
              <Input
                id="key-path"
                value={form.gcloudKeyPath}
                onChange={(e) => setForm({ ...form, gcloudKeyPath: e.target.value })}
                placeholder="projects/.../keyRings/.../cryptoKeys/.../cryptoKeyVersions/1"
              />
            </div>

            <div>
              <Label htmlFor="creds-file">
                <Trans>Service-account credentials JSON</Trans>
              </Label>
              <Input
                id="creds-file"
                type="file"
                accept="application/json,.json"
                onChange={onCredsFileChange}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {existing?.hasGcloudCredentials ? (
                  <Trans>Credentials already stored. Upload to replace.</Trans>
                ) : (
                  <Trans>Required: GCP service-account JSON file with KMS sign access.</Trans>
                )}
              </p>
            </div>

            <div>
              <Label htmlFor="chain-file">
                <Trans>Certificate chain (PEM)</Trans>
              </Label>
              <Input
                id="chain-file"
                type="file"
                accept=".pem,.crt,.cer"
                onChange={onCertChainFileChange}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {existing?.hasGcloudCertChain ? (
                  <Trans>Cert chain stored. Upload to replace.</Trans>
                ) : (
                  <Trans>
                    Required: PEM file with the public certificate (and any intermediates) for the
                    KMS-held key.
                  </Trans>
                )}
              </p>
            </div>
          </fieldset>
        )}

        {/* Shared: TSA + contact info */}
        <fieldset className="space-y-4 rounded-md border p-4">
          <legend className="px-2 text-sm font-semibold">
            <Trans>Time-stamp authority + signing metadata</Trans>
          </legend>

          <div>
            <Label htmlFor="tsa-urls">
              <Trans>TSA URLs (comma-separated)</Trans>
            </Label>
            <Textarea
              id="tsa-urls"
              className="font-mono text-xs"
              value={form.tsaUrls}
              onChange={(e) => setForm({ ...form, tsaUrls: e.target.value })}
              placeholder="http://timestamp.digicert.com,http://tsa.belgium.be/connect"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans>
                Comma-separated list of RFC 3161 TSA URLs. With at least one URL, signed PDFs get
                LTV + archival timestamp. Empty = no timestamping.
              </Trans>
            </p>
          </div>

          <div>
            <Label htmlFor="contact">
              <Trans>Signing Contact Info</Trans>
            </Label>
            <Input
              id="contact"
              value={form.signingContactInfo}
              onChange={(e) => setForm({ ...form, signingContactInfo: e.target.value })}
              placeholder="contracts@bizrethink.ai"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans>
                Embedded in every signed PDF as Contact Info. Defaults to the webapp URL if empty.
              </Trans>
            </p>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Trans>Save signing config</Trans>
          </Button>

          {existing && (
            <Button
              variant="destructive"
              onClick={handleReset}
              loading={resetMutation.isPending}
              className="ml-auto"
            >
              <Trans>Reset to env</Trans>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
