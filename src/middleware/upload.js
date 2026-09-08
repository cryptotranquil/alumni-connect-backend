const multer = require("multer");
const CloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── CV storage ────────────────────────────────────────────────────────────────
// Use resource_type "image" with format "pdf" — Cloudinary free plan blocks
// "raw" resource type but serves "image/pdf" freely without restrictions.
const cvStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: `${process.env.CLOUDINARY_FOLDER}/cvs`,
    resource_type: "image", // NOT "raw" — free plan restricts raw delivery
    format: "pdf",
    public_id: `cv_${req.user.userId}_${Date.now()}`,
  }),
});

const uploadCV = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// ── Profile photo storage ─────────────────────────────────────────────────────
const photoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: `${process.env.CLOUDINARY_FOLDER}/photos`,
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
    ],
    public_id: `photo_${req.user.userId}_${Date.now()}`,
  }),
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

module.exports = { uploadCV, uploadPhoto };
