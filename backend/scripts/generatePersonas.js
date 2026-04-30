import dotenv from "dotenv";
dotenv.config();

import personaService from "../src/services/personaService.js";

const NUM_PERSONAS = 5;

// Track used names to avoid duplicates
const usedNames = new Set();
const usedEmails = new Set();
const usedPhones = new Set();

// Main function to generate personas
async function generateUniquePersonas() {
  console.log(`\n Generating ${NUM_PERSONAS} Unique Personas \n`);

  const personas = [];
  const maxAttempts = 20; // Try up to 20 times per persona

  for (let i = 0; i < NUM_PERSONAS; i++) {
    console.log(`\n Generating Persona ${i + 1}/${NUM_PERSONAS} `);

    let attempts = 0;
    let personaGenerated = false;

    while (attempts < maxAttempts && !personaGenerated) {
      attempts++;

      try {
        // Generate with specific diversity requirements for this slot
        const diversityHint = getDiversityHintForSlot(i);
        console.log(`Attempt ${attempts}: ${diversityHint}`);

        const persona = await personaService.generateValidPersona(
          5,
          0.9,
          diversityHint,
        );

        // Check for uniqueness
        const fullName = persona.PER.full_name;
        const email = persona.CODE.email;
        const phone = persona.CODE.phone;

        if (usedNames.has(fullName.toLowerCase())) {
          console.log(`Duplicate name: ${fullName} - Regenerating...`);
          continue;
        }

        if (usedEmails.has(email.toLowerCase())) {
          console.log(`Duplicate email: ${email} - Regenerating...`);
          continue;
        }

        if (usedPhones.has(phone)) {
          console.log(`Duplicate phone: ${phone} - Regenerating...`);
          continue;
        }

        // Store used values
        usedNames.add(fullName.toLowerCase());
        usedEmails.add(email.toLowerCase());
        usedPhones.add(phone);

        console.log(
          `Success: ${fullName} (${persona.DEM.age}, ${persona.DEM.job_title})`,
        );

        personas.push({ id: i + 1, ...persona });
        personaGenerated = true;
      } catch (error) {
        console.error(`Error on attempt ${attempts}:`, error.message);

        if (attempts === maxAttempts) {
          throw new Error(
            `Failed to generate persona ${i + 1} after ${maxAttempts} attempts`,
          );
        }
      }
    }
  }

  // Save personas
  personaService.savePersonas(personas);

  console.log("\n Generation Complete ");
  console.log(` ${personas.length} unique personas saved`);

  // Print summary
  console.log("\n Persona Summary ");
  personas.forEach((p, idx) => {
    console.log(
      `${idx + 1}. ${p.PER.full_name} (${p.DEM.age}, ${p.DEM.nationality}, ${p.DEM.job_title}, ${p.LOC.city})`,
    );
  });
}

/**
 * Get diversity hint for each persona slot
 * This ensures variety without forcing unrealistic combinations
 */
function getDiversityHintForSlot(index) {
  const hints = [
    // Persona 1: Young British professional
    "Young British professional in their 20s, working in tech/business sector in a major UK city. Common British first name and surname.",

    // Persona 2: Mid-career diverse background
    "Mid-career professional (30-40) with South Asian, African, or Middle Eastern background. Working in healthcare, education, or skilled trade. Based in Birmingham, Manchester, or Leeds.",

    // Persona 3: Experienced British professional
    "Experienced British professional (40-55) in traditional profession (law, finance, education). Based in London or another major city. Traditional British name.",

    // Persona 4: Young diverse professional
    "Young professional (25-35) with African, Caribbean, or Asian background. Working in creative, tech, or public sector. Based in diverse UK city.",

    // Persona 5: European or varied background
    "Professional (any age 25-60) with European, Eastern European, or other international background. Working in skilled trade, hospitality, or professional services. Any UK city.",
  ];

  return (
    hints[index] ||
    "Create a realistic UK resident with unique name and background."
  );
}

// Run generation
generateUniquePersonas().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
