const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../../app");
const User = require("../../models/User");
const {
  createTestUser,
  createUserWithToken,
  testUserData,
  extractToken,
  authHeader,
} = require("../setup/testHelpers");

describe("Auth Endpoints", () => {
  describe("POST /api/v1/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const userData = testUserData.valid;

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      console.log(response.body);

      // Check response structure
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "User registered successfully"
      );
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("tokenType", "Bearer");

      // Check user data in response
      const { user } = response.body.data;
      expect(user).toHaveProperty("id");
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe("user");
      expect(user).not.toHaveProperty("password"); // Password should not be returned

      // Verify user was created in database
      const dbUser = await User.findById(user.id);
      expect(dbUser).toBeTruthy();
      expect(dbUser.username).toBe(userData.username);
      expect(dbUser.email).toBe(userData.email);

      // Verify token is valid
      const token = response.body.data.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(user.id);
    });

    it("should return 400 for invalid email format", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testUserData.invalidEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Validation failed");
    });

    it("should return 400 for weak password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testUserData.weakPassword)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Validation failed");
    });

    it("should return 400 for invalid username", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testUserData.invalidUsername)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Validation failed");
    });

    it("should return 400 for username with special characters", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(testUserData.specialCharsUsername)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Validation failed");
    });

    it("should return 400 for duplicate email", async () => {
      // Create user first
      await createTestUser({ email: "duplicate@example.com" });

      // Try to register with same email
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "newuser",
          email: "duplicate@example.com",
          password: "ValidPass123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    it("should return 400 for duplicate username", async () => {
      // Create user first
      await createTestUser({ username: "duplicateuser" });

      // Try to register with same username
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "duplicateuser",
          email: "new@example.com",
          password: "ValidPass123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    // it("should not allow non-admin to register as admin", async () => {
    //   const response = await request(app)
    //     .post("/api/v1/auth/register")
    //     .send({
    //       username: "wannabeadmin",
    //       email: "admin@example.com",
    //       password: "AdminPass123",
    //       role: "admin",
    //     })
    //     .expect(201);

    //   // Should create user but with 'user' role, not 'admin'
    //   expect(response.body.data.user.role).toBe("user");
    // });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          username: "testuser",
          // missing email and password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await createTestUser({
        email: "login@example.com",
        password: "LoginPass123",
      });
    });

    it("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: "LoginPass123",
        })
        .expect(200);

      // Check response structure
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("tokenType", "Bearer");

      // Check user data
      const { user } = response.body.data;
      expect(user.email).toBe("login@example.com");
      expect(user).toHaveProperty("lastLogin");
      expect(user).not.toHaveProperty("password");

      // Verify token is valid
      const token = response.body.data.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(user.id);
    });

    it("should return 401 for invalid email", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "LoginPass123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid credentials");
    });

    it("should return 401 for invalid password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: "WrongPassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid credentials");
    });

    it("should return 401 for inactive user", async () => {
      // Create inactive user
      const inactiveUser = await createTestUser({
        email: "inactive@example.com",
        password: "InactivePass123",
        isActive: false,
      });

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "inactive@example.com",
          password: "InactivePass123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid credentials");
    });

    it("should return 400 for invalid email format", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "invalid-email-format",
          password: "LoginPass123",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should return 400 for missing password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should update lastLogin timestamp on successful login", async () => {
      const userBefore = await User.findOne({ email: "login@example.com" });
      const initialLastLogin = userBefore.lastLogin;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "login@example.com",
          password: "LoginPass123",
        })
        .expect(200);

      const userAfter = await User.findOne({ email: "login@example.com" });
      expect(userAfter.lastLogin).not.toEqual(initialLastLogin);
      expect(userAfter.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout successfully with valid token", async () => {
      const { token } = await createUserWithToken();

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", authHeader(token))
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged out successfully");
    });

    it("should return 401 without authorization header", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Access token is required");
    });

    it("should return 401 with invalid token", async () => {
      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid token");
    });

    it("should return 401 with expired token", async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: "someUserId" },
        process.env.JWT_SECRET,
        { expiresIn: "-1h" } // Expired 1 hour ago
      );

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", authHeader(expiredToken))
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Token expired");
    });

    it("should return 401 for token with non-existent user", async () => {
      // Create token for non-existent user
      const nonExistentToken = jwt.sign(
        { userId: "507f1f77bcf86cd799439011" }, // Valid ObjectId but user doesn't exist
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      const response = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", authHeader(nonExistentToken))
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid or expired token");
    });
  });
});
