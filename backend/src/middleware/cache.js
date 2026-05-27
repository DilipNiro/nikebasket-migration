// src/middleware/cache.js — Middleware de cache Redis
// -----------------------------------------------------
// Usage : router.get('/route', cache(300), controller)
//   - ttl : durée de vie en secondes (défaut 60s)
//
// Clé de cache = méthode + URL complète (query string incluse)
// → GET /api/products?page=1&categorie=2  →  clé distincte de page=2
//
// Invalidation : appeler clearCache(pattern) depuis un controller
// lors d'une mutation (POST/PUT/DELETE).

'use strict';

const redis = require('../config/redis');

/**
 * Middleware factory — retourne un middleware Express qui met en cache
 * la réponse JSON pendant `ttl` secondes.
 *
 * @param {number} ttl - Durée de vie du cache en secondes (défaut : 60)
 */
function cache(ttl = 60) {
  return async (req, res, next) => {
    // Désactivé en mode test pour ne pas dépendre de Redis
    if (process.env.NODE_ENV === 'test') return next();

    const key = `cache:${req.method}:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
    } catch (_) {
      // Redis indisponible → on passe directement au controller
    }

    // Intercepte res.json pour mettre en cache la réponse
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      try {
        await redis.setex(key, ttl, JSON.stringify(data));
      } catch (_) { /* Redis indisponible, on ignore */ }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Supprime toutes les clés de cache correspondant à un préfixe.
 * Exemple : clearCache('cache:GET:/api/products')
 *
 * @param {string} pattern - Pattern Redis (ex: 'cache:GET:/api/products*')
 */
async function clearCache(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Cache invalidé : ${keys.length} clé(s) [${pattern}]`);
    }
  } catch (_) { /* Redis indisponible, on ignore */ }
}

module.exports = { cache, clearCache };
