// src/controllers/admin.controller.js — Administration
// -------------------------------------------------------
// Endpoints réservés aux rôles admin et employé.
// Équivalent PHP : commande/gestionCommandes.php + produits/managementProduits.php

const pool = require('../config/db');

// Statuts de commande autorisés (liste blanche — protection A01 OWASP)
const STATUTS_AUTORISES = [
  'en_attente', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee',
];

/**
 * GET /api/admin/stats
 * Tableau de bord : CA du mois, commandes du jour, ruptures de stock, nb utilisateurs.
 */
async function getStats(req, res, next) {
  try {
    const [caResult, commandesJour, ruptures, users, caHebdo] = await Promise.all([
      // CA du mois en cours
      pool.query(`
        SELECT COALESCE(SUM(montant_total), 0) AS ca_mois
        FROM "commande"
        WHERE statut NOT IN ('annulee', 'en_attente')
          AND DATE_TRUNC('month', commandee_le) = DATE_TRUNC('month', NOW())
      `),
      // Commandes du jour
      pool.query(`
        SELECT COUNT(*) AS commandes_jour
        FROM "commande"
        WHERE commandee_le::date = CURRENT_DATE
      `),
      // Produits en rupture
      pool.query(`
        SELECT COUNT(*) AS ruptures
        FROM "produits"
        WHERE statut = 'en_rupture'
      `),
      // Total utilisateurs
      pool.query(`SELECT COUNT(*) AS total_users FROM "user"`),
      // CA des 7 derniers jours (pour Recharts — CDC Technique §4.1)
      pool.query(`
        SELECT
          TO_CHAR(commandee_le::date, 'DD/MM') AS jour,
          COALESCE(SUM(montant_total), 0)       AS ca
        FROM "commande"
        WHERE statut NOT IN ('annulee', 'en_attente')
          AND commandee_le >= NOW() - INTERVAL '7 days'
        GROUP BY commandee_le::date
        ORDER BY commandee_le::date
      `),
    ]);

    res.json({
      ca_mois:        parseFloat(caResult.rows[0].ca_mois),
      commandes_jour: parseInt(commandesJour.rows[0].commandes_jour),
      ruptures:       parseInt(ruptures.rows[0].ruptures),
      total_users:    parseInt(users.rows[0].total_users),
      ca_hebdo:       caHebdo.rows.map(r => ({ jour: r.jour, ca: parseFloat(r.ca) })),
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/orders
 * Toutes les commandes avec filtres (statut, date_debut, date_fin).
 */
async function getAllOrders(req, res, next) {
  try {
    const { statut, date_debut, date_fin, page = 1, limit = 20 } = req.query;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (statut)      { conditions.push(`c.statut = $${idx++}`);                     values.push(statut); }
    if (date_debut)  { conditions.push(`c.commandee_le >= $${idx++}`);               values.push(date_debut); }
    if (date_fin)    { conditions.push(`c.commandee_le <= $${idx++}::date + 1`);     values.push(date_fin); }

    const where    = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * limitNum;

    const { rows } = await pool.query(
      `SELECT c.id, c.montant_total, c.commandee_le, c.statut,
              u.nom AS client_nom, u.email AS client_email
       FROM "commande" c
       JOIN "user" u ON u.id = c.user_id
       ${where}
       ORDER BY c.commandee_le DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limitNum, offset]
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM "commande" c ${where}`,
      values
    );

    res.json({
      orders: rows,
      pagination: {
        total: parseInt(countRows[0].count),
        page:  pageNum,
        limit: limitNum,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/orders/:id
 * Modification du statut d'une commande avec journalisation dans commande_historique.
 */
async function updateOrderStatus(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { statut } = req.body;

    // Validation du statut (liste blanche — OWASP A01)
    if (!STATUTS_AUTORISES.includes(statut)) {
      return res.status(400).json({
        error: `Statut invalide. Valeurs acceptées : ${STATUTS_AUTORISES.join(', ')}`,
      });
    }

    await client.query('BEGIN');

    // Récupérer le statut actuel
    const { rows: current } = await client.query(
      'SELECT statut FROM "commande" WHERE id = $1',
      [id]
    );

    if (current.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const ancienStatut = current[0].statut;

    // Mettre à jour le statut
    await client.query(
      'UPDATE "commande" SET statut = $1 WHERE id = $2',
      [statut, id]
    );

    // Journaliser le changement
    await client.query(
      `INSERT INTO "commande_historique"
         (commande_id, ancien_statut, nouveau_statut, modifie_par)
       VALUES ($1, $2, $3, $4)`,
      [id, ancienStatut, statut, req.user.id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Statut mis à jour', ancien_statut: ancienStatut, nouveau_statut: statut });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/admin/users
 * Liste de tous les utilisateurs (admin uniquement).
 */
async function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const { rows } = await pool.query(
      `SELECT id, nom, email, role, created_at
       FROM "user"
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limitNum, offset]
    );

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM "user"');

    res.json({
      users: rows,
      pagination: {
        total: parseInt(countRows[0].count),
        page:  pageNum,
        limit: limitNum,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/users/:id/role
 * Modification du rôle d'un utilisateur (admin uniquement).
 */
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const rolesAutorises = ['client', 'employe', 'admin'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({ error: `Rôle invalide. Valeurs : ${rolesAutorises.join(', ')}` });
    }

    // Empêcher de se rétrograder soi-même
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    const { rows, rowCount } = await pool.query(
      `UPDATE "user" SET role = $1 WHERE id = $2 RETURNING id, nom, email, role`,
      [role, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: rows[0] });

  } catch (err) {
    next(err);
  }
}

module.exports = { getStats, getAllOrders, updateOrderStatus, getAllUsers, updateUserRole };
