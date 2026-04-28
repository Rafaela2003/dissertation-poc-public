/*
  Warnings:

  - You are about to drop the column `botResponse` on the `Interaction` table. All the data in the column will be lost.
  - You are about to drop the column `userPrompt` on the `Interaction` table. All the data in the column will be lost.
  - Added the required column `templatedPrompt` to the `Interaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templatedResponse` to the `Interaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Interaction_modelUsed_idx";

-- DropIndex
DROP INDEX "Interaction_personaId_idx";

-- AlterTable
ALTER TABLE "Interaction" DROP COLUMN "botResponse",
DROP COLUMN "userPrompt",
ADD COLUMN     "blockCategory" TEXT,
ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "enforcementAction" TEXT,
ADD COLUMN     "piiCategoriesDetected" TEXT,
ADD COLUMN     "templatedPrompt" TEXT NOT NULL,
ADD COLUMN     "templatedResponse" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Interaction_enforcementAction_idx" ON "Interaction"("enforcementAction");
