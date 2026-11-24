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
router.post("/", (req, res) => {
  const error = validateLog(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error
    });
  }

  const log = addLog(req.body);

  return res.status(201).json({
    success: true,
    message: "Log received successfully",
    data: log
  });
});

// Receive multiple log events.
router.post("/batch", (req, res) => {
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

  const storedLogs = addLogs(logs);

  return res.status(201).json({
    success: true,
    message: "Logs received successfully",
    count: storedLogs.length
  });
});

// Retrieve all logs.
router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    count: getLogs().length,
    data: getLogs()
  });
});

// Retrieve log statistics.
router.get("/stats", (req, res) => {
  return res.status(200).json({
    success: true,
    data: getLogStats()
  });
});

export default router;