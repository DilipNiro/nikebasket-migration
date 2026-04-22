// src/controllers/auth.controller.js — Authentification
// -------------------------------------------------------
// Gère : inscription, connexion, déconnexion, profil
// Équivalent PHP : auth/functionInsription.php + auth/functionLogin.php

const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool    = require('../config/db');

// -- Helpers ------------------------------------------------------

/**
 * Génère un cookie JWT httpOnly.
 * httpOnly = JavaScript ne peut pas lire le cookie (protection XSS).
 * secure    = Cookie uniquement en HTTPS (activé en production).
 */
function setTokenCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000, // 24h en ms
  });

  return token;
}

// -- Validations --------------------------------------------------

// Règles de validation pour l'inscription
// CDC Technique §3.2 : 12 caractères minimum, majuscule, chiffre, caractère spécial
const registerValidation = [
  body('nom').trim().notEmpty().withMessage('Le nom est requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Le mot de passe doit contenir au moins 12 caractères')
    .matches(/[A-Z]/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule')
    .matches(/[0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un chiffre')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Le mot de passe doit contenir au moins un caractère spécial'),
];

// Règles de validation pour la connexion
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// -- Controllers --------------------------------------------------

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur (rôle client par défaut).
 * Hash le mot de passe avec bcrypt (saltRounds: 10).
 */
async function register(req, res, next) {
  try {
    // Vérification des erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const { nom, email, password } = req.body;

    // Vérifier si l'email est déjà utilisé
    const existing = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hash du mot de passe (bcrypt, 10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion en base
    const { rows } = await pool.query(
      `INSERT INTO "user" (nom, email, password, role)
       VALUES ($1, $2, $3, 'client')
       RETURNING id, nom, email, role, created_at`,
      [nom, email, hashedPassword]
    );

    const user = rows[0];

    // Génération du token JWT et cookie
    setTokenCookie(res, { id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      message: 'Inscription réussie',
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Connexion avec email + mot de passe.
 * Retourne un cookie JWT httpOnly.
 */
async function login(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    const { email, password } = req.body;

    // Recherche de l'utilisateur
    const { rows } = await pool.query(
      'SELECT id, nom, email, password, role FROM "user" WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      // Message générique : ne pas indiquer si c'est l'email ou le mot de passe
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const user = rows[0];

    // Vérification du mot de passe avec bcrypt
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Génération du token JWT et cookie
    setTokenCookie(res, { id: user.id, email: user.email, role: user.role });

    res.json({
      message: 'Connexion réussie',
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Invalide le cookie JWT (en le remplaçant par un cookie vide expiré).
 */
function logout(req, res) {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Déconnexion réussie' });
}

/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur connecté.
 * Nécessite le middleware verifyToken.
 */
async function getMe(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, nom, email, role, created_at FROM "user" WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: rows[0] });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Génère un token de réinitialisation (valable 1h) et l'enregistre en base.
 * En production, envoyer un email avec le lien. Ici on retourne le token dans
 * la réponse JSON (mode développement sans service email).
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const { rows } = await pool.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    );

    // Toujours répondre 200 pour ne pas divulguer si l'email existe (OWASP A07)
    if (rows.length === 0) {
      return res.json({ message: 'Si cet email existe, un lien vous a été envoyé.' });
    }

    const crypto = require('crypto');
    const token      = crypto.randomBytes(32).toString('hex');
    const tokenHash  = crypto.createHash('sha256').update(token).digest('hex');
    const expires    = new Date(Date.now() + 60 * 60 * 1000); // +1h

    await pool.query(
      `UPDATE "user" SET reset_token_hash = $1, reset_token_expires_at = $2 WHERE id = $3`,
      [tokenHash, expires, rows[0].id]
    );

    // En développement : retourner le lien directement
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    res.json({ message: 'Lien de réinitialisation généré.', reset_link: resetLink });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Vérifie le token, met à jour le mot de passe, invalide le token.
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
    }

    // CDC Technique §3.2 : 12+ chars, majuscule, chiffre, spécial
    const strongPassword = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir 12 caractères minimum, une majuscule, un chiffre et un caractère spécial',
      });
    }

    const crypto    = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await pool.query(
      `SELECT id FROM "user"
       WHERE reset_token_hash = $1 AND reset_token_expires_at > NOW()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE "user"
       SET password = $1, reset_token_hash = NULL, reset_token_expires_at = NULL, password_changed = TRUE
       WHERE id = $2`,
      [hashedPassword, rows[0].id]
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/change-password
 * Modification du mot de passe depuis le compte connecté.
 * Équivalent PHP : auth/change-password.php
 * Nécessite le middleware verifyToken.
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Les champs current_password et new_password sont requis' });
    }

    // Validation du nouveau mot de passe (CDC Technique §3.2)
    const strongPassword = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$/;
    if (!strongPassword.test(new_password)) {
      return res.status(400).json({
        error: 'Le mot de passe doit contenir 12 caractères minimum, une majuscule, un chiffre et un caractère spécial',
      });
    }

    // Récupérer le hash actuel
    const { rows } = await pool.query(
      'SELECT id, password FROM "user" WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier l'ancien mot de passe
    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hash et mise à jour
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE "user" SET password = $1, password_changed = TRUE WHERE id = $2`,
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Mot de passe modifié avec succès' });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  registerValidation,
  loginValidation,
};
