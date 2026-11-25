
import express from "express";

import {
  addLog,
  addLogs,
  getLogs,
  getLogStats
} from "../services/log.service.js";

import { validateLog } from "../utils/log.validator.js";

const router = express.Router();

// Receive a single log event.
router.post("/", async (req, res, next) => {
  try {
    const error = validateLog(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error
      });
    }

    const log = await addLog(req.body);

    return res.status(201).json({
      success: true,
      message: "Log received successfully",
      data: log
    });
  } catch (error) {
    next(error);
  }
});

// Receive multiple log events.
router.post("/batch", async (req, res, next) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Request must contain a non-empty logs array"
      });
    }

    const errors = [];

    logs.forEach((log, index) => {
      const error = validateLog(log);

      if (error) {
        errors.push({
          index,
          error
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Batch validation failed",
        errors
      });
    }

    const storedLogs = await addLogs(logs);

    return res.status(201).json({
      success: true,
      message: "Logs received successfully",
      count: storedLogs.length
    });
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

    const { level, service } = req.query;

    // Validate pagination.
    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid pagination. Page must be at least 1 and limit must be between 1 and 100."
      });
    }

    // Validate log level.
    if (
      level !== undefined &&
      (
        typeof level !== "string" ||
        !["INFO", "WARN", "ERROR"].includes(level)
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid log level. Allowed values: INFO, WARN, ERROR"
      });
    }

    // Validate service filter.
    if (
      service !== undefined &&
      (
        typeof service !== "string" ||
        service.trim() === ""
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid service filter"
      });
    }

    const result = await getLogs({
      page,
      limit,
      level,
      service
    });

    return res.status(200).json({
      success: true,
      ...result,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
