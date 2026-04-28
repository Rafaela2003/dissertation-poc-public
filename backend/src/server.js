// Starts the server, sets up middleware and routes, and handles errors

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";
import personaRoutes from "./routes/personaRoutes.js";
import experimentRoutes from "./routes/experimentRoutes.js";
import leakageDetectionService from "./services/leakageDetectionService.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3001;

console.log("Server Configuration");
console.log("PORT:", PORT);
console.log(
  "FRONTEND_URL:",
  process.env.FRONTEND_URL || "http://localhost:5173",
);
console.log("NODE_ENV:", process.env.NODE_ENV);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

console.log("CORS Options:", corsOptions);

app.use(cors(corsOptions));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` ${req.method} ${req.path}`);
  console.log(`Origin: ${req.get("origin")}`);
  console.log(`Time: ${new Date().toISOString()}`);
  if (Object.keys(req.body || {}).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  console.log(`${"=".repeat(60)}\n`);
  next();
});

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/persona", personaRoutes);
app.use("/api/experiment", experimentRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  console.error(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Not Found",
    path: req.path,
    method: req.method,
  });
});

// Start Python service then Express server
async function startServer() {
  try {
    console.log("Starting services...");

    try {
      await leakageDetectionService.startPythonService();
    } catch (error) {
      console.warn("Python leakage detection service failed to start");
      console.warn("Continuing with fallback detection only");
    }

    app.listen(PORT, () => {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Backend server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      if (leakageDetectionService.isAvailable) {
        console.log("Leakage detection: AVAILABLE");
      } else {
        console.log("Leakage detection: UNAVAILABLE (using fallback)");
      }
      console.log(`${"=".repeat(60)}\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Cleanup on exit
process.on("SIGINT", () => {
  leakageDetectionService.stopPythonService();
  process.exit(0);
});

process.on("SIGTERM", () => {
  leakageDetectionService.stopPythonService();
  process.exit(0);
});
