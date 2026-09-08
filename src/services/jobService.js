const db = require("../config/firestore");
const jobsRef = db.collection("jobPosts");

async function findById(id) {
  const snap = await jobsRef.doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Mirrors the old Mongo query: admin sees everything; student/alumni see
 * approved jobs OR their own posts (any status). Firestore doesn't handle
 * that kind of mixed OR cleanly without extra composite indexes, so this
 * runs two simple queries and merges/de-dupes in JS instead.
 */
async function listForUser(role, userId) {
  if (role === "admin") {
    const snap = await jobsRef.orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const approvedSnap = await jobsRef.where("status", "==", "approved").get();
  const ownSnap = await jobsRef.where("postedBy", "==", userId).get();

  const byId = new Map();
  approvedSnap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
  ownSnap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() })); // de-dupes automatically

  return [...byId.values()].sort(
    (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
  );
}

async function createJob(data) {
  const id = jobsRef.doc().id;
  const now = new Date();
  const doc = { ...data, applicants: [], applicantsCount: 0, createdAt: now, updatedAt: now };
  await jobsRef.doc(id).set(doc);
  return { id, ...doc };
}

async function updateJob(id, patch) {
  await jobsRef.doc(id).update({ ...patch, updatedAt: new Date() });
}

async function deleteJob(id) {
  await jobsRef.doc(id).delete();
}

async function addApplicant(id, userId) {
  const job = await findById(id);
  if (!job) return null;
  if ((job.applicants || []).includes(userId)) return job;

  const applicants = [...(job.applicants || []), userId];
  await jobsRef.doc(id).update({ applicants, applicantsCount: applicants.length, updatedAt: new Date() });
  return { ...job, applicants, applicantsCount: applicants.length };
}

async function countByStatus(status) {
  const snap = await jobsRef.where("status", "==", status).get();
  return snap.size;
}

// NOTE: this combination (equality + array-contains) will likely need its own
// composite index the first time it runs — same click-through as the reset-token one.
async function countAppliedByUser(userId) {
  const snap = await jobsRef.where("status", "==", "approved").where("applicants", "array-contains", userId).get();
  return snap.size;
}

async function listApproved() {
  const snap = await jobsRef.where("status", "==", "approved").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { findById, listForUser, createJob, updateJob, deleteJob, addApplicant, countByStatus, countAppliedByUser, listApproved };