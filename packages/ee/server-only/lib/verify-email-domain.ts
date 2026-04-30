import { EmailDomainStatus } from '@prisma/client';
import { promises as dns } from 'node:dns';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

// MODIFIED for BizRethink: replaced AWS SES poll with a local DNS TXT lookup.
// SES was being used purely as a domain-verification middleman; we do all
// sending through Postmark and don't need an SES dependency just to check
// "did the user actually add the DKIM TXT record?" — `dns.resolveTxt` does
// the same job using Node's resolver. Same security guarantee: only whoever
// controls the domain's DNS zone can add a TXT record at the selector path.
// See overlays/009.

export const verifyEmailDomain = async (emailDomainId: string) => {
  const emailDomain = await prisma.emailDomain.findUnique({
    where: {
      id: emailDomainId,
    },
  });

  if (!emailDomain) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Email domain not found',
    });
  }

  let isVerified = false;

  try {
    // Documenso stores `selector` as the full FQDN (e.g.,
    // "documenso-org_xxxx._domainkey.circularpayments.com"), so resolveTxt
    // takes it directly. Each TXT record is returned as an array of string
    // chunks (DNS limits TXT strings to 255 chars; longer values get split);
    // join the chunks before parsing.
    const txtRecords = await dns.resolveTxt(emailDomain.selector);
    const flattenedRecords = txtRecords.map((chunks) => chunks.join(''));

    const dkimRecord = flattenedRecords.find((record) => record.startsWith('v=DKIM1'));

    if (dkimRecord) {
      const publicKeyMatch = dkimRecord.match(/p=([A-Za-z0-9+/=]+)/);

      if (publicKeyMatch && publicKeyMatch[1] === emailDomain.publicKey) {
        isVerified = true;
      }
    }
  } catch (err) {
    // dns.resolveTxt throws on NXDOMAIN, NODATA, network errors, etc.
    // Any of those means the user hasn't added the TXT record yet (or DNS
    // hasn't propagated). Keep status PENDING; the user can click verify
    // again after a few minutes.
    isVerified = false;
  }

  const updatedEmailDomain = await prisma.emailDomain.update({
    where: {
      id: emailDomainId,
    },
    data: {
      status: isVerified ? EmailDomainStatus.ACTIVE : EmailDomainStatus.PENDING,
      lastVerifiedAt: new Date(),
    },
  });

  return {
    emailDomain: updatedEmailDomain,
    isVerified,
  };
};
