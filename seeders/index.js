const mongoose = require("mongoose");
const seedUsers = require("./adminUserSeeder");
// const seedUrls = require('./urlSeeder'); // Future seeders
require("dotenv").config();

const runAllSeeders = async () => {
  try {
    console.log("Starting database seeding...");

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/url_shortner"
    );
    console.log("Connected to MongoDB");

    // Run seeders in order
    await seedUsers();
    // await seedUrls();

    console.log("All seeders completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "users":
    seedUsers();
    break;
  //   case "all":
  default:
    runAllSeeders();
    break;
}

module.exports = { runAllSeeders, seedUsers };
