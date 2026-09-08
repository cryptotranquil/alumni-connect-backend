const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

/**
 * Prefers FIREBASE_SERVICE_ACCOUNT_JSON (base64-encoded service account JSON)
 * when set — this is what .env.example documents and what actually works on
 * a deployed/serverless target like Vercel, since there's no local
 * serviceAccountKey.json file to read there. Falls back to the local file
 * for local dev convenience, so nothing breaks on machines already set up
 * the old way. Whichever path is used, make sure serviceAccountKey.json is
 * in .gitignore — it's real, sensitive credentials either way.
 */
function loadServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (encoded) {
    try {
      return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    } catch (err) {
      console.error("❌ Firestore: FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be parsed as base64 JSON:", err.message);
      process.exit(1);
    }
  }

  const serviceAccountPath = path.join(__dirname, "../../serviceAccountKey.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(`❌ Firestore: neither FIREBASE_SERVICE_ACCOUNT_JSON env var nor serviceAccountKey.json at ${serviceAccountPath} was found.`);
    process.exit(1);
  }
  return require(serviceAccountPath);
}

try {
  const serviceAccount = loadServiceAccount();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  console.log("✅ Firestore initialized successfully");
} catch (err) {
  console.error("❌ Firestore initialization error:", err.message);
  process.exit(1);
}

module.exports = admin.firestore();