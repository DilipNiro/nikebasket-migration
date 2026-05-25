// src/controllers/payments.controller.js — Paiements Stripe
// -----------------------------------------------------------
// Gère la création de PaymentIntents Stripe pour le checkout.
// Flow :
//   1. Frontend → POST /api/payments/create-intent (montant calculé depuis le panier)
//   2. Backend  → crée un PaymentIntent Stripe, retourne { clientSecret }
//   3. Frontend → confirme le paiement avec Stripe Elements
//   4. Frontend → POST /api/orders avec { payment_intent_id }
//   5. Backend  → vérifie le PI Stripe puis crée la commande

const pool   = require('../config/db');

/**
 * POST /api/payments/create-intent
 * Calcule le montant depuis le panier de l'utilisateur et crée un PaymentIntent Stripe.
 * Retourne le clientSecret nécessaire à Stripe Elements.
 */
async function createPaymentIntent(req, res, next) {
  try {
    // Récupérer le panier pour calculer le montant total côté serveur
    // (ne jamais faire confiance au montant envoyé par le client)
    const { rows: cartItems } = await pool.query(
      `SELECT quantite, prix FROM "panier" WHERE user_id = $1`,
      [req.user.id]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Le panier est vide' });
    }

    // Montant en centimes (Stripe travaille toujours en centimes)
    const montantTotal = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.prix) * item.quantite,
      0
    );
    const montantCentimes = Math.round(montantTotal * 100);

    // Création du PaymentIntent sur l'API Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   montantCentimes,
      currency: 'eur',
      metadata: { user_id: req.user.id.toString() },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (err) {
    next(err);
  }
}

module.exports = { createPaymentIntent };
