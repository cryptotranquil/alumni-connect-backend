const { body, param, query, validationResult } = require("express-validator");
const DEPARTMENTS = require("../config/departments");

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// Sanitize HTML to prevent XSS
const sanitizeHtml = (value) => {
  if (!value) return value;
  // Remove script tags and dangerous attributes
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
};

// ========== AUTH VALIDATIONS ==========
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["student", "alumni", "admin"])
    .withMessage("Invalid role"),
  body("registrationNumber")
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage("Registration number must be at least 5 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
    body("department")
    .optional()
    .trim()
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`)
    .customSanitizer((value) => sanitizeHtml(value)),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// ========== JOB VALIDATIONS ==========
const createJobValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("company")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name is required")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("description")
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("requirements")
    .optional()
    .isArray()
    .withMessage("Requirements must be an array"),
  body("type")
    .optional()
    .isIn(["full-time", "part-time", "internship", "contract", "remote"])
    .withMessage("Invalid job type"),
];

// ========== EVENT VALIDATIONS ==========
const createEventValidation = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("eventDate")
    .isISO8601()
    .withMessage("Valid event date is required")
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date()) {
        throw new Error("Event date must be in the future");
      }
      return true;
    }),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Location too long")
    .customSanitizer((value) => sanitizeHtml(value)),
];

// ========== MESSAGE VALIDATIONS ==========
const sendMessageValidation = [
  body("receiverId").trim().isLength({ min: 1 }).withMessage("Valid receiver ID is required"),
  body("message")
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message must be between 1 and 2000 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
];

// ========== PROFILE VALIDATIONS ==========
const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("phone")
    .optional()
    .trim()
    .matches(
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    )
    .withMessage("Invalid phone number format")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio must be less than 500 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("skills")
    .optional()
    .isArray()
    .withMessage("Skills must be an array")
    .customSanitizer((value) => value?.map((s) => sanitizeHtml(s))),
  body("interests")
    .optional()
    .isArray()
    .withMessage("Interests must be an array")
    .customSanitizer((value) => value?.map((i) => sanitizeHtml(i))),
  body("graduationYear")
    .optional()
    .isInt({ min: 1950, max: 2030 })
    .withMessage("Invalid graduation year"),
  body("university")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("University name too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("company")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Company name too long")
    .customSanitizer((value) => sanitizeHtml(value)),
    body("position")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Position too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("department")
    .optional()
    .trim()
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`)
    .customSanitizer((value) => sanitizeHtml(value)),
];

const changePasswordValidation = [
  body("currentPassword")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Current password must be at least 6 characters"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// ========== DIRECTORY FILTER VALIDATIONS ==========
const directoryFilterValidation = [
    query("department")
    .optional()
    .trim()
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`)
    .customSanitizer((value) => sanitizeHtml(value)),
  query("skills")
    .optional()
    .trim()
    .customSanitizer((value) => sanitizeHtml(value)),
  query("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  query("search")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Search term too long")
    .customSanitizer((value) => sanitizeHtml(value)),
];

// ========== MENTORSHIP VALIDATIONS ==========
const mentorshipRequestValidation = [
  body("skills").optional().isArray().withMessage("Skills must be an array"),
  body("interests")
    .optional()
    .isArray()
    .withMessage("Interests must be an array"),
  body("careerGoals")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Career goals too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("preferredIndustry")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Industry too long")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Message too long")
    .customSanitizer((value) => sanitizeHtml(value)),
];

const mentorshipResponseValidation = [
  body("status")
    .isIn(["accepted", "rejected"])
    .withMessage("Status must be accepted or rejected"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Message too long")
    .customSanitizer((value) => sanitizeHtml(value)),
];

// ========== DEPARTMENT VALIDATIONS ==========
const createDepartmentValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department name must be between 2 and 100 characters")
    .customSanitizer((value) => sanitizeHtml(value)),
  body("code")
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage("Department code must be between 2 and 10 characters")
    .matches(/^[A-Z0-9]+$/i)
    .withMessage("Department code must contain only letters and numbers")
    .customSanitizer((value) => value.toUpperCase()),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description too long")
    .customSanitizer((value) => sanitizeHtml(value)),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createJobValidation,
  createEventValidation,
  sendMessageValidation,
  updateProfileValidation,
  changePasswordValidation,
  directoryFilterValidation,
  mentorshipRequestValidation,
  mentorshipResponseValidation,
  createDepartmentValidation,
};
