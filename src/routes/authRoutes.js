const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/bootstrap", authController.bootstrap);

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["student", "alumni", "admin"])
      .withMessage("Invalid role"),
  ],
  authController.register,
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.login,
);

router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Token is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  authController.resetPasswordWithToken,
);

module.exports = router;
