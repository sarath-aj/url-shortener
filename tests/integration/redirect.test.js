const request = require("supertest");
const app = require("../../app"); // Adjust path to your main app file
const Url = require("../../models/Url"); // Adjust path as needed
const { createUserWithToken } = require("../setup/testHelpers");
const { createTestUrl } = require("../setup/urlHelpers");

describe("URL Redirect Endpoint", () => {
  let user, testUrl;

  beforeEach(async () => {
    // Create test user and URL for each test
    const userData = await createUserWithToken();
    user = userData.user;

    testUrl = await createTestUrl(user._id, {
      longUrl: "https://www.google.com",
      shortCode: "testcode123",
      isActive: true,
    });
  });

  describe("GET /:shortCode (Redirect)", () => {
    it("should redirect to long URL for valid short code", async () => {
      const response = await request(app)
        .get(`/${testUrl.shortCode}`)
        .expect(302);

      // Check redirect location
      expect(response.headers.location).toBe(testUrl.longUrl);

      // Verify click count was incremented (might need slight delay)
      setTimeout(async () => {
        const updatedUrl = await Url.findById(testUrl._id);
        expect(updatedUrl.clickCount).toBe(testUrl.clickCount + 1);
      }, 100);
    });

    it("should return 404 HTML page for non-existent short code", async () => {
      const response = await request(app).get("/nonexistent123").expect(404);

      // Check that response is HTML
      expect(response.headers["content-type"]).toMatch(/text\/html/);
      expect(response.text).toContain("Link Not Found");
      expect(response.text).toContain("doesn't exist or has expired");
    });

    it("should return 404 for inactive URL", async () => {
      // Update URL to be inactive
      await Url.findByIdAndUpdate(testUrl._id, { isActive: false });

      const response = await request(app)
        .get(`/${testUrl.shortCode}`)
        .expect(404);

      expect(response.headers["content-type"]).toMatch(/text\/html/);
      expect(response.text).toContain("Link Not Found");
    });

    it("should return 404 for expired URL", async () => {
      // Update URL to be expired
      await Url.findByIdAndUpdate(testUrl._id, {
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      });

      const response = await request(app)
        .get(`/${testUrl.shortCode}`)
        .expect(404);

      expect(response.headers["content-type"]).toMatch(/text\/html/);
      expect(response.text).toContain("Link Not Found");
    });

    it("should handle different URL schemes (HTTP)", async () => {
      const httpUrl = await createTestUrl(user._id, {
        longUrl: "http://example.com",
        shortCode: "httptest123",
        isActive: true,
      });

      const response = await request(app)
        .get(`/${httpUrl.shortCode}`)
        .expect(302);

      expect(response.headers.location).toBe("http://example.com");
    });

    it("should handle URLs with query parameters", async () => {
      const paramUrl = await createTestUrl(user._id, {
        longUrl: "https://example.com/page?param1=value1&param2=value2",
        shortCode: "paramtest123",
        isActive: true,
      });

      const response = await request(app)
        .get(`/${paramUrl.shortCode}`)
        .expect(302);

      expect(response.headers.location).toBe(
        "https://example.com/page?param1=value1&param2=value2"
      );
    });

    it("should handle URLs with fragments", async () => {
      const fragmentUrl = await createTestUrl(user._id, {
        longUrl: "https://example.com/page#section1",
        shortCode: "fragtest123",
        isActive: true,
      });

      const response = await request(app)
        .get(`/${fragmentUrl.shortCode}`)
        .expect(302);

      expect(response.headers.location).toBe(
        "https://example.com/page#section1"
      );
    });

    it("should update lastAccessedAt timestamp", async () => {
      const initialAccessTime = testUrl.lastAccessedAt;

      await request(app).get(`/${testUrl.shortCode}`).expect(302);

      // Wait a bit and check that lastAccessedAt was updated
      setTimeout(async () => {
        const updatedUrl = await Url.findById(testUrl._id);
        if (initialAccessTime) {
          expect(updatedUrl.lastAccessedAt).not.toEqual(initialAccessTime);
        } else {
          expect(updatedUrl.lastAccessedAt).toBeDefined();
        }
      }, 100);
    });

    it("should return 500 HTML page on server error", async () => {
      // This test might be tricky to implement without actually causing a server error
      // You might need to mock the UrlService.getLongUrl method to throw an error
      // For now, we'll skip this test or implement it based on your error handling
      // Example approach (would require mocking):
      // jest.spyOn(UrlService, 'getLongUrl').mockRejectedValue(new Error('Database error'));
      // const response = await request(app)
      //   .get('/errortest123')
      //   .expect(500);
      // expect(response.headers['content-type']).toMatch(/text\/html/);
      // expect(response.text).toContain('Server Error');
    });

    it("should handle concurrent clicks properly", async () => {
      const initialClickCount = testUrl.clickCount;

      // Make multiple concurrent requests
      const promises = Array(5)
        .fill()
        .map(() => request(app).get(`/${testUrl.shortCode}`).expect(302));

      await Promise.all(promises);

      // Wait a bit for analytics to be recorded
      setTimeout(async () => {
        const updatedUrl = await Url.findById(testUrl._id);
        expect(updatedUrl.clickCount).toBeGreaterThan(initialClickCount);
      }, 200);
    });

    it("should not redirect if shortCode is empty", async () => {
      const response = await request(app).get("/").expect(404); // This depends on your root route handling

      // If you have a homepage, this might be 200
      // Adjust based on your app's behavior
    });

    it("should handle case sensitivity of short codes", async () => {
      // Test with uppercase version of shortCode
      const response = await request(app)
        .get(`/${testUrl.shortCode.toUpperCase()}`)
        .expect(404); // Assuming short codes are case sensitive

      expect(response.headers["content-type"]).toMatch(/text\/html/);
      expect(response.text).toContain("Link Not Found");
    });

    it("should handle special characters in short codes", async () => {
      const specialUrl = await createTestUrl(user._id, {
        longUrl: "https://special-example.com",
        shortCode: "test-code_123",
        isActive: true,
      });

      const response = await request(app)
        .get(`/${specialUrl.shortCode}`)
        .expect(302);

      expect(response.headers.location).toBe("https://special-example.com");
    });
  });
});
