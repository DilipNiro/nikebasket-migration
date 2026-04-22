// src/controllers/cart.controller.js — Panier
// --------------------------------------------
// Équivalent PHP : panier/ajouterProduit.php, supprimerProduit.php, viderPanier.php
// Endpoints : GET/POST /api/cart, PUT/DELETE /api/cart/:itemId, DELETE /api/cart

const pool = require('../config/db');

/**
 * GET /api/cart
 * Retourne le contenu du panier de l'utilisateur connecté,
 * avec le total calculé.
 */
async function getCart(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT
        pan.id,
        pan.quantite,
        pan.prix,
        pan.quantite * pan.prix AS sous_total,
        p.nom, p.image_url, p.statut,
        t.valeur AS taille, t.id AS taille_id,
        cl.nom   AS couleur, cl.id AS couleur_id
       FROM "panier" pan
       JOIN "produits" p  ON p.id  = pan.produit_id
       JOIN "taille"   t  ON t.id  = pan.taille_id
       JOIN "couleur"  cl ON cl.id = pan.couleur_id
       WHERE pan.user_id = $1
       ORDER BY pan.ajout_date`,
      [req.user.id]
    );

    const total = rows.reduce((sum, item) => sum + parseFloat(item.sous_total), 0);

    res.json({
      items: rows,
      total: parseFloat(total.toFixed(2)),
      count: rows.reduce((sum, item) => sum + item.quantite, 0),
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/cart
 * Ajoute un article au panier.
 * Si le même produit+taille+couleur existe déjà → incrémente la quantité.
 * Vérifie le stock disponible avant d'ajouter.
 */
async function addToCart(req, res, next) {
  try {
    const { produit_id, taille_id, couleur_id, quantite = 1 } = req.body;

    if (!produit_id || !taille_id || !couleur_id) {
      return res.status(400).json({ error: 'produit_id, taille_id et couleur_id sont requis' });
    }

    // Vérifier le stock disponible
    const { rows: stockRows } = await pool.query(
      `SELECT s.quantite, p.prix
       FROM "stock" s
       JOIN "produits" p ON p.id = s.produit_id
       WHERE s.produit_id = $1 AND s.taille_id = $2 AND s.couleur_id = $3`,
      [produit_id, taille_id, couleur_id]
    );

    if (stockRows.length === 0 || stockRows[0].quantite < quantite) {
      return res.status(400).json({ error: 'Stock insuffisant pour cette combinaison taille/couleur' });
    }

    const prix = stockRows[0].prix;

    // Upsert : si l'article est déjà dans le panier, on incrémente
    const { rows } = await pool.query(
      `INSERT INTO "panier" (user_id, produit_id, taille_id, couleur_id, quantite, prix)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, produit_id, couleur_id, taille_id)
       DO UPDATE SET quantite = "panier".quantite + $5
       RETURNING *`,
      [req.user.id, produit_id, taille_id, couleur_id, quantite, prix]
    );

    res.status(201).json({ item: rows[0], message: 'Article ajouté au panier' });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/cart/:itemId
 * Modifie la quantité d'un article du panier.
 */
async function updateCartItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantite } = req.body;

    if (!quantite || quantite < 1) {
      return res.status(400).json({ error: 'Quantité invalide (minimum 1)' });
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE "panier" SET quantite = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [quantite, itemId, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Article non trouvé dans le panier' });
    }

    res.json({ item: rows[0] });

  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cart/:itemId
 * Supprime un article du panier.
 */
async function removeFromCart(req, res, next) {
  try {
    const { itemId } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM "panier" WHERE id = $1 AND user_id = $2`,
      [itemId, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Article non trouvé dans le panier' });
    }

    res.json({ message: 'Article supprimé du panier' });

  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/cart
 * Vide complètement le panier de l'utilisateur.
 */
async function clearCart(req, res, next) {
  try {
    await pool.query('DELETE FROM "panier" WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Panier vidé' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };
