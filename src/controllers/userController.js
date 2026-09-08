const userService = require("../services/userService");
const formatUser = require("../utils/formatUser");
const { canExchangeMessages } = require("../services/connection.service");

exports.getPublicPeer = async (req, res) => {
  const { id } = req.params;
  const allowed = await canExchangeMessages(req.user.userId, id);
  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to message this user yet.",
    });
  }
  const peer = await userService.findById(id);
  if (!peer)
    return res.status(404).json({ success: false, message: "User not found" });
  res.json({
    userId: peer.userId,
    name: peer.name,
    profilePhoto: peer.profilePhoto || "",
    role: peer.role,
  });
};

exports.listUsers = async (req, res) => {
  const users = await userService.listUsers();
  res.json({ success: true, users: users.map((u) => formatUser(u)) });
};

exports.getProfile = async (req, res) => {
  const user = await userService.getFullUser(req.user.userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, user: formatUser(user) });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await userService.findById(req.user.userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  if (user.mustChangePassword) {
    await userService.updateUser(req.user.userId, {
      password: newPassword,
      mustChangePassword: false,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
    });
    const updatedUser = await userService.findById(req.user.userId);
    return res.json({
      success: true,
      message: "Password updated.",
      user: formatUser(updatedUser),
    });
  }
  if (!currentPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Current password is required." });
  }
  if (!(await userService.matchPassword(currentPassword, user.password))) {
    return res
      .status(401)
      .json({ success: false, message: "Current password is incorrect." });
  }
  await userService.updateUser(req.user.userId, {
    password: newPassword,
    passwordResetTokenHash: null,
    passwordResetExpires: null,
  });
  const updatedUser = await userService.findById(req.user.userId);
  res.json({
    success: true,
    message: "Password updated.",
    user: formatUser(updatedUser),
  });
};

exports.updateProfile = async (req, res) => {
  const allowed = [
    "name",
    "phone",
    "graduationYear",
    "university",
    "company",
    "position",
    "profilePhoto",
    "skills",
    "interests",
    "department",
    "location",
    "bio",
    "cvUrl",
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  await userService.updateUser(req.user.userId, updates);
  const user = await userService.findById(req.user.userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, user: formatUser(user) });
};

exports.uploadPhoto = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded." });
  const profilePhoto = req.file.path;
  await userService.updateUser(req.user.userId, { profilePhoto });
  const user = await userService.findById(req.user.userId);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, profilePhoto, user: formatUser(user) });
};

// GET /profile/stats
// NOTE: This endpoint requires Jobs, Events, and Connections to be migrated to Firestore (Phase 3b+)
// For now, returning a stub response
exports.getProfileStats = async (req, res) => {
  res.json({
    success: true,
    message: "Profile stats endpoint will be available after Jobs, Events, and Connections migration",
    jobsApplied: 0,
    appliedJobs: [],
    connectionsCount: 0,
    connectionsList: [],
    eventsJoined: 0,
    eventsList: [],
  });
};
