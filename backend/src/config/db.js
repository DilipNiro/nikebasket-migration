// src/config/db.js — Pool de connexions PostgreSQL
// ------------------------------------------------
// Utilise le module "pg" avec un pool de connexions.
// Un pool évite de créer/fermer une connexion à chaque requête,
// ce qui améliore les performances (concept important en production).

const { Pool } = require('pg');

// Le pool est configuré via les variables d'environnement.
// En développement, elles sont chargées depuis le fichier .env.
const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'ecommerce',
  max:      10,        // Nombre maximum de connexions simultanées
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Vérification de la connexion au démarrage
pool.on('error', (err) => {
  console.error('[DB] Erreur inattendue sur le pool :', err.message);
});

module.exports = pool;
