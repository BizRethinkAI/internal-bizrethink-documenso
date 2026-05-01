import { useEffect, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';

import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Switch } from '@documenso/ui/primitives/switch';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

// Phase E (overlay 013): admin UI for instance storage transport.
//
// Replaces NEXT_PUBLIC_UPLOAD_TRANSPORT + 5 NEXT_PRIVATE_UPLOAD_* env vars
// with a singleton DB row. NOTE: switching transport doesn't migrate
// existing files — that's a separate one-shot script. Toggling here only
// affects new uploads/reads.

export function meta() {
  return appMetaTags(msg`Storage`);
}

type FormState = {
  transport: 'database' | 's3';
  s3Endpoint: string;
  s3ForcePathStyle: boolean;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  s3DistributionDomain: string;
  s3DistributionKeyId: string;
  s3DistributionKeyPem: string;
};

const DEFAULT_FORM: FormState = {
  transport: 'database',
  s3Endpoint: '',
  s3ForcePathStyle: false,
  s3Region: '',
  s3Bucket: '',
  s3AccessKeyId: '',
  s3SecretAccessKey: '',
  s3DistributionDomain: '',
  s3DistributionKeyId: '',
  s3DistributionKeyPem: '',
};

export default function AdminStoragePage() {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: existing, isLoading } = trpc.bizrethink.instanceStorage.get.useQuery();
  const updateMutation = trpc.bizrethink.instanceStorage.update.useMutation();
  const resetMutation = trpc.bizrethink.instanceStorage.reset.useMutation();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (existing) {
      setForm({
        transport: existing.transport,
        s3Endpoint: existing.s3Endpoint ?? '',
        s3ForcePathStyle: existing.s3ForcePathStyle,
        s3Region: existing.s3Region ?? '',
        s3Bucket: existing.s3Bucket ?? '',
        s3AccessKeyId: '',
        s3SecretAccessKey: '',
        s3DistributionDomain: existing.s3DistributionDomain ?? '',
        s3DistributionKeyId: '',
        s3DistributionKeyPem: '',
      });
    } else if (existing === null) {
      setForm(DEFAULT_FORM);
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast({
        title: t`Storage config saved`,
        description: t`New uploads will use this configuration.`,
      });
      setForm((prev) => ({
        ...prev,
        s3AccessKeyId: '',
        s3SecretAccessKey: '',
        s3DistributionKeyId: '',
        s3DistributionKeyPem: '',
      }));
      await utils.bizrethink.instanceStorage.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t`Reset storage config? Falls back to environment variables.`)) {
      return;
    }
    try {
      await resetMutation.mutateAsync();
      setForm(DEFAULT_FORM);
      toast({ title: t`Storage config reset` });
      await utils.bizrethink.instanceStorage.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to reset`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) return <SpinnerBox className="py-32" />;

  return (
    <div>
      <SettingsHeader
        title={t`Storage Config`}
        subtitle={t`Where uploaded PDFs live. Switching transport does not migrate existing files — that's a separate one-shot script.`}
      />

      <div className="mt-6 max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label>
            <Trans>Storage transport</Trans>
          </Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="transport"
                value="database"
                checked={form.transport === 'database'}
                onChange={() => setForm({ ...form, transport: 'database' })}
              />
              <Trans>Database (Postgres bytea)</Trans>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="transport"
                value="s3"
                checked={form.transport === 's3'}
                onChange={() => setForm({ ...form, transport: 's3' })}
              />
              <Trans>S3 (any S3-compatible endpoint)</Trans>
            </label>
          </div>
        </div>

        {form.transport === 's3' && (
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-2 text-sm font-semibold">
              <Trans>S3 connection</Trans>
            </legend>

            <div>
              <Label htmlFor="endpoint">
                <Trans>Endpoint (optional, for non-AWS providers)</Trans>
              </Label>
              <Input
                id="endpoint"
                value={form.s3Endpoint}
                onChange={(e) => setForm({ ...form, s3Endpoint: e.target.value })}
                placeholder="https://ewr1.vultrobjects.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">
                  <Trans>Region</Trans>
                </Label>
                <Input
                  id="region"
                  value={form.s3Region}
                  onChange={(e) => setForm({ ...form, s3Region: e.target.value })}
                  placeholder="us-east-1"
                />
              </div>
              <div>
                <Label htmlFor="bucket">
                  <Trans>Bucket</Trans>
                </Label>
                <Input
                  id="bucket"
                  value={form.s3Bucket}
                  onChange={(e) => setForm({ ...form, s3Bucket: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.s3ForcePathStyle}
                onCheckedChange={(v) => setForm({ ...form, s3ForcePathStyle: v })}
                id="path-style"
              />
              <Label htmlFor="path-style">
                <Trans>Force path-style URLs (Vultr / Minio / R2)</Trans>
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="key-id">
                  <Trans>Access Key ID</Trans>
                </Label>
                <Input
                  id="key-id"
                  type="password"
                  value={form.s3AccessKeyId}
                  onChange={(e) => setForm({ ...form, s3AccessKeyId: e.target.value })}
                  placeholder={existing?.hasS3Credentials ? t`(leave empty to keep)` : t`Required`}
                />
              </div>
              <div>
                <Label htmlFor="secret">
                  <Trans>Secret Access Key</Trans>
                </Label>
                <Input
                  id="secret"
                  type="password"
                  value={form.s3SecretAccessKey}
                  onChange={(e) => setForm({ ...form, s3SecretAccessKey: e.target.value })}
                  placeholder={existing?.hasS3Credentials ? t`(leave empty to keep)` : t`Required`}
                />
              </div>
            </div>
          </fieldset>
        )}

        {form.transport === 's3' && (
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-2 text-sm font-semibold">
              <Trans>Optional CDN distribution</Trans>
            </legend>

            <div>
              <Label htmlFor="dist-domain">
                <Trans>Distribution domain</Trans>
              </Label>
              <Input
                id="dist-domain"
                value={form.s3DistributionDomain}
                onChange={(e) => setForm({ ...form, s3DistributionDomain: e.target.value })}
                placeholder="https://cdn.bizrethink.ai"
              />
            </div>

            <div>
              <Label htmlFor="dist-key-id">
                <Trans>CloudFront key-pair ID</Trans>
              </Label>
              <Input
                id="dist-key-id"
                type="password"
                value={form.s3DistributionKeyId}
                onChange={(e) => setForm({ ...form, s3DistributionKeyId: e.target.value })}
                placeholder={existing?.hasS3DistributionKey ? t`(leave empty to keep)` : ''}
              />
            </div>

            <div>
              <Label htmlFor="dist-key-pem">
                <Trans>CloudFront private-key PEM</Trans>
              </Label>
              <Textarea
                id="dist-key-pem"
                className="font-mono text-xs"
                value={form.s3DistributionKeyPem}
                onChange={(e) => setForm({ ...form, s3DistributionKeyPem: e.target.value })}
                placeholder={
                  existing?.hasS3DistributionKey ? t`(leave empty to keep)` : t`-----BEGIN ...-----`
                }
              />
            </div>
          </fieldset>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Trans>Save storage config</Trans>
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
