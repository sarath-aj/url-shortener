const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { specs, swaggerUi } = require("./config/swagger");

// Import routes
const authRoutes = require("./routes/auth");
const urlRoutes = require("./routes/urls");
const userRoutes = require("./routes/users");
const analyticsRoutes = require("./routes/analytics");

// Import controllers
const UrlController = require("./controllers/urlController");

// Import middleware
const {
  urlAccessLimiter,
  generalLimiter,
} = require("./middleware/rateLimiter");

const { validateShortCode } = require("./request/validators/auth-validators");
const { errorResponse } = require("./utils/apiResponse");

// Create Express app
const app = express();

// Trust proxy (important for getting real IP addresses in production)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost in development
    if (process.env.NODE_ENV === "development") {
      callback(null, true);
      return;
    }

    // In production, configure allowed origins
    const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Body parsing middleware
// app.use(...) → Adds middleware to run on every request.
// express.json(...) → Middleware that parses incoming requests with JSON payloads (Content-Type: application/json).
// limit: "10mb" → Maximum allowed JSON body size is 10 megabytes; larger requests are rejected with 413 Payload Too Large.
// Result: Any incoming JSON request body (up to 10 MB) is parsed and made available as a JavaScript object in req.body.
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// express.urlencoded(...) → Middleware that parses URL-encoded request bodies (e.g., form submissions like application/x-www-form-urlencoded).
// extended: true → Allows nested objects and arrays in the data (uses the qs library).
// If false, only simple key=value pairs are parsed (uses Node’s built-in querystring).
// limit: '10mb' → Restricts the maximum body size to 10 megabytes; prevents huge payloads from crashing your server.
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes with versioning
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/urls", urlRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

// Serve static files from React build
app.use(express.static(path.join(__dirname, "dist")));

// Handle React routing (for routes like /about, /contact, etc.)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Short URL redirect route (must be after API routes)
/**
 * @route GET /:shortCode
 * @desc Redirect to long URL
 * @access Public
 */
app.get(
  "/:shortCode",
  urlAccessLimiter,
  validateShortCode,
  UrlController.redirectToLongUrl
);

// Swagger Documentation
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customSiteTitle: "URL Shortener REST API Documentation",
    customfavIcon: "/favicon.ico",
    customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
  `,
    swaggerOptions: {
      docExpansion: "list",
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
    },
  })
);

// JSON endpoint for the OpenAPI specification
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(specs);
});

// 404 handler for API routes
// /api will match all requests starting with /api that didn’t match earlier routes.
// Use req.originalUrl instead of req.path to show the full path requested.
app.use("/api", (req, res) => {
  return errorResponse(
    res,
    `API endpoint not found: ${req.method} ${req.originalUrl}`,
    404
  );
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Handle different types of errors
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return errorResponse(res, "Validation failed", 400, errors);
  }

  if (error.name === "CastError") {
    return errorResponse(res, "Invalid ID format", 400);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return errorResponse(res, `${field} already exists`, 400);
  }

  if (error.name === "JsonWebTokenError") {
    return errorResponse(res, "Invalid token", 401);
  }

  if (error.name === "TokenExpiredError") {
    return errorResponse(res, "Token expired", 401);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : error.message;

  return errorResponse(res, message, statusCode);
});

module.exports = app;
