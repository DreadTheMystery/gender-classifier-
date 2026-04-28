require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const profilesRouter = require("./routes/profileRoutes");
const authRouter = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/authMiddleware");
const { requireApiVersion } = require("./middleware/versionMiddleware");
const { apiRateLimit } = require("./middleware/rateLimitMiddleware");

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.WEB_PORTAL_URL,
  process.env.BACKEND_BASE_URL,
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (
        !allowedOrigins.length ||
        allowedOrigins.includes(origin.replace(/\/$/, ""))
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    exposedHeaders: ["X-CSRF-Token"],
  }),
);
app.use(express.json());
app.use(cookieParser());

// Simple request logging middleware (method, URL, status, duration)
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
});

app.use("/auth", authRouter);

app.use("/api", requireApiVersion, requireAuth, apiRateLimit);
app.use("/api/profiles", profilesRouter);

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Profiles API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    status: "error",
    message: "Upstream or server failure",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = app;
