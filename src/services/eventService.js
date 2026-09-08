const db = require("../config/firestore");
const eventsRef = db.collection("events");
const registrationsRef = db.collection("eventRegistrations");

async function listAll() {
  const snap = await eventsRef.orderBy("startDate", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function findById(id) {
  const snap = await eventsRef.doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function createEvent(data) {
  const id = eventsRef.doc().id;
  const now = new Date();
  const doc = { ...data, createdAt: now, updatedAt: now };
  await eventsRef.doc(id).set(doc);
  return { id, ...doc };
}

async function deleteEvent(id) {
  await eventsRef.doc(id).delete();
  const regs = await registrationsRef.where("eventId", "==", id).get();
  const batch = db.batch();
  regs.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function findRegistration(eventId, userId) {
  const snap = await registrationsRef.where("eventId", "==", eventId).where("userId", "==", userId).limit(1).get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function register(eventId, userId) {
  const id = registrationsRef.doc().id;
  const now = new Date();
  const doc = { eventId, userId, status: "registered", registeredAt: now, updatedAt: now };
  await registrationsRef.doc(id).set(doc);
  return { id, ...doc };
}

async function listRegistrationsForEvent(eventId) {
  const snap = await registrationsRef.where("eventId", "==", eventId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listUpcoming(fromDate, toDate) {
  const snap = await eventsRef.where("startDate", ">=", fromDate).where("startDate", "<", toDate).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { listAll, findById, createEvent, deleteEvent, findRegistration, register, listRegistrationsForEvent, listUpcoming };