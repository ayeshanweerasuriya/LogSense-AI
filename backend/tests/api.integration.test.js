
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";
import { pool } from "../src/config/database.js";

let server;
let baseUrl;

const testService = `api-integration-${Date.now()}`;

async function submitLogs(logs) {
  const response = await fetch(`${baseUrl}/api/logs/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ logs })
  });

  const body = await response.json();

  assert.equal(response.status, 201, JSON.stringify(body));

  return body;
}

before(async () => {
  // Start the Express application on an available port.
  server = app.listen(0, "127.0.0.1");

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  // Close the HTTP server.
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  // Close the PostgreSQL connection pool.
  await pool.end();
});

test("GET /health should return a healthy status", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "healthy");
  assert.equal(body.service, "logsense-backend");
});

test("GET /ready should confirm database connectivity", async () => {
  const response = await fetch(`${baseUrl}/ready`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ready");
  assert.equal(body.database, "connected");
});

test("POST /api/logs should successfully store a valid log", async () => {
  const log = {
    timestamp: new Date().toISOString(),
    level: "INFO",
    service: "integration-test-service",
    environment: "test",
    event: "TEST_EVENT",
    message: "Integration test log received",
    requestId: `test-${Date.now()}`,
    durationMs: 120,
    statusCode: 200
  };

  const response = await fetch(`${baseUrl}/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(log)
  });

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.message, "Log received successfully");
  assert.ok(body.data);
  assert.ok(body.data.id);
});


test("POST /api/logs/batch should successfully store multiple logs", async () => {
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service: testService,
      environment: "test",
      event: "BATCH_TEST_ONE",
      message: "First batch integration test log"
    },
    {
      timestamp: new Date().toISOString(),
      level: "WARN",
      service: testService,
      environment: "test",
      event: "BATCH_TEST_TWO",
      message: "Second batch integration test log"
    }
  ];

  const response = await fetch(`${baseUrl}/api/logs/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ logs })
  });

  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.message, "Logs received successfully");
  assert.equal(body.data.count, 2);
});

test("POST /api/logs/batch should reject an empty batch", async () => {
  const response = await fetch(`${baseUrl}/api/logs/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ logs: [] })
  });

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(
    body.message,
    "Request must contain a non-empty logs array"
  );
});

test("POST /api/logs/batch should reject batches exceeding 500 logs", async () => {
  const logs = Array.from({ length: 501 }, () => ({}));

  const response = await fetch(`${baseUrl}/api/logs/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ logs })
  });

  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.success, false);
  assert.match(body.message, /maximum limit of 500/);
});

test("POST /api/logs/batch should reject an invalid batch without inserting any logs", async () => {
  const validLog = {
    timestamp: new Date().toISOString(),
    level: "INFO",
    service: testService,
    environment: "test",
    event: "SHOULD_NOT_BE_INSERTED",
    message: "This log must not be inserted"
  };

  const invalidLog = {
    timestamp: new Date().toISOString(),
    level: "INVALID",
    service: testService,
    event: "INVALID_BATCH_LOG",
    message: "This log has an invalid level"
  };

  const countBefore = await pool.query(
    "SELECT COUNT(*)::int AS count FROM logs WHERE service = $1",
    [testService]
  );

  const response = await fetch(`${baseUrl}/api/logs/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      logs: [validLog, invalidLog]
    })
  });

  const body = await response.json();

  const countAfter = await pool.query(
    "SELECT COUNT(*)::int AS count FROM logs WHERE service = $1",
    [testService]
  );

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Batch validation failed");

  assert.equal(body.details.length, 1);
  assert.equal(body.details[0].index, 1);

  assert.equal(
    countAfter.rows[0].count,
    countBefore.rows[0].count
  );
});

// Test retrieving all logs
test("GET /api/logs should retrieve logs successfully", async () => {
  const response = await fetch(`${baseUrl}/api/logs`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "Logs retrieved successfully");

  assert.ok(Array.isArray(body.data.data));
  assert.equal(body.data.page, 1);
  assert.equal(body.data.limit, 20);
  assert.ok(body.data.total >= 1);
  assert.ok(body.data.totalPages >= 1);
});

// Test filtering by log level
test("GET /api/logs should filter logs by severity", async () => {
  const service = `${testService}-level`;

  await submitLogs([
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service,
      event: "INFO_FILTER_TEST",
      message: "Information log"
    },
    {
      timestamp: new Date().toISOString(),
      level: "WARN",
      service,
      event: "WARN_FILTER_TEST",
      message: "Warning log"
    }
  ]);

  const response = await fetch(
    `${baseUrl}/api/logs?service=${service}&level=WARN`
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.total, 1);
  assert.ok(body.data.data.every(log => log.level === "WARN"));
});

// Test filtering by service
test("GET /api/logs should filter logs by service", async () => {
  const service = `${testService}-service`;

  await submitLogs([
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service,
      event: "SERVICE_FILTER_TEST",
      message: "Service filtering test"
    }
  ]);

  const response = await fetch(
    `${baseUrl}/api/logs?service=${service}`
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.total, 1);
  assert.ok(body.data.data.every(log => log.service === service));
});

// Test searching log messages
test("GET /api/logs should search log messages", async () => {
  const marker = `unique-search-${Date.now()}`;

  await submitLogs([
    {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      service: `${testService}-search`,
      event: "SEARCH_TEST",
      message: `Database connection failed: ${marker}`
    }
  ]);

  const response = await fetch(
    `${baseUrl}/api/logs?search=${marker}`
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.total, 1);
  assert.ok(body.data.data[0].message.includes(marker));
});

