// Client for interacting with the backend API.
// This module uses Axios to send HTTP requests to the backend server and provides functions
// for sending chat messages, assigning personas and fetching chat history.
// It also includes interceptors for logging requests and responses for debugging purposes.

import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${API_BASE}/api`;

console.log("🔧 API Client Configuration:");
console.log("API Base:", API_BASE);
console.log("API URL:", API_URL);

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 90000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log("API Client request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error("API Client request error:", error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    console.log("API Client response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("API Client response error:", {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

// Send a chat message to the backend and receive a response from the assistant
export const sendMessage = async (prompt, sessionId, personaId) => {
  console.log("Sending message:", { prompt, sessionId, personaId });

  const response = await apiClient.post("/chat/message", {
    prompt,
    sessionId,
    personaId,
  });

  return response.data;
};

// Assign a persona to a session
export const assignPersona = async (sessionId) => {
  console.log("Requesting persona for session:", sessionId);

  const response = await apiClient.post("/persona/assign", {
    sessionId,
  });

  console.log("Persona assigned:", response.data);
  return response.data;
};

// Get the chat history for a session
export const getChatHistory = async (sessionId) => {
  const response = await apiClient.get(`/chat/history/${sessionId}`);
  return response.data;
};

export default apiClient;
