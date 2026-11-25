
import { pool } from "../config/database.js";

// Insert a single log into PostgreSQL.
export async function addLog(log) {
  const query = `
    INSERT INTO logs (
      timestamp,
      level,
      service,
      environment,
      event,
      message,
      request_id,
      duration_ms,
      status_code,
      error,
      metadata
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11
    )
    RETURNING
      id,
      timestamp,
      level,
      service,
      environment,
      event,
      message,
      request_id AS "requestId",
      duration_ms AS "durationMs",
      status_code AS "statusCode",
      error,
      metadata,
      created_at AS "createdAt"
  `;

  const values = [
    log.timestamp,
    log.level,
    log.service,
    log.environment ?? null,
    log.event,
    log.message,
    log.requestId ?? null,
    log.durationMs ?? null,
    log.statusCode ?? null,
    log.error ? JSON.stringify(log.error) : null,
    log.metadata ? JSON.stringify(log.metadata) : null
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

// Insert multiple logs in a single transaction.
export async function addLogs(newLogs) {
  if (!Array.isArray(newLogs) || newLogs.length === 0) {
    throw new Error("A non-empty array of logs is required");
  }

  if (newLogs.length > 500) {
    throw new Error("Batch size cannot exceed 500 logs");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO logs (
        timestamp,
        level,
        service,
        environment,
        event,
        message,
        request_id,
        duration_ms,
        status_code,
        error,
        metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11
      )
    `;

    for (const log of newLogs) {
      const values = [
        log.timestamp,
        log.level,
        log.service,
        log.environment ?? null,
        log.event,
        log.message,
        log.requestId ?? null,
        log.durationMs ?? null,
        log.statusCode ?? null,
        log.error ? JSON.stringify(log.error) : null,
        log.metadata ? JSON.stringify(log.metadata) : null
      ];

      await client.query(query, values);
    }

    await client.query("COMMIT");

    return newLogs;

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Database rollback failed:", rollbackError.message);
    }

    throw error;

  } finally {
    client.release();
  }
}

// Retrieve all logs, newest first.
export async function getLogs({
  page = 1,
  limit = 20,
  level,
  service,
  search,
  startDate,
  endDate
} = {}) {
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];

  if (level) {
    values.push(level);
    conditions.push(`level = $${values.length}`);
  }

  if (service) {
    values.push(service);
    conditions.push(`service = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    const searchParam = `$${values.length}`;

    conditions.push(`(
      message ILIKE ${searchParam}
      OR event ILIKE ${searchParam}
      OR service ILIKE ${searchParam}
      OR request_id ILIKE ${searchParam}
    )`);
  }

  if (startDate) {
    values.push(startDate);
    conditions.push(`timestamp >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`timestamp <= $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM logs
    ${whereClause}
  `;

  const dataValues = [...values, limit, offset];

  const dataQuery = `
    SELECT
      id,
      timestamp,
      level,
      service,
      environment,
      event,
      message,
      request_id AS "requestId",
      duration_ms AS "durationMs",
      status_code AS "statusCode",
      error,
      metadata,
      created_at AS "createdAt"
    FROM logs
    ${whereClause}
    ORDER BY timestamp DESC, id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, values),
    pool.query(dataQuery, dataValues)
  ]);

  return {
    total: Number(countResult.rows[0].total),
    page,
    limit,
    data: dataResult.rows
  };
}

// Retrieve log statistics.
export async function getLogStats() {
  const query = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE level = 'INFO') AS "INFO",
      COUNT(*) FILTER (WHERE level = 'WARN') AS "WARN",
      COUNT(*) FILTER (WHERE level = 'ERROR') AS "ERROR"
    FROM logs
  `;

  const result = await pool.query(query);
  const stats = result.rows[0];

  return {
    total: Number(stats.total),
    INFO: Number(stats.INFO),
    WARN: Number(stats.WARN),
    ERROR: Number(stats.ERROR)
  };
}