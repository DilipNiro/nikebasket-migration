// src/routes/payments.routes.js — Routes paiements Stripe
const express = require('express');
const router  = express.Router();
const { verifyToken }         = require('../middleware/auth');
const { createPaymentIntent } = require('../controllers/payments.controller');

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Crée un PaymentIntent Stripe depuis le panier courant
 *     tags: [Paiements]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: clientSecret Stripe à utiliser dans Stripe Elements
 */
router.post('/create-intent', verifyToken, createPaymentIntent);

module.exports = router;
