/*
  Warnings:

  - You are about to drop the column `leakageFlags` on the `Interaction` table. All the data in the column will be lost.
  - You are about to drop the column `personaId` on the `Interaction` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Interaction` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `Interaction` table. All the data in the column will be lost.
  - The `piiCategoriesDetected` column on the `Interaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `enforcementAction` on table `Interaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Interaction_enforcementAction_idx";

-- DropIndex
DROP INDEX "Interaction_sessionId_idx";

-- DropIndex
DROP INDEX "Interaction_timestamp_idx";

-- AlterTable
ALTER TABLE "Interaction" DROP COLUMN "leakageFlags",
DROP COLUMN "personaId",
DROP COLUMN "timestamp",
DROP COLUMN "userAgent",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "enforcementAction" SET NOT NULL,
DROP COLUMN "piiCategoriesDetected",
ADD COLUMN     "piiCategoriesDetected" TEXT[];

-- DropTable
DROP TABLE "Session";

-- CreateTable
CREATE TABLE "Persona" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperimentSession" (
    "id" TEXT NOT NULL,
    "infoSheetViewed" BOOLEAN NOT NULL DEFAULT false,
    "infoSheetViewedAt" TIMESTAMP(3),
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentGivenAt" TIMESTAMP(3),
    "consentDeclined" BOOLEAN NOT NULL DEFAULT false,
    "consentDeclinedAt" TIMESTAMP(3),
    "chatStarted" BOOLEAN NOT NULL DEFAULT false,
    "chatStartedAt" TIMESTAMP(3),
    "chatEndedAt" TIMESTAMP(3),
    "withdrew" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" TIMESTAMP(3),
    "surveyCompleted" BOOLEAN NOT NULL DEFAULT false,
    "surveyCompletedAt" TIMESTAMP(3),
    "personaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentStatement" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InformationSheet" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InformationSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" SERIAL NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExperimentSession" ADD CONSTRAINT "ExperimentSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExperimentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
