// src/routes/cart.routes.js
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart } = require('../controllers/cart.controller');

// Toutes les routes panier nécessitent d'être connecté
router.use(verifyToken);

router.get('/',           getCart);
router.post('/',          addToCart);
router.put('/:itemId',    updateCartItem);
router.delete('/:itemId', removeFromCart);
router.delete('/',        clearCart);

module.exports = router;
