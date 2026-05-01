-- CreateTable
CREATE TABLE "BizrethinkInstanceAiConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "vertexProjectId" TEXT,
    "vertexLocation" TEXT,
    "vertexApiKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" INTEGER,

    CONSTRAINT "BizrethinkInstanceAiConfig_pkey" PRIMARY KEY ("id")
);
