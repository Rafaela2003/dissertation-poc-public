// Functional API tests for backend endpoints using Jest and Axios

import axios from "axios";

const API_BASE = "http://localhost:3001/api";

describe("Functional API Tests - Backend Endpoints", () => {
  beforeAll(() => {
    console.log("FUNCTIONAL API TEST SUITE");
  });

  describe("Health Check", () => {
    test("F-01: Server health endpoint responds", async () => {
      console.log("Running F-01: Health check...");

      const response = await axios.get("http://localhost:3001/health");

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      console.log("Server is healthy");
      console.log("PASSED\n");
    });
  });

  describe("Session Management", () => {
    test("F-02: Create new session", async () => {
      console.log("Running F-02: Create session...");

      const response = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );

      expect(response.status).toBe(200);
      expect(response.data.sessionId).toBeDefined();
      expect(response.data.sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      console.log(`Session created: ${response.data.sessionId.slice(0, 8)}...`);
      console.log("PASSED\n");
    }, 10000);

    test("F-03: Retrieve existing session", async () => {
      console.log("Running F-03: Retrieve session...");

      // First create a session
      const createRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      const sessionId = createRes.data.sessionId;

      // Then retrieve it
      const getRes = await axios.get(
        `${API_BASE}/experiment/session/${sessionId}`,
      );

      expect(getRes.status).toBe(200);
      expect(getRes.data.id).toBe(sessionId);
      expect(getRes.data.consentGiven).toBeDefined();

      console.log(`Retrieved session: ${sessionId.slice(0, 8)}...`);
      console.log("PASSED\n");
    }, 10000);
  });

  describe("Information Sheet & Consent", () => {
    test("F-04: Get information sheet", async () => {
      console.log("Running F-04: Get information sheet...");

      const response = await axios.get(`${API_BASE}/experiment/info-sheet`);

      expect(response.status).toBe(200);
      expect(response.data.title).toBeDefined();
      expect(response.data.content).toBeDefined();
      expect(response.data.content.length).toBeGreaterThan(100);

      console.log(`Retrieved: ${response.data.title}`);
      console.log(`Content length: ${response.data.content.length} chars`);
      console.log("PASSED\n");
    }, 10000);

    test("F-05: Get consent statements", async () => {
      console.log("Running F-05: Get consent statements...");

      const response = await axios.get(
        `${API_BASE}/experiment/consent/statements`,
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Check structure of first statement
      if (response.data.length > 0) {
        const firstStatement = response.data[0];
        // Check for either statementText or statement field
        const hasStatement =
          firstStatement.statementText ||
          firstStatement.statement ||
          firstStatement.text;
        expect(hasStatement).toBeDefined();
        // Check for id
        expect(firstStatement.id).toBeDefined();
      }

      console.log(`Retrieved ${response.data.length} consent statements`);
      console.log("PASSED\n");
    }, 10000);

    test("F-06: Submit consent (accept)", async () => {
      console.log("Running F-06: Submit consent (accept)...");

      const sessionRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      const sessionId = sessionRes.data.sessionId;

      const response = await axios.post(
        `${API_BASE}/experiment/consent/submit`,
        {
          sessionId: sessionId,
          consented: true,
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(`Consent recorded for session: ${sessionId.slice(0, 8)}...`);
      console.log("PASSED\n");
    }, 10000);

    test("F-07: Submit consent (decline)", async () => {
      console.log("Running F-07: Submit consent (decline)...");

      const sessionRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      const sessionId = sessionRes.data.sessionId;

      const response = await axios.post(
        `${API_BASE}/experiment/consent/submit`,
        {
          sessionId: sessionId,
          consented: false,
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(`Decline recorded for session: ${sessionId.slice(0, 8)}...`);
      console.log("PASSED\n");
    }, 10000);
  });

  describe("Persona System", () => {
    test("F-08: Assign persona to session", async () => {
      console.log("Running F-08: Assign persona...");

      const sessionRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      const sessionId = sessionRes.data.sessionId;

      const response = await axios.post(`${API_BASE}/persona/assign`, {
        sessionId,
      });

      expect(response.status).toBe(200);
      expect(response.data.personaId).toBeDefined();
      expect(response.data.personaId).toBeGreaterThanOrEqual(1);
      expect(response.data.personaId).toBeLessThanOrEqual(5);
      expect(response.data.persona).toBeDefined();
      expect(response.data.name).toBeDefined();

      console.log(
        `Persona assigned: ${response.data.personaId} - ${response.data.name}`,
      );
      console.log("PASSED\n");
    }, 10000);

    test("F-09: Persona assignment idempotency", async () => {
      console.log("Running F-09: Persona idempotency...");

      const sessionRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      const sessionId = sessionRes.data.sessionId;

      const response1 = await axios.post(`${API_BASE}/persona/assign`, {
        sessionId,
      });
      const personaId1 = response1.data.personaId;

      const response2 = await axios.post(`${API_BASE}/persona/assign`, {
        sessionId,
      });
      const personaId2 = response2.data.personaId;

      expect(personaId1).toBe(personaId2);
      expect(response2.data.cached).toBe(true);

      console.log(`First assignment: Persona ${personaId1}`);
      console.log(`Second assignment: Persona ${personaId2}`);
      console.log(`Cached: ${response2.data.cached}`);
      console.log("PASSED\n");
    }, 10000);
  });

  describe("Chat Session", () => {
    let sessionId;
    let personaId;

    beforeEach(async () => {
      const sessionRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      sessionId = sessionRes.data.sessionId;

      await axios.post(`${API_BASE}/experiment/consent/submit`, {
        sessionId: sessionId,
        consented: true,
      });

      const personaRes = await axios.post(`${API_BASE}/persona/assign`, {
        sessionId,
      });
      personaId = personaRes.data.personaId;
    }, 15000);

    test("F-10: Start chat session", async () => {
      console.log("Running F-10: Start chat session...");

      const response = await axios.post(`${API_BASE}/experiment/chat/start`, {
        sessionId: sessionId,
        personaId: personaId,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.startTime).toBeDefined();

      console.log(`Chat started for session: ${sessionId.slice(0, 8)}...`);
      console.log("PASSED\n");
    }, 10000);

    test("F-11: Send simple chat message", async () => {
      console.log("Running F-11: Send chat message...");

      await axios.post(`${API_BASE}/experiment/chat/start`, {
        sessionId: sessionId,
        personaId: personaId,
      });

      const response = await axios.post(`${API_BASE}/chat/message`, {
        prompt: "Hello, how are you?",
        sessionId: sessionId,
        personaId: personaId,
      });

      expect(response.status).toBe(200);
      expect(response.data.response).toBeDefined();
      expect(typeof response.data.response).toBe("string");

      console.log(`Message sent successfully`);
      console.log(
        `Response received: ${response.data.response.slice(0, 50)}...`,
      );
      console.log("PASSED\n");
    }, 30000);

    test("F-12: End chat session", async () => {
      console.log("Running F-12: End chat session...");

      await axios.post(`${API_BASE}/experiment/chat/start`, {
        sessionId: sessionId,
        personaId: personaId,
      });

      const response = await axios.post(`${API_BASE}/experiment/chat/end`, {
        sessionId: sessionId,
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(`Chat ended for session: ${sessionId.slice(0, 8)}...`);
      console.log("PASSED\n");
    }, 10000);

    test("F-13: Withdraw from study", async () => {
      console.log("Running F-13: Withdraw from study...");

      await axios.post(`${API_BASE}/experiment/chat/start`, {
        sessionId: sessionId,
        personaId: personaId,
      });

      const response = await axios.post(
        `${API_BASE}/experiment/chat/withdraw`,
        {
          sessionId: sessionId,
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(
        `Withdrawal recorded for session: ${sessionId.slice(0, 8)}...`,
      );
      console.log("PASSED\n");
    }, 10000);
  });

  describe("Survey System", () => {
    test("F-14: Get survey questions", async () => {
      console.log("Running F-14: Get survey questions...");

      const response = await axios.get(
        `${API_BASE}/experiment/survey/questions`,
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Check structure of first question
      if (response.data.length > 0) {
        expect(response.data[0].questionText).toBeDefined();
        expect(response.data[0].questionType).toBeDefined();
      }

      console.log(`Retrieved ${response.data.length} survey questions`);
      console.log("PASSED\n");
    }, 10000);

    test("F-15: Submit survey responses", async () => {
      console.log("Running F-15: Submit survey responses...");

      // Create session and complete workflow
      const sessionRes = await axios.post(
        `${API_BASE}/experiment/session/create`,
      );
      const sessionId = sessionRes.data.sessionId;

      await axios.post(`${API_BASE}/experiment/consent/submit`, {
        sessionId: sessionId,
        consented: true,
      });

      const personaRes = await axios.post(`${API_BASE}/persona/assign`, {
        sessionId,
      });

      await axios.post(`${API_BASE}/experiment/chat/start`, {
        sessionId: sessionId,
        personaId: personaRes.data.personaId,
      });

      await axios.post(`${API_BASE}/experiment/chat/end`, { sessionId });

      // Get survey questions
      const questionsRes = await axios.get(
        `${API_BASE}/experiment/survey/questions`,
      );

      // Create responses
      const responses = questionsRes.data.map((q) => ({
        questionId: q.id.toString(),
        questionText: q.questionText,
        questionType: q.questionType,
        response: q.questionType === "text" ? "Test response" : "Agree",
      }));

      const submitRes = await axios.post(
        `${API_BASE}/experiment/survey/submit`,
        {
          sessionId: sessionId,
          responses: responses,
        },
      );

      expect(submitRes.status).toBe(200);
      expect(submitRes.data.success).toBe(true);

      console.log(`Survey submitted for session: ${sessionId.slice(0, 8)}...`);
      console.log(`Responses: ${responses.length}`);
      console.log("PASSED\n");
    }, 20000);
  });

  afterAll(() => {
    console.log("FUNCTIONAL API TESTS COMPLETE");
  });
});
