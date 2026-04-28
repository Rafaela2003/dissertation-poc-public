// Template Logger Service

class TemplateLogger {
  constructor() {
    // Regex patterns for structured PII
    this.patterns = {
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        token: "[EMAIL]",
      },
      phone: {
        regex: /\b(?:(?:\+44\s?|0)(?:7\d{3}|\d{2,4})\s?\d{3,4}\s?\d{3,4})\b/g,
        token: "[PHONE]",
      },
      postcode: {
        regex: /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/gi,
        token: "[POSTCODE]",
      },
      ni_number: {
        regex: /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]\b/gi,
        token: "[NI_NUMBER]",
      },
      credit_card: {
        regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        token: "[CREDIT_CARD]",
      },
      date: {
        regex: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
        token: "[DATE]",
      },
    };

    console.log("Template Logger initialised");
  }

  // Replace detected PII in text with tokens
  templatize(text, nerDetections = []) {
    if (!text || text.trim().length === 0) {
      return {
        templated: text || "",
        replacements: [],
        piiCategories: [],
      };
    }

    let templated = text;
    const replacements = [];

    console.log(`Templating: "${text}"`);
    console.log(`NER detections: ${nerDetections.length}`);

    // Debug: Show what we received
    if (nerDetections.length > 0) {
      console.log("   Detections:");
      nerDetections.forEach((d) => {
        console.log(`     - "${d.text}" (${d.type || d.label})`);
      });
    }

    // STEP 1: Template structured PII (emails, phones, etc.)
    for (const [type, config] of Object.entries(this.patterns)) {
      const regex = new RegExp(config.regex);
      const matches = [...text.matchAll(regex)];

      for (const match of matches) {
        console.log(`  → ${type}: "${match[0]}" → ${config.token}`);
        replacements.push({
          original: match[0],
          token: config.token,
          type,
          method: "regex",
        });
      }

      templated = templated.replace(regex, config.token);
    }

    // STEP 2: Template NER-detected entities
    if (nerDetections && nerDetections.length > 0) {
      // Sort by length (longest first) to avoid partial replacements
      const sorted = [...nerDetections]
        .filter((d) => {
          if (!d.text || d.text.trim().length < 2) {
            console.log(`Skipping very short: "${d.text}"`);
            return false;
          }
          if (d.type === "CONTEXT") {
            console.log(`Skipping CONTEXT: "${d.text}"`);
            return false;
          }
          return true;
        })
        .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));

      console.log(`Processing ${sorted.length} valid detections`);

      for (const detection of sorted) {
        const label = detection.type || detection.label;
        const token = this.getTokenForEntityType(label);

        // Check if this text exists in current templated version
        const textLower = templated.toLowerCase();
        const detectionLower = detection.text.toLowerCase();

        if (!textLower.includes(detectionLower)) {
          console.log(`"${detection.text}" not found in current text`);
          continue;
        }

        console.log(`   -> ${label}: "${detection.text}" -> ${token}`);

        replacements.push({
          original: detection.text,
          token,
          type: label,
          method: "ner",
        });

        // Replace (case-insensitive)
        const escaped = this.escapeRegex(detection.text);
        const regex = new RegExp(`\\b${escaped}\\b`, "gi");
        templated = templated.replace(regex, token);
      }
    }

    // STEP 3: Clean up duplicate tokens
    templated = this.cleanupTokens(templated);

    const piiCategories = [...new Set(replacements.map((r) => r.type))];

    console.log(`Result: "${templated}"`);
    console.log(
      `Replacements: ${replacements.length}, Categories: ${piiCategories.join(", ")}`,
    );

    return {
      templated,
      replacements,
      piiCategories,
    };
  }

  cleanupTokens(text) {
    let cleaned = text;

    const tokens = [
      "[PER_NAME]",
      "[LOC]",
      "[ORG]",
      "[EMAIL]",
      "[PHONE]",
      "[DATE]",
      "[POSTCODE]",
      "[JOB_TITLE]",
      "[NUMBER]",
      "[PII]",
    ];

    for (const token of tokens) {
      // Remove duplicate consecutive tokens
      const regex = new RegExp(
        `(${this.escapeRegex(token)})(\\s+${this.escapeRegex(token)})+`,
        "g",
      );
      cleaned = cleaned.replace(regex, token);
    }

    return cleaned.trim();
  }

  getTokenForEntityType(type) {
    if (!type) return "[PII]";

    const label = type.toUpperCase();

    const tokens = {
      PER: "[PER_NAME]",
      PERSON: "[PER_NAME]",
      NAME: "[PER_NAME]",

      JOB: "[JOB_TITLE]",
      JOB_TITLE: "[JOB_TITLE]",

      LOC: "[LOC]",
      LOCATION: "[LOC]",
      GPE: "[LOC]",

      ORG: "[ORG]",
      ORGANIZATION: "[ORG]",

      EMAIL: "[EMAIL]",
      PHONE: "[PHONE]",

      DATE: "[DATE]",
      TIME: "[TIME]",

      MONEY: "[MONEY]",
      QUANTITY: "[NUMBER]",
      CARDINAL: "[NUMBER]",
    };

    return tokens[label] || "[PII]";
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export default new TemplateLogger();
