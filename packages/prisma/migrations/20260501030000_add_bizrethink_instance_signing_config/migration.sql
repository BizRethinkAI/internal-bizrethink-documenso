-- CreateTable
CREATE TABLE "BizrethinkInstanceSigningConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "transport" TEXT NOT NULL DEFAULT 'local',
    "localCertContents" TEXT,
    "localPassphrase" TEXT,
    "gcloudKeyPath" TEXT,
    "gcloudCredentials" TEXT,
    "gcloudCertChain" TEXT,
    "tsaUrls" TEXT,
    "signingContactInfo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,

    CONSTRAINT "BizrethinkInstanceSigningConfig_pkey" PRIMARY KEY ("id")
);
