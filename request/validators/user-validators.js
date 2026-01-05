const { body, param, query } = require("express-validator");

/**
 * User update validation
 */
const validateUserUpdate = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .bail()
    .matches(/^[\p{L}\s.'-]+$/u)
    .withMessage(
      "Name can only contain letters, spaces, and basic punctuation"
    ),
];

module.exports = {
  validateUserUpdate,
};
