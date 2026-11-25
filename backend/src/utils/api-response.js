
export function sendError(res, req, statusCode, message, details = null) {
  const response = {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Include additional validation details when provided.
  if (details !== null) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}


export function sendSuccess(res, req, statusCode, message, data = null) {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  };

  // Include response data when provided.
  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
}
