// =============================================================
// scripts/migrate.js — Migration automatisée MySQL → PostgreSQL
// =============================================================
// Usage : node scripts/migrate.js
//
// Ce script automatise le transfert de données depuis la base
// MySQL "basketnike" vers PostgreSQL "ecommerce".
// Il gère :
//   1. La conversion des types (TINYINT → BOOLEAN, ENUM → VARCHAR)
//   2. Le respect de l'ordre d'insertion (contraintes FK)
//   3. L'insertion par batch de 100 lignes
//   4. Un logging coloré de chaque étape
//   5. La gestion d'erreurs sans crash silencieux
// =============================================================

'use strict';

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const { Client } = require('pg');
const chalk = require('chalk');

// -- Configuration ------------------------------------------------
const BATCH_SIZE = 100;

// Ordre d'insertion respectant les dépendances de clés étrangères
const MIGRATION_ORDER = [
  'categorie',
  'couleur',
  'taille',
  'user',
  'produits',
  'produit_images',
  'stock',
  'panier',
  'commande',
  'commande_produits',
  'commande_historique',
  'paiement',
];

// Connexion MySQL (source)
const mysqlConfig = {
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT || '3306'),
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'basketnike',
};

// Connexion PostgreSQL (cible)
const pgConfig = {
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'ecommerce',
};

// -- Helpers ------------------------------------------------------

/**
 * Transforme une ligne MySQL pour la rendre compatible PostgreSQL.
 * Conversion TINYINT(1) → BOOLEAN, gestion des NULL, etc.
 */
function convertRow(tableName, row) {
  const converted = { ...row };

  // TINYINT(1) → BOOLEAN pour la table user
  if (tableName === 'user' && 'password_changed' in converted) {
    converted.password_changed = Boolean(converted.password_changed);
  }

  // Conversion des dates MySQL (qui peuvent être '0000-00-00') → NULL
  for (const [key, value] of Object.entries(converted)) {
    if (value instanceof Date) {
      // Vérifier date invalide MySQL
      if (isNaN(value.getTime())) {
        converted[key] = null;
      }
    }
    if (typeof value === 'string' && value === '0000-00-00 00:00:00') {
      converted[key] = null;
    }
  }

  return converted;
}

/**
 * Insère un batch de lignes dans PostgreSQL.
 * Construit dynamiquement la requête INSERT.
 */
async function insertBatch(tableName, rows, pgClient) {
  if (rows.length === 0) return;

  // Utiliser les clés de la première ligne comme colonnes
  const columns = Object.keys(rows[0]);
  const quotedColumns = columns.map(c => `"${c}"`).join(', ');

  // Construire les placeholders : ($1,$2,...), ($n+1,$n+2,...), ...
  const valuePlaceholders = rows.map((_, rowIdx) => {
    const placeholders = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`);
    return `(${placeholders.join(', ')})`;
  }).join(', ');

  // Aplatir toutes les valeurs
  const values = rows.flatMap(row => columns.map(col => {
    const val = convertRow(tableName, row)[col];
    return val === undefined ? null : val;
  }));

  const query = `
    INSERT INTO "${tableName}" (${quotedColumns})
    VALUES ${valuePlaceholders}
    ON CONFLICT DO NOTHING
  `;

  await pgClient.query(query, values);
}

/**
 * Migre une table complète de MySQL vers PostgreSQL.
 */
async function migrateTable(tableName, mysqlConn, pgClient) {
  console.log(chalk.blue(`\n→ Migration de la table : ${tableName}`));

  // Lecture complète depuis MySQL
  const [rows] = await mysqlConn.execute(`SELECT * FROM \`${tableName}\``);

  if (rows.length === 0) {
    console.log(chalk.yellow(`  ⚠ Table ${tableName} : vide`));
    return;
  }

  // Insertion par batch
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await insertBatch(tableName, batch, pgClient);
    inserted += batch.length;
  }

  console.log(chalk.green(`  ✓ Table ${tableName} : ${rows.length} lignes migrées`));
}

/**
 * Remet les séquences PostgreSQL (SERIAL) à jour après l'import.
 * Nécessaire pour que les prochains INSERT auto-incrémentés fonctionnent.
 */
async function resetSequences(pgClient) {
  console.log(chalk.blue('\n→ Mise à jour des séquences PostgreSQL...'));

  const tables = [
    'user', 'categorie', 'couleur', 'taille', 'produits',
    'produit_images', 'stock', 'panier', 'commande',
    'commande_produits', 'commande_historique', 'paiement',
  ];

  for (const table of tables) {
    try {
      await pgClient.query(`
        SELECT setval(
          pg_get_serial_sequence('"${table}"', 'id'),
          COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
          false
        )
      `);
    } catch (err) {
      // Certaines tables peuvent ne pas avoir de séquence SERIAL
      console.log(chalk.yellow(`  ⚠ Séquence non trouvée pour ${table} (ignoré)`));
    }
  }

  console.log(chalk.green('  ✓ Séquences mises à jour'));
}

// -- Point d'entrée -----------------------------------------------

async function main() {
  console.log(chalk.bold.cyan('\n=== Migration MySQL → PostgreSQL — NikeBasket ===\n'));

  let mysqlConn = null;
  let pgClient = null;

  try {
    // 1. Connexion simultanée aux deux bases
    console.log(chalk.blue('Connexion à MySQL...'));
    mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log(chalk.green('✓ MySQL connecté'));

    console.log(chalk.blue('Connexion à PostgreSQL...'));
    pgClient = new Client(pgConfig);
    await pgClient.connect();
    console.log(chalk.green('✓ PostgreSQL connecté'));

    // 2. Désactiver les contraintes FK le temps de la migration
    await pgClient.query('SET session_replication_role = replica');

    // 3. Migrer chaque table dans l'ordre des dépendances FK
    for (const tableName of MIGRATION_ORDER) {
      await migrateTable(tableName, mysqlConn, pgClient);
    }

    // 4. Réactiver les contraintes FK
    await pgClient.query('SET session_replication_role = DEFAULT');

    // 5. Remettre les séquences à jour
    await resetSequences(pgClient);

    console.log(chalk.bold.green('\n=== Migration terminée avec succès ! ===\n'));

  } catch (err) {
    console.error(chalk.red('\n✗ Erreur lors de la migration :'), err.message);
    console.error(err.stack);
    process.exit(1);

  } finally {
    // Fermeture propre des connexions
    if (mysqlConn) await mysqlConn.end();
    if (pgClient) await pgClient.end();
  }
}

main();
