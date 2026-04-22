# Veille Technologique — NikeBasket Migration
**Efrei Paris — PEP Bachelor 3 Dev Web — 2025/2026**
*Livrable S2 — Pep.pdf §4.4*

---

## 1. React 18 vs Vue 3 vs Angular 17

### React 18 (choix retenu)
**Nouveautés clés :**
- **Concurrent rendering** : React peut interrompre un rendu pour traiter un événement plus prioritaire (ex. `useTransition`, `useDeferredValue`).
- **Automatic batching** : les mises à jour d'état dans les `setTimeout`, `fetch` callbacks sont maintenant groupées automatiquement → moins de re-rendus.
- **Streaming SSR avec Suspense** : `renderToPipeableStream` permet d'envoyer le HTML au fur et à mesure.

**Pourquoi React pour ce projet ?**
- Écosystème le plus large (npm, Stack Overflow).
- Vite + React = DX excellente (HMR < 50ms).
- React Router v6 gère parfaitement les SPA e-commerce avec layouts imbriqués.
- Recharts, SweetAlert2, react-query sont natifs React.

### Vue 3 (alternatif)
- Composition API proche des hooks React.
- Pinia (store) plus simple que Redux.
- Moins de librairies tierces disponibles.
- **Non retenu** : l'équipe était plus familière React.

### Angular 17
- Framework complet (DI, routing, forms, HTTP intégré).
- TypeScript obligatoire, courbe d'apprentissage élevée.
- Bundle size plus lourd pour un projet de cette taille.
- **Non retenu** : over-engineering pour un MVP.

---

## 2. Node.js / Express vs Fastify vs NestJS

### Express (choix retenu)
- Standard de facto depuis 2011, documentation exhaustive.
- Middlewares (`cors`, `cookie-parser`, `express-rate-limit`) matures et stables.
- Architecture flexible : MVC implementé manuellement (routes → controllers → pool).
- **Vulnérabilité connue** : pas de validation par défaut → compensé par `express-validator`.

### Fastify
- 2× plus rapide qu'Express en benchmark pur.
- Schéma JSON intégré (Ajv) → validation native.
- **Non retenu** : écosystème plus jeune, moins de ressources d'apprentissage.

### NestJS
- Inspiré d'Angular, DI, modules, decorators TypeScript.
- Idéal pour les grandes équipes et micro-services.
- **Non retenu** : complexité excessive pour un projet solo de 8 missions.

---

## 3. PostgreSQL vs MySQL vs MongoDB

### PostgreSQL (choix retenu)
**Avantages sur MySQL :**
| Fonctionnalité | PostgreSQL | MySQL |
|---|---|---|
| Types natifs | `JSONB`, `ARRAY`, `UUID`, `TIMESTAMPTZ` | Limités |
| Contraintes | `CHECK` expressions complexes | Basiques |
| Requêtes window | `OVER (PARTITION BY...)` complet | Partiel |
| Performances | Meilleures sur lectures complexes | Meilleures sur écritures simples |
| Conformité SQL | SQL:2016 | Partiel |

**Pertinent pour NikeBasket :**
- `TIMESTAMPTZ` pour les dates de commande (fuseau horaire correct).
- `SERIAL` → séquences gérables (reset après migration).
- `CHECK (role IN ('client', 'admin', 'employe'))` → contrainte native.

### MongoDB
- Document store : pas de schéma fixe.
- Inadapté pour des relations N:N (stock taille × couleur × produit).
- **Non retenu** : relationnel obligatoire pour l'e-commerce.

---

## 4. JWT (httpOnly Cookie) vs Session Server-Side vs OAuth2

### JWT httpOnly Cookie (choix retenu)
- **httpOnly** : inaccessible depuis JavaScript → protection XSS (OWASP A03).
- **sameSite: lax** : protection CSRF par défaut.
- **Stateless** : pas de stockage serveur → scalable horizontalement.
- Expiration configurable (`JWT_EXPIRES_IN=24h`).

**vs localStorage (à éviter)**
- Accessible par `document.cookie` et JavaScript → XSS trivial.
- Beaucoup de tutoriels utilisent localStorage par simplicité — c'est une mauvaise pratique.

**vs Session server-side**
- Nécessite Redis ou table de sessions en base.
- État côté serveur → problèmes avec les instances multiples.
- Plus sécurisé pour la révocation immédiate (logout forcé).
- **Non retenu** : complexité supplémentaire pour un MVP.

### OAuth2 / OpenID Connect
- Google, GitHub, Apple Sign-In.
- Délègue l'authentification à un tiers fiable.
- **Extension possible** : intégration `passport.js` + `passport-google-oauth20`.

---

## 5. Sécurité OWASP Top 10 — points de veille 2024

### A01 — Broken Access Control
- **Nouveauté 2024** : montée des attaques IDOR (Insecure Direct Object References) dans les API REST.
- **Mesure dans NikeBasket** : middleware `requireAdmin` sur toutes les routes `/api/admin/*`.

### A02 — Cryptographic Failures
- **Tendance** : TLS 1.3 obligatoire, dépréciation de SHA-1.
- **Mesure** : bcrypt salt rounds 10, JWT HS256.

### A03 — Injection
- **SQL Injection** : requêtes paramétrées `$1, $2` dans pg (jamais de concaténation).
- **XSS** : React échappe automatiquement le JSX, SweetAlert2 encode les chaînes.

### A07 — Identification and Authentication Failures
- **2FA** : champ `secret` prévu dans la table `user` (Google Authenticator — TOTP RFC 6238).
- **Rate limiting** : `express-rate-limit` max 10 tentatives / 15 min sur `/api/auth/login`.

### A09 — Security Logging and Monitoring Failures
- **Audit log** : table `commande_historique` pour tracer les changements de statut.
- **Amélioration possible** : Winston + ELK Stack pour les logs d'erreur.

---

## 6. Docker & CI/CD — état de l'art 2024

### Docker Compose v2
- `depends_on: condition: service_healthy` → attente du healthcheck PostgreSQL.
- Images Alpine pour réduire la surface d'attaque (postgres:16-alpine = 240MB vs 380MB).

### GitHub Actions (CI — `.github/workflows/ci.yml`)
- Linting ESLint + test backend Node.js à chaque push.
- Build Docker image sur merge vers `main`.
- **Outil alternatif** : GitLab CI, Jenkins (plus complexes à configurer).

### Orchestration (hors scope MVP)
- Kubernetes pour le déploiement multi-nœuds.
- Helm charts pour la gestion des configurations.

---

## 7. Sources consultées

| Source | URL | Thème |
|---|---|---|
| React 18 blog | react.dev/blog/2022/03/29/react-v18 | Concurrent rendering |
| Express security | expressjs.com/en/advanced/best-practice-security.html | Bonnes pratiques Express |
| OWASP Top 10 2021 | owasp.org/Top10 | Sécurité API |
| PostgreSQL docs | postgresql.org/docs/16 | Schéma, requêtes |
| JWT best practices | auth0.com/docs/secure/tokens/json-web-tokens | Authentification |
| Recharts | recharts.org | Visualisation données |
| Docker best practices | docs.docker.com/develop/develop-images/dockerfile_best-practices | Images Docker |
