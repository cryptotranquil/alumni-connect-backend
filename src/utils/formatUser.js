const formatUser = (user) => {
  if (!user) return null;
  const u = { ...user };
  u._id = u.id; // keep frontend contract identical — was Mongo's _id, now Firestore's doc id
  delete u.id;
  delete u.password;
  delete u.passwordResetTokenHash;
  if (u.createdAt?.toDate) u.createdAt = u.createdAt.toDate().toISOString();
  if (u.updatedAt?.toDate) u.updatedAt = u.updatedAt.toDate().toISOString();
  return u;
};

module.exports = formatUser;