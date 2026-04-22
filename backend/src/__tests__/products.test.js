// __tests__/products.test.js — Tests d'intégration : catalogue produits
// -----------------------------------------------------------------------
// GET /api/products et GET /api/products/:id ne nécessitent pas de token.
// Les routes d'écriture (POST/PUT/DELETE) nécessitent un token admin.

const request = require('supertest');
const app     = require('../app');

// ── Lecture publique ───────────────────────────────────────────────────────

describe('GET /api/products', () => {
  it('retourne 200 avec une structure paginée', async () => {
    const res = await request(app).get('/api/products');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('products');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('la pagination contient total, page et limit', async () => {
    const res = await request(app).get('/api/products?page=1&limit=5');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    // La page doit contenir au plus 5 produits
    expect(res.body.products.length).toBeLessThanOrEqual(5);
  });

  it('accepte le filtre par statut sans erreur', async () => {
    const res = await request(app).get('/api/products?statut=actif');
    expect(res.statusCode).toBe(200);
  });

  it('accepte une recherche par nom sans erreur', async () => {
    const res = await request(app).get('/api/products?search=air');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
  });
});

describe('GET /api/products/:id', () => {
  it('retourne 404 pour un produit inexistant', async () => {
    const res = await request(app).get('/api/products/999999');
    expect(res.statusCode).toBe(404);
  });
});

// ── Protection admin ───────────────────────────────────────────────────────

describe('POST /api/products — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ nom: 'Air Test', prix: 99.99 });

    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/products/:id — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app)
      .put('/api/products/1')
      .send({ nom: 'Modifié' });

    expect(res.statusCode).toBe(401);
  });
});

describe('DELETE /api/products/:id — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app).delete('/api/products/1');
    expect(res.statusCode).toBe(401);
  });
});
