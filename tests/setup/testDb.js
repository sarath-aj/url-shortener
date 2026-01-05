const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

// Setup test database before all tests
const setupTestDB = async () => {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Override the MONGODB_URI for tests
    process.env.MONGODB_URI = mongoUri;

    // Connect to the in-memory database
    await mongoose.connect(mongoUri);

    console.log("Test database connected");
  } catch (error) {
    console.error("Test database setup failed:", error);
    process.exit(1);
  }
};

// Cleanup test database after all tests
const teardownTestDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log("Test database disconnected");
  } catch (error) {
    console.error("Test database teardown failed:", error);
  }
};

// Clear all collections in the database
const clearTestDB = async () => {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error("Clear test database failed:", error);
  }
};

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
};
