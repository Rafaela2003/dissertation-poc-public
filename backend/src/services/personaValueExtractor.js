// Persona Value Extractor - Extracts allowed values from a persona for entity classification

class PersonaValueExtractor {
  extractAllowedValues(persona) {
    if (!persona) {
      return {
        names: new Set(),
        jobs: new Set(),
        locations: new Set(),
        organizations: new Set(),
        emails: new Set(),
        phones: new Set(),
        all: new Set(),
      };
    }

    const values = {
      names: new Set(),
      jobs: new Set(),
      locations: new Set(),
      organizations: new Set(),
      emails: new Set(),
      phones: new Set(),
      all: new Set(),
    };

    const addToCategory = (value, category) => {
      if (!value) return;
      const cleaned = value.toString().toLowerCase().trim();
      if (cleaned.length > 0) {
        category.add(cleaned);
        values.all.add(cleaned);
      }
    };

    // NAMES
    if (persona.PER?.full_name) {
      const fullName = persona.PER.full_name;
      addToCategory(fullName, values.names);

      // Add individual name parts
      const nameParts = fullName.split(/\s+/);
      nameParts.forEach((part) => {
        if (part.length > 1) {
          addToCategory(part, values.names);
        }
      });
    }

    if (persona.PER?.username) {
      addToCategory(persona.PER.username, values.names);
    }

    // JOBS
    if (persona.DEM?.job_title) {
      const jobTitle = persona.DEM.job_title;
      addToCategory(jobTitle, values.jobs);

      // Add job parts (e.g., "Software Engineer" → "software", "engineer")
      const jobParts = jobTitle.split(/\s+/);
      jobParts.forEach((part) => {
        if (part.length > 3) {
          addToCategory(part, values.jobs);
        }
      });
    }

    // LOCATIONS
    if (persona.LOC?.city) {
      addToCategory(persona.LOC.city, values.locations);
    }

    if (persona.LOC?.country) {
      addToCategory(persona.LOC.country, values.locations);
    }

    // ORGANISATIONS
    if (persona.ORG?.organisation) {
      const org = persona.ORG.organisation;
      addToCategory(org, values.organizations);

      // Add org parts
      const orgParts = org.split(/\s+/);
      orgParts.forEach((part) => {
        if (part.length > 3) {
          addToCategory(part, values.organizations);
        }
      });
    }

    // CONTACT INFO
    if (persona.CODE?.email) {
      addToCategory(persona.CODE.email, values.emails);
    }

    if (persona.CODE?.phone) {
      const phone = persona.CODE.phone.replace(/\s+/g, "").replace(/\+44/, "0");
      addToCategory(phone, values.phones);
    }

    return values;
  }

  // Check if a text matches any allowed persona value (exact or partial for multi-word)
  isPersonaValue(text, allowedValues) {
    const textLower = text.toLowerCase().trim();

    // Exact match in any category
    if (allowedValues.all.has(textLower)) {
      return true;
    }

    // Partial match for multi-word values
    for (const allowed of allowedValues.all) {
      if (allowed.includes(" ")) {
        // Multi-word: check if text is a word within it
        const words = allowed.split(/\s+/);
        if (words.includes(textLower)) {
          return true;
        }
      }
    }

    return false;
  }

  // Classify an entity based on whether it matches allowed persona values
  classifyEntity(entity, allowedValues) {
    const isPersona = this.isPersonaValue(entity.text, allowedValues);

    return {
      ...entity,
      classification: isPersona ? "PERSONA" : "EXTERNAL",
      isAllowed: isPersona,
    };
  }
}

export default new PersonaValueExtractor();
