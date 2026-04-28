import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function exportWithPersonas() {
  console.log("Exporting Interactions with Persona IDs\n");

  try {
    // Load persona assignments from file
    const assignmentsFile = "./data/persona-assignments/assignments.jsonl";

    if (!fs.existsSync(assignmentsFile)) {
      console.error("No persona assignments found!");
      console.log("Make sure personas have been assigned to sessions first.");
      process.exit(1);
    }

    const assignmentsData = fs.readFileSync(assignmentsFile, "utf-8");
    const assignments = assignmentsData
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .reduce((acc, item) => {
        acc[item.sessionId] = item.personaId;
        return acc;
      }, {});

    console.log(
      `Loaded ${Object.keys(assignments).length} persona assignments`,
    );

    // Get all interactions from database
    const interactions = await prisma.interaction.findMany({
      orderBy: { timestamp: "asc" },
    });

    console.log(`Loaded ${interactions.length} interactions from database`);

    // Enrich interactions with persona IDs
    const enriched = interactions.map((interaction) => ({
      ...interaction,
      personaId: assignments[interaction.sessionId] || null,
    }));

    // Count how many matched
    const matched = enriched.filter((i) => i.personaId !== null).length;
    console.log(
      `Matched ${matched}/${interactions.length} interactions with personas\n`,
    );

    // Save enriched data
    const outputFile = "./data/interactions-with-personas.json";
    fs.writeFileSync(outputFile, JSON.stringify(enriched, null, 2));

    console.log(`Exported to: ${outputFile}`);

    // Create CSV for analysis
    const csv = [
      "Timestamp,SessionID,PersonaID,UserPrompt,BotResponse",
      ...enriched.map(
        (i) =>
          `"${i.timestamp}","${i.sessionId}",${i.personaId || "NULL"},"${i.userPrompt.replace(/"/g, '""')}","${i.botResponse.replace(/"/g, '""')}"`,
      ),
    ].join("\n");

    const csvFile = "./data/interactions-with-personas.csv";
    fs.writeFileSync(csvFile, csv);
    console.log(`Exported to: ${csvFile}`);
  } catch (error) {
    console.error("Export failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportWithPersonas();
