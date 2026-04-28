// Defines the Express router for persona-related endpoints, including the POST /assign endpoint
// that handles persona assignment requests. It imports the assignPersona controller
// function to process these requests

import express from "express";
import { assignPersona } from "../controllers/personaController.js";

const router = express.Router();

router.post("/assign", assignPersona);

export default router;
