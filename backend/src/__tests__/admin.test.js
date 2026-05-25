// __tests__/admin.test.js — Tests d'intégration : routes d'administration
// -------------------------------------------------------------------------
// Vérifie que toutes les routes /api/admin/* sont protégées par le JWT.

const request = require('supertest');
const app     = require('../app');

// ── Protection JWT sur toutes les routes admin ────────────────────────────

describe('Routes /api/admin — Protection JWT (sans token)', () => {
  const routes = [
    { method: 'get',    path: '/api/admin/stats' },
    { method: 'get',    path: '/api/admin/orders' },
    { method: 'put',    path: '/api/admin/orders/1' },
    { method: 'get',    path: '/api/admin/users' },
    { method: 'put',    path: '/api/admin/users/1/role' },
    { method: 'delete', path: '/api/admin/users/1' },
  ];

  routes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} retourne 401`, async () => {
      const res = await request(app)[method](path).send({ statut: 'payee', role: 'admin' });
      expect(res.statusCode).toBe(401);
    });
  });
});

// ── Protection JWT sur les routes commandes ───────────────────────────────

describe('Routes /api/orders — Protection JWT (sans token)', () => {
  it('GET /api/orders retourne 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/orders/:id retourne 401', async () => {
    const res = await request(app).get('/api/orders/1');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/orders retourne 401', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.statusCode).toBe(401);
  });
});

// ── Protection JWT sur les routes panier ─────────────────────────────────

describe('Routes /api/cart — Protection JWT (sans token)', () => {
  it('GET /api/cart retourne 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/cart retourne 401', async () => {
    const res = await request(app).post('/api/cart').send({});
    expect(res.statusCode).toBe(401);
  });

  it('PUT /api/cart/1 retourne 401', async () => {
    const res = await request(app).put('/api/cart/1').send({});
    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/cart/1 retourne 401', async () => {
    const res = await request(app).delete('/api/cart/1');
    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/cart retourne 401', async () => {
    const res = await request(app).delete('/api/cart');
    expect(res.statusCode).toBe(401);
  });
});

// ── Protection JWT sur les routes paiements ───────────────────────────────

describe('Routes /api/payments — Protection JWT (sans token)', () => {
  it('POST /api/payments/create-intent retourne 401', async () => {
    const res = await request(app).post('/api/payments/create-intent').send({});
    expect(res.statusCode).toBe(401);
  });
});

// ── Protection JWT sur les routes 2FA ─────────────────────────────────────

describe('Routes /api/auth/2fa — Protection JWT (sans token)', () => {
  it('GET /api/auth/2fa/setup retourne 401', async () => {
    const res = await request(app).get('/api/auth/2fa/setup');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/2fa/enable retourne 401', async () => {
    const res = await request(app).post('/api/auth/2fa/enable').send({});
    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/auth/2fa/disable retourne 401', async () => {
    const res = await request(app).delete('/api/auth/2fa/disable').send({});
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/2fa/verify sans pending_token retourne 401', async () => {
    const res = await request(app).post('/api/auth/2fa/verify').send({ code: '123456' });
    expect(res.statusCode).toBe(401);
  });
});
