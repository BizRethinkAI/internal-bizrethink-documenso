import { EmailDomainStatus } from '@prisma/client';
import { Resolver } from 'node:dns/promises';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

// MODIFIED for BizRethink: replaced AWS SES poll with a local DNS TXT lookup
// against public resolvers (Cloudflare 1.1.1.1, Google 8.8.8.8). SES was being
// used purely as a domain-verification middleman; we do all sending through
// Postmark and don't need an SES dependency just to check "did the user
// actually add the DKIM TXT record?". Same security guarantee: only whoever
// controls the domain's DNS zone can add a TXT record at the selector path.
//
// We use a custom Resolver with explicit nameservers instead of the default
// `dns.resolveTxt` because Docker's embedded DNS at 127.0.0.11 was returning
// stale/empty results for newly-added TXT records — likely caching an earlier
// NXDOMAIN/CNAME from a misconfigured DNS state. Public resolvers don't have
// this caching pathology because their authoritative-resolution chain is
// fresh per request and respects the record's TTL strictly. See overlays/009.

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
    const resolver = new Resolver();
    resolver.setServers(['1.1.1.1', '8.8.8.8']);

    const txtRecords = await resolver.resolveTxt(emailDomain.selector);
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
