
export function errorHandler(error, req, res, next) {
  // Pass the error to Express if the response has already started.
  if (res.headersSent) {
    return next(error);
  }

  // Log internal details for debugging.
  console.error("API Error:", {
    method: req.method,
    path: req.originalUrl,
    message: error.message,
    stack: error.stack
  });

  let statusCode = 500;
  let message = "Internal server error";

  // Handle malformed JSON request bodies.
  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON request body";
  }

  // Handle request bodies that exceed the configured size limit.
  else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  return res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
}
