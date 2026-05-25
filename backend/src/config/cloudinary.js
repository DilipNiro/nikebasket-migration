// src/config/cloudinary.js — Stockage d'images via Cloudinary
// -------------------------------------------------------------
// Remplace le stockage local (uploads/) par un service cloud scalable.
// Variables .env requises : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

const cloudinary              = require('cloudinary').v2;
const { CloudinaryStorage }   = require('multer-storage-cloudinary');
const multer                  = require('multer');

// Configuration du client Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Stockage Multer → Cloudinary
// Les images sont uploadées dans le dossier "nikebasket/products"
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'nikebasket/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }], // Resize automatique
  },
});

// Middleware Multer avec stockage Cloudinary
const uploadCloudinary = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont acceptées'));
    }
    cb(null, true);
  },
});

module.exports = { uploadCloudinary, cloudinary };
