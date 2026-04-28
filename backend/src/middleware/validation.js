// Validation middleware for Express.js
// This module provides functions to validate incoming requests for the chat API,
// including session ID, prompt content, and persona ID.
// It also includes an Express middleware function to apply these validations to chat requests.

export const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== "string") {
    return false;
  }

  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  // Follows RFC 4122 standard for UUIDs, which is commonly used for session identifiers.
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
};

// Validate prompt content
export const validatePrompt = (prompt) => {
  if (!prompt || typeof prompt !== "string") {
    return false;
  }

  const trimmed = prompt.trim();

  // Must not be empty
  if (trimmed.length === 0) {
    return false;
  }

  // Must not exceed max length (10,000 chars)
  if (trimmed.length > 10000) {
    return false;
  }

  return true;
};

// Validate persona ID (optional, must be an integer between 1 and 100 if provided)
export const validatePersonaId = (personaId) => {
  if (personaId === null || personaId === undefined) {
    return true; // Optional field
  }

  const id = parseInt(personaId);

  if (isNaN(id) || id < 1 || id > 100) {
    return false;
  }

  return true;
};

// Middleware to validate chat request body
export const validateChatRequest = (req, res, next) => {
  const { prompt, sessionId, personaId } = req.body;

  if (!validateSessionId(sessionId)) {
    return res.status(400).json({
      error: "Invalid session ID format",
    });
  }

  if (!validatePrompt(prompt)) {
    return res.status(400).json({
      error: "Invalid or empty prompt",
    });
  }

  if (!validatePersonaId(personaId)) {
    return res.status(400).json({
      error: "Invalid persona ID",
    });
  }

  next();
};

export default {
  validateSessionId,
  validatePrompt,
  validatePersonaId,
  validateChatRequest,
};
