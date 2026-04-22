// src/routes/orders.routes.js
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getMyOrders, getOrderById, createOrder } = require('../controllers/orders.controller');

router.use(verifyToken);

router.get('/',    getMyOrders);
router.get('/:id', getOrderById);
router.post('/',   createOrder);

module.exports = router;
