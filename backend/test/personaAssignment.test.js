// Persona Assignment Test Suite - tests for persona assignment endpoint, distribution, idempotency and data completeness

import axios from "axios";

const API_BASE = "http://localhost:3001/api";

// Helper functions
async function createSession() {
  const response = await axios.post(`${API_BASE}/experiment/session/create`);
  return response.data.sessionId;
}

async function assignPersona(sessionId) {
  const response = await axios.post(`${API_BASE}/persona/assign`, {
    sessionId,
  });
  return response.data;
}

describe("Persona Assignment Tests", () => {
  beforeAll(() => {
    console.log("PERSONA ASSIGNMENT TEST SUITE");
  });

  test("P-01: Persona assigned on first request", async () => {
    console.log("Running P-01: First persona assignment...");

    const sessionId = await createSession();
    console.log(`  Session created: ${sessionId.slice(0, 8)}...`);

    const personaData = await assignPersona(sessionId);

    console.log(
      `  Persona assigned: ID ${personaData.personaId} - ${personaData.name}`,
    );

    expect(personaData.personaId).toBeGreaterThanOrEqual(1);
    expect(personaData.personaId).toBeLessThanOrEqual(5);
    expect(personaData.persona).toBeDefined();
    expect(personaData.persona.PER.full_name).toBeDefined();

    console.log("PASSED\n");
  }, 10000);

  test("P-02: Idempotency - same session gets same persona", async () => {
    console.log("Running P-02: Idempotency test...");

    const sessionId = await createSession();
    console.log(`  Session created: ${sessionId.slice(0, 8)}...`);

    const personaData1 = await assignPersona(sessionId);
    console.log(`First assignment: Persona ${personaData1.personaId}`);

    const personaData2 = await assignPersona(sessionId);
    console.log(`Second assignment: Persona ${personaData2.personaId}`);
    console.log(`Cached: ${personaData2.cached}`);

    expect(personaData1.personaId).toBe(personaData2.personaId);
    expect(personaData2.cached).toBe(true);

    console.log("PASSED\n");
  }, 10000);

  test("P-03: Persona distribution across 20 sessions", async () => {
    console.log("Running P-03: Distribution test (20 sessions)...");

    const personaCounts = {};
    const sessionResults = [];

    for (let i = 0; i < 20; i++) {
      const sessionId = await createSession();
      const personaData = await assignPersona(sessionId);
      const personaId = personaData.personaId;

      personaCounts[personaId] = (personaCounts[personaId] || 0) + 1;
      sessionResults.push({
        session: sessionId.slice(0, 8),
        personaId: personaId,
        personaName: personaData.name,
      });
    }

    console.log("\n  Persona Distribution:");
    Object.entries(personaCounts).forEach(([id, count]) => {
      const persona = sessionResults.find((s) => s.personaId === parseInt(id));
      console.log(
        `    Persona ${id} (${persona.personaName}): ${count} sessions (${((count / 20) * 100).toFixed(1)}%)`,
      );
    });

    const uniquePersonas = Object.keys(personaCounts).length;
    console.log(`\n  Unique personas used: ${uniquePersonas}/5`);

    expect(uniquePersonas).toBeGreaterThanOrEqual(2);

    console.log("PASSED\n");
  }, 60000);

  test("P-04: All 5 personas exist in database", async () => {
    console.log("Running P-04: Verify all 5 personas...");

    const personaIds = new Set();
    const maxAttempts = 50; // Try up to 50 sessions to find all 5

    for (let i = 0; i < maxAttempts && personaIds.size < 5; i++) {
      const sessionId = await createSession();
      const personaData = await assignPersona(sessionId);
      personaIds.add(personaData.personaId);

      if (personaIds.size < 5 && i === maxAttempts - 1) {
        console.log(
          `Warning: Only found ${personaIds.size} unique personas in ${maxAttempts} attempts`,
        );
      }
    }

    console.log(
      `  Found ${personaIds.size} unique personas: ${Array.from(personaIds).sort().join(", ")}`,
    );

    expect(personaIds.size).toBe(5);
    expect(Array.from(personaIds).sort()).toEqual([1, 2, 3, 4, 5]);

    console.log("PASSED\n");
  }, 120000);

  test("P-05: Persona data completeness for all 5", async () => {
    console.log("Running P-05: Data completeness test...");

    const requiredFields = [
      "PER.full_name",
      "PER.username",
      "DEM.age",
      "DEM.job_title",
      "DEM.education_level",
      "ORG.organisation",
      "LOC.city",
      "LOC.country",
      "CODE.email",
      "CODE.phone",
      "PROFILE.background",
      "PROFILE.goals",
    ];

    // Test each persona
    for (let targetPersonaId = 1; targetPersonaId <= 5; targetPersonaId++) {
      const sessionId = await createSession();

      // Keep trying until we get the target persona
      let personaData;
      let attempts = 0;
      do {
        personaData = await assignPersona(sessionId);
        if (personaData.personaId !== targetPersonaId && attempts < 20) {
          // Create new session and try again
          const newSessionId = await createSession();
          personaData = await assignPersona(newSessionId);
          attempts++;
        }
      } while (personaData.personaId !== targetPersonaId && attempts < 20);

      if (personaData.personaId !== targetPersonaId) {
        console.log(
          `Skipping Persona ${targetPersonaId} (not assigned after ${attempts} attempts)`,
        );
        continue;
      }

      const persona = personaData.persona;
      console.log(
        `Checking Persona ${targetPersonaId} (${persona.PER.full_name})...`,
      );

      let allFieldsPresent = true;
      requiredFields.forEach((fieldPath) => {
        const parts = fieldPath.split(".");
        let value = persona;
        for (const part of parts) {
          value = value?.[part];
        }

        if (!value) {
          console.log(`Missing: ${fieldPath}`);
          allFieldsPresent = false;
        }
      });

      if (allFieldsPresent) {
        console.log(`All ${requiredFields.length} fields present`);
      }

      expect(allFieldsPresent).toBe(true);
    }

    console.log("PASSED\n");
  }, 180000);

  afterAll(() => {
    console.log("PERSONA ASSIGNMENT TESTS COMPLETE");
  });
});
