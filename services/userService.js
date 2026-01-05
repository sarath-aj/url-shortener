const User = require("../models/User");
const { getRedisClient } = require("../config/redis");

class UserService {
  /**
   * Get users with pagination and search
   */
  static async getUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

      // Build search filter
      let filter = {};

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Get URLs with pagination
      const users = await User.find(filter)
        .select("name email role createdAt totalUrls totalClicks")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get total count for pagination
      const total = await User.countDocuments(filter);

      return {
        users,
        // pagination: {
        //   page: parseInt(page),
        //   total_pages: Math.ceil(total / limit),
        //   total, // total users
        //   has_next: page * limit < total,
        //   has_prev: page > 1,
        // },

        meta: {
          current_page: page,
          per_page: limit,
          total,
          last_page: Math.ceil(total / limit),
          from: total === 0 ? null : (page - 1) * limit + 1,
          to: Math.min(page * limit, total),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Get user details
   */
  static async getUserDetails(userId) {
    try {
      const user = await User.findOne({ _id: userId });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to get user details: ${error.message}`);
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(userId) {
    try {
      const user = await User.findOne({ _id: userId });

      if (!user) {
        throw new Error("User not found");
      }

      // Delete URL and related clicks
      await User.findByIdAndDelete(userId);

      // Remove from cache
      const redisClient = getRedisClient();
      if (redisClient) {
        const keys = await redisClient.keys("analytics:admin:*");
        if (keys.length) {
          await redisClient.del(keys);
        }
      }

      return { message: "User deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}

module.exports = UserService;
