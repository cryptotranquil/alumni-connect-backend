const db = require("../config/firestore");
const profilesRef = db.collection("profiles");

async function findById(userId) {
  const snap = await profilesRef.doc(userId).get();
  return snap.exists ? snap.data() : null;
}

module.exports = { findById };