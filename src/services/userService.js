
const db = require("../config/firestore");
const bcrypt = require("bcryptjs");
const profileService = require("./profileService");

const usersRef = db.collection("users");

/** Total user count — used for the "allow first admin to register" bootstrap check. */
async function countUsers() {
  const snap = await usersRef.get();
  return snap.size;
}

async function findByEmail(email) {
  const snap = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function findById(userId) {
  const snap = await usersRef.doc(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/** Requires a composite index on (passwordResetTokenHash ==, passwordResetExpires >) —
 *  Firestore will print a direct console link to create it the first time this runs. */
async function findByResetTokenHash(hash) {
  const snap = await usersRef
    .where("passwordResetTokenHash", "==", hash)
    .where("passwordResetExpires", ">", new Date())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function createUser(data) {
  const id = usersRef.doc().id; // Firestore-generated ID; this becomes the userId referenced everywhere else
  const hashedPassword = await bcrypt.hash(data.password, 12);
  const now = new Date();
  const doc = { ...data, password: hashedPassword, createdAt: now, updatedAt: now };
  await usersRef.doc(id).set(doc);
  return { id, ...doc };
}

async function updateUser(id, patch) {
  await usersRef.doc(id).update({ ...patch, updatedAt: new Date() });
}

async function deleteUser(id) {
  await usersRef.doc(id).delete();
}

async function matchPassword(entered, hash) {
  return bcrypt.compare(entered, hash);
}

async function listUsers() {
  const snap = await usersRef.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Merges the `users` doc with its matching `profiles` doc (bio, skills,
 * company, etc.). Joined by DOCUMENT ID, not the `profiles.userId` field —
 * that field is known to drift out of sync (see data-quality notes: a typo'd
 * value on at least one seeded record), so it can't be trusted as a lookup key.
 *
 * `users` fields win on any name collision. This matters because `department`
 * is known to differ between the two collections for at least one record —
 * this does NOT reconcile that discrepancy, it just prefers the `users` value,
 * since that's what auth, the admin dashboard aggregates, and directory
 * filters already read from. If `profiles/{id}` doesn't exist yet (e.g. a
 * freshly registered user with no extended profile written), this falls back
 * to the bare user doc with no error.
 */
async function getFullUser(userId) {
  const user = await findById(userId);
  if (!user) return null;

  const profileSnap = await db.collection("profiles").doc(userId).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};

  return { ...profile, ...user, id: user.id };
}

module.exports = { countUsers, findByEmail, findById, findByResetTokenHash, createUser, updateUser, deleteUser, matchPassword, listUsers, getFullUser };
