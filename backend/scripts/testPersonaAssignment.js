import axios from "axios";

const API_BASE = "http://localhost:3001/api";

console.log("\n" + "=".repeat(80));
console.log("PERSONA ASSIGNMENT VALIDATION TEST");
console.log("=".repeat(80) + "\n");

async function createSession() {
  try {
    const response = await axios.post(`${API_BASE}/experiment/session/create`);
    return response.data.sessionId;
  } catch (error) {
    console.error(
      "Failed to create session:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

async function assignPersona(sessionId) {
  try {
    const response = await axios.post(`${API_BASE}/persona/assign`, {
      sessionId,
    });
    return response.data;
  } catch (error) {
    console.error(
      "Failed to assign persona:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

async function testPersonaAssignment() {
  console.log("Checking server availability...");

  try {
    const healthCheck = await axios.get("http://localhost:3001/health");
    console.log("Server is running\n");
  } catch (error) {
    console.error("Server is not running!");
    console.error("Please start the backend server with: npm run dev");
    console.error("Error:", error.message);
    process.exit(1);
  }

  const results = [];
  const numTests = 10;

  console.log(`Running ${numTests} persona assignment tests...\n`);

  for (let i = 1; i <= numTests; i++) {
    console.log(`Test ${i}/${numTests}:`);
    console.log("-".repeat(40));

    try {
      // Create a new session
      console.log("   Creating session...");
      const sessionId = await createSession();
      console.log(`Session created: ${sessionId.slice(0, 16)}...`);

      // Assign persona
      console.log("Assigning persona...");
      const personaData = await assignPersona(sessionId);
      console.log(
        `Persona assigned: ID ${personaData.personaId} - ${personaData.name}`,
      );

      // Test idempotency - assign again with same session
      console.log("   Testing idempotency (second assignment)...");
      const personaData2 = await assignPersona(sessionId);
      console.log(
        `Second call: ID ${personaData2.personaId} - ${personaData2.name}`,
      );

      const isCached = personaData2.cached === true;
      const samePersona = personaData.personaId === personaData2.personaId;

      console.log(`Cached: ${isCached ? "Yes" : "No"}`);
      console.log(`Same persona: ${samePersona ? "Yes" : "No"}`);

      if (!samePersona) {
        console.log(
          "WARNING: Idempotency failed! Same session got different personas!",
        );
      }

      results.push({
        testNumber: i,
        sessionId,
        personaId: personaData.personaId,
        personaName: personaData.name,
        cached: isCached,
        idempotent: samePersona,
        success: true,
      });

      console.log("Test passed\n");
    } catch (error) {
      console.error(`Test failed!`);
      console.error(`Error message: ${error.message}`);
      console.error(
        `Error response: ${JSON.stringify(error.response?.data, null, 2)}`,
      );

      results.push({
        testNumber: i,
        error: error.message,
        errorDetails: error.response?.data,
        success: false,
      });

      console.log("");
    }

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\n" + "=".repeat(80));
  console.log("TEST RESULTS SUMMARY");
  console.log("=".repeat(80) + "\n");

  const successfulTests = results.filter((r) => r.success);
  const failedTests = results.filter((r) => !r.success);

  // Count persona distribution
  const personaDistribution = {};
  successfulTests.forEach((r) => {
    if (r.personaId) {
      personaDistribution[r.personaId] = personaDistribution[r.personaId] || {
        name: r.personaName,
        sessions: [],
      };
      personaDistribution[r.personaId].sessions.push(r.sessionId.slice(0, 8));
    }
  });

  if (Object.keys(personaDistribution).length > 0) {
    console.log("Persona Distribution Across Sessions:\n");
    Object.entries(personaDistribution).forEach(([personaId, data]) => {
      console.log(`Persona ${personaId} (${data.name}):`);
      console.log(`Assigned to ${data.sessions.length} session(s)`);
      console.log(`Sessions: ${data.sessions.join(", ")}\n`);
    });
  } else {
    console.log("No successful persona assignments\n");
  }

  console.log("Statistics:\n");
  console.log(`   Total tests: ${numTests}`);
  console.log(
    `   Successful: ${successfulTests.length} ${successfulTests.length === numTests ? "y" : "n"}`,
  );
  console.log(
    `   Failed: ${failedTests.length} ${failedTests.length === 0 ? "y" : "n"}`,
  );
  console.log(
    `   Unique personas used: ${Object.keys(personaDistribution).length}`,
  );

  const allCached = successfulTests.every((r) => r.cached === true);
  const allIdempotent = successfulTests.every((r) => r.idempotent === true);

  console.log(`   All cached correctly: ${allCached ? "y" : "n"}`);
  console.log(`   All idempotent: ${allIdempotent ? "y" : "n"}`);

  if (failedTests.length > 0) {
    console.log("\nFAILED TESTS:\n");
    failedTests.forEach((test) => {
      console.log(`Test ${test.testNumber}: ${test.error}`);
      if (test.errorDetails) {
        console.log(`Details: ${JSON.stringify(test.errorDetails)}`);
      }
    });
  }

  console.log(
    "\n" +
      (successfulTests.length === numTests ? "y" : "n") +
      " Validation Test Complete!\n",
  );
  console.log("=".repeat(80) + "\n");

  // Exit with appropriate code
  process.exit(failedTests.length > 0 ? 1 : 0);
}

// Run the test
testPersonaAssignment().catch((error) => {
  console.error("\nTest suite crashed:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
});
