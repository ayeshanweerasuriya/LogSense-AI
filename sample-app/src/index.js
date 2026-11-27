
import { randomUUID, randomInt } from "node:crypto";

const SERVICE_NAME = "ecommerce-api";
const ENVIRONMENT = "development";
const LOG_INTERVAL = 1000;

// Simulated application events
const events = [
  {
    level: "INFO",
    event: "USER_LOGIN",
    message: "User successfully logged in",
    statusCode: 200,
    minDuration: 20,
    maxDuration: 120
  },
  {
    level: "INFO",
    event: "PRODUCT_VIEW",
    message: "Product details retrieved successfully",
    statusCode: 200,
    minDuration: 30,
    maxDuration: 150
  },
  {
    level: "INFO",
    event: "ORDER_CREATED",
    message: "New customer order created",
    statusCode: 201,
    minDuration: 50,
    maxDuration: 200
  },
  {
    level: "INFO",
    event: "PAYMENT_PROCESSED",
    message: "Payment processed successfully",
    statusCode: 200,
    minDuration: 100,
    maxDuration: 400
  },
  {
    level: "WARN",
    event: "SLOW_DATABASE_QUERY",
    message: "Database query took longer than expected",
    statusCode: 200,
    minDuration: 1200,
    maxDuration: 3000
  },
  {
    level: "WARN",
    event: "API_RATE_LIMIT",
    message: "API request rate limit is approaching",
    statusCode: 429,
    minDuration: 10,
    maxDuration: 50
  },
  {
    level: "ERROR",
    event: "PAYMENT_FAILED",
    message: "Payment processing failed",
    statusCode: 500,
    minDuration: 100,
    maxDuration: 800,
    error: "PaymentGatewayError"
  },
  {
    level: "ERROR",
    event: "DATABASE_CONNECTION_FAILED",
    message: "Unable to establish database connection",
    statusCode: 503,
    minDuration: 500,
    maxDuration: 1500,
    error: "DatabaseConnectionError"
  },
  {
    level: "ERROR",
    event: "INTERNAL_SERVER_ERROR",
    message: "Unexpected application error occurred",
    statusCode: 500,
    minDuration: 50,
    maxDuration: 500,
    error: "InternalServerError"
  }
];

// Weighted selection: normal events are more common than failures.
const eventWeights = [
  30,  // USER_LOGIN
  25,  // PRODUCT_VIEW
  15,  // ORDER_CREATED
  10,  // PAYMENT_PROCESSED
  6,   // SLOW_DATABASE_QUERY
  4,   // API_RATE_LIMIT
  4,   // PAYMENT_FAILED
  3,   // DATABASE_CONNECTION_FAILED
  3    // INTERNAL_SERVER_ERROR
];

function selectEvent() {
  const totalWeight = eventWeights.reduce(
    (total, weight) => total + weight,
    0
  );

  let selection = randomInt(totalWeight);

  for (let i = 0; i < events.length; i++) {
    selection -= eventWeights[i];

    if (selection < 0) {
      return events[i];
    }
  }

  return events[0];
}



async function generateLog() {
  const selectedEvent = selectEvent();

  const durationMs = randomInt(
    selectedEvent.minDuration,
    selectedEvent.maxDuration + 1
  );

  const log = {
    timestamp: new Date().toISOString(),
    level: selectedEvent.level,
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
    event: selectedEvent.event,
    message: selectedEvent.message,
    requestId: randomUUID(),
    durationMs,
    statusCode: selectedEvent.statusCode
  };

  if (selectedEvent.error) {
    log.error = {
      type: selectedEvent.error,
      message: selectedEvent.message
    };
  }

  // Print the generated log.
  console.log(JSON.stringify(log));

  // Send the log to the LogSense backend.
  try {
    const response = await fetch(
      "http://localhost:3000/api/logs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(log)
      }
    );

    if (!response.ok) {
      console.error(
        `Log ingestion failed: HTTP ${response.status}`
      );
    } else {
      console.log("[LogSense] Log successfully ingested");
    }
  } catch (error) {
    console.error(
      `[LogSense] Backend connection failed: ${error.message}`
    );
  }
}

console.log(
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level: "INFO",
    service: SERVICE_NAME,
    event: "APPLICATION_STARTED",
    message: "E-commerce sample application started",
    environment: ENVIRONMENT
  })
);

console.error = console.error.bind(console);

// Generate a new application event every second.
const interval = setInterval(generateLog, LOG_INTERVAL);

// Gracefully stop the generator when Ctrl+C is pressed.
process.on("SIGINT", () => {
  clearInterval(interval);

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      service: SERVICE_NAME,
      event: "APPLICATION_STOPPED",
      message: "E-commerce sample application stopped",
      environment: ENVIRONMENT
    })
  );

  process.exit(0);
});
