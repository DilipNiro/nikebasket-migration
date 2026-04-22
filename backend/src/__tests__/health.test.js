// __tests__/health.test.js — Test de l'endpoint de santé
// Ce test ne nécessite pas de base de données (utilisable offline).

const request = require('supertest');
const app     = require('../app');

describe('GET /api/health', () => {
  it('retourne status ok avec un timestamp ISO', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    // Vérifie que le timestamp est une date ISO valide
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });
});
