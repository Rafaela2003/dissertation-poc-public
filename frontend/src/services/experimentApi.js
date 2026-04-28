// Service module for interacting with the experiment-related API endpoints.
// This module uses Axios to send HTTP requests to the backend server and provides functions
// for session management, information sheet retrieval, consent handling, chat interaction and survey management.
// It also includes interceptors for logging requests and responses for debugging purposes.

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

console.log("Experiment API Configuration:");
console.log("API Base URL:", API_BASE_URL);
console.log("Experiment endpoint:", `${API_BASE_URL}/api/experiment`);

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/experiment`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log("Outgoing request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log("Incoming response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("Response interceptor error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      fullURL: error.config
        ? `${error.config.baseURL}${error.config.url}`
        : "unknown",
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

// Session management
export const createSession = async () => {
  console.log("Creating session...");
  try {
    const response = await api.post("/session/create");
    console.log("Session created:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
};

export const getSession = async (sessionId) => {
  console.log("Getting session:", sessionId);
  try {
    const response = await api.get(`/session/${sessionId}`);
    console.log("Session retrieved:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to get session:", error);
    throw error;
  }
};

// Information sheet
export const getInformationSheet = async () => {
  console.log("Getting information sheet...");
  try {
    const response = await api.get("/info-sheet");
    console.log("Information sheet retrieved");
    return response.data;
  } catch (error) {
    console.error("Failed to get information sheet:", error);
    throw error;
  }
};

export const logInfoSheetViewed = async (sessionId) => {
  console.log("Logging info sheet view:", sessionId);
  try {
    const response = await api.post("/info-sheet/viewed", { sessionId });
    console.log("Info sheet view logged");
    return response.data;
  } catch (error) {
    console.error("Failed to log info sheet view:", error);
    throw error;
  }
};

// Consent
export const getConsentStatements = async () => {
  console.log("Getting consent statements...");
  try {
    const response = await api.get("/consent/statements");
    console.log("Consent statements retrieved");
    return response.data;
  } catch (error) {
    console.error("Failed to get consent statements:", error);
    throw error;
  }
};

export const submitConsent = async (sessionId, consented) => {
  console.log("Submitting consent:", { sessionId, consented });
  try {
    const response = await api.post("/consent/submit", {
      sessionId,
      consented,
    });
    console.log("Consent submitted");
    return response.data;
  } catch (error) {
    console.error("Failed to submit consent:", error);
    throw error;
  }
};

// Chat interaction
export const startChat = async (sessionId, personaId) => {
  console.log("Starting chat:", { sessionId, personaId });
  try {
    const response = await api.post("/chat/start", { sessionId, personaId });
    console.log("Chat started:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to start chat:", error);
    throw error;
  }
};

export const endChat = async (sessionId) => {
  console.log("Ending chat:", sessionId);
  try {
    const response = await api.post("/chat/end", { sessionId });
    console.log("Chat ended");
    return response.data;
  } catch (error) {
    console.error("Failed to end chat:", error);
    throw error;
  }
};

export const withdrawFromStudy = async (sessionId) => {
  console.log("Withdrawing from study:", sessionId);
  try {
    const response = await api.post("/chat/withdraw", { sessionId });
    console.log("Withdrawal logged");
    return response.data;
  } catch (error) {
    console.error("Failed to log withdrawal:", error);
    throw error;
  }
};

// Survey
export const getSurveyQuestions = async () => {
  console.log("Getting survey questions...");
  try {
    const response = await api.get("/survey/questions");
    console.log("Survey questions retrieved");
    return response.data;
  } catch (error) {
    console.error("Failed to get survey questions:", error);
    throw error;
  }
};

export const submitSurvey = async (sessionId, responses) => {
  console.log("Submitting survey:", {
    sessionId,
    responseCount: responses.length,
  });
  try {
    const response = await api.post("/survey/submit", { sessionId, responses });
    console.log("Survey submitted");
    return response.data;
  } catch (error) {
    console.error("Failed to submit survey:", error);
    throw error;
  }
};

export default api;
