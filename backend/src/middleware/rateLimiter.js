// Rate limiting middleware for Express.js

import rateLimit from "express-rate-limit";

// Rate limiter for chat messages
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: "Too many requests",
    message: "Please wait a moment before sending another message",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for persona assignment
export const personaRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: "Too many requests",
    message: "Please wait before requesting another persona",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  chatRateLimiter,
  personaRateLimiter,
};
