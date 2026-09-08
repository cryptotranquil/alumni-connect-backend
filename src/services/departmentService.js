const db = require("../config/firestore");
const seedList = require("../config/departments");

const departmentsRef = db.collection("departments");

function slugCode(name) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

/**
 * "Static but admin-editable": on the very first read, if the departments
 * collection is empty, seed it from config/departments.js so the app works
 * out of the box with zero manual setup. Every read after that hits the
 * real Firestore collection, which admins can then edit freely.
 */
async function ensureSeeded() {
  const snap = await departmentsRef.limit(1).get();
  if (!snap.empty) return;

  const batch = db.batch();
  const now = new Date();
  seedList.forEach((name) => {
    const ref = departmentsRef.doc();
    batch.set(ref, {
      name,
      code: slugCode(name),
      description: "",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  });
  await batch.commit();
}

/** Public list — active departments only, alphabetical.
 *  NOTE: this where("isActive","==",true).orderBy("name") combination needs
 *  a Firestore composite index. Firestore won't complain ahead of time —
 *  the first real request will fail with an error containing a direct link
 *  to auto-create the index in the console (same pattern as the reset-token
 *  and applied-jobs queries elsewhere in this codebase — see jobService.js).
 *  Click that link once, wait for the index to build, then it works from
 *  then on. */
async function listActive() {
  await ensureSeeded();
  const snap = await departmentsRef
    .where("isActive", "==", true)
    .orderBy("name")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Admin list — everything, including inactive, alphabetical. */
async function listAll() {
  await ensureSeeded();
  const snap = await departmentsRef.orderBy("name").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function findById(id) {
  const snap = await departmentsRef.doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function findByName(name) {
  const snap = await departmentsRef
    .where("name", "==", name.trim())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function create({ name, code, description }) {
  const now = new Date();
  const payload = {
    name: name.trim(),
    code: (code?.trim() || slugCode(name)).toUpperCase(),
    description: description?.trim() || "",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await departmentsRef.add(payload);
  return { id: ref.id, ...payload };
}

async function update(id, data) {
  const patch = { ...data, updatedAt: new Date() };
  if (patch.name) patch.name = patch.name.trim();
  if (patch.code) patch.code = patch.code.trim().toUpperCase();
  delete patch.id;
  await departmentsRef.doc(id).update(patch);
  return findById(id);
}

async function remove(id) {
  await departmentsRef.doc(id).delete();
}

module.exports = {
  ensureSeeded,
  listActive,
  listAll,
  findById,
  findByName,
  create,
  update,
  remove,
};