// src/routes/admin.routes.js
const express = require('express');
const router  = express.Router();
const { verifyToken, requireAdmin, requireAdminOrEmploye } = require('../middleware/auth');
const { getStats, getAllOrders, updateOrderStatus, getAllUsers, updateUserRole } = require('../controllers/admin.controller');

// Toutes les routes admin nécessitent d'être connecté
router.use(verifyToken);

// Tableau de bord (admin + employé)
router.get('/stats',           requireAdminOrEmploye, getStats);

// Gestion commandes (admin + employé)
router.get('/orders',          requireAdminOrEmploye, getAllOrders);
router.put('/orders/:id',      requireAdminOrEmploye, updateOrderStatus);

// Gestion utilisateurs (admin uniquement)
router.get('/users',           requireAdmin, getAllUsers);
router.put('/users/:id/role',  requireAdmin, updateUserRole);

module.exports = router;
