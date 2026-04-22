// src/routes/products.routes.js
const express = require('express');
const router  = express.Router();
const path    = require('path');
const multer  = require('multer');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  getProducts, getProductById, getCategories, getTailles, getCouleurs,
  createProduct, updateProduct, deleteProduct,
  productValidation,
  getProductStock, updateProductStock,
} = require('../controllers/products.controller');

// -- Upload image --------------------------------------------------
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Fichier non image'));
    cb(null, true);
  },
});

router.post('/upload', verifyToken, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

router.get('/categories', getCategories);
router.get('/tailles',    getTailles);
router.get('/couleurs',   getCouleurs);
router.get('/',           getProducts);
router.get('/:id',        getProductById);

// Routes admin uniquement
router.post('/',         verifyToken, requireAdmin, productValidation, createProduct);
router.put('/:id',       verifyToken, requireAdmin, updateProduct);
router.delete('/:id',    verifyToken, requireAdmin, deleteProduct);
router.get('/:id/stock', verifyToken, requireAdmin, getProductStock);
router.put('/:id/stock', verifyToken, requireAdmin, updateProductStock);

module.exports = router;
