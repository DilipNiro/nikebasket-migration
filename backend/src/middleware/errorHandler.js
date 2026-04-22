// src/middleware/errorHandler.js — Gestionnaire d'erreurs centralisé
// -------------------------------------------------------------------
// Tous les try/catch du projet font : next(err)
// Ce middleware intercepte et formate toutes les erreurs.
//
// Avantage par rapport au PHP : un seul endroit pour gérer les erreurs,
// pas besoin de répéter la logique dans chaque fichier.

/**
 * Middleware d'erreur Express (4 paramètres obligatoires).
 * À monter EN DERNIER dans app.js avec app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => {
  // Log interne : toujours afficher le détail en console serveur
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Erreurs de validation express-validator
  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.errors,
    });
  }

  // Erreurs PostgreSQL connues
  if (err.code === '23505') {
    // Unique violation
    return res.status(409).json({ error: 'Cette ressource existe déjà' });
  }
  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({ error: 'Référence invalide' });
  }
  if (err.code === '23514') {
    // Check violation
    return res.status(400).json({ error: 'Valeur hors contrainte' });
  }

  // Erreur JWT explicite
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token invalide' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expiré' });
  }

  // Erreur générique : ne jamais exposer le détail en production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Une erreur interne est survenue.'
    : err.message;

  res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
