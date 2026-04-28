// Leakage Detection Service that analyses prompts and completions for potential data leakage

import fetch from "node-fetch";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import llmDetectionService from "./llmDetectionService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LeakageDetectionService {
  constructor() {
    this.pythonServiceUrl = "http://localhost:5000";
    this.pythonProcess = null;
    this.isAvailable = false;
  }

  async startPythonService() {
    return new Promise((resolve, reject) => {
      console.log("Starting Python leakage detection service...");

      const pythonScript = path.join(
        __dirname,
        "../../python/leakage_detector.py",
      );

      this.pythonProcess = spawn("python", [pythonScript], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Log Python output
      this.pythonProcess.stdout.on("data", (data) => {
        console.log("Python service:", data.toString());
      });

      this.pythonProcess.stderr.on("data", (data) => {
        console.error("Python service error:", data.toString());
      });

      this.pythonProcess.on("error", (error) => {
        console.error("Failed to start Python service:", error);
        this.isAvailable = false;
        reject(error);
      });

      this.pythonProcess.on("exit", (code) => {
        console.log(`Python service exited with code ${code}`);
        this.isAvailable = false;
      });

      // Wait for the service to be ready by polling the health endpoint
      let attempts = 0;
      const maxAttempts = 30;

      const checkHealth = async () => {
        attempts++;

        try {
          const response = await fetch(`${this.pythonServiceUrl}/health`, {
            timeout: 2000,
          });

          if (response.ok) {
            console.log("Python leakage detection service is ready");
            this.isAvailable = true;
            resolve();
          } else {
            throw new Error("Health check failed");
          }
        } catch (error) {
          if (attempts < maxAttempts) {
            console.log(
              `Waiting for Python service... (${attempts}/${maxAttempts})`,
            );
            setTimeout(checkHealth, 1000);
          } else {
            console.error("Python service failed to start after 10 seconds");
            this.isAvailable = false;
            reject(new Error("Python service not available"));
          }
        }
      };

      // Start checking health after a short delay to give the service time to start
      setTimeout(checkHealth, 2000);
    });
  }

  stopPythonService() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      console.log("Python service stopped");
      this.isAvailable = false;
    }
  }

  // PRIMARY: Regex + spaCy NER-based detection
  async analysePrimary(text, persona = null) {
    if (!this.isAvailable) {
      console.warn("Python service unavailable, using fallback");
      return this.basicFallbackDetection(text);
    }

    try {
      const response = await fetch(`${this.pythonServiceUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          persona, // Pass persona to Python service
        }),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      const results = await response.json();
      return results;
    } catch (error) {
      console.error("Primary detection error:", error.message);
      return this.basicFallbackDetection(text);
    }
  }

  // SECONDARY: LLM-based contextual analysis
  async analyseSecondary(text, primaryResult) {
    if (!llmDetectionService.shouldRunSecondaryDetection(primaryResult)) {
      return null;
    }

    const secondaryResult = await llmDetectionService.analyseContextualPII(
      text,
      primaryResult.detections,
    );

    return secondaryResult;
  }

  // combined analysis that runs both primary and secondary detection,
  // deduplicates results and calculates severity
  async analyseText(text) {
    const primaryResult = await this.analysePrimary(text);
    console.log(`Primary: ${primaryResult.detections.length} detections`);

    const secondaryResult = await this.analyseSecondary(text, primaryResult);

    if (secondaryResult) {
      console.log(`Secondary: ${secondaryResult.detections.length} detections`);
    }

    const combinedDetections = [
      ...primaryResult.detections,
      ...(secondaryResult?.detections || []),
    ];

    const deduplicated = this.deduplicateDetections(combinedDetections);

    const combinedSeverity = this.calculateCombinedSeverity(
      primaryResult.severity,
      secondaryResult?.overall_risk,
    );

    return {
      text,
      has_leakage: deduplicated.length > 0,
      leakage_score: this.calculateLeakageScore(deduplicated),
      detections: deduplicated,
      severity: combinedSeverity,
      primary_count: primaryResult.detections.length,
      secondary_count: secondaryResult?.detections.length || 0,
      detection_methods: {
        primary: "spaCy NER + Regex + Keywords",
        secondary: secondaryResult
          ? "LLM Contextual Analysis"
          : "Not triggered",
      },
    };
  }

  deduplicateDetections(detections) {
    const seen = new Set();
    const result = [];

    for (const detection of detections) {
      const key = `${detection.text}:${detection.type || detection.category}`;

      if (!seen.has(key)) {
        seen.add(key);
        result.push(detection);
      } else {
        const existingIndex = result.findIndex(
          (d) =>
            d.text === detection.text &&
            (d.type || d.category) === (detection.type || detection.category),
        );

        if (existingIndex !== -1) {
          const existingConf = result[existingIndex].confidence || 0.5;
          const newConf = detection.confidence || 0.5;

          if (newConf > existingConf) {
            result[existingIndex] = detection;
          }
        }
      }
    }

    return result;
  }

  calculateCombinedSeverity(primarySev, secondarySev) {
    const levels = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

    const primaryLevel = levels[primarySev] || 0;
    const secondaryLevel = secondarySev ? levels[secondarySev] || 0 : 0;

    const maxLevel = Math.max(primaryLevel, secondaryLevel);

    return (
      Object.keys(levels).find((key) => levels[key] === maxLevel) || "none"
    );
  }

  calculateLeakageScore(detections) {
    if (detections.length === 0) return 0;

    const weights = {
      CODE: 1.0,
      PER: 0.8,
      implicit_identifier: 0.7,
      quasi_identifier: 0.6,
      contextual_sensitive: 0.5,
      LOC: 0.4,
      ORG: 0.3,
      CONTEXT: 0.2,
    };

    let totalScore = 0;
    for (const detection of detections) {
      const type = detection.type || detection.category || "CONTEXT";
      const weight = weights[type] || 0.3;
      const confidence = detection.confidence || 0.5;
      totalScore += weight * confidence;
    }

    return Math.min(totalScore / 3, 1.0);
  }

  async analyseInteraction(userPrompt, botResponse) {
    const [userAnalysis, botAnalysis] = await Promise.all([
      this.analyseText(userPrompt),
      this.analyseText(botResponse),
    ]);

    return {
      user: userAnalysis,
      bot: botAnalysis,
      overall_leakage: userAnalysis.has_leakage || botAnalysis.has_leakage,
      combined_severity: this.calculateCombinedSeverity(
        userAnalysis.severity,
        botAnalysis.severity,
      ),
      total_detections:
        userAnalysis.detections.length + botAnalysis.detections.length,
    };
  }

  basicFallbackDetection(text) {
    const detections = [];

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      detections.push({
        text: match[0],
        type: "CODE",
        subtype: "email",
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
        method: "fallback",
      });
    }

    const phoneRegex =
      /\b(?:(?:\+44\s?|0)(?:7\d{3}|\d{2,4})\s?\d{3,4}\s?\d{3,4})\b/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      detections.push({
        text: match[0],
        type: "CODE",
        subtype: "phone",
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
        method: "fallback",
      });
    }

    return {
      text,
      has_leakage: detections.length > 0,
      leakage_score: detections.length > 0 ? 0.5 : 0,
      detections,
      severity: detections.length > 0 ? "medium" : "none",
      fallback: true,
    };
  }
}

export default new LeakageDetectionService();
