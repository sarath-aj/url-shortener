const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const adminUsers = [
  {
    name: "admin",
    email: "admin@example.com",
    password: "admin123456", // This will be hashed automatically
    role: "admin",
    isActive: true,
  },
  {
    name: "admin2",
    email: "admin2@example.com",
    password: "super123456",
    role: "admin",
    isActive: true,
  },
];

const seedUsers = async () => {
  try {
    console.log("Starting user seeding...");

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/urlshortner"
    );
    console.log("Connected to MongoDB");

    // Clear existing admin users (optional)
    await User.deleteMany({ role: "admin" });
    console.log("Cleared existing admin users");

    // Create admin users
    const createdUsers = await User.create(adminUsers);
    console.log(`Successfully created ${createdUsers.length} admin users`);
  } catch (error) {
    console.error("Error seeding users:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
