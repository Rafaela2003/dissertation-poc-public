import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Session management, consent handling, and survey endpoints for the experiment
export const createSession = async (req, res) => {
  try {
    const session = await prisma.experimentSession.create({
      data: {},
    });

    console.log(`Created experiment session: ${session.id}`);

    res.json({
      sessionId: session.id,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error("Failed to create session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
};

export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.experimentSession.findUnique({
      where: { id: sessionId },
      include: {
        persona: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Failed to get session:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
};

// Information Sheet

export const getInformationSheet = async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("GET INFORMATION SHEET REQUEST");
  console.log("=".repeat(60));

  try {
    console.log("Searching for active information sheet...");

    const infoSheet = await prisma.informationSheet.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    console.log("Result:", infoSheet ? "Found" : "Not found");

    if (!infoSheet) {
      console.log("No active information sheet found in database");
      return res
        .status(404)
        .json({ error: "No active information sheet found" });
    }

    console.log("Returning information sheet:", infoSheet.title);
    console.log("=".repeat(60) + "\n");

    res.json(infoSheet);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("GET INFORMATION SHEET ERROR");
    console.error("=".repeat(60));
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("=".repeat(60) + "\n");

    res.status(500).json({ error: "Failed to get information sheet" });
  }
};

export const logInfoSheetViewed = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        infoSheetViewed: true,
        infoSheetViewedAt: new Date(),
      },
    });

    console.log(`Info sheet viewed: ${sessionId}`);

    res.json({ success: true, session });
  } catch (error) {
    console.error("Failed to log info sheet view:", error);
    res.status(500).json({ error: "Failed to log info sheet view" });
  }
};

// Consent management

export const getConsentStatements = async (req, res) => {
  try {
    const statements = await prisma.consentStatement.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    res.json(statements);
  } catch (error) {
    console.error("Failed to get consent statements:", error);
    res.status(500).json({ error: "Failed to get consent statements" });
  }
};

export const submitConsent = async (req, res) => {
  try {
    const { sessionId, consented } = req.body;

    const updateData = consented
      ? {
          consentGiven: true,
          consentGivenAt: new Date(),
        }
      : {
          consentDeclined: true,
          consentDeclinedAt: new Date(),
        };

    const session = await prisma.experimentSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    console.log(
      `${consented ? "y" : "n"} Consent ${consented ? "given" : "declined"}: ${sessionId}`,
    );

    res.json({ success: true, consented, session });
  } catch (error) {
    console.error("Failed to submit consent:", error);
    res.status(500).json({ error: "Failed to submit consent" });
  }
};

// Chat interaction

export const startChat = async (req, res) => {
  try {
    const { sessionId, personaId } = req.body;

    // Verify consent was given
    const session = await prisma.experimentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.consentGiven) {
      return res.status(403).json({ error: "Consent not given" });
    }

    // Update session with chat start time and persona
    const updatedSession = await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        chatStarted: true,
        chatStartedAt: new Date(),
        personaId: personaId || null,
      },
    });

    console.log(`Chat started: ${sessionId}`);

    res.json({
      success: true,
      session: updatedSession,
      startTime: updatedSession.chatStartedAt,
    });
  } catch (error) {
    console.error("Failed to start chat:", error);
    res.status(500).json({ error: "Failed to start chat" });
  }
};

export const endChat = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        chatEndedAt: new Date(),
      },
    });

    console.log(`Chat ended: ${sessionId}`);

    res.json({ success: true, session });
  } catch (error) {
    console.error("Failed to end chat:", error);
    res.status(500).json({ error: "Failed to end chat" });
  }
};

export const withdrawFromStudy = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        withdrew: true,
        withdrawnAt: new Date(),
        chatEndedAt: new Date(),
      },
    });

    console.log(`Participant withdrew: ${sessionId}`);

    res.json({ success: true, session });
  } catch (error) {
    console.error("Failed to log withdrawal:", error);
    res.status(500).json({ error: "Failed to log withdrawal" });
  }
};

// Survey

export const getSurveyQuestions = async (req, res) => {
  try {
    const questions = await prisma.surveyQuestion.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    const formattedQuestions = questions.map((q) => {
      let formattedOptions = [];

      if (Array.isArray(q.options)) {
        // already correct shape from DB
        formattedOptions =
          q.questionType === "likert"
            ? { scale: q.options }
            : { choices: q.options };
      } else if (q.options && typeof q.options === "object") {
        // fallback if somehow still object
        formattedOptions = q.options;
      }

      return {
        ...q,
        options: formattedOptions,
      };
    });

    res.json(formattedQuestions);
  } catch (error) {
    console.error("Failed to get survey questions:", error);
    res.status(500).json({ error: "Failed to get survey questions" });
  }
};

export const submitSurvey = async (req, res) => {
  try {
    const { sessionId, responses } = req.body;

    // Verify session exists and chat ended
    const session = await prisma.experimentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.chatEndedAt) {
      return res.status(403).json({ error: "Chat not completed" });
    }

    // Save all survey responses
    const savedResponses = await Promise.all(
      responses.map((response) =>
        prisma.surveyResponse.create({
          data: {
            sessionId,
            questionId: response.questionId,
            questionText: response.questionText,
            questionType: response.questionType,
            response: response.response,
          },
        }),
      ),
    );

    // Mark survey as completed
    await prisma.experimentSession.update({
      where: { id: sessionId },
      data: {
        surveyCompleted: true,
        surveyCompletedAt: new Date(),
      },
    });

    console.log(
      `📋 Survey completed: ${sessionId} (${responses.length} responses)`,
    );

    res.json({ success: true, responses: savedResponses });
  } catch (error) {
    console.error("Failed to submit survey:", error);
    res.status(500).json({ error: "Failed to submit survey" });
  }
};

export async function getTranscript(req, res) {
  const { sessionId } = req.params;

  try {
    const interactions = await prisma.interaction.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    if (!interactions.length) {
      return res.status(404).json({ error: "No transcript found" });
    }

    // Format nicely
    const transcript = interactions.map((i) => ({
      user: i.templatedPrompt,
      assistant: i.templatedResponse,
      timestamp: i.createdAt,
    }));

    res.json({ transcript });
  } catch (error) {
    console.error("Transcript error:", error);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
}
