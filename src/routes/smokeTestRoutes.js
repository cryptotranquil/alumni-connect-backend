const express = require("express");
const router = express.Router();
const db = require("../config/firestore");

// TEMPORARY — confirms Firestore connectivity (env vars + IAM permissions).
// DELETE this file and its line in routes/index.js once confirmed working.
router.get("/firestore", async (req, res) => {
  try {
    const snap = await db.collection("analytics").doc("overview").get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        message: "Connected to Firestore, but analytics/overview doc was not found.",
      });
    }

    res.json({ success: true, data: snap.data() });
  } catch (err) {
    console.error("[smoke-test] Firestore read failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;