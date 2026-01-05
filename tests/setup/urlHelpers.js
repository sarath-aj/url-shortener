const Url = require("../../models/Url"); // Adjust path as needed
const { generateUniqueId } = require("./testHelpers");

/**
 * Create a test URL in the database
 */
const createTestUrl = async (userId, urlData = {}) => {
  const uniqueId = generateUniqueId();
  const defaultUrlData = {
    longUrl: `https://example${uniqueId}.com`,
    shortCode: `code${uniqueId}`,
    userId: userId,
    title: `Test URL ${uniqueId}`,
    description: `Test description ${uniqueId}`,
    clickCount: 0,
    isActive: true,
  };

  const url = new Url({ ...defaultUrlData, ...urlData });
  await url.save();
  return url;
};

/**
 * Create multiple test URLs for pagination testing
 */
const createMultipleTestUrls = async (userId, count = 5) => {
  const urls = [];
  for (let i = 0; i < count; i++) {
    const url = await createTestUrl(userId, {
      longUrl: `https://example${i}.com`,
      shortCode: `test${i}${Date.now()}`,
      title: `Test URL ${i}`,
      clickCount: i * 10, // Different click counts for sorting tests
    });
    urls.push(url);
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return urls;
};

/**
 * Common test URL data
 */
const testUrlData = {
  valid: {
    longUrl: "https://www.google.com",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  },

  validWithoutExpiry: {
    longUrl: "https://www.github.com",
  },

  invalidUrl: {
    longUrl: "not-a-valid-url",
  },

  emptyUrl: {
    longUrl: "",
  },

  httpUrl: {
    longUrl: "http://example.com",
  },

  longUrlWithParams: {
    longUrl: "https://example.com/path?param1=value1&param2=value2",
  },

  expiredUrl: {
    longUrl: "https://expired.com",
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
};

/**
 * Format URL response for comparison
 */
const formatUrlResponse = (url, baseUrl = "http://localhost:3000") => {
  return {
    id: url._id.toString(),
    shortCode: url.shortCode,
    shortUrl: `${baseUrl}/${url.shortCode}`,
    longUrl: url.longUrl,
    title: url.title,
    description: url.description,
    clickCount: url.clickCount,
    isActive: url.isActive,
    expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
    lastAccessedAt: url.lastAccessedAt
      ? url.lastAccessedAt.toISOString()
      : null,
    createdAt: url.createdAt.toISOString(),
    updatedAt: url.updatedAt.toISOString(),
  };
};

/**
 * Validate URL response structure
 */
const validateUrlResponse = (urlData) => {
  expect(urlData).toHaveProperty("id");
  expect(urlData).toHaveProperty("shortCode");
  expect(urlData).toHaveProperty("shortUrl");
  expect(urlData).toHaveProperty("longUrl");
  expect(urlData).toHaveProperty("clickCount");
  expect(urlData).toHaveProperty("isActive");
  expect(urlData).toHaveProperty("createdAt");
  expect(urlData).toHaveProperty("updatedAt");

  expect(typeof urlData.id).toBe("string");
  expect(typeof urlData.shortCode).toBe("string");
  expect(typeof urlData.shortUrl).toBe("string");
  expect(typeof urlData.longUrl).toBe("string");
  expect(typeof urlData.clickCount).toBe("number");
  expect(typeof urlData.isActive).toBe("boolean");
  expect(typeof urlData.createdAt).toBe("string");
  expect(typeof urlData.updatedAt).toBe("string");
};

/**
 * Validate pagination response structure
 */
const validatePaginationResponse = (pagination, expectedTotal = null) => {
  expect(pagination).toHaveProperty("currentPage");
  expect(pagination).toHaveProperty("totalPages");
  expect(pagination).toHaveProperty("totalUrls");
  expect(pagination).toHaveProperty("limit");
  expect(pagination).toHaveProperty("hasNext");
  expect(pagination).toHaveProperty("hasPrev");

  expect(typeof pagination.currentPage).toBe("number");
  expect(typeof pagination.totalPages).toBe("number");
  expect(typeof pagination.totalUrls).toBe("number");
  expect(typeof pagination.limit).toBe("number");
  expect(typeof pagination.hasNext).toBe("boolean");
  expect(typeof pagination.hasPrev).toBe("boolean");

  if (expectedTotal !== null) {
    expect(pagination.totalUrls).toBe(expectedTotal);
  }
};

module.exports = {
  createTestUrl,
  createMultipleTestUrls,
  testUrlData,
  formatUrlResponse,
  validateUrlResponse,
  validatePaginationResponse,
};
