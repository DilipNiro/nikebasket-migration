// src/app.js — Point d'entrée du serveur Express
// ------------------------------------------------
// Architecture MVC :
//   Routes → Controllers → Pool PostgreSQL
//
// Middlewares globaux montés dans l'ordre :
//   1. cors        — autorise les requêtes cross-origin (frontend React)
//   2. cookie-parser — permet de lire req.cookies (token JWT)
//   3. express.json — parse le body JSON des requêtes
//   4. Routes       — auth / products / cart / orders / admin
//   5. Swagger       — documentation auto sur /api/docs
//   6. errorHandler  — capture toutes les erreurs non traitées

'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi    = require('swagger-ui-express');

const errorHandler   = require('./middleware/errorHandler');
const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/products.routes');
const cartRoutes     = require('./routes/cart.routes');
const orderRoutes    = require('./routes/orders.routes');
const adminRoutes    = require('./routes/admin.routes');

const path = require('path');
const app  = express();
const PORT = process.env.PORT || 3001;

// -- Middlewares globaux ------------------------------------------

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Nécessaire pour envoyer/recevoir les cookies
}));

app.use(cookieParser());
app.use(express.json());

// -- Fichiers statiques (images uploadées) ------------------------
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// -- Routes -------------------------------------------------------

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',    adminRoutes);

// Route de santé (utile pour Docker/CI)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -- Swagger (documentation auto-générée) ------------------------

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:   'NikeBasket API',
      version: '1.0.0',
      description: 'API REST — Migration E-Commerce Full-Stack (Efrei Paris 2026)',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in:   'cookie',
          name: 'token',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// -- Gestionnaire d'erreurs (DOIT être monté EN DERNIER) ----------
app.use(errorHandler);

// -- Démarrage (désactivé en mode test pour supertest) -----------

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur NikeBasket démarré sur http://localhost:${PORT}`);
    console.log(`📚 Documentation Swagger : http://localhost:${PORT}/api/docs`);
    console.log(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}\n`);
  });
}

module.exports = app;
