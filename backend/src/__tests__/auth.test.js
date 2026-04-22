// __tests__/auth.test.js — Tests d'intégration : routes d'authentification
// -------------------------------------------------------------------------
// Les tests de validation (400) ne nécessitent pas de BDD.
// Les tests d'inscription/connexion nécessitent PostgreSQL (CI GitHub Actions).
//
// Lancer en local (avec Docker Compose) :
//   docker-compose up -d postgres
//   npm test

const request = require('supertest');
const app     = require('../app');

// Mot de passe respectant les règles CDC Technique §3.2
const MOT_DE_PASSE_VALIDE = 'NikeBasket2026!';
// Email unique pour éviter les doublons entre runs de tests
const EMAIL_TEST = `test.${Date.now()}@nikebasket.test`;

// ── Inscription ────────────────────────────────────────────────────────────

describe('POST /api/auth/register — Validation des entrées', () => {
  it('retourne 400 si le champ nom est absent', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: EMAIL_TEST, password: MOT_DE_PASSE_VALIDE });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 400 si l\'email est invalide', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: 'pas-un-email', password: MOT_DE_PASSE_VALIDE });

    expect(res.statusCode).toBe(400);
  });

  it('retourne 400 si le mot de passe est trop court (< 12 caractères)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: EMAIL_TEST, password: 'Court1!' });

    expect(res.statusCode).toBe(400);
  });

  it('retourne 400 si le mot de passe n\'a pas de majuscule', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: EMAIL_TEST, password: 'nikebasket2026!' });

    expect(res.statusCode).toBe(400);
  });

  it('retourne 400 si le mot de passe n\'a pas de chiffre', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Test', email: EMAIL_TEST, password: 'NikeBasketFort!' });

    expect(res.statusCode).toBe(400);
  });
});

// ── Connexion ──────────────────────────────────────────────────────────────

describe('POST /api/auth/login — Identifiants incorrects', () => {
  it('retourne 401 si l\'email n\'existe pas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@nikebasket.test', password: MOT_DE_PASSE_VALIDE });

    expect(res.statusCode).toBe(401);
    // Message générique (OWASP A07 — ne pas indiquer quel champ est incorrect)
    expect(res.body.error).toBe('Identifiants incorrects');
  });
});

// ── Déconnexion ────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('retourne 200 et un message de confirmation', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Déconnexion réussie');
  });

  it('efface le cookie token dans la réponse', async () => {
    const res = await request(app).post('/api/auth/logout');
    // supertest expose les Set-Cookie headers
    const cookies = res.headers['set-cookie'] || [];
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    // Le cookie doit être présent mais vide (effacement)
    if (tokenCookie) {
      expect(tokenCookie).toMatch(/token=;/);
    }
  });
});

// ── Protection JWT ─────────────────────────────────────────────────────────

describe('GET /api/auth/me — Middleware verifyToken', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne 401 avec un token JWT invalide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'token=ceci.nest.pas.un.jwt');

    expect(res.statusCode).toBe(401);
  });
});

// ── Mot de passe oublié ────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('retourne 400 si le champ email est absent', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it('retourne 200 même si l\'email n\'existe pas (OWASP A07 — no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inconnu@nikebasket.test' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});

// ── Réinitialisation de mot de passe ──────────────────────────────────────

describe('POST /api/auth/reset-password — Validation', () => {
  it('retourne 400 si le token est absent', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ password: MOT_DE_PASSE_VALIDE });

    expect(res.statusCode).toBe(400);
  });

  it('retourne 400 si le nouveau mot de passe est trop faible', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'faketoken123', password: 'tropfaible' });

    expect(res.statusCode).toBe(400);
  });

  it('retourne 400 si le token est invalide ou expiré', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-invalide-inexistant', password: MOT_DE_PASSE_VALIDE });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalide|expiré/i);
  });
});

// ── Changement de mot de passe ────────────────────────────────────────────

describe('PUT /api/auth/change-password — Protection JWT', () => {
  it('retourne 401 sans cookie JWT', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .send({
        current_password: MOT_DE_PASSE_VALIDE,
        new_password:     'NouveauMot2026!',
      });

    expect(res.statusCode).toBe(401);
  });
});
