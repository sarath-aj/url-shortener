const express = require("express");
const AnalyticsController = require("../controllers/analyticsController");
const { authenticateToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/rbac");
const {
  analyticsLimiter,
  generalLimiter,
} = require("../middleware/rateLimiter");
const {
  validateAnalyticsTimeRange,
} = require("../request/validators/auth-validators");

const router = express.Router();

/**
 * @route GET /api/v1/analytics/user
 * @desc Get user analytics for dashboard
 * @access Private
 */
router.get(
  "/user",
  authenticateToken,
  analyticsLimiter,
  validateAnalyticsTimeRange,
  AnalyticsController.getUserAnalytics
);

/**
 * @route GET /api/v1/analytics/admin
 * @desc Get admin analytics for dashboard
 * @access Private (Admin)
 */
router.get(
  "/admin",
  authenticateToken,
  requireAdmin,
  analyticsLimiter,
  validateAnalyticsTimeRange,
  AnalyticsController.getAdminAnalytics
);

module.exports = router;
