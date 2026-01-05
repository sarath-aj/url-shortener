const dotenv = require("dotenv");
const path = require("path");

// __dirname in Node.js is a global variable that gives the absolute path of the current file’s directory.
dotenv.config({ path: path.join(__dirname, "./.env") });

const app = require("./app");
const connectDB = require("./config/database");
const { connectRedis } = require("./config/redis");

// Validate required environment variables
const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "MONGODB_URI",
  "JWT_SECRET",
  "BASE_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);

console.log(missingEnvVars);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:");
  missingEnvVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", err.message);
  console.error(err.stack);
  process.exit(1);
});

// Graceful shutdown handler
// async
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Close Sentry client
  //   await sentryUtils.Sentry.close(2000);

  if (!server) {
    console.log("Server not yet started, exiting immediately");
    process.exit(0);
  }

  server.close(() => {
    console.log("HTTP server closed");

    // Close database connections
    const mongoose = require("mongoose");
    mongoose.connection.close(() => {
      console.log("MongoDB connection closed");

      // Close Redis connection
      const { getRedisClient } = require("./config/redis");
      const redisClient = getRedisClient();
      if (redisClient) {
        redisClient.quit(() => {
          console.log("Redis connection closed");
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  });
};

// Step-by-step (concise):
// * `gracefulShutdown = (signal) => { ... }` — function that receives the shutdown signal name and starts the shutdown sequence.
// * `console.log(...)` — log which signal was received.
// * `server.close(() => { ... })` — stop accepting new HTTP connections; wait for existing requests to finish; then run the callback.
// * `console.log("HTTP server closed")` — confirm HTTP server stopped.
// * `const mongoose = require("mongoose"); mongoose.connection.close(() => { ... })` — close MongoDB connections gracefully; wait for close, then run the callback.
// * `console.log("MongoDB connection closed")` — confirm DB closed.
// * `const { getRedisClient } = require("./config/redis"); redisClient.quit(() => { ... })` — fetch Redis client; if present, call `quit()` to close Redis connection gracefully, then run callback and log.
// * `process.exit(0)` — once everything is closed (or if no Redis client), exit the process with success code `0`.
// * `process.on("SIGTERM"/"SIGINT", ...)` — register handlers so those OS signals trigger the `gracefulShutdown` flow (SIGINT = Ctrl+C, SIGTERM = termination from PMs/k8s).
// Purpose: orderly stop — let in-flight work finish and clean up DB/Redis before exiting. (Consider adding a forced timeout fallback to avoid hanging if something never closes.)

// Listen for shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server function
const startServer = async () => {
  try {
    console.log("Starting URL Shortener Server...");
    console.log(`Environment: ${process.env.NODE_ENV}`);
    // console.log(`Sentry: ${process.env.SENTRY_DSN ? "Enabled" : "Disabled"}`);
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await connectDB();
    console.log("MongoDB connected successfully");

    // Connect to Redis
    console.log("Connecting to Redis...");
    try {
      await connectRedis();
      console.log("Redis connected successfully");
    } catch (error) {
      console.warn(
        "  Redis connection failed - continuing without cache:",
        error.message
      );
    }

    // Start HTTP server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log("URL Shortener Server Ready!");
      console.log(`Server running on port: ${PORT}`);
      console.log(`Base URL: ${process.env.BASE_URL}`);
      console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(`JSON Spec: http://localhost:${PORT}/api-docs.json`);
      console.log(`Health Check: ${process.env.BASE_URL}/health`);
      console.log("");
      console.log(" Available Endpoints:");
      console.log("   Authentication: /api/v1/auth");
      console.log("   URLs: /api/v1/urls");
      console.log("   Analytics: /api/v1/analytics");
      console.log("   Redirect: /:shortCode");
      console.log("");

      if (process.env.NODE_ENV === "development") {
        console.log(" Development Mode:");
        console.log("   - Detailed error messages enabled");
        console.log("   - CORS enabled for localhost");
        console.log("   - Rate limiting relaxed for admin users");
        console.log("");
      }

      // Store server reference for graceful shutdown
      global.server = server;
    });

    return server;
  } catch (error) {
    console.error(" Failed to start server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Cleanup function for expired URLs (runs every hour)
const cleanupExpiredUrls = async () => {
  try {
    const Url = require("./models/Url");
    const result = await Url.updateMany(
      {
        expiresAt: { $lte: new Date() },
        isActive: true,
      },
      { isActive: false }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Deactivated ${result.modifiedCount} expired URLs`);
    }
  } catch (error) {
    console.error("❌ Error cleaning up expired URLs:", error.message);
  }
};

// Schedule cleanup task
setInterval(cleanupExpiredUrls, 60 * 60 * 1000); // Run every hour

// Start the server
let server;
startServer()
  .then((serverInstance) => {
    server = serverInstance;
  })
  .catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });

// Export for testing purposes
module.exports = app;
