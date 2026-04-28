// LLM Service for OpenRouter - handles all interactions with the
// OpenRouter API, including response generation and error handling

import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";

class LLMService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY?.replace(/[\s\r\n]+/g, "");
    this.model = (process.env.LLM_MODEL || "openrouter/auto").trim();
    this.privacyMode = process.env.PRIVACY_MODE === "true";

    console.log("OpenRouter LLM Service Initialised");
    console.log("Model:", this.model);
    console.log("Privacy Mode:", this.privacyMode);
    console.log("API Key present:", !!this.apiKey);
    console.log("API Key prefix:", this.apiKey?.substring(0, 20) + "...");

    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  async generateResponse(messages, sessionId, attempt = 1, maxAttempts = 3) {
    const startTime = Date.now();

    let messageArray;

    if (typeof messages === "string") {
      messageArray = [{ role: "user", content: messages }];
      console.log(`Prompt length: ${messages.length} chars`);
    } else {
      messageArray = messages;
      console.log(`Conversation history: ${messageArray.length} messages`);
    }

    console.log(
      `Generating response for session: ${sessionId.substring(0, 8)}... (attempt ${attempt})`,
    );

    console.log(`Model: ${this.model}`);

    try {
      const requestParams = {
        model: this.model,
        max_tokens: 1024,
        messages: messageArray,
        temperature: 0.7,
      };

      // Add privacy headers if enabled
      if (this.privacyMode) {
        requestParams.metadata = {
          user_id: `session_${sessionId.substring(0, 8)}`,
        };
      }

      console.log("Calling API...");

      const response = await this.client.chat.completions.create(requestParams);

      const responseTime = Date.now() - startTime;
      console.log("Claude response received");
      console.log(`Response time: ${responseTime} ms`);

      // Extract content
      const content = response.choices[0]?.message?.content || "";

      if (!content) {
        console.error(
          "No content in response:",
          JSON.stringify(response, null, 2),
        );
        throw new Error("No content in Claude response");
      }

      // Extract token usage
      const usage = response.usage || {};
      console.log("Tokens:", {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
      });

      const modelUsed = response.model || this.model;
      console.log(`Actual model used: ${modelUsed}`);

      return {
        content,
        promptTokens: usage.prompt_tokens || 0,
        responseTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        modelUsed,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      console.error("Claude API Error:");
      console.error("Status:", error.status);
      console.error("Type:", error.type);
      console.error("Message:", error.message);
      console.error(`Failed after: ${responseTime} ms`);

      // Handle rate limiting
      if (error.status === 429) {
        if (attempt < maxAttempts) {
          const waitTime = attempt * 5000;
          console.log(
            `Rate limited. Waiting ${waitTime / 1000}s before retry...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.generateResponse(
            messages,
            sessionId,
            attempt + 1,
            maxAttempts,
          );
        }
      }

      // Handle overloaded API
      if (error.status === 529) {
        if (attempt < maxAttempts) {
          const waitTime = attempt * 3000;
          console.log(
            `API overloaded. Waiting ${waitTime / 1000}s before retry...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.generateResponse(
            prompt,
            sessionId,
            attempt + 1,
            maxAttempts,
          );
        }
      }

      throw error;
    }
  }
}

export default new LLMService();
