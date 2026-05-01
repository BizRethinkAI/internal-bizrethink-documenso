-- CreateTable
CREATE TABLE "BizrethinkSsoProvider" (
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "oidcWellKnownUrl" TEXT,
    "oidcProviderLabel" TEXT,
    "oidcSkipVerify" BOOLEAN NOT NULL DEFAULT false,
    "oidcPrompt" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,

    CONSTRAINT "BizrethinkSsoProvider_pkey" PRIMARY KEY ("provider")
);
