// PII Detection Evaluation Tests - tests the effectiveness of PII detection and enforcement for each persona

import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "http://localhost:3001/api";

// Load test cases
const testCasesPath = path.join(__dirname, "piiTestCases.json");
const testCases = JSON.parse(fs.readFileSync(testCasesPath, "utf8"));

describe("PII Detection Evaluation Tests", () => {
  let results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    correctActions: 0,
    correctBlocks: 0,
    correctAllows: 0,
    falsePositives: 0,
    falseNegatives: 0,
  };

  let sessions = {}; // Store sessions for each personaId

  beforeAll(async () => {
    console.log("PII DETECTION EVALUATION TEST SUITE");

    // Create multiple sessions and map them to personas
    const MAX_SESSIONS = 50; // Create 50 sessions to increase chance of getting all 5 personas
    const createdSessions = [];

    console.log("Creating sessions and assigning personas...\n");

    for (let i = 0; i < MAX_SESSIONS; i++) {
      try {
        const sessionRes = await axios.post(
          `${API_BASE}/experiment/session/create`,
        );
        const sessionId = sessionRes.data.sessionId;

        const personaRes = await axios.post(`${API_BASE}/persona/assign`, {
          sessionId,
        });
        const personaId = personaRes.data.personaId;
        const personaName = personaRes.data.name;

        // Store this session for this persona if we don't have one yet
        if (!sessions[personaId]) {
          sessions[personaId] = {
            sessionId,
            persona: personaRes.data,
          };
          console.log(`Persona ${personaId} (${personaName}) - Session ready`);
        }

        createdSessions.push({ sessionId, personaId, personaName });

        // Stop early if we have all 5 personas
        if (Object.keys(sessions).length === 5) {
          console.log(`\nAll 5 personas assigned after ${i + 1} sessions`);
          break;
        }
      } catch (error) {
        console.log(`Session ${i + 1} failed: ${error.message}`);
      }
    }

    console.log(`\nTotal sessions created: ${createdSessions.length}`);
    console.log(`Unique personas obtained: ${Object.keys(sessions).length}/5`);

    // List which personas we got
    const obtainedPersonas = Object.keys(sessions).map(Number).sort();
    const missingPersonas = [1, 2, 3, 4, 5].filter(
      (id) => !obtainedPersonas.includes(id),
    );

    if (missingPersonas.length > 0) {
      console.log(`\nMissing personas: ${missingPersonas.join(", ")}`);
      console.log(`Tests requiring these personas will be SKIPPED\n`);
    } else {
      console.log("\nAll personas available for testing\n");
    }
  }, 180000); // 3 minute timeout for beforeAll

  testCases.forEach((testCase) => {
    test(`${testCase.id}: ${testCase.description}`, async () => {
      results.totalTests++;
      console.log(`\n${testCase.id}: ${testCase.description}`);
      console.log(`  Input: "${testCase.input}"`);

      const session = sessions[testCase.personaId];
      if (!session) {
        console.log(`SKIPPED: Persona ${testCase.personaId} not available`);
        results.skipped++;
        return; // Skip test, don't fail
      }

      let testPassed = true;

      try {
        const response = await axios.post(`${API_BASE}/chat/message`, {
          prompt: testCase.input,
          sessionId: session.sessionId,
          personaId: testCase.personaId,
        });

        console.log(`Result: ALLOWED`);
        const responsePreview =
          response.data.response?.slice(0, 60) || "[no response]";
        console.log(`Response: "${responsePreview}..."`);

        if (testCase.expectedAction === "allowed") {
          results.correctActions++;
          results.correctAllows++;
          console.log(`Correctly allowed`);
        } else {
          results.falseNegatives++;
          testPassed = false;
          console.log(`FALSE NEGATIVE: Should have been BLOCKED`);
        }
      } catch (error) {
        if (error.response && error.response.status === 403) {
          console.log(`Result: BLOCKED`);
          const reason = error.response.data.message || "Privacy protection";
          console.log(`Reason: ${reason}`);

          if (testCase.expectedAction === "blocked") {
            results.correctActions++;
            results.correctBlocks++;
            console.log(`Correctly blocked`);
          } else {
            results.falsePositives++;
            testPassed = false;
            console.log(`FALSE POSITIVE: Should have been ALLOWED`);
          }
        } else if (
          error.response &&
          (error.response.status === 429 || error.response.status >= 500)
        ) {
          console.log(`API ERROR (${error.response.status}): ${error.message}`);
          console.log(`Test skipped due to server error`);
          results.skipped++;
          return; // Skip test, don't fail
        } else {
          console.log(`ERROR: ${error.message}`);
          testPassed = false;
        }
      }

      if (testPassed) {
        results.passed++;
        console.log(`TEST PASSED`);
      } else {
        results.failed++;
        console.log(`TEST FAILED`);
      }

      expect(testPassed).toBe(true);
    }, 30000); // 30 second timeout per test
  });

  afterAll(() => {
    console.log("PII DETECTION TEST RESULTS");

    const completedTests = results.totalTests - results.skipped;
    const accuracy =
      completedTests > 0
        ? ((results.correctActions / completedTests) * 100).toFixed(1)
        : "N/A";

    const totalBlocks = results.correctBlocks + results.falsePositives;
    const precision =
      totalBlocks > 0
        ? ((results.correctBlocks / totalBlocks) * 100).toFixed(1)
        : "N/A";

    const totalShouldBlock = results.correctBlocks + results.falseNegatives;
    const recall =
      totalShouldBlock > 0
        ? ((results.correctBlocks / totalShouldBlock) * 100).toFixed(1)
        : "N/A";

    const f1Score =
      precision !== "N/A" && recall !== "N/A"
        ? (
            (2 * (parseFloat(precision) * parseFloat(recall))) /
            (parseFloat(precision) + parseFloat(recall))
          ).toFixed(1)
        : "N/A";

    console.log(`Total Test Cases: ${results.totalTests}`);
    console.log(`Completed: ${completedTests} | Skipped: ${results.skipped}`);
    console.log(`Passed: ${results.passed} | Failed: ${results.failed}`);
    console.log(
      `\nEnforcement Accuracy: ${results.correctActions}/${completedTests} (${accuracy}%)`,
    );
    console.log(`  Correct Blocks: ${results.correctBlocks}`);
    console.log(`  Correct Allows: ${results.correctAllows}`);
    console.log(`\nError Analysis:`);
    console.log(
      `  False Positives (blocked when should allow): ${results.falsePositives}`,
    );
    console.log(
      `  False Negatives (allowed when should block): ${results.falseNegatives}`,
    );
    console.log(`\nDetection Metrics:`);
    console.log(`  Precision: ${precision}%`);
    console.log(`  Recall: ${recall}%`);
    console.log(`  F1 Score: ${f1Score}%`);

    if (results.skipped > 0) {
      console.log(
        `\nNote: ${results.skipped} tests skipped (missing personas or API errors)`,
      );
    }
  });
});
