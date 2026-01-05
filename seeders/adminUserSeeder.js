const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN2_PASSWORD) {
  throw new Error("Admin seed passwords are not defined");
}

const adminUsers = [
  {
    name: process.env.ADMIN_NAME || "admin",
    email: process.env.ADMIN_EMAIL || "admin@example.com",
    password: process.env.ADMIN_PASSWORD,
    role: "admin",
    isActive: true,
  },
  {
    name: process.env.ADMIN2_NAME || "admin2",
    email: process.env.ADMIN2_EMAIL || "admin2@example.com",
    password: process.env.ADMIN2_PASSWORD,
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
