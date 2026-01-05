const redis = require("redis");

let client;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
    });

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
