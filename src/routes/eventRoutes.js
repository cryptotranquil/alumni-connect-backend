const express = require("express");
const eventController = require("../controllers/eventController");
const {
  authenticate,
  authorize,
  requireApprovedAlumni,
} = require("../middleware/authMiddleware");
const { createEventValidation, validate } = require("../middleware/validation");

const router = express.Router();

router.use(authenticate, requireApprovedAlumni);

router.get("/", eventController.listEvents);
router.post(
  "/",
  authorize("admin"),
  createEventValidation,
  validate,
  eventController.createEvent,
);
router.post("/:id/join", eventController.joinEvent);
router.delete("/:id", authorize("admin"), eventController.deleteEvent);

// Participants list (admin only)
router.get(
  "/:id/participants",
  authorize("admin"),
  eventController.getParticipants,
);

// NEW: Send event reminders (admin only, can be called by cron)
router.post(
  "/reminders",
  authorize("admin"),
  eventController.sendEventReminders,
);

module.exports = router;
