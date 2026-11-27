
import test from "node:test";
import assert from "node:assert/strict";

import { validateLog } from "../src/utils/log.validator.js";

// A valid log used as the base for validation tests.
const validLog = {
  timestamp: "2026-11-25T10:00:00.000Z",
  level: "INFO",
  service: "ecommerce-api",
  environment: "development",
  event: "USER_LOGIN",
  message: "User logged in successfully",
  requestId: "test-request-001",
  durationMs: 120,
  statusCode: 200,
  error: null,
  metadata: null
};

// Test a valid log.
test("should accept a valid log", () => {
  assert.equal(validateLog(validLog), null);
});

// Test required fields.
test("should reject a log with a missing timestamp", () => {
  const log = { ...validLog };
  delete log.timestamp;

  assert.equal(
    validateLog(log),
    "Missing or invalid field: timestamp"
  );
});

test("should reject an empty message", () => {
  const log = {
    ...validLog,
    message: " "
  };

  assert.equal(
    validateLog(log),
    "Missing or invalid field: message"
  );
});

// Test log levels.
test("should reject an invalid log level", () => {
  const log = {
    ...validLog,
    level: "DEBUG"
  };

  assert.equal(
    validateLog(log),
    "Invalid log level. Allowed values: INFO, WARN, ERROR"
  );
});

// Test timestamps.
test("should reject an invalid timestamp", () => {
  const log = {
    ...validLog,
    timestamp: "25-11-2026"
  };

  assert.equal(
    validateLog(log),
    "Invalid timestamp. Use ISO 8601 format with a timezone"
  );
});

// Test string length limits.
test("should reject a service name exceeding 100 characters", () => {
  const log = {
    ...validLog,
    service: "a".repeat(101)
  };

  assert.equal(
    validateLog(log),
    "Service name cannot exceed 100 characters"
  );
});

// Test duration.
test("should reject a negative duration", () => {
  const log = {
    ...validLog,
    durationMs: -10
  };

  assert.equal(
    validateLog(log),
    "durationMs must be a non-negative integer"
  );
});

// Test HTTP status code.
test("should reject an invalid HTTP status code", () => {
  const log = {
    ...validLog,
    statusCode: 700
  };

  assert.equal(
    validateLog(log),
    "statusCode must be an integer between 100 and 599"
  );
});

// Test optional object fields.
test("should reject metadata when it is not an object", () => {
  const log = {
    ...validLog,
    metadata: "invalid"
  };

  assert.equal(
    validateLog(log),
    "metadata must be a JSON object"
  );
});

// Test input type.
test("should reject an array instead of a log object", () => {
  assert.equal(
    validateLog([]),
    "Log must be a JSON object"
  );
});


test("should accept WARN log level", () => {
  assert.equal(
    validateLog({ ...validLog, level: "WARN" }),
    null
  );
});

test("should accept ERROR log level", () => {
  assert.equal(
    validateLog({ ...validLog, level: "ERROR" }),
    null
  );
});

test("should reject a timestamp without a timezone", () => {
  assert.equal(
    validateLog({
      ...validLog,
      timestamp: "2026-11-25T10:00:00"
    }),
    "Invalid timestamp. Use ISO 8601 format with a timezone"
  );
});

test("should reject an empty service name", () => {
  assert.equal(
    validateLog({ ...validLog, service: "" }),
    "Missing or invalid field: service"
  );
});

test("should reject a request ID exceeding 100 characters", () => {
  assert.match(
    validateLog({
      ...validLog,
      requestId: "a".repeat(101)
    }),
    /^Invalid requestId\./
  );
});

test("should reject a decimal duration", () => {
  assert.equal(
    validateLog({ ...validLog, durationMs: 10.5 }),
    "durationMs must be a non-negative integer"
  );
});

test("should reject an HTTP status code below 100", () => {
  assert.equal(
    validateLog({ ...validLog, statusCode: 99 }),
    "statusCode must be an integer between 100 and 599"
  );
});

test("should reject metadata as an array", () => {
  assert.equal(
    validateLog({ ...validLog, metadata: [] }),
    "metadata must be a JSON object"
  );
});

test("should reject error as an array", () => {
  assert.equal(
    validateLog({ ...validLog, error: [] }),
    "error must be a JSON object"
  );
});

test("should accept null optional metadata", () => {
  assert.equal(
    validateLog({ ...validLog, metadata: null, error: null }),
    null
  );
});
