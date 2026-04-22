// __tests__/admin.test.js — Tests d'intégration : routes d'administration
// -------------------------------------------------------------------------
// Vérifie que toutes les routes /api/admin/* sont protégées par le JWT.
// Ces tests ne nécessitent pas de base de données.

const request = require('supertest');
const app     = require('../app');

describe('Routes /api/admin — Protection JWT (sans token)', () => {
  const routes = [
    { method: 'get',  path: '/api/admin/stats' },
    { method: 'get',  path: '/api/admin/orders' },
    { method: 'put',  path: '/api/admin/orders/1' },
    { method: 'get',  path: '/api/admin/users' },
    { method: 'put',  path: '/api/admin/users/1/role' },
  ];

  routes.forEach(({ method, path }) => {
    it(`${method.toUpperCase()} ${path} retourne 401`, async () => {
      const res = await request(app)[method](path).send({ statut: 'payee', role: 'admin' });
      expect(res.statusCode).toBe(401);
    });
  });
});

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

describe('Routes /api/cart — Protection JWT (sans token)', () => {
  it('GET /api/cart retourne 401', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/cart retourne 401', async () => {
    const res = await request(app).post('/api/cart').send({});
    expect(res.statusCode).toBe(401);
  });
});
