// src/controllers/orders.controller.js — Commandes
// --------------------------------------------------
// Équivalent PHP : commande/gestionCommandes.php + paiement/process-order.php
// Endpoints : GET /api/orders, GET /api/orders/:id, POST /api/orders

const pool = require('../config/db');

/**
 * GET /api/orders
 * Retourne les commandes de l'utilisateur connecté.
 */
async function getMyOrders(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, montant_total, commandee_le, statut
       FROM "commande"
       WHERE user_id = $1
       ORDER BY commandee_le DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/:id
 * Détail d'une commande : lignes produits + historique de statut.
 * Vérifie que la commande appartient bien à l'utilisateur connecté.
 */
async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    const { rows: orders } = await pool.query(
      `SELECT c.*, u.nom AS client_nom, u.email AS client_email
       FROM "commande" c
       JOIN "user" u ON u.id = c.user_id
       WHERE c.id = $1 AND c.user_id = $2`,
      [id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Lignes de la commande
    const { rows: items } = await pool.query(
      `SELECT cp.quantite, cp.prix_unitaire,
              p.nom, p.image_url,
              t.valeur AS taille,
              cl.nom   AS couleur
       FROM "commande_produits" cp
       JOIN "produits" p  ON p.id  = cp.produit_id
       JOIN "taille"   t  ON t.id  = cp.taille_id
       JOIN "couleur"  cl ON cl.id = cp.couleur_id
       WHERE cp.commande_id = $1`,
      [id]
    );

    // Historique de statut
    const { rows: historique } = await pool.query(
      `SELECT h.ancien_statut, h.nouveau_statut, h.modifie_le,
              u.nom AS modifie_par
       FROM "commande_historique" h
       LEFT JOIN "user" u ON u.id = h.modifie_par
       WHERE h.commande_id = $1
       ORDER BY h.modifie_le`,
      [id]
    );

    res.json({ order: orders[0], items, historique });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders
 * Crée une commande depuis le panier courant.
 * Utilise une transaction PostgreSQL pour :
 *   1. Vérifier le stock de chaque article
 *   2. Créer la commande
 *   3. Insérer les lignes commande_produits
 *   4. Décrémenter le stock
 *   5. Vider le panier
 *   6. Enregistrer le paiement (simulé)
 */
async function createOrder(req, res, next) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Récupérer le contenu du panier
    const { rows: cartItems } = await client.query(
      `SELECT pan.produit_id, pan.taille_id, pan.couleur_id, pan.quantite, pan.prix
       FROM "panier" pan
       WHERE pan.user_id = $1`,
      [req.user.id]
    );

    if (cartItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Le panier est vide' });
    }

    // 2. Vérifier le stock pour chaque article
    for (const item of cartItems) {
      const { rows: stockRows } = await client.query(
        `SELECT quantite FROM "stock"
         WHERE produit_id = $1 AND taille_id = $2 AND couleur_id = $3
         FOR UPDATE`, // Verrouillage pour éviter les race conditions
        [item.produit_id, item.taille_id, item.couleur_id]
      );

      if (stockRows.length === 0 || stockRows[0].quantite < item.quantite) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuffisant pour le produit ID ${item.produit_id}`,
        });
      }
    }

    // 3. Calculer le montant total
    const montant_total = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.prix) * item.quantite, 0
    );

    // 4. Créer la commande
    const { rows: [commande] } = await client.query(
      `INSERT INTO "commande" (user_id, montant_total, statut)
       VALUES ($1, $2, 'payee')
       RETURNING id`,
      [req.user.id, montant_total.toFixed(2)]
    );

    // 5. Insérer les lignes de commande
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO "commande_produits"
           (commande_id, produit_id, taille_id, couleur_id, quantite, prix_unitaire)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [commande.id, item.produit_id, item.taille_id, item.couleur_id, item.quantite, item.prix]
      );

      // 6. Décrémenter le stock
      await client.query(
        `UPDATE "stock"
         SET quantite = GREATEST(0, quantite - $1)
         WHERE produit_id = $2 AND taille_id = $3 AND couleur_id = $4`,
        [item.quantite, item.produit_id, item.taille_id, item.couleur_id]
      );

      // Mettre à jour la quantité globale du produit
      await client.query(
        `UPDATE "produits"
         SET quantite = (
           SELECT COALESCE(SUM(quantite), 0) FROM "stock" WHERE produit_id = $1
         ),
         statut = CASE
           WHEN (SELECT COALESCE(SUM(quantite), 0) FROM "stock" WHERE produit_id = $1) = 0
           THEN 'en_rupture' ELSE statut
         END
         WHERE id = $1`,
        [item.produit_id]
      );
    }

    // 7. Enregistrer le paiement (simulé — intégration Stripe possible)
    await client.query(
      `INSERT INTO "paiement" (user_id, commande_id, montant, statut_paiement)
       VALUES ($1, $2, $3, 'succes')`,
      [req.user.id, commande.id, montant_total.toFixed(2)]
    );

    // 8. Historique de statut initial
    await client.query(
      `INSERT INTO "commande_historique" (commande_id, ancien_statut, nouveau_statut, modifie_par)
       VALUES ($1, NULL, 'payee', $2)`,
      [commande.id, req.user.id]
    );

    // 9. Vider le panier
    await client.query('DELETE FROM "panier" WHERE user_id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Commande créée avec succès',
      commande_id: commande.id,
      montant_total: parseFloat(montant_total.toFixed(2)),
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { getMyOrders, getOrderById, createOrder };
