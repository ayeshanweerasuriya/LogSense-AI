
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";
import { pool } from "../src/config/database.js";

let server;
let baseUrl;

const testService = `api-integration-${Date.now()}`;

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
