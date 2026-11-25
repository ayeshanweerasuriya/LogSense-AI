
import express from "express";
import logRoutes from "./routes/log.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { pool } from "./config/database.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));

// Check whether the API server is running.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "logsense-backend",
    timestamp: new Date().toISOString()
  });
});

// Check whether the API and database are ready.
app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ready",
      service: "logsense-backend",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database readiness check failed:", error.message);

    return res.status(503).json({
      status: "not ready",
      service: "logsense-backend",
      database: "unavailable"
    });
  }
});

// Log ingestion API.
app.use("/api/logs", logRoutes);

// Handle requests to unknown routes.
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Centralized error handling.
app.use(errorHandler);

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`LogSense backend running on port ${PORT}`);
});

// Gracefully close the HTTP server and database pool.
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async (error) => {
    if (error) {
      console.error("Error closing HTTP server:", error);
      process.exitCode = 1;
    }

    try {
      await pool.end();
      console.log("PostgreSQL connection pool closed.");
    } catch (dbError) {
      console.error("Error closing PostgreSQL pool:", dbError);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
