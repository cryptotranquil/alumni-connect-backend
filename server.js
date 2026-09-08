require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { errorHandler } = require("./src/middleware/errorMiddleware");
const initSocket = require("./src/socket");
const cronService = require("./src/services/cron.service");

// Ensure JWT secret exists
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev-jwt-secret-change-in-production";
  console.warn("JWT_SECRET missing — using insecure dev default.");
}

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- CORS CONFIGURATION ----------------
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",") // split comma-separated list
  : ["https://alumni-connect-pied-nine.vercel.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS blocked request from: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ---------------- SECURITY & LOGGING ----------------
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// ---------------- RATE LIMITING ----------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/register", authLimiter);
app.use("/api/login", authLimiter);

// ---------------- ROUTES ----------------
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "alumni-connect-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", require("./src/routes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use(errorHandler);

// ---------------- HTTP SERVER ----------------
const httpServer = http.createServer(app);
initSocket(httpServer, app);

// ---------------- CRON JOBS ----------------
const startCronJobs = () => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  cronService.scheduleEventReminders(baseUrl);
};

// ---------------- START SERVER ----------------
httpServer.listen(PORT, () => {
  console.log(`Alumni Connect API listening on port ${PORT}`);
  console.log(`Socket.IO ready (same port, path /socket.io/)`);
  startCronJobs();
});

// ---------------- GRACEFUL SHUTDOWN ----------------
const shutdown = () => {
  console.log("Shutting down gracefully...");
  cronService.stopAll();
  httpServer.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = app;
