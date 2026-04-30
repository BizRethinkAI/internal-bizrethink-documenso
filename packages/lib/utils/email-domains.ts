// MODIFIED for BizRethink: removed `AWS_SES_SPF_RECORD` from the returned
// records array. We use Postmark, not SES — the SES SPF record was
// confusing (recommended `v=spf1 include:amazonses.com -all` which would
// break Postmark sends if added). Only the DKIM TXT record matters for our
// setup; Postmark's own SPF (if needed) is configured separately. See
// overlays/009.

export const generateDkimRecord = (recordName: string, publicKeyFlattened: string) => {
  return {
    name: recordName,
    value: `v=DKIM1; k=rsa; p=${publicKeyFlattened}`,
    type: 'TXT',
  };
};

export const generateEmailDomainRecords = (recordName: string, publicKeyFlattened: string) => {
  return [generateDkimRecord(recordName, publicKeyFlattened)];
};
