
import pg from "pg";

const { Pool } = pg;

if (!process.env.POSTGRES_PASSWORD) {
  throw new Error("POSTGRES_PASSWORD is not configured");
}

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || "logsense",
  user: process.env.POSTGRES_USER || "logsense_user",
  password: process.env.POSTGRES_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});
