const express = require("express");

const router = express.Router();

router.use("/", require("./authRoutes"));
router.use("/", require("./userRoutes"));
router.use("/cv", require("./cvRoutes"));
router.use("/jobs", require("./jobRoutes"));
router.use("/messages", require("./messageRoutes"));
router.use("/events", require("./eventRoutes"));
router.use("/admin", require("./adminRoutes"));
router.use("/connections", require("./connectionRoutes"));
router.use("/directory", require("./directoryRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/businesses", require("./businessRoutes"));

module.exports = router;