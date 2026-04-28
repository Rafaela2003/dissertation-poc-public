// Chat controller to handle incoming messages, enforce privacy, call LLM and log interactions
import privacyEnforcementService from "../services/privacyEnforcementService.js";
import llmService from "../services/llmService.js";
import loggingService from "../services/loggingService.js";
import prisma from "../config/database.js";

export async function handleMessage(req, res) {
  const { prompt, sessionId, personaId } = req.body;

  if (!prompt || !sessionId || !personaId) {
    return res.status(400).json({
      error: "Missing required fields: prompt, sessionId, personaId",
    });
  }

  try {
    // Get persona from database
    const persona = await prisma.persona.findUnique({
      where: { id: parseInt(personaId) },
    });

    if (!persona) {
      return res.status(404).json({ error: "Persona not found" });
    }

    console.log(`\nProcessing message for session ${sessionId.slice(0, 8)}...`);
    console.log(` Prompt: "${prompt.slice(0, 50)}..."`);

    // Step 1: Analyse privacy with fallback logic
    const privacyResult = await privacyEnforcementService.enforce(
      prompt,
      personaId,
      persona.data, 
    );

    console.log(
      `Privacy check: ${privacyResult.blocked ? "blocked" : "allowed"} (${privacyResult.reason || "passed"})`,
    );

    // Step 2: Block if privacy violation detected
    if (privacyResult.blocked) {
      console.log(`Blocked: ${privacyResult.message}`);

      await loggingService.logBlockedMessage({
        sessionId,
        personaId: parseInt(personaId),
        blockReason: privacyResult.message,
        blockCategory: privacyResult.category || privacyResult.reason,
        userAgent: req.headers["user-agent"],
      });

      return res.status(403).json({
        blocked: true,
        message: privacyResult.message,
        category: privacyResult.category || privacyResult.reason,
      });
    }

    // Step 3: Call LLM with templated content (with fallback)
    const templatedPrompt = privacyResult.templatedText;
    console.log(`Loading conversation history...`);

    const previousInteractions = await prisma.interaction.findMany({
      where: {
        sessionId,
        enforcementAction: "allowed",
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    // Build message history
    const messageHistory = [];

    previousInteractions.forEach((interaction) => {
      if (interaction.templatedPrompt) {
        messageHistory.push({
          role: "user",
          content: interaction.templatedPrompt,
        });
      }

      if (interaction.templatedResponse) {
        messageHistory.push({
          role: "assistant",
          content: interaction.templatedResponse,
        });
      }
    });

    // Add current message
    messageHistory.push({
      role: "user",
      content: templatedPrompt,
    });

    console.log(
      `History: ${messageHistory.length - 1} previous messages loaded`,
    );

    console.log(`Allowed. Calling LLM...`);

    let llmResponse;
    let llmError = null;

    try {
      llmResponse = await llmService.generateResponse(
        templatedPrompt,
        sessionId,
      );
    } catch (error) {
      console.error(`LLM call failed: ${error.message}`);
      llmError = error.message;

      // Fallback response
      llmResponse = {
        content:
          "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your message or try again in a moment.",
        promptTokens: 0,
        responseTokens: 0,
        totalTokens: 0,
        modelUsed: "fallback",
        responseTime: 0,
      };
    }

    // Step 4: Log interaction
    await loggingService.logTemplatedInteraction({
      sessionId,
      personaId: parseInt(personaId),
      templatedPrompt,
      templatedResponse: llmResponse.content,
      piiCategories: privacyResult.piiCategories || [],
      enforcementAction: "allowed",
      blockReason: null,
      blockCategory: null,
      promptTokens: llmResponse.promptTokens || 0,
      responseTokens: llmResponse.responseTokens || 0,
      totalTokens: llmResponse.totalTokens || 0,
      modelUsed: llmResponse.modelUsed || "unknown",
      responseTime: llmResponse.responseTime || 0,
      errorOccurred: !!llmError,
      errorMessage: llmError,
      userAgent: req.headers["user-agent"],
    });

    console.log(`Response generated (${llmResponse.modelUsed})`);

    // Step 5: Return response
    return res.status(200).json({
      response: llmResponse.content,
      timestamp: new Date().toISOString(),
      model: llmResponse.modelUsed,
      detectionMethod: privacyResult.method,
      llmFallback: !!llmError,
    });
  } catch (error) {
    console.error("Message handling error:", error);

    return res.status(500).json({
      error: "Internal server error",
      message:
        "An error occurred while processing your message. Please try again.",
    });
  }
}

export default {
  handleMessage,
};
