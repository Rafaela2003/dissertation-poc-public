import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function migratePersonas() {
  try {
    console.log("Migrating personas from JSON to database...\n");

    // Read personas.json
    const personasPath = path.join(__dirname, "../data/personas/personas.json");
    const personasData = JSON.parse(fs.readFileSync(personasPath, "utf8"));

    const personas = Array.isArray(personasData)
      ? personasData
      : personasData.personas;

    if (!personas || personas.length === 0) {
      console.error("No personas found in JSON file");
      return;
    }

    console.log(`Found ${personas.length} personas in JSON file\n`);

    // Clear existing personas
    console.log("Clearing existing personas from database...");
    await prisma.persona.deleteMany();
    console.log("Cleared\n");

    // Insert each persona
    for (const persona of personas) {
      console.log(`Inserting Persona ${persona.id}: ${persona.PER.full_name}`);

      await prisma.persona.create({
        data: {
          id: persona.id,
          data: persona,
        },
      });

      console.log(`Inserted`);
    }

    console.log(
      `\nSuccessfully migrated ${personas.length} personas to database!`,
    );
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migratePersonas();
