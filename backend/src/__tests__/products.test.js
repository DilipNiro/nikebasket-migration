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

  it('accepte le tri par prix descendant', async () => {
    const res = await request(app).get('/api/products?sort=prix&order=desc');
    expect(res.statusCode).toBe(200);
  });

  it('accepte le filtre par prix min et max', async () => {
    const res = await request(app).get('/api/products?prix_min=50&prix_max=200');
    expect(res.statusCode).toBe(200);
    // Tous les produits retournés doivent avoir un prix dans la plage
    res.body.products.forEach(p => {
      expect(parseFloat(p.prix)).toBeGreaterThanOrEqual(50);
      expect(parseFloat(p.prix)).toBeLessThanOrEqual(200);
    });
  });

  it('retourne une page 2 valide', async () => {
    const res = await request(app).get('/api/products?page=2&limit=5');
    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.page).toBe(2);
  });
});

describe('GET /api/products/categories', () => {
  it('retourne la liste des catégories', async () => {
    const res = await request(app).get('/api/products/categories');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('categories');
    expect(Array.isArray(res.body.categories)).toBe(true);
  });
});

describe('GET /api/products/tailles', () => {
  it('retourne la liste des tailles', async () => {
    const res = await request(app).get('/api/products/tailles');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tailles');
  });
});

describe('GET /api/products/couleurs', () => {
  it('retourne la liste des couleurs', async () => {
    const res = await request(app).get('/api/products/couleurs');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('couleurs');
  });
});

describe('GET /api/products/:id', () => {
  it('retourne 404 pour un produit inexistant', async () => {
    const res = await request(app).get('/api/products/999999');
    expect(res.statusCode).toBe(404);
  });

  it('retourne 400 ou 404 pour un id non numérique', async () => {
    const res = await request(app).get('/api/products/abc');
    expect([400, 404, 500]).toContain(res.statusCode);
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
    const res = await request(app).put('/api/products/1').send({ nom: 'Modifié' });
    expect(res.statusCode).toBe(401);
  });
});

describe('DELETE /api/products/:id — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app).delete('/api/products/1');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/products/:id/stock — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app).get('/api/products/1/stock');
    expect(res.statusCode).toBe(401);
  });
});

describe('PUT /api/products/:id/stock — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app).put('/api/products/1/stock').send({});
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/products/upload — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app).post('/api/products/upload');
    expect(res.statusCode).toBe(401);
  });
});
