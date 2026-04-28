// Persona assignment controller to assign a random persona to each session and cache it for the session duration

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const assignPersona = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("PERSONA ASSIGNMENT REQUEST");
    console.log("=".repeat(70));
    console.log("Timestamp:", new Date().toISOString());
    console.log("Request body:", req.body);

    const { sessionId } = req.body;

    if (!sessionId) {
      console.error("Missing sessionId");
      return res.status(400).json({ error: "Session ID is required" });
    }

    console.log("Session ID:", sessionId);

    // Check if this session already has a persona assigned
    console.log("Checking if session already has a persona...");
    const existingSession = await prisma.experimentSession.findUnique({
      where: { id: sessionId },
      include: { persona: true },
    });

    if (existingSession?.personaId && existingSession.persona) {
      console.log("Session already has assigned persona");
      console.log("   Persona ID:", existingSession.personaId);
      console.log(
        "   Persona Name:",
        existingSession.persona.data.PER.full_name,
      );
      console.log("=".repeat(70) + "\n");

      return res.json({
        personaId: existingSession.personaId,
        persona: existingSession.persona.data,
        name: existingSession.persona.data.PER.full_name,
        cached: true,
      });
    }

    // Get all personas from database
    console.log("Fetching all personas from database...");
    const personas = await prisma.persona.findMany({
      orderBy: { id: "asc" },
    });

    if (!personas || personas.length === 0) {
      console.error("No personas found in database");
      console.log("=".repeat(70) + "\n");
      return res.status(500).json({
        error: "No personas available",
        message: "Please run: node scripts/migratePersonas.js",
      });
    }

    console.log(`Found ${personas.length} personas in database`);
    personas.forEach((p) => {
      console.log(`   - Persona ${p.id}: ${p.data.PER.full_name}`);
    });

    // Select random persona
    const randomIndex = Math.floor(Math.random() * personas.length);
    const selectedPersona = personas[randomIndex];

    console.log("\nRandom selection:");
    console.log("   Random index:", randomIndex);
    console.log("   Selected Persona ID:", selectedPersona.id);
    console.log(
      "   Selected Persona Name:",
      selectedPersona.data.PER.full_name,
    );

    // Update session with assigned persona
    console.log("\nUpdating session with assigned persona...");
    await prisma.experimentSession.update({
      where: { id: sessionId },
      data: { personaId: selectedPersona.id },
    });
    console.log("Session updated");

    const response = {
      personaId: selectedPersona.id,
      persona: selectedPersona.data,
      name: selectedPersona.data.PER.full_name,
      cached: false,
    };

    console.log("\nSending response:");
    console.log("   Persona ID:", response.personaId);
    console.log("   Persona Name:", response.name);
    console.log("=".repeat(70) + "\n");

    res.json(response);
  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("PERSONA ASSIGNMENT ERROR");
    console.error("=".repeat(70));
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=".repeat(70) + "\n");

    res.status(500).json({
      error: "Failed to assign persona",
      message: error.message,
    });
  }
};
