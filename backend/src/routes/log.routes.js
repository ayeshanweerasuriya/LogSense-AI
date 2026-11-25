
import express from "express";

import {
  addLog,
  addLogs,
  getLogs,
  getLogStats
} from "../services/log.service.js";

import { validateLog } from "../utils/log.validator.js";
import {
  sendError,
  sendSuccess
} from "../utils/api-response.js";

const router = express.Router();

// Receive a single log event.
router.post("/", async (req, res, next) => {
  try {
    const error = validateLog(req.body);

    if (error) {
      return sendError(res, req, 400, error);
    }

    const log = await addLog(req.body);

    return sendSuccess(
      res,
      req,
      201,
      "Log received successfully",
      log
    );
  } catch (error) {
    next(error);
  }
});

// Receive multiple log events.
router.post("/batch", async (req, res, next) => {
  try {
    const { logs } = req.body ?? {};

    const MAX_BATCH_SIZE = 500;

    // Validate the batch.
    if (!Array.isArray(logs) || logs.length === 0) {
      return sendError(res, req, 400, "Request must contain a non-empty logs array");
    }

    // Prevent excessively large batches.
    if (logs.length > MAX_BATCH_SIZE) {
      return sendError(res, req, 413, `Batch size exceeds the maximum limit of ${MAX_BATCH_SIZE} logs`);
    }

    // Validate every log before inserting anything.
    const errors = [];

    logs.forEach((log, index) => {
      const error = validateLog(log);

      if (error) {
        errors.push({ index, error });
      }
    });

    if (errors.length > 0) {
      return sendError(res, req, 400, "Batch validation failed", errors);
    }

    // Store all logs in a database transaction.
    const storedLogs = await addLogs(logs);

    return sendSuccess(
      res,
      req,
      201,
      "Logs received successfully",
      {
        count: storedLogs.length
      }
    );

  } catch (error) {
    next(error);
  }
});

// Retrieve logs with pagination and optional filters.
router.get("/", async (req, res, next) => {
  try {
    const page = req.query.page === undefined
      ? 1
      : Number(req.query.page);

    const limit = req.query.limit === undefined
      ? 20
      : Number(req.query.limit);

    const { level, service, search, startDate, endDate } = req.query;

    // Validate pagination.
    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return sendError(res, req, 400, "Invalid pagination. Page must be at least 1 and limit must be between 1 and 100.");
    }

    // Validate log level.
    if (
      level !== undefined &&
      (typeof level !== "string" ||
        !["INFO", "WARN", "ERROR"].includes(level))
    ) {
      return sendError(res, req, 400, "Invalid log level. Allowed values: INFO, WARN, ERROR");
    }

    // Validate service filter.
    if (
      service !== undefined &&
      (typeof service !== "string" || service.trim() === "")
    ) {
      return sendError(res, req, 400, "Invalid service filter");
    }

    // Validate search query.
    if (
      search !== undefined &&
      (typeof search !== "string" ||
        search.trim() === "" ||
        search.length > 200)
    ) {
      return sendError(res, req, 400, "Search must be a non-empty string of at most 200 characters");
    }

    // Validate date parameters.
    for (const [name, value] of [
      ["startDate", startDate],
      ["endDate", endDate]
    ]) {
      if (
        value !== undefined &&
        (typeof value !== "string" ||
          value.trim() === "" ||
          Number.isNaN(Date.parse(value)))
      ) {
        return sendError(res, req, 400, `Invalid ${name}. Provide a valid ISO 8601 date or timestamp.`);
      }
    }

    // Ensure the start date is not later than the end date.
    if (
      startDate &&
      endDate &&
      new Date(startDate) > new Date(endDate)
    ) {
      return sendError(res, req, 400, "startDate cannot be later than endDate");
    }

    const result = await getLogs({
      page,
      limit,
      level,
      service,
      search: search?.trim(),
      startDate,
      endDate
    });

    return sendSuccess(
      res,
      req,
      200,
      "Logs retrieved successfully",
      {
        ...result,
        totalPages: Math.ceil(result.total / limit)
      }
    );
  } catch (error) {
    next(error);
  }
});


// Retrieve log statistics.
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await getLogStats();

    return sendSuccess(
      res,
      req,
      200,
      "Log statistics retrieved successfully",
      stats
    );
  } catch (error) {
    next(error);
  }
});


export default router;
