
const requiredFields = [
  "timestamp",
  "level",
  "service",
  "event",
  "message"
];

const validLevels = ["INFO", "WARN", "ERROR"];

const optionalStringFields = {
  environment: 50,
  requestId: 100
};

export function validateLog(log) {
  // Ensure the input is a JSON object.
  if (
    typeof log !== "object" ||
    log === null ||
    Array.isArray(log)
  ) {
    return "Log must be a JSON object";
  }

  // Validate required fields.
  for (const field of requiredFields) {
    if (
      typeof log[field] !== "string" ||
      log[field].trim() === ""
    ) {
      return `Missing or invalid field: ${field}`;
    }
  }

  // Validate timestamp.
  const isoTimestampPattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

  if (
    !isoTimestampPattern.test(log.timestamp) ||
    Number.isNaN(Date.parse(log.timestamp))
  ) {
    return "Invalid timestamp. Use ISO 8601 format with a timezone";
  }

  // Validate log level.
  if (!validLevels.includes(log.level)) {
    return "Invalid log level. Allowed values: INFO, WARN, ERROR";
  }

  // Validate service and event lengths.
  if (log.service.length > 100) {
    return "Service name cannot exceed 100 characters";
  }

  if (log.event.length > 150) {
    return "Event name cannot exceed 150 characters";
  }

  // Validate optional string fields.
  for (const [field, maxLength] of Object.entries(optionalStringFields)) {
    const value = log[field];

    if (
      value !== undefined &&
      value !== null &&
      (
        typeof value !== "string" ||
        value.trim() === "" ||
        value.length > maxLength
      )
    ) {
      return `Invalid ${field}. It must be a non-empty string of at most ${maxLength} characters`;
    }
  }

  // Validate duration.
  if (
    log.durationMs !== undefined &&
    log.durationMs !== null &&
    (
      !Number.isSafeInteger(log.durationMs) ||
      log.durationMs < 0
    )
  ) {
    return "durationMs must be a non-negative integer";
  }

  // Validate HTTP status code.
  if (
    log.statusCode !== undefined &&
    log.statusCode !== null &&
    (
      !Number.isInteger(log.statusCode) ||
      log.statusCode < 100 ||
      log.statusCode > 599
    )
  ) {
    return "statusCode must be an integer between 100 and 599";
  }

  // Validate error and metadata objects.
  for (const field of ["error", "metadata"]) {
    const value = log[field];

    if (
      value !== undefined &&
      value !== null &&
      (
        typeof value !== "object" ||
        Array.isArray(value)
      )
    ) {
      return `${field} must be a JSON object`;
    }
  }

  return null;
}
