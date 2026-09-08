const express = require("express");
const adminController = require("../controllers/adminController");
const departmentController = require("../controllers/departmentController");
const jobController = require("../controllers/jobController");
const eventController = require("../controllers/eventController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorize("admin"));

// ========== USER MANAGEMENT ==========
router.delete("/users/:id", adminController.deleteUser);
router.post("/invite-admin", adminController.inviteAdmin);
router.put("/approve-alumni/:id", adminController.approveAlumni);
router.get("/users", adminController.getAllUsers); // NEW
router.get("/users/pending-alumni", adminController.getPendingAlumni); // NEW

// ========== DASHBOARD STATISTICS (for Recharts) ==========
router.get("/dashboard/stats", adminController.getDashboardStats); // NEW
router.get(
  "/dashboard/mentorship-analytics",
  adminController.getMentorshipAnalytics,
); // NEW

// ========== DEPARTMENTS ==========
router.get("/departments/all", departmentController.listAll);
router.get("/departments/stats", departmentController.stats);
router.post("/departments", departmentController.create);
router.put("/departments/:id", departmentController.update);
router.delete("/departments/:id", departmentController.remove);

// ========== JOB MODERATION ==========
router.put("/approve-job/:id", jobController.approveJob);

// ========== EVENT MANAGEMENT ==========
router.delete("/events/:id", eventController.deleteEvent);

module.exports = router;