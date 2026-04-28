// Defines the Express router for experiment-related endpoints, including session management,
// information sheet access, consent handling, chat interaction, survey management
// and transcript retrieval.
// It imports the relevant controller functions to process these requests and applies any
// necessary middleware (e.g., validation, rate limiting) to ensure that requests are well-formed
// and do not exceed rate limits.
// This router is then exported for use in the main application setup.

import express from "express";
import * as experimentController from "../controllers/experimentController.js";

const router = express.Router();

// Session management
router.post("/session/create", experimentController.createSession);
router.get("/session/:sessionId", experimentController.getSession);

// Information sheet
router.get("/info-sheet", experimentController.getInformationSheet);
router.post("/info-sheet/viewed", experimentController.logInfoSheetViewed);

// Consent
router.get("/consent/statements", experimentController.getConsentStatements);
router.post("/consent/submit", experimentController.submitConsent);

// Chat interaction
router.post("/chat/start", experimentController.startChat);
router.post("/chat/end", experimentController.endChat);
router.post("/chat/withdraw", experimentController.withdrawFromStudy);

// Survey
router.get("/survey/questions", experimentController.getSurveyQuestions);
router.post("/survey/submit", experimentController.submitSurvey);

// Transcript
router.get("/transcript/:sessionId", experimentController.getTranscript);

export default router;
