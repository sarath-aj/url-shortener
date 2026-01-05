const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);

    // process.exit(1) tells Node.js to end the process immediately with exit code 1 (meaning an error).
    // 0 → success/normal exit
    // 1 (or other non-zero) → failure/error exit
    // So in your code:
    // If MongoDB connection fails, the app logs the error and then exits with code 1, signaling to the OS or a process manager (like PM2, Docker, systemd, etc.) that the app crashed.
    // 👉 Useful so deployment tools can auto-restart the app instead of leaving it hanging.
    process.exit(1);
  }
};

module.exports = connectDB;
