// src/routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../middleware/auth');
const {
  register, login, logout, getMe,
  forgotPassword, resetPassword, changePassword,
  registerValidation, loginValidation,
} = require('../controllers/auth.controller');

// Rate limiting : max 10 tentatives de login par 15 minutes (OWASP A07)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 */
router.post('/register', registerValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connexion (retourne un cookie JWT httpOnly)
 *     tags: [Auth]
 */
router.post('/login', loginLimiter, loginValidation, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Déconnexion (supprime le cookie JWT)
 *     tags: [Auth]
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Profil de l'utilisateur connecté
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.get('/me', verifyToken, getMe);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Demande de réinitialisation de mot de passe
 *     tags: [Auth]
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialisation du mot de passe avec token
 *     tags: [Auth]
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Modification du mot de passe (utilisateur connecté)
 *     tags: [Auth]
 *     security: [{ cookieAuth: [] }]
 */
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
