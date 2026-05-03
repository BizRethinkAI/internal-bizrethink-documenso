import { z } from 'zod';

import { ZEnvelopeExpirationPeriod } from '@documenso/lib/constants/envelope-expiration';
import { ZEnvelopeReminderSettings } from '@documenso/lib/constants/envelope-reminder';
import { SUPPORTED_LANGUAGE_CODES } from '@documenso/lib/constants/i18n';
import { ZDefaultRecipientsSchema } from '@documenso/lib/types/default-recipients';
import { ZDocumentEmailSettingsSchema } from '@documenso/lib/types/document-email';
import {
  ZDocumentMetaDateFormatSchema,
  ZDocumentMetaTimezoneSchema,
} from '@documenso/lib/types/document-meta';
import { DocumentVisibility } from '@documenso/lib/types/document-visibility';
import { zEmail } from '@documenso/lib/utils/zod';

export const ZUpdateOrganisationSettingsRequestSchema = z.object({
  organisationId: z.string(),
  data: z.object({
    // Document related settings.
    documentVisibility: z.nativeEnum(DocumentVisibility).optional(),
    documentLanguage: z.enum(SUPPORTED_LANGUAGE_CODES).optional(),
    documentTimezone: ZDocumentMetaTimezoneSchema.nullish(), // Null means local timezone.
    documentDateFormat: ZDocumentMetaDateFormatSchema.optional(),
    includeSenderDetails: z.boolean().optional(),
    includeSigningCertificate: z.boolean().optional(),
    includeAuditLog: z.boolean().optional(),
    typedSignatureEnabled: z.boolean().optional(),
    uploadSignatureEnabled: z.boolean().optional(),
    drawSignatureEnabled: z.boolean().optional(),
    defaultRecipients: ZDefaultRecipientsSchema.nullish(),
    delegateDocumentOwnership: z.boolean().nullish(),
    envelopeExpirationPeriod: ZEnvelopeExpirationPeriod.optional(),
    reminderSettings: ZEnvelopeReminderSettings.optional(),

    // Branding related settings.
    brandingEnabled: z.boolean().optional(),
    brandingLogo: z.string().optional(),
    brandingUrl: z.string().optional(),
    brandingCompanyDetails: z.string().optional(),

    // ADDED for BizRethink overlay 025: per-org hidePoweredBy toggle.
    // Mutates OrganisationClaim.flags.hidePoweredBy for this org's claim
    // (each org has its own claim row, so this is per-org). When true, the
    // email footer suppresses the "Powered by Pacta" attribution. When false,
    // attribution shows. Decoupled from brandingEnabled so tenants without
    // their own logo can still hide attribution if desired.
    hidePoweredBy: z.boolean().optional(),

    // Email related settings.
    emailId: z.string().nullish(),
    emailReplyTo: zEmail().nullish(),
    // emailReplyToName: z.string().optional(),
    emailDocumentSettings: ZDocumentEmailSettingsSchema.optional(),

    // AI features settings.
    aiFeaturesEnabled: z.boolean().optional(),
  }),
});

export const ZUpdateOrganisationSettingsResponseSchema = z.void();
