// src/routes/products.routes.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { cache, clearCache }         = require('../middleware/cache');
const {
  getProducts, getProductById, getCategories, getTailles, getCouleurs,
  createProduct, updateProduct, deleteProduct,
  productValidation,
  getProductStock, updateProductStock,
} = require('../controllers/products.controller');

// -- Upload image --------------------------------------------------
// Si CLOUDINARY_CLOUD_NAME est configuré → stockage Cloudinary (production)
// Sinon → stockage local dans /uploads (développement)
let upload;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  const { uploadCloudinary } = require('../config/cloudinary');
  upload = uploadCloudinary;
} else {
  const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename:    (req, file, cb) => {
      const ext  = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
      cb(null, name);
    },
  });
  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Fichier non image'));
      cb(null, true);
    },
  });
}

router.post('/upload', verifyToken, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  // Cloudinary retourne req.file.path (URL CDN), local retourne req.file.filename
  const url = req.file.path || `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Cache 5 min sur les listes statiques, 2 min sur le catalogue (filtres variés)
router.get('/categories', cache(300), getCategories);
router.get('/tailles',    cache(300), getTailles);
router.get('/couleurs',   cache(300), getCouleurs);
router.get('/',           cache(120), getProducts);
router.get('/:id',        cache(120), getProductById);

// Routes admin — invalide le cache après mutation
router.post('/',         verifyToken, requireAdmin, productValidation, async (req, res, next) => {
  await clearCache('cache:GET:/api/products*');
  next();
}, createProduct);
router.put('/:id',       verifyToken, requireAdmin, async (req, res, next) => {
  await clearCache('cache:GET:/api/products*');
  next();
}, updateProduct);
router.delete('/:id',    verifyToken, requireAdmin, async (req, res, next) => {
  await clearCache('cache:GET:/api/products*');
  next();
}, deleteProduct);
router.get('/:id/stock', verifyToken, requireAdmin, getProductStock);
router.put('/:id/stock', verifyToken, requireAdmin, updateProductStock);

module.exports = router;
