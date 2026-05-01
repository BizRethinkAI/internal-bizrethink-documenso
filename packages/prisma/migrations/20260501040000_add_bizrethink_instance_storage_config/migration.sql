-- CreateTable
CREATE TABLE "BizrethinkInstanceStorageConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "transport" TEXT NOT NULL DEFAULT 'database',
    "s3Endpoint" TEXT,
    "s3ForcePathStyle" BOOLEAN NOT NULL DEFAULT false,
    "s3Region" TEXT,
    "s3Bucket" TEXT,
    "s3AccessKeyId" TEXT,
    "s3SecretAccessKey" TEXT,
    "s3DistributionDomain" TEXT,
    "s3DistributionKeyId" TEXT,
    "s3DistributionKeyPem" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,

    CONSTRAINT "BizrethinkInstanceStorageConfig_pkey" PRIMARY KEY ("id")
);
