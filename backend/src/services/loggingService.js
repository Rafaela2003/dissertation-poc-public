// Logging Service - handles all logging of interactions, including templated interactions and blocked messages

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class LoggingService {
  async logTemplatedInteraction({
    sessionId,
    templatedPrompt,
    templatedResponse,
    piiCategories = [],
    enforcementAction,
    promptTokens,
    responseTokens,
    totalTokens,
    modelUsed,
    responseTime,
    personaId,
    userAgent,
    errorOccurred = false,
    errorMessage = null,
    blockReason = null,
    blockCategory = null,
  }) {
    try {
      // Ensure piiCategories is an array, not a string
      let categoriesArray = piiCategories;

      if (typeof piiCategories === "string") {
        try {
          categoriesArray = JSON.parse(piiCategories);
        } catch {
          categoriesArray = [];
        }
      }

      if (!Array.isArray(categoriesArray)) {
        categoriesArray = [];
      }

      const interaction = await prisma.interaction.create({
        data: {
          sessionId,
          templatedPrompt,
          templatedResponse,
          piiCategoriesDetected: categoriesArray,
          enforcementAction,
          promptTokens,
          responseTokens,
          totalTokens,
          modelUsed,
          responseTime,
          errorOccurred,
          errorMessage,
          blockReason,
          blockCategory,
        },
      });

      console.log(
        `Logged templated interaction: ${interaction.id.substring(0, 8)}...`,
      );
      return interaction;
    } catch (error) {
      console.error("Database logging error:", error);
      throw error;
    }
  }

  async logBlockedMessage({
    sessionId,
    blockReason,
    blockCategory,
    personaId,
    userAgent,
  }) {
    try {
      const interaction = await prisma.interaction.create({
        data: {
          sessionId,
          templatedPrompt: "[BLOCKED]",
          templatedResponse: "",
          piiCategoriesDetected: blockCategory ? [blockCategory] : [],
          enforcementAction: "blocked",
          blockReason,
          blockCategory,
          errorOccurred: false,
        },
      });

      console.log(`Logged block event: ${blockReason} (${blockCategory})`);
      return interaction;
    } catch (error) {
      console.error("Failed to log blocked message:", error);
      throw error;
    }
  }

  async getSessionInteractions(sessionId) {
    try {
      const interactions = await prisma.interaction.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      return interactions;
    } catch (error) {
      console.error("Failed to retrieve interactions:", error);
      throw error;
    }
  }
}

export default new LoggingService();
