// src/controllers/products.controller.js — Catalogue produits
// -------------------------------------------------------------
// Équivalent PHP : produits/listeProduits.php + produits/managementProduits.php
// Endpoints : GET /api/products, GET /api/products/:id
//             POST/PUT/DELETE /api/products (admin)

const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

/**
 * GET /api/products
 * Liste les produits avec filtres optionnels :
 *   ?categorie=1  → filtre par catégorie
 *   ?search=air   → recherche dans le nom
 *   ?statut=actif → filtre par statut
 *   ?prix_max=150 → prix maximum
 *   ?page=1&limit=12 → pagination
 */
async function getProducts(req, res, next) {
  try {
    const {
      categorie, search, statut,
      prix_min, prix_max,
      taille, couleur,
      page = 1, limit = 12,
      sort = 'date_sortie', order = 'DESC',
    } = req.query;

    const conditions = [];
    const values     = [];
    let   idx        = 1;

    // Par défaut : afficher actif + en_rupture (exclure archive uniquement)
    if (statut) {
      conditions.push(`p.statut = $${idx++}`);
      values.push(statut);
    } else {
      conditions.push(`p.statut != 'archive'`);
    }
    if (categorie)  { conditions.push(`p.categorie_id = $${idx++}`);    values.push(parseInt(categorie)); }
    if (search)     { conditions.push(`p.nom ILIKE $${idx++}`);         values.push(`%${search}%`); }
    if (prix_min)   { conditions.push(`p.prix >= $${idx++}`);           values.push(parseFloat(prix_min)); }
    if (prix_max)   { conditions.push(`p.prix <= $${idx++}`);           values.push(parseFloat(prix_max)); }
    // Filtre par taille — supporte plusieurs valeurs séparées par virgule (ex: "38,39,40")
    if (taille) {
      const tailleList = taille.split(',').map(v => v.trim()).filter(Boolean);
      if (tailleList.length > 0) {
        conditions.push(`EXISTS (
          SELECT 1 FROM "stock" s
          JOIN "taille" t ON t.id = s.taille_id
          WHERE s.produit_id = p.id AND t.valeur = ANY($${idx++}) AND s.quantite > 0
        )`);
        values.push(tailleList);
      }
    }
    // Filtre par couleur
    if (couleur)    {
      conditions.push(`EXISTS (
        SELECT 1 FROM "stock" s
        JOIN "couleur" co ON co.id = s.couleur_id
        WHERE s.produit_id = p.id AND co.nom = $${idx++} AND s.quantite > 0
      )`);
      values.push(couleur);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Colonnes de tri autorisées (protection injection)
    const allowedSort  = ['date_sortie', 'prix', 'nom'];
    const allowedOrder = ['ASC', 'DESC'];
    const safeSort     = allowedSort.includes(sort)   ? sort  : 'date_sortie';
    const safeOrder    = allowedOrder.includes(order) ? order : 'DESC';

    // Pagination
    const pageNum   = Math.max(1, parseInt(page));
    const limitNum  = Math.min(50, Math.max(1, parseInt(limit)));
    const offset    = (pageNum - 1) * limitNum;

    // Requête principale
    const query = `
      SELECT
        p.id, p.nom, p.description, p.prix, p.statut,
        p.image_url, p.image_hover_url, p.date_sortie, p.quantite,
        c.nom AS categorie
      FROM "produits" p
      JOIN "categorie" c ON c.id = p.categorie_id
      ${where}
      ORDER BY p.${safeSort} ${safeOrder}
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limitNum, offset);

    // Comptage total pour la pagination
    const countQuery = `
      SELECT COUNT(*) FROM "produits" p ${where}
    `;
    const countValues = values.slice(0, -2); // sans LIMIT/OFFSET

    const [{ rows: products }, { rows: countRows }] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, countValues),
    ]);

    res.json({
      products,
      pagination: {
        total: parseInt(countRows[0].count),
        page:  pageNum,
        limit: limitNum,
        pages: Math.ceil(parseInt(countRows[0].count) / limitNum),
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 * Détail d'un produit : informations + images + stock par taille/couleur
 */
async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    // Produit principal
    const { rows: products } = await pool.query(
      `SELECT p.*, c.nom AS categorie
       FROM "produits" p
       JOIN "categorie" c ON c.id = p.categorie_id
       WHERE p.id = $1`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Images supplémentaires
    const { rows: images } = await pool.query(
      `SELECT image_url, ordre FROM "produit_images"
       WHERE produit_id = $1 ORDER BY ordre`,
      [id]
    );

    // Stock par taille × couleur
    const { rows: stock } = await pool.query(
      `SELECT s.quantite, t.valeur AS taille, t.id AS taille_id,
              cl.nom AS couleur, cl.id AS couleur_id
       FROM "stock" s
       JOIN "taille" t  ON t.id  = s.taille_id
       JOIN "couleur" cl ON cl.id = s.couleur_id
       WHERE s.produit_id = $1 AND s.quantite > 0
       ORDER BY t.valeur, cl.nom`,
      [id]
    );

    res.json({
      product: products[0],
      images,
      stock,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/categories
 * Liste toutes les catégories
 */
async function getCategories(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM "categorie" ORDER BY nom');
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/tailles
 * Liste toutes les tailles disponibles (CDC Fonctionnel §2.3)
 */
async function getTailles(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM "taille" ORDER BY valeur');
    res.json({ tailles: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/couleurs
 * Liste toutes les couleurs disponibles (CDC Fonctionnel §2.3)
 */
async function getCouleurs(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT * FROM "couleur" ORDER BY nom');
    res.json({ couleurs: rows });
  } catch (err) {
    next(err);
  }
}

// Validation pour la création/modification d'un produit
const productValidation = [
  body('nom').trim().notEmpty().isLength({ max: 50 }),
  body('categorie_id').isInt({ min: 1 }),
  body('prix').isFloat({ min: 0 }),
  body('image_url').notEmpty(),
  body('image_hover_url').notEmpty(),
];

/**
 * POST /api/products
 * Création d'un produit (admin uniquement)
 */
async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { nom, categorie_id, description, prix, image_url, image_hover_url, statut = 'actif' } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO "produits" (nom, categorie_id, description, prix, image_url, image_hover_url, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nom, categorie_id, description, prix, image_url, image_hover_url, statut]
    );

    res.status(201).json({ product: rows[0] });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/products/:id
 * Modification d'un produit (admin uniquement)
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { nom, categorie_id, description, prix, image_url, image_hover_url, statut } = req.body;

    const { rows } = await pool.query(
      `UPDATE "produits" SET
        nom             = COALESCE($1, nom),
        categorie_id    = COALESCE($2, categorie_id),
        description     = COALESCE($3, description),
        prix            = COALESCE($4, prix),
        image_url       = COALESCE($5, image_url),
        image_hover_url = COALESCE($6, image_hover_url),
        statut          = COALESCE($7, statut)
       WHERE id = $8
       RETURNING *`,
      [nom, categorie_id, description, prix, image_url, image_hover_url, statut, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    res.json({ product: rows[0] });

  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/products/:id
 * Suppression d'un produit (admin uniquement)
 * ON DELETE CASCADE gère automatiquement stock, images, panier
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    const { rowCount } = await pool.query('DELETE FROM "produits" WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    res.json({ message: 'Produit supprimé' });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id/stock
 * Stock complet (admin) : toutes les entrées incluant quantite=0
 */
async function getProductStock(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT s.id, s.quantite, s.couleur_id, s.taille_id,
              cl.nom AS couleur, t.valeur AS taille
       FROM "stock" s
       JOIN "couleur" cl ON cl.id = s.couleur_id
       JOIN "taille"  t  ON t.id  = s.taille_id
       WHERE s.produit_id = $1
       ORDER BY cl.nom, t.valeur::numeric`,
      [id]
    );
    res.json({ stock: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/products/:id/stock
 * Met à jour (upsert) la quantité pour une combinaison couleur × taille
 * Body: { couleur_id, taille_id, quantite }
 */
async function updateProductStock(req, res, next) {
  try {
    const { id } = req.params;
    const { couleur_id, taille_id, quantite } = req.body;

    if (quantite === undefined || quantite < 0) {
      return res.status(400).json({ error: 'Quantité invalide' });
    }

    // Upsert stock
    const { rows } = await pool.query(
      `INSERT INTO "stock" (produit_id, couleur_id, taille_id, quantite)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (produit_id, couleur_id, taille_id)
       DO UPDATE SET quantite = EXCLUDED.quantite
       RETURNING *`,
      [id, couleur_id, taille_id, parseInt(quantite)]
    );

    // Recalcul automatique du statut selon le stock total
    const { rows: totalRows } = await pool.query(
      `SELECT COALESCE(SUM(quantite), 0) AS total FROM "stock" WHERE produit_id = $1`,
      [id]
    );
    const total = parseInt(totalRows[0].total);
    const newStatut = total > 0 ? 'actif' : 'en_rupture';

    await pool.query(
      `UPDATE "produits" SET statut = $1
       WHERE id = $2 AND statut != 'archive'`,
      [newStatut, id]
    );

    res.json({ stock: rows[0], statut: newStatut });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  getTailles,
  getCouleurs,
  createProduct,
  updateProduct,
  deleteProduct,
  productValidation,
  getProductStock,
  updateProductStock,
};
