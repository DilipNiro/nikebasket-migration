// src/middleware/auth.js — Vérification du token JWT
// ---------------------------------------------------
// Ce middleware vérifie que le token JWT est valide avant
// d'autoriser l'accès aux routes protégées.
//
// Le token est stocké dans un cookie httpOnly (protection XSS) :
// le navigateur l'envoie automatiquement, mais JavaScript ne peut
// pas le lire — contrairement à un token en localStorage.

const jwt = require('jsonwebtoken');

/**
 * Middleware : vérifie le token JWT dans le cookie "token".
 * Si valide, ajoute req.user = { id, email, role }.
 * Sinon, retourne 401.
 */
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware : vérifie que l'utilisateur a le rôle "admin".
 * À utiliser APRÈS verifyToken.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé — rôle admin requis' });
  }
  next();
};

/**
 * Middleware : vérifie que l'utilisateur est admin OU employé.
 * À utiliser APRÈS verifyToken.
 */
const requireAdminOrEmploye = (req, res, next) => {
  if (!['admin', 'employe'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Accès refusé — rôle admin ou employé requis' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireAdminOrEmploye };
