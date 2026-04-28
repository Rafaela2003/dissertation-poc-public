// Defines the Express router for chat-related endpoints, including the POST /message endpoint that handles incoming chat messages. It imports the handleMessage controller function to process the chat messages and applies any necessary middleware (e.g., validation, rate limiting) to ensure that requests are well-formed and do not exceed rate limits. This router is then exported for use in the main application setup.
// Chat routes for Express.js
import express from "express";
import { handleMessage } from "../controllers/chatController.js";

const router = express.Router();

router.post("/message", handleMessage);

export default router;
