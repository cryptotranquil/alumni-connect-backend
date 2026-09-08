const db = require("../config/firestore");

const requestsRef = db.collection("mentorshipRequests");
const matchesRef = db.collection("mentorshipMatches");

const toPlain = (doc) => ({ id: doc.id, ...doc.data() });

// ========== REQUESTS ==========
// status: "pending" | "approved" | "rejected"
// NOTE: seeded request01 has status "Pending" (capitalized) — Firestore
// queries are case-sensitive, so it won't match the lowercase queries below
// until fixed in the console. All new writes here use lowercase.

async function createRequest(data) {
  const id = requestsRef.doc().id;
  const now = new Date();
  const doc = {
    skillsRequested: [],
    interests: [],
    careerGoals: "",
    preferredIndustry: "",
    message: "",
    matchScore: null,
    matchDetails: null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  await requestsRef.doc(id).set(doc);
  return { id, ...doc };
}

async function findRequestById(id) {
  const snap = await requestsRef.doc(id).get();
  return snap.exists ? toPlain(snap) : null;
}

async function updateRequest(id, patch) {
  await requestsRef.doc(id).update({ ...patch, updatedAt: new Date() });
  return findRequestById(id);
}

async function deleteRequest(id) {
  await requestsRef.doc(id).delete();
}
async function listRequestsByStudent(studentId) {
  const snap = await requestsRef.where("studentId", "==", studentId).get();
  return snap.docs.map(toPlain);
}


async function listPendingRequestsForMentor(mentorId) {
  const snap = await requestsRef
    .where("mentorId", "==", mentorId)
    .where("status", "==", "pending")
    .get();
  return snap.docs.map(toPlain);
}

/** Any existing request between this exact pair, regardless of status — used by the direct 1:1 requestConnection flow to detect dupes/re-requests. */
async function findRequestBetween(studentId, mentorId) {
  const snap = await requestsRef
    .where("studentId", "==", studentId)
    .where("mentorId", "==", mentorId)
    .limit(1)
    .get();
  return snap.empty ? null : toPlain(snap.docs[0]);
}

/**
 * Auto-declines a student's OTHER pending requests once one gets approved.
 * DELIBERATE BEHAVIOR CHANGE from the Mongo original: the single-Connection
 * model let multiple alumni independently accept the same student, with
 * nothing stopping a student from ending up in several simultaneously-
 * "accepted" connections at once. Flagging this as new, not a silent port.
 */
async function rejectOtherPendingRequests(studentId, exceptRequestId) {
  const snap = await requestsRef
    .where("studentId", "==", studentId)
    .where("status", "==", "pending")
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => {
    if (doc.id !== exceptRequestId) {
      batch.update(doc.ref, { status: "rejected", updatedAt: new Date() });
    }
  });
  await batch.commit();
}

// ========== MATCHES ==========
// status: "active" | "completed"

async function createMatch(data) {
  const id = matchesRef.doc().id;
  const now = new Date();
  const doc = {
    conversationId: null,
    completedAt: null,
    feedback: null,
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  await matchesRef.doc(id).set(doc);
  return { id, ...doc };
}

async function findMatchById(id) {
  const snap = await matchesRef.doc(id).get();
  return snap.exists ? toPlain(snap) : null;
}

async function updateMatch(id, patch) {
  await matchesRef.doc(id).update({ ...patch, updatedAt: new Date() });
  return findMatchById(id);
}

async function listMatchesForUser(userId, role, status) {
  const field = role === "student" ? "studentId" : "mentorId";
  let q = matchesRef.where(field, "==", userId);
  if (status) q = q.where("status", "==", status);
  const snap = await q.get();
  return snap.docs.map(toPlain);
}

/** No role filter — used for admin's view, which sees every active match platform-wide. */
async function listAllMatches(status) {
  let q = matchesRef;
  if (status) q = q.where("status", "==", status);
  const snap = await q.get();
  return snap.docs.map(toPlain);
}

/** Used by canExchangeMessages — does an active match exist between this exact pair? */
async function findMatchBetween(studentId, mentorId, status = "active") {
  const snap = await matchesRef
    .where("studentId", "==", studentId)
    .where("mentorId", "==", mentorId)
    .where("status", "==", status)
    .limit(1)
    .get();
  return snap.empty ? null : toPlain(snap.docs[0]);
}

/** Guards createMentorshipRequest: blocks a new broadcast if the student has an unanswered request OR an already-active mentorship. */
async function studentHasActiveEngagement(studentId) {
  const [pendingSnap, activeMatches] = await Promise.all([
    requestsRef.where("studentId", "==", studentId).where("status", "==", "pending").limit(1).get(),
    listMatchesForUser(studentId, "student", "active"),
  ]);
  return !pendingSnap.empty || activeMatches.length > 0;
}

module.exports = {
  createRequest, findRequestById, updateRequest, deleteRequest,
  listRequestsByStudent, listPendingRequestsForMentor, findRequestBetween,
  rejectOtherPendingRequests,
  createMatch, findMatchById, updateMatch, listMatchesForUser, listAllMatches, findMatchBetween,
  studentHasActiveEngagement,
};