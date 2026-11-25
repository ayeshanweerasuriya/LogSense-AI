
import app from "./app.js";
import { pool } from "./config/database.js";

const PORT = 3000;

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
