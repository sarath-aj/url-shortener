const jwt = require("jsonwebtoken");
const User = require("../../models/User"); // Adjust path as needed

/**
 * Generate unique username/email to avoid conflicts
 */
const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

/**
 * Create a test user in the database
 */
const createTestUser = async (userData = {}) => {
  const uniqueId = generateUniqueId();
  const defaultUserData = {
    username: `testuser${uniqueId}`,
    email: `test${uniqueId}@example.com`,
    password: "TestPass123",
    role: "user",
  };

  const user = new User({ ...defaultUserData, ...userData });
  await user.save();
  return user;
};

/**
 * Create an admin test user
 */
const createTestAdmin = async (userData = {}) => {
  const uniqueId = generateUniqueId();
  const defaultAdminData = {
    username: `testadmin${uniqueId}`,
    email: `admin${uniqueId}@example.com`,
    password: "AdminPass123",
    role: "admin",
  };

  return createTestUser({ ...defaultAdminData, ...userData });
};

/**
 * Generate a JWT token for testing
 */
const generateTestToken = (userId) => {
  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

/**
 * Create user and return with token
 */
const createUserWithToken = async (userData = {}) => {
  const user = await createTestUser(userData);
  const token = generateTestToken(user._id);
  return { user, token };
};

/**
 * Create admin and return with token
 */
const createAdminWithToken = async (userData = {}) => {
  const admin = await createTestAdmin(userData);
  const token = generateTestToken(admin._id);
  return { user: admin, token };
};

/**
 * Common test data
 */
const testUserData = {
  valid: {
    username: `validuser${Date.now()}`,
    email: `valid${Date.now()}@example.com`,
    password: "ValidPass123",
  },

  invalidEmail: {
    username: `testuser${Date.now()}`,
    email: "invalid-email",
    password: "TestPass123",
  },

  weakPassword: {
    username: `testuser${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: "123", // Too short, no uppercase, no special chars
  },

  invalidUsername: {
    username: "ab", // Too short
    email: `test${Date.now()}@example.com`,
    password: "TestPass123",
  },

  specialCharsUsername: {
    username: "test@user!", // Invalid characters
    email: `test${Date.now()}@example.com`,
    password: "TestPass123",
  },
};

/**
 * Extract token from response
 */
const extractToken = (response) => {
  return response.body.data?.token;
};

/**
 * Create authorization header
 */
const authHeader = (token) => {
  return `Bearer ${token}`;
};

module.exports = {
  generateUniqueId,
  createTestUser,
  createTestAdmin,
  generateTestToken,
  createUserWithToken,
  createAdminWithToken,
  testUserData,
  extractToken,
  authHeader,
};
