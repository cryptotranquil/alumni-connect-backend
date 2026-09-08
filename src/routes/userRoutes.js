const express = require("express");
const userController = require("../controllers/userController");
const {
  authenticate,
  authorize,
  requireApprovedAlumni,
} = require("../middleware/authMiddleware");
const { uploadPhoto } = require("../middleware/upload");
const {
  updateProfileValidation,
  changePasswordValidation,
  validate,
} = require("../middleware/validation");

const router = express.Router();

router.get(
  "/users/peer/:id",
  authenticate,
  requireApprovedAlumni,
  userController.getPublicPeer,
);
router.get(
  "/users",
  authenticate,
  authorize("admin"),
  userController.listUsers,
);

// /profile/stats must be BEFORE /profile to avoid prefix match
router.get(
  "/profile/stats",
  authenticate,
  requireApprovedAlumni,
  userController.getProfileStats,
);
router.get(
  "/profile",
  authenticate,
  requireApprovedAlumni,
  userController.getProfile,
);
router.put(
  "/profile/update",
  authenticate,
  requireApprovedAlumni,
  updateProfileValidation,
  validate,
  userController.updateProfile,
);
router.put(
  "/profile/password",
  authenticate,
  requireApprovedAlumni,
  changePasswordValidation,
  validate,
  userController.changePassword,
);
router.post(
  "/profile/photo",
  authenticate,
  requireApprovedAlumni,
  uploadPhoto.single("photo"),
  userController.uploadPhoto,
);

module.exports = router;
