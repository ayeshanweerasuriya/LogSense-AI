import express from "express";
import logRoutes from "./routes/log.routes.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "logsense-backend",
    timestamp: new Date().toISOString()
  });
});

// Log ingestion API.
app.use("/api/logs", logRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LogSense backend running on port ${PORT}`);
});