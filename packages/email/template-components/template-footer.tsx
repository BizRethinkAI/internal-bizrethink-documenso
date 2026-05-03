// MODIFIED for BizRethink overlay 023: rebrand the email footer from
// upstream Documenso defaults to Pacta. Three changes:
//   1. "Powered by Documenso" link → "Powered by Pacta" linking to the
//      BizRethink AI marketing site.
//   2. Address fallback (when an org has no brandingCompanyDetails set):
//      Documenso's San Francisco address → BizRethink AI's address.
//   3. Use APP_NAME / APP_PARENT_BRAND constants from app.ts (overlay 021)
//      so future renames are a one-file change.
import { Trans } from '@lingui/react/macro';

import { APP_NAME, APP_PARENT_BRAND } from '@documenso/lib/constants/app';

import { Link, Section, Text } from '../components';
import { useBranding } from '../providers/branding';

export type TemplateFooterProps = {
  isDocument?: boolean;
};

export const TemplateFooter = ({ isDocument = true }: TemplateFooterProps) => {
  const branding = useBranding();

  return (
    <Section>
      {isDocument && !branding.brandingHidePoweredBy && (
        <Text className="my-4 text-base text-slate-400">
          <Trans>
            This document was sent using{' '}
            <Link className="text-[#1f2937]" href="https://bizrethink.ai">
              {APP_NAME}
            </Link>
            .
          </Trans>
        </Text>
      )}

      {branding.brandingEnabled && branding.brandingCompanyDetails && (
        <Text className="my-8 text-sm text-slate-400">
          {branding.brandingCompanyDetails.split('\n').map((line, idx) => {
            return (
              <>
                {idx > 0 && <br />}
                {line}
              </>
            );
          })}
        </Text>
      )}

      {!branding.brandingEnabled && (
        <Text className="my-8 text-sm text-slate-400">
          {APP_PARENT_BRAND} (Server Baba Inc.)
          <br />
          Florida, USA
        </Text>
      )}
    </Section>
  );
};

export default TemplateFooter;
