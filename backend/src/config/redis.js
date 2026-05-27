// src/config/redis.js — Client Redis (ioredis)
// ---------------------------------------------
// Utilisé pour mettre en cache les réponses des endpoints lents.
// Si Redis n'est pas disponible, le cache est simplement ignoré
// (mode dégradé gracieux — l'application continue de fonctionner).

'use strict';

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  // Désactive les reconnexions infinies si Redis est absent
  maxRetriesPerRequest:   3,
  enableReadyCheck:       false,
  lazyConnect:            true,
});

redis.on('connect', () => {
  console.log('✅ Redis connecté :', REDIS_URL);
});

redis.on('error', (err) => {
  // On log mais on ne plante pas l'app
  console.warn('⚠️  Redis indisponible (mode dégradé) :', err.message);
});

module.exports = redis;
