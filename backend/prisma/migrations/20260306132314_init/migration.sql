-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "botResponse" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promptTokens" INTEGER,
    "responseTokens" INTEGER,
    "totalTokens" INTEGER,
    "leakageFlags" TEXT,
    "modelUsed" TEXT,
    "responseTime" INTEGER,
    "personaId" INTEGER,
    "userAgent" TEXT,
    "errorOccurred" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interaction_sessionId_idx" ON "Interaction"("sessionId");

-- CreateIndex
CREATE INDEX "Interaction_timestamp_idx" ON "Interaction"("timestamp");

-- CreateIndex
CREATE INDEX "Interaction_modelUsed_idx" ON "Interaction"("modelUsed");

-- CreateIndex
CREATE INDEX "Interaction_personaId_idx" ON "Interaction"("personaId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
