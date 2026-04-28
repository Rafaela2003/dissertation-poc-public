// Persona Service - Generates and validates realistic user personas for chatbot research

import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PersonaService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = "https://openrouter.ai/api/v1/chat/completions";
    this.generationModel = "openrouter/free";

    // Load personas on init
    this.personas = this.loadPersonas();

    this.generationPrompt = `You are generating a fictional user persona for a UK-based research study on chatbot interactions.

CRITICAL REQUIREMENTS:
1. Create ONE fully realistic persona that could be a real person in the UK
2. Name must be UNIQUE - use realistic but uncommon name combinations
3. All details must be internally consistent and plausible
4. Prioritize realism over diversity - make believable people, not checkboxes

NAMING GUIDELINES:
- Use realistic UK names (British, Irish, South Asian, African, Middle Eastern, European)
- AVOID very common names like "Sarah Johnson", "John Smith", "Emma Williams"
- AVOID repetitive patterns - check that first name + surname combination is unique
- Examples of GOOD unique names: "Imogen Patel", "Callum O'Brien", "Aisha Rahman", "Tobias Chen", "Zara Kowalski"
- Examples of TOO COMMON (avoid): "Sarah Khan", "John Brown", "Emma Jones", "James Wilson"

REALISM GUIDELINES:
- Age should match career stage (don't make a 23-year-old senior manager)
- Income should match job and experience (don't make a retail worker earn £60k)
- Education should match career path (most jobs require relevant education)
- Location should be realistic for job (tech jobs in cities, not rural areas)
- Background should explain how they got to current position

DIVERSITY (Natural, not forced):
- Mix ages: 22-60 (weighted toward 25-45)
- Mix backgrounds: British, Irish, South Asian, African, Caribbean, European, Middle Eastern
- Mix jobs: professional, skilled trade, creative, service, technical
- Mix cities: London, Manchester, Birmingham, Leeds, Glasgow, Edinburgh, Bristol, Liverpool, etc.
- Mix income: £20k-£70k (realistic for UK)

CATEGORIES TO INCLUDE:
- PER: full_name, username
- CODE: email (use example.com/example.org), phone (UK format: 07XXX XXXXXX)
- LOC: city (UK city), country (United Kingdom)
- ORG: organisation (fictional but realistic, e.g., "Riverside Medical Centre", "TechFlow Solutions Ltd")
- DEM: age, nationality, job_title, education_level
- DATETIME: birth_year (2024 - age), career_start_year
- QUANTITY: income_range (realistic for job/age)
- PROFILE: background (2-3 sentences), goals (specific to situation), communication_style

FORBIDDEN:
- No sensitive attributes: health, religion, political beliefs, sexual orientation, ethnicity beyond nationality
- No real organizations (use "Riverside Hospital" not "NHS Trust X")
- No real email domains (must use example.com, example.org, test.com)
- No functional phone numbers (use 07000 prefix)

OUTPUT FORMAT (JSON only, no markdown):
{
  "PER": {"full_name": "Firstname Surname", "username": "fsurname"},
  "CODE": {"email": "firstname.s@example.com", "phone": "07000 123456"},
  "LOC": {"city": "CityName", "country": "United Kingdom"},
  "ORG": {"organisation": "CompanyName Ltd"},
  "DEM": {"age": 35, "nationality": "British", "job_title": "Job Title", "education_level": "Undergraduate degree"},
  "DATETIME": {"birth_year": 1989, "career_start_year": 2011},
  "QUANTITY": {"income_range": "£35,000-£45,000"},
  "PROFILE": {"background": "Brief background...", "goals": "Specific goals...", "communication_style": "Style description..."}
}`;

    this.validationPrompt = `Review this persona for REALISM and INTERNAL CONSISTENCY.

Check for:
1. NAMING:
   - Is the name combination realistic and NOT overly common?
   - Does it avoid repetitive patterns (e.g., not the 5th "Khan" or "Johnson")?
   
2. REALISM:
   - Does age match career stage? (Junior at 22-27, mid at 28-40, senior at 40-55)
   - Does income match job and age? (Entry £20-28k, Mid £28-45k, Senior £45-70k+)
   - Does education match career? (Degree for professional jobs, vocational for trades)
   - Is location realistic for job type? (Tech in cities, not rural areas)
   
3. INTERNAL CONSISTENCY:
   - Birth year = current year (2024) - age
   - Career start = birth year + age they finished education
   - Background story makes sense for current position
   
4. POLICY COMPLIANCE:
   - No sensitive attributes (health, religion, politics, sexual orientation)
   - Fictional organization (not real company)
   - Safe email domain (example.com, example.org, test.com)
   - Safe phone (07000 prefix)
   
5. SCHEMA:
   - All required fields present
   - Valid JSON structure
   - No extra fields

Return "VALID" if persona passes all checks.

If invalid, list specific issues with suggested fixes.

Be strict on realism - if income/age/job don't align, reject it.`;

    console.log("Persona Service Initialised");
    console.log("Model:", this.generationModel);
    console.log(`Loaded ${this.personas.length} personas from file`);
  }

  async generatePersona(diversityHint = "") {
    const enhancedPrompt = diversityHint
      ? `${this.generationPrompt}\n\nSPECIFIC REQUIREMENTS FOR THIS PERSONA:\n${diversityHint}\n\nGenerate the persona following all rules above:`
      : this.generationPrompt;

    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: this.generationModel,
          messages: [
            {
              role: "user",
              content: enhancedPrompt,
            },
          ],
          temperature: 0.9,
          max_tokens: 1500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
            "X-Title": "Persona Generation",
            "OpenRouter-Data-Retention": "0",
          },
          timeout: 60000,
        },
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from LLM");
      }

      let cleaned = content.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/```\n?/g, "");
      }

      const persona = JSON.parse(cleaned);
      return persona;
    } catch (error) {
      console.error("Persona generation error:", error.message);
      throw error;
    }
  }

  async validatePersona(persona) {
    try {
      const response = await axios.post(
        this.baseURL,
        {
          model: this.generationModel,
          messages: [
            {
              role: "user",
              content: `${this.validationPrompt}\n\nPERSONA TO VALIDATE:\n${JSON.stringify(persona, null, 2)}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 800,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
            "X-Title": "Persona Validation",
          },
          timeout: 30000,
        },
      );

      const validation = response.data.choices[0]?.message?.content || "";

      if (validation.includes("VALID")) {
        return { valid: true };
      } else {
        return { valid: false, issues: validation };
      }
    } catch (error) {
      console.error("Validation error:", error.message);
      return { valid: false, issues: "Validation failed" };
    }
  }

  async generateValidPersona(
    maxRetries = 5,
    temperature = 0.9,
    diversityHint = "",
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`  Generating (attempt ${attempt}/${maxRetries})...`);

      const persona = await this.generatePersona(diversityHint);

      console.log(`  Validating...`);
      const validation = await this.validatePersona(persona);

      if (validation.valid) {
        console.log(`Valid persona generated`);
        return persona;
      } else {
        console.log(`Invalid: ${validation.issues}`);
        if (attempt < maxRetries) {
          console.log(`  Retrying...`);
        }
      }
    }

    throw new Error("Failed to generate valid persona after maximum retries");
  }

  savePersonas(personas) {
    const personasDir = path.join(__dirname, "../../data/personas");

    if (!fs.existsSync(personasDir)) {
      fs.mkdirSync(personasDir, { recursive: true });
    }

    personas.forEach((persona, index) => {
      const filename = path.join(
        personasDir,
        `persona_${persona.id || index + 1}.json`,
      );
      fs.writeFileSync(filename, JSON.stringify(persona, null, 2));
    });

    const combinedPath = path.join(personasDir, "personas.json");
    fs.writeFileSync(combinedPath, JSON.stringify(personas, null, 2));

    console.log(`\nSaved ${personas.length} personas to ${personasDir}`);
  }

  loadPersonas() {
    const personasPath = path.join(
      __dirname,
      "../../data/personas/personas.json",
    );

    try {
      if (!fs.existsSync(personasPath)) {
        console.warn("No personas.json found, returning empty array");
        return [];
      }

      const data = fs.readFileSync(personasPath, "utf8");
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.personas && Array.isArray(parsed.personas)) {
        return parsed.personas;
      }

      return [];
    } catch (error) {
      console.error("Failed to load personas:", error.message);
      return [];
    }
  }

  /**
   * Get a random persona from the loaded personas
   */
  getRandomPersona() {
    if (this.personas.length === 0) {
      throw new Error("No personas available. Please generate personas first.");
    }

    const randomIndex = Math.floor(Math.random() * this.personas.length);
    return this.personas[randomIndex];
  }

  /**
   * Get persona by ID
   */
  getPersonaById(id) {
    const persona = this.personas.find((p) => p.id === id);
    if (!persona) {
      throw new Error(`Persona with ID ${id} not found`);
    }
    return persona;
  }

  /**
   * Get all personas
   */
  getAllPersonas() {
    return this.personas;
  }

  /**
   * Reload personas from file
   */
  reloadPersonas() {
    this.personas = this.loadPersonas();
    console.log(`Reloaded ${this.personas.length} personas`);
    return this.personas;
  }
}

export default new PersonaService();
