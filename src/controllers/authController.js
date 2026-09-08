const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const userService = require("../services/userService");
const generateToken = require("../utils/generateToken");
const formatUser = require("../utils/formatUser");
const { generatePlainToken, hashToken } = require("../utils/tokenCrypto");
const { sendTransactionalEmail, frontendBaseUrl } = require("../services/email.service");

exports.bootstrap = async (req, res) => {
  const userCount = await userService.countUsers();
  res.json({ allowFirstAdminRegister: userCount === 0 });
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { name, email, password, role, phone, graduationYear, university, company, position } = req.body;

  if (!["student", "alumni", "admin"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role." });
  }

  const userCount = await userService.countUsers();

  // split "name" into firstname/lastname to match the existing users schema —
  // frontend still just sends one "name" field, no API contract change needed
  const [firstname, ...rest] = (name || "").trim().split(" ");
  const lastname = rest.join(" ");

  if (role === "admin") {
    if (userCount > 0) {
      return res.status(403).json({
        success: false,
        message: "Admin self-registration is only allowed when no users exist. Ask an administrator to invite you.",
      });
    }
    const user = await userService.createUser({
      firstname, lastname,
      email: email.toLowerCase(),
      password, role: "admin",
      phone: phone || "",
      accountStatus: "active",
    });
    const token = generateToken(user.id);
    return res.status(201).json({ success: true, user: formatUser(user), token });
  }

  if (role === "student" && !graduationYear) {
    return res.status(400).json({ success: false, message: "Graduation year is required for students." });
  }

  const exists = await userService.findByEmail(email);
  if (exists) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  const accountStatus = role === "student" ? "active" : "pending"; // alumni need admin approval
  const user = await userService.createUser({
    firstname, lastname,
    email: email.toLowerCase(),
    password, role,
    phone: phone || "",
    accountStatus,
  });

  // NOTE: this creates the `users` doc only. Extended profile fields
  // (graduationYear, university, company, position, bio, skills) still need
  // a matching `profiles/{user.id}` doc — deferred: the exact field mapping
  // there (e.g. Mongoose's `position` vs your profiles' `jobTitle`) isn't
  // settled yet, so not guessing at it here. Worth its own quick follow-up.

  if (role === "alumni") {
    return res.status(201).json({
      success: true,
      message: "Registration successful. An administrator must approve your account before you can sign in.",
      user: formatUser(user), token: null, pendingApproval: true,
    });
  }

  const token = generateToken(user.id);
  return res.status(201).json({ success: true, user: formatUser(user), token });
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email, password } = req.body;
  const user = await userService.findByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  if (user.role === "alumni" && user.accountStatus !== "active") {
    return res.status(403).json({
      success: false,
      message: "Your alumni account is pending approval. Please try again once an administrator approves it.",
    });
  }

  const token = generateToken(user.id);
  res.json({
    success: true, user: formatUser(user), token,
    mustChangePassword: !!user.mustChangePassword,
  });
};

exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { email } = req.body;
  const user = await userService.findByEmail(email);
  const generic = "If an account exists for that email, you will receive reset instructions shortly.";

  if (!user) return res.json({ success: true, message: generic }); // don't reveal whether the email exists

  const plainToken = generatePlainToken();
  await userService.updateUser(user.id, {
    passwordResetTokenHash: hashToken(plainToken),
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
  });

  const link = `${frontendBaseUrl()}/reset-password?token=${plainToken}`;
  const html = `<p>Hello ${user.firstname},</p><p>We received a request to reset your Alumni Connect password.</p><p><a href="${link}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`;

  try {
    await sendTransactionalEmail({ to: user.email, subject: "Reset your Alumni Connect password", html });
  } catch (err) {
    console.error("[forgotPassword] email error:", err);
  }

  const responseBody = { success: true, message: generic };
  if (process.env.NODE_ENV !== "production") {
    // TEMPORARY — local/dev convenience only. Lets the reset flow be tested
    // end-to-end without a working email provider. MUST be removed (or this
    // guard must stay airtight) before any real deployment — leaking a raw
    // password-reset token in an API response is a real vulnerability if it
    // ever reaches production.
    responseBody.devToken = plainToken;
  }
  res.json(responseBody);
};

exports.resetPasswordWithToken = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { token, newPassword } = req.body;
  const user = await userService.findByResetTokenHash(hashToken(token));

  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset link. Request a new one from login." });
  }

  await userService.updateUser(user.id, {
    password: await bcrypt.hash(newPassword, 12),
    passwordResetTokenHash: null,
    passwordResetExpires: null,
    mustChangePassword: false,
  });

  res.json({ success: true, message: "Password updated. You can sign in with your new password." });
};