// Add the date-filtering test
test("GET /api/logs should filter logs by date range", async () => {
  const service = `${testService}-date-filter`;

  await submitLogs([
    {
      timestamp: "2026-01-10T10:00:00.000Z",
      level: "INFO",
      service,
      event: "BEFORE_DATE_RANGE",
      message: "Log before the date range"
    },
    {
      timestamp: "2026-01-15T10:00:00.000Z",
      level: "WARN",
      service,
      event: "INSIDE_DATE_RANGE",
      message: "Log inside the date range"
    },
    {
      timestamp: "2026-01-20T10:00:00.000Z",
      level: "ERROR",
      service,
      event: "AFTER_DATE_RANGE",
      message: "Log after the date range"
    }
  ]);

  const query = new URLSearchParams({
    service,
    startDate: "2026-01-12T00:00:00.000Z",
    endDate: "2026-01-18T23:59:59.999Z"
  });

  const response = await fetch(
    `${baseUrl}/api/logs?${query}`
  );

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.total, 1);

  assert.equal(
    body.data.data[0].event,
    "INSIDE_DATE_RANGE"
  );

  assert.equal(
    body.data.data[0].service,
    service
  );
});

// Add the statistics integration test
test("GET /api/logs/stats should return accurate log statistics", async () => {
  // Get statistics before inserting test logs.
  const beforeResponse = await fetch(
    `${baseUrl}/api/logs/stats`
  );

  const beforeBody = await beforeResponse.json();

  assert.equal(beforeResponse.status, 200);
  assert.equal(beforeBody.success, true);

  const beforeStats = beforeBody.data;

  // Insert one log for each severity level.
  await submitLogs([
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service: `${testService}-stats`,
      event: "STATS_INFO",
      message: "Statistics test INFO log"
    },
    {
      timestamp: new Date().toISOString(),
      level: "WARN",
      service: `${testService}-stats`,
      event: "STATS_WARN",
      message: "Statistics test WARN log"
    },
    {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      service: `${testService}-stats`,
      event: "STATS_ERROR",
      message: "Statistics test ERROR log"
    }
  ]);

  // Get statistics after inserting test logs.
  const afterResponse = await fetch(
    `${baseUrl}/api/logs/stats`
  );

  const afterBody = await afterResponse.json();

  assert.equal(afterResponse.status, 200);
  assert.equal(afterBody.success, true);

  const afterStats = afterBody.data;

  // Verify that all statistics increased correctly.
  assert.equal(afterStats.total, beforeStats.total + 3);
  assert.equal(afterStats.INFO, beforeStats.INFO + 1);
  assert.equal(afterStats.WARN, beforeStats.WARN + 1);
  assert.equal(afterStats.ERROR, beforeStats.ERROR + 1);
});

// Test pagination
test("GET /api/logs should paginate results correctly", async () => {
  const service = `${testService}-pagination`;

  await submitLogs([
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service,
      event: "PAGINATION_ONE",
      message: "Pagination test log one"
    },
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service,
      event: "PAGINATION_TWO",
      message: "Pagination test log two"
    },
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service,
      event: "PAGINATION_THREE",
      message: "Pagination test log three"
    }
  ]);

  const firstResponse = await fetch(
    `${baseUrl}/api/logs?service=${service}&page=1&limit=2`
  );

  const firstBody = await firstResponse.json();

  const secondResponse = await fetch(
    `${baseUrl}/api/logs?service=${service}&page=2&limit=2`
  );

  const secondBody = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);

  assert.equal(firstBody.data.total, 3);
  assert.equal(firstBody.data.totalPages, 2);
  assert.equal(firstBody.data.page, 1);
  assert.equal(firstBody.data.data.length, 2);

  assert.equal(secondBody.data.page, 2);
  assert.equal(secondBody.data.data.length, 1);

  const allIds = [
    ...firstBody.data.data.map(log => log.id),
    ...secondBody.data.data.map(log => log.id)
  ];

  assert.equal(new Set(allIds).size, 3);
});

// Test invalid pagination parameters
test("GET /api/logs should reject invalid pagination parameters", async () => {
  const invalidQueries = [
    "page=0",
    "page=-1",
    "limit=0",
    "limit=101"
  ];

  for (const query of invalidQueries) {
    const response = await fetch(
      `${baseUrl}/api/logs?${query}`
    );

    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.match(body.message, /Invalid pagination/);
  }
});

// Malformed JSON should return HTTP 400
test("API should reject malformed JSON requests", async () => {
  const response = await fetch(`${baseUrl}/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: '{"timestamp": "invalid-json"'
  });

  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Invalid JSON request body");
  assert.equal(body.statusCode, 400);
});

// Unknown API endpoints should return HTTP 404
test("API should return 404 for unknown endpoints", async () => {
  const response = await fetch(
    `${baseUrl}/api/unknown-endpoint`
  );

  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "API endpoint not found");
  assert.equal(body.statusCode, 404);
  assert.equal(body.path, "/api/unknown-endpoint");
});

test("API should reject oversized request bodies", async () => {
  const largePayload = JSON.stringify({
    message: "x".repeat(1024 * 1024)
  });

  const response = await fetch(`${baseUrl}/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: largePayload
  });

  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.success, false);
  assert.equal(body.message, "Request body is too large");
  assert.equal(body.statusCode, 413);
});
