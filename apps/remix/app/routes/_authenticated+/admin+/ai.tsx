import { useEffect, useState } from 'react';

import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';

import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { SpinnerBox } from '@documenso/ui/primitives/spinner';
import { Switch } from '@documenso/ui/primitives/switch';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { SettingsHeader } from '~/components/general/settings-header';
import { appMetaTags } from '~/utils/meta';

// Phase H (overlay 016): Vertex AI config admin UI. Replaces 3 env vars
// (GOOGLE_VERTEX_PROJECT_ID / _LOCATION / _API_KEY) with a singleton DB row.
// Used by AI-assisted contract review when wired upstream. The per-org/team
// `aiFeaturesEnabled` flag is upstream-managed (in OrganisationGlobalSettings
// and TeamGlobalSettings); this row supplies the instance-wide credentials.

export function meta() {
  return appMetaTags(msg`AI Config`);
}

type FormState = {
  enabled: boolean;
  vertexProjectId: string;
  vertexLocation: string;
  vertexApiKey: string;
};

const DEFAULT_FORM: FormState = {
  enabled: false,
  vertexProjectId: '',
  vertexLocation: '',
  vertexApiKey: '',
};

export default function AdminAiConfigPage() {
  const { t } = useLingui();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: existing, isLoading } = trpc.bizrethink.instanceAi.get.useQuery();
  const updateMutation = trpc.bizrethink.instanceAi.update.useMutation();
  const resetMutation = trpc.bizrethink.instanceAi.reset.useMutation();

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (existing) {
      setForm({
        enabled: existing.enabled,
        vertexProjectId: existing.vertexProjectId ?? '',
        vertexLocation: existing.vertexLocation ?? '',
        vertexApiKey: '',
      });
    } else if (existing === null) {
      setForm(DEFAULT_FORM);
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast({ title: t`AI config saved` });
      setForm((prev) => ({ ...prev, vertexApiKey: '' }));
      await utils.bizrethink.instanceAi.get.invalidate();
    } catch (err) {
      toast({
        title: t`Failed to save`,
        description: err instanceof Error ? err.message : t`Unknown error`,
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    if (!window.confirm(t`Reset AI config? Falls back to environment variables.`)) return;
    try {
      await resetMutation.mutateAsync();
      setForm(DEFAULT_FORM);
      toast({ title: t`AI config reset` });
      await utils.bizrethink.instanceAi.get.invalidate();
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
        title={t`AI Config`}
        subtitle={t`Google Vertex AI credentials for AI-assisted contract review. Stored encrypted at rest.`}
      />

      <div className="mt-6 max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.enabled}
            onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            id="ai-enabled"
          />
          <Label htmlFor="ai-enabled">
            <Trans>Enabled</Trans>
          </Label>
        </div>

        <div>
          <Label htmlFor="vertex-project">
            <Trans>Vertex project ID</Trans>
          </Label>
          <Input
            id="vertex-project"
            value={form.vertexProjectId}
            onChange={(e) => setForm({ ...form, vertexProjectId: e.target.value })}
            placeholder="my-gcp-project-id"
          />
        </div>

        <div>
          <Label htmlFor="vertex-location">
            <Trans>Vertex location</Trans>
          </Label>
          <Input
            id="vertex-location"
            value={form.vertexLocation}
            onChange={(e) => setForm({ ...form, vertexLocation: e.target.value })}
            placeholder="us-central1"
          />
        </div>

        <div>
          <Label htmlFor="vertex-api-key">
            <Trans>Vertex API key</Trans>
          </Label>
          <Input
            id="vertex-api-key"
            type="password"
            value={form.vertexApiKey}
            onChange={(e) => setForm({ ...form, vertexApiKey: e.target.value })}
            placeholder={existing?.hasVertexApiKey ? t`(leave empty to keep)` : t`Required`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <Button onClick={handleSave} loading={updateMutation.isPending}>
            <Trans>Save AI config</Trans>
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
