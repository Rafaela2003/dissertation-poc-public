// Manages user sessions by generating a unique session ID and storing it in sessionStorage.
// This allows us to track user interactions across the application without requiring authentication.
// The session ID is generated using the uuid library to ensure uniqueness.

import { v4 as uuidv4 } from "uuid";

const SESSION_KEY = "research_session_id";

export const getOrCreateSessionId = () => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
};

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const getCurrentSessionId = () => {
  return sessionStorage.getItem(SESSION_KEY);
};
