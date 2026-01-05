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
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage("Name can only contain letters and spaces"),
];

module.exports = {
  validateUserUpdate,
};
