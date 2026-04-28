// LLM Detection Service - handles secondary detection using LLM contextual analysis

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

class LLMDetectionService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = "https://openrouter.ai/api/v1/chat/completions";
    this.detectionModel = process.env.DETECTION_MODEL || "openrouter/free";
    this.usePrivacyMode = process.env.PRIVACY_MODE === "true";
    this.retryDelay = 3000;
    this.maxRetries = 2;
    this.timeout = parseInt(process.env.DETECTION_TIMEOUT || "120000");

    console.log("LLM Detection Service Initialised");
    console.log("Detection model:", this.detectionModel);
    console.log("Privacy mode:", this.usePrivacyMode ? "ENABLED" : "DISABLED");
    console.log("Timeout:", this.timeout / 1000, "seconds");
    console.log("\n");
  }

  async analyseContextualPII(text, primaryDetections = [], retryCount = 0) {
    const startTime = Date.now();
    console.log(
      `Running secondary LLM detection... (attempt ${retryCount + 1}/${this.maxRetries + 1})`,
    );

    const prompt = this.buildDetectionPrompt(text, primaryDetections);

    try {
      // Build request body
      const requestBody = {
        model: this.detectionModel,
        messages: [
          {
            role: "system",
            content:
              "You are a privacy analysis system. Identify personally identifiable information (PII) in text. Output only valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      };

      // Add privacy constraints if enabled
      if (this.usePrivacyMode) {
        requestBody.provider = {
          data_collection: "deny",
          require_parameters: true,
        };
      }

      // Build headers
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
        "X-Title": "Privacy Research - LLM Detection",
        "Content-Type": "application/json",
      };

      // Add privacy headers
      if (this.usePrivacyMode) {
        headers["X-OpenRouter-No-Log"] = "true";
        headers["OpenRouter-Data-Retention"] = "0";
      }

      const response = await axios.post(this.baseURL, requestBody, {
        headers: headers,
        timeout: this.timeout,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const content = response.data.choices[0]?.message?.content;

      // Log actual model used
      if (response.data.model) {
        console.log("Detection model used:", response.data.model);
      }

      if (!content) {
        console.warn("LLM detection returned empty response");
        return { detections: [], confidence: 0, method: "llm_failed" };
      }

      const result = this.parseDetectionResponse(content);
      result.actual_model = response.data.model; // Track which model was used
      console.log(
        `LLM detection complete: ${result.detections.length} findings (${duration}ms)`,
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.error("LLM detection error:");
      console.error("  - Status:", error.response?.status);
      console.error("  - Code:", error.code);
      console.error("  - Message:", error.message);
      console.error("  - Duration:", duration, "ms");

      // Handle timeout
      if (error.code === "ECONNABORTED") {
        console.warn(`Timeout after ${duration}ms`);

        if (retryCount < this.maxRetries) {
          console.log(`Retrying after timeout...`);
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
          return this.analyseContextualPII(
            text,
            primaryDetections,
            retryCount + 1,
          );
        } else {
          return {
            detections: [],
            confidence: 0,
            method: "skipped_timeout",
            error: `Timeout after ${duration}ms`,
          };
        }
      }

      // Handle rate limiting
      if (error.response?.status === 429) {
        if (retryCount < this.maxRetries) {
          const waitTime = this.retryDelay * (retryCount + 1);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.analyseContextualPII(
            text,
            primaryDetections,
            retryCount + 1,
          );
        } else {
          return {
            detections: [],
            confidence: 0,
            method: "skipped_rate_limit",
            error: "Rate limit exceeded",
          };
        }
      }

      return {
        detections: [],
        confidence: 0,
        method: "llm_error",
        error: error.message,
        error_code: error.code,
        error_status: error.response?.status,
      };
    }
  }

  buildDetectionPrompt(text, primaryDetections) {
    const primarySummary =
      primaryDetections.length > 0
        ? `Primary detection found: ${primaryDetections.map((d) => `${d.type}: "${d.text}"`).join(", ")}`
        : "No primary detections found";

    return `Analyse for implicit PII that primary detection missed.

${primarySummary}

TEXT: "${text}"

Find:
- Unique identifiers (e.g., "only X in city")
- Quasi-identifiers (age+job+city)
- Sensitive context (health, finance)
- Relationships (family, workplace)

JSON output only:
{
  "detections": [
    {
      "text": "exact span",
      "category": "implicit_identifier|quasi_identifier|contextual_sensitive|relationship",
      "risk_level": "low|medium|high|critical",
      "explanation": "why identifying"
    }
  ],
  "overall_risk": "low|medium|high|critical",
  "confidence": 0.0-1.0
}

Empty array if none found.`;
  }

  parseDetectionResponse(content) {
    try {
      let cleaned = content.trim();

      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```\n?/g, "");
      }

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      if (!parsed.detections || !Array.isArray(parsed.detections)) {
        parsed.detections = [];
      }

      return {
        detections: parsed.detections.map((d) => ({
          text: d.text || "",
          category: d.category || "other",
          pii_type: d.pii_type || d.category || "other",
          risk_level: d.risk_level || "low",
          explanation: d.explanation || "",
          could_identify: d.could_identify || false,
          method: "llm",
          timestamp: new Date().toISOString(),
          confidence: d.confidence || 0.7,
        })),
        overall_risk: parsed.overall_risk || "low",
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || "",
        method: "llm",
      };
    } catch (error) {
      console.error("Failed to parse LLM detection response");
      console.error("Parse error:", error.message);

      return {
        detections: [],
        confidence: 0,
        method: "llm_parse_error",
        error: error.message,
      };
    }
  }

  shouldRunSecondaryDetection(primaryResult) {
    if (process.env.ENABLE_SECONDARY_DETECTION === "false") {
      console.log("Secondary detection disabled in config");
      return false;
    }

    if (primaryResult.text.length < 50) {
      console.log("Skipping secondary: text too short (<50 chars)");
      return false;
    }

    if (primaryResult.text.length > 80) {
      console.log("Triggering secondary: text length >80 chars");
      return true;
    }

    const hasContext = primaryResult.detections.some(
      (d) => d.type === "CONTEXT",
    );
    const hasConcretePII = primaryResult.detections.some((d) =>
      ["CODE", "PER"].includes(d.type),
    );

    if (hasContext && !hasConcretePII) {
      console.log("Triggering secondary: context without concrete PII");
      return true;
    }

    console.log("Skipping secondary: no triggers met");
    return false;
  }
}

export default new LLMDetectionService();
