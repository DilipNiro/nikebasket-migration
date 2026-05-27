// src/config/metrics.js — Métriques Prometheus (prom-client)
// -----------------------------------------------------------
// Expose les métriques sur GET /metrics (scrapé par Prometheus)
//
// Métriques collectées :
//   - http_requests_total        : nb de requêtes par method/route/status
//   - http_request_duration_ms   : durée des requêtes (histogram)
//   - Métriques système Node.js  : collectDefaultMetrics()

'use strict';

const client = require('prom-client');

// Métriques par défaut : CPU, mémoire, event loop, GC…
// Désactivé en mode test (évite les handles ouverts qui bloquent Jest)
if (process.env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({ prefix: 'nikebasket_' });
}

// Compteur de requêtes HTTP
const httpRequestsTotal = new client.Counter({
  name:    'nikebasket_http_requests_total',
  help:    'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status_code'],
});

// Histogramme de durée des requêtes
const httpRequestDurationMs = new client.Histogram({
  name:    'nikebasket_http_request_duration_ms',
  help:    'Durée des requêtes HTTP en millisecondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

/**
 * Middleware Express — instrumente chaque requête HTTP.
 * À monter AU DÉBUT de app.js, avant les routes.
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Normalise la route (évite la cardinalité infinie sur les IDs)
    const route = req.route ? req.baseUrl + req.route.path : req.path;

    httpRequestsTotal.inc({
      method:      req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestDurationMs.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration,
    );
  });

  next();
}

/**
 * Handler Express pour GET /metrics
 * Retourne les métriques au format texte Prometheus.
 */
async function metricsHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}

module.exports = { metricsMiddleware, metricsHandler };
