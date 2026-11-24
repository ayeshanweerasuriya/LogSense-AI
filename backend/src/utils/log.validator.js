const requiredFields = [
  "timestamp",
  "level",
  "service",
  "event",
  "message"
];

const validLevels = ["INFO", "WARN", "ERROR"];

export function validateLog(log) {
  if (
    typeof log !== "object" ||
    log === null ||
    Array.isArray(log)
  ) {
    return "Log must be a JSON object";
  }

  for (const field of requiredFields) {
    if (
      typeof log[field] !== "string" ||
      log[field].trim() === ""
    ) {
      return `Missing or invalid field: ${field}`;
    }
  }

  if (!validLevels.includes(log.level)) {
    return "Invalid log level. Allowed values: INFO, WARN, ERROR";
  }

  if (Number.isNaN(Date.parse(log.timestamp))) {
    return "Invalid timestamp";
  }

  return null;
}