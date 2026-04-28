// Utility functions for managing assigned personas in localStorage
// This module provides functions to get, set and clear the assigned persona for a user session.
// It uses localStorage to persist the assigned persona across page reloads, allowing the user
// to maintain their assigned persona throughout their interaction with the chatbot.

const PERSONA_STORAGE_KEY = "assigned_persona";

// Get the assigned persona from localStorage or return null if not found
export const getAssignedPersona = () => {
  try {
    const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error reading persona from storage:", error);
    return null;
  }
};

// Save the assigned persona to localStorage
export const setAssignedPersona = (personaData) => {
  try {
    localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(personaData));
  } catch (error) {
    console.error("Error saving persona to storage:", error);
  }
};

// Clear the assigned persona from localStorage
export const clearAssignedPersona = () => {
  try {
    localStorage.removeItem(PERSONA_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing persona from storage:", error);
  }
};
