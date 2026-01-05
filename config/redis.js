const redis = require("redis");

let client;

const connectRedis = async () => {
  try {
    const config = {
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      },
    };

    if (process.env.REDIS_USERNAME) {
      config.username = process.env.REDIS_USERNAME;
    }

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    client = redis.createClient(config);

    client.on("error", (err) => {
      console.log("Redis Client Error", err);
    });

    client.on("connect", () => {
      console.log("Redis Connected");
    });

    await client.connect();
    return client;
  } catch (error) {
    console.error("Error connecting to Redis:", error.message);
    // Don't exit process, continue without cache
    return null;
  }
};

const getRedisClient = () => client;

module.exports = {
  connectRedis,
  getRedisClient,
};
