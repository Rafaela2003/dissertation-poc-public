// Privacy Enforcement Service - Analyses user input for potential PII and enforces rules based on persona

import sensitiveCategoryDetector from "./sensitiveCategoryDetector.js";
import templateLogger from "./templateLogger.js";
import leakageDetectionService from "./leakageDetectionService.js";
import personaService from "./personaService.js";

class PrivacyEnforcementService {
  constructor() {
    console.log("Privacy Enforcement Service Initialised");
  }

  // Main enforcement function - checks detected entities against persona values and decides to allow or block
  async enforce(text, personaId, personaData = null) {
    console.log("Running privacy enforcement pipeline...");
    console.log(`Input: "${text}"`);

    // STEP 1: Sensitive Category Detection (health, religion, politics)
    const sensitiveCheck = sensitiveCategoryDetector.detect(text);

    if (sensitiveCheck.isBlocked) {
      console.log(
        `BLOCKED: Sensitive category (${sensitiveCheck.primaryCategory})`,
      );
      return {
        allowed: false,
        blocked: true,
        reason: "sensitive_category",
        category: sensitiveCheck.primaryCategory,
        message: sensitiveCategoryDetector.getWarningMessage(
          sensitiveCheck.primaryCategory,
        ),
        originalText: text,
        templatedText: "[BLOCKED]",
      };
    }

    // STEP 2: Load assigned persona
    // Prefer the DB-sourced personaData passed directly; fall back to file lookup
    const persona = personaData
      ? personaData
      : personaId
        ? personaService.personas.find(
            (p) => p.id === parseInt(personaId)
          )
        : null;

    if (!persona) {
      console.log("No persona assigned");
      return {
        allowed: false,
        blocked: true,
        reason: "no_persona",
        message: "No persona assigned. Please refresh the page.",
        originalText: text,
        templatedText: "[BLOCKED]",
      };
    }

    // STEP 3: Detect ALL entities using NER + regex WITH PERSONA VALIDATION
    console.log(
      `Detecting entities with persona validation (Persona ${personaId})...`,
    );
    const nerResult = await leakageDetectionService.analysePrimary(
      text,
      persona,
    );
    console.log(` Detected ${nerResult.detections.length} entities`);

    // Log all detections with persona status
    nerResult.detections.forEach((entity) => {
      const symbol = entity.is_persona ? "y" : "n";
      console.log(
        `   ${symbol} ${entity.type}: "${entity.text}" → ${entity.is_persona ? "PERSONA" : "EXTERNAL"}`,
      );
    });

    // STEP 4: Check for EXTERNAL identifiers (non-persona)
    const externalEntities = nerResult.detections.filter(
      (e) =>
        e.is_persona === false &&
        ["PER", "PERSON", "JOB", "LOC", "GPE", "ORG", "CODE"].includes(e.type),
    );

    if (externalEntities.length > 0) {
      const firstExternal = externalEntities[0];
      console.log(`BLOCKED: External identifier detected`);
      console.log(` Type: ${firstExternal.type}`);
      console.log(` Value: "${firstExternal.text}"`);

      return {
        allowed: false,
        blocked: true,
        reason: "external_identifier",
        message: `Your message contains personal information ("${firstExternal.text}") that does not match your assigned persona. Please use only the details from your persona profile.`,
        originalText: text,
        templatedText: "[BLOCKED]",
        externalEntities,
      };
    }

    // STEP 5: All identifiers are valid (from persona) - Template them
    console.log("All identifiers match persona");
    console.log("Templating all identifiers...");

    const templated = templateLogger.templatize(text, nerResult.detections);

    console.log(`ALLOWED: Message passed all checks`);
    console.log(` Original: "${text}"`);
    console.log(` Templated: "${templated.templated}"`);

    return {
      allowed: true,
      blocked: false,
      reason: null,
      originalText: text,
      templatedText: templated.templated,
      replacements: templated.replacements,
      piiCategories: templated.piiCategories,
      validEntities: nerResult.detections.filter((e) => e.is_persona === true),
    };
  }
}

export default new PrivacyEnforcementService();
