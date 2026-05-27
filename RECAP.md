# Récapitulatif des nouvelles fonctionnalités — Post-soutenance

> Période : 29 avril 2026 → 10 juin 2026
> Suite du projet NikeBasket après la soutenance PEP du 24 avril.

---

## Semaine 1 — 29 avril → 4 mai

### Authentification à deux facteurs (2FA TOTP)

**Contexte :** Le site PHP original intégrait la 2FA via Google Authenticator (colonne `secret` déjà présente dans le schéma PostgreSQL). Cette fonctionnalité était absente de la migration.

**Ce qui a été implémenté :**

- `GET /api/auth/2fa/setup` — génère un secret TOTP et un QR code base64 à scanner dans Google Authenticator
- `POST /api/auth/2fa/enable` — vérifie le premier code TOTP et sauvegarde le secret en base
- `DELETE /api/auth/2fa/disable` — désactive la 2FA (nécessite un dernier code valide)
- `POST /api/auth/2fa/verify` — deuxième étape du login, vérifie le code TOTP via un `pending_token` éphémère (5min)
- Modification de `POST /api/auth/login` : si `secret` présent → pose un cookie `pending_token` et répond `{ requires_2fa: true }` au lieu d'émettre directement le JWT
- `GET /api/auth/me` mis à jour : retourne maintenant `two_fa_enabled: true/false`

**Frontend :**
- `Login.jsx` — étape 2 avec champ TOTP (6 chiffres, clavier numérique, auto-focus)
- `Profile.jsx` — section 2FA avec activation via QR code et désactivation sécurisée
- `AuthContext.jsx` — nouvelle fonction `verify2FA()`, `login()` gère `requires_2fa`

**Librairies ajoutées :** `speakeasy`, `qrcode`

---

## Semaine 2 — 5 → 11 mai

### Email réel avec Nodemailer

**Contexte :** `POST /api/auth/forgot-password` retournait le lien de réinitialisation directement dans la réponse JSON — comportement acceptable en développement, mais incomplet pour la production.

**Ce qui a été implémenté :**

- `backend/src/config/mailer.js` — transport SMTP centralisé via Nodemailer
- `forgotPassword` mis à jour : si `SMTP_HOST` est configuré → envoie l'email HTML avec le lien ; sinon → mode développement (lien dans la réponse JSON, comportement inchangé)
- Template email responsive avec bouton de réinitialisation
- Nouvelles variables `.env` : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Librairies ajoutées :** `nodemailer`

### Extension de la couverture Jest

**Contexte :** Les tests Jest couvraient les endpoints critiques mais pas les routes secondaires (stock, référentiels, 2FA, paiements).

**Nouveaux tests ajoutés :**

`products.test.js` :
- Filtre par prix min/max (vérification des valeurs retournées)
- Tri par prix descendant
- Pagination page 2
- Routes `GET /categories`, `GET /tailles`, `GET /couleurs`
- Protection `GET /:id/stock`, `PUT /:id/stock`, `POST /upload`
- Gestion d'un id non numérique

`admin.test.js` :
- `DELETE /api/admin/users/:id` protégé par JWT
- Routes panier complètes (`PUT`, `DELETE /:id`, `DELETE /`)
- `POST /api/payments/create-intent` protégé par JWT
- Routes 2FA toutes protégées par JWT (`setup`, `enable`, `disable`, `verify`)

---

## Semaines 3-4 — 12 → 25 mai

### Intégration Stripe

**Contexte :** Le paiement était simulé (commande créée directement avec statut `payee` sans aucune transaction réelle). L'oral de soutenance mentionnait explicitement l'intégration Stripe comme prochaine étape. La colonne `transaction_id` était déjà prévue dans le schéma `paiement`.

**Ce qui a été implémenté :**

**Backend :**
- `backend/src/controllers/payments.controller.js` — calcule le montant depuis le panier serveur (ne jamais faire confiance au client), crée un `PaymentIntent` Stripe en centimes
- `backend/src/routes/payments.routes.js` — `POST /api/payments/create-intent`
- `orders.controller.js` mis à jour : accepte `payment_intent_id` dans le body ; si fourni → vérifie le statut `succeeded` via l'API Stripe avant de créer la commande ; stocke le `transaction_id` réel en base
- Nouvelles variables `.env` : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Rétrocompatibilité : sans `payment_intent_id`, le paiement simulé fonctionne toujours

**Frontend :**
- `Checkout.jsx` entièrement revu : si `VITE_STRIPE_PUBLIC_KEY` est configuré → affiche Stripe Elements (formulaire de carte sécurisé) ; sinon → mode simulation inchangé
- `loadStripe` + `Elements` + `PaymentElement` de `@stripe/react-stripe-js`

**Librairies ajoutées :** `stripe` (backend), `@stripe/react-stripe-js`, `@stripe/stripe-js` (frontend)

---

## Semaine 5 — 26 mai → 1 juin

### Suppression d'utilisateur (admin)

**Contexte :** L'interface admin permettait de modifier le rôle d'un utilisateur mais pas de le supprimer. Endpoint manquant identifié dans l'analyse de code.

**Ce qui a été implémenté :**

- `DELETE /api/admin/users/:id` — protection anti-suppression de son propre compte
- `admin/Users.jsx` — bouton "Supprimer" avec confirmation SweetAlert2, masqué sur le compte connecté

### Pagination côté serveur — Admin Produits

**Contexte :** `AdminProducts.jsx` chargeait tous les produits en une fois (`limit=200`), ce qui ne passe pas à l'échelle avec un catalogue important.

**Ce qui a été implémenté :**

- Remplacement de `limit=200` par pagination serveur (`limit=20` par défaut)
- `useEffect` réactif sur `page`, `search` et `filterStatut` — rechargement automatique
- Contrôles Précédent / Suivant avec indicateur "Page X / Y"
- Réinitialisation automatique à la page 1 lors d'un nouveau filtre ou d'une recherche

### Cache Redis sur les endpoints lents

**Contexte :** Les endpoints `GET /api/products`, `/categories`, `/tailles` et `/couleurs` exécutent des requêtes SQL complètes à chaque appel. Sous charge, ces lectures répétées dégradent les performances. La solution standard en production est un cache en mémoire entre l'API et la base de données.

**Ce qui a été implémenté :**

- `backend/src/config/redis.js` — client ioredis avec connexion lazy et mode dégradé gracieux (l'app continue de fonctionner si Redis est absent)
- `backend/src/middleware/cache.js` — middleware `cache(ttl)` factory : vérifie le cache Redis avant le controller, met en cache la réponse JSON ; fonction `clearCache(pattern)` pour l'invalidation
- `products.routes.js` mis à jour : `GET /` et `GET /:id` cachés 2 min ; `/categories`, `/tailles`, `/couleurs` cachés 5 min
- Invalidation automatique sur POST/PUT/DELETE produit (`clearCache('cache:GET:/api/products*')`)
- Header `X-Cache: HIT/MISS` sur chaque réponse mise en cache
- Cache désactivé en `NODE_ENV=test` pour ne pas dépendre de Redis dans les tests

**Nouvelle variable `.env` :** `REDIS_URL=redis://localhost:6379`

**Librairies ajoutées :** `ioredis`

### Monitoring Grafana + Prometheus

**Contexte :** Le projet n'avait aucune visibilité sur le comportement en production (taux d'erreur, latence des endpoints, utilisation mémoire Node.js). Grafana + Prometheus est le stack standard pour monitorer une API Node.js.

**Ce qui a été implémenté :**

**Backend :**
- `backend/src/config/metrics.js` — instrumentation `prom-client` : compteur `nikebasket_http_requests_total` (method/route/status), histogramme `nikebasket_http_request_duration_ms`, métriques système Node.js (CPU, mémoire, event loop, GC) via `collectDefaultMetrics`
- `app.js` mis à jour : middleware `metricsMiddleware` monté avant les routes, endpoint `GET /metrics` exposé au format texte Prometheus
- `collectDefaultMetrics` désactivé en `NODE_ENV=test` pour éviter les handles ouverts dans Jest

**Infrastructure :**
- `monitoring/prometheus.yml` — configuration Prometheus : scrape le backend toutes les 15s sur `/metrics`
- `docker-compose.yml` mis à jour — 3 nouveaux services : `redis` (port 6379), `prometheus` (port 9090), `grafana` (port 3000 — admin/admin)

**Accès :**
| Service | URL |
|---|---|
| Grafana | http://localhost:3000 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Métriques brutes | http://localhost:3001/metrics |

> Dans Grafana : ajouter une source de données Prometheus (`http://prometheus:9090`) puis créer des panels avec les métriques `nikebasket_http_requests_total` et `nikebasket_http_request_duration_ms`.

**Librairies ajoutées :** `prom-client`

---

## Semaine 6 — 2 → 10 juin

### Stockage d'images Cloudinary

**Contexte :** Les images de produits étaient stockées sur le filesystem local du serveur (`/uploads`). Cela ne passe pas à l'échelle (volumes Docker non persistants par défaut, impossible sur plusieurs instances). Le rapport de soutenance identifiait S3/Cloudinary comme prochaine étape naturelle.

**Ce qui a été implémenté :**

- `backend/src/config/cloudinary.js` — configuration Cloudinary v2 + middleware Multer avec `multer-storage-cloudinary`
- `products.routes.js` mis à jour : détection automatique de l'environnement — si `CLOUDINARY_CLOUD_NAME` est défini → upload Cloudinary ; sinon → stockage local inchangé (développement sans compte)
- Transformation automatique appliquée : resize `800×800` `limit` (pas d'agrandissement)
- Nouvelles variables `.env` : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Librairies ajoutées :** `cloudinary`, `multer-storage-cloudinary`

### React Error Boundary

**Contexte :** Sans Error Boundary, un crash dans un composant React laisse une page complètement blanche sans message d'explication.

**Ce qui a été implémenté :**

- `frontend/src/components/ErrorBoundary.jsx` — class component avec `getDerivedStateFromError` + `componentDidCatch`
- Affichage d'une page d'erreur générique avec bouton "Rafraîchir la page"
- Intégré dans `App.jsx` autour de toute l'application

---

## Résumé des fichiers modifiés / créés

### Backend (Semaine 5)

| Fichier | Type |
|---|---|
| `src/config/redis.js` | Créé — client ioredis (mode dégradé gracieux) |
| `src/config/metrics.js` | Créé — métriques Prometheus (prom-client) |
| `src/middleware/cache.js` | Créé — middleware cache Redis + invalidation |
| `src/routes/products.routes.js` | Modifié — cache sur GET + invalidation sur mutations |
| `src/app.js` | Modifié — metricsMiddleware + GET /metrics |
| `monitoring/prometheus.yml` | Créé — config scrape Prometheus |
| `docker-compose.yml` | Modifié — services redis, prometheus, grafana |

### Backend (Semaines 1–6)

| Fichier | Type |
|---|---|
| `src/controllers/auth.controller.js` | Modifié — 2FA (4 fonctions) + login + forgotPassword + getMe |
| `src/controllers/admin.controller.js` | Modifié — ajout `deleteUser` |
| `src/controllers/orders.controller.js` | Modifié — accepte `payment_intent_id` Stripe |
| `src/controllers/payments.controller.js` | Créé — PaymentIntent Stripe |
| `src/routes/auth.routes.js` | Modifié — 4 routes 2FA |
| `src/routes/admin.routes.js` | Modifié — `DELETE /users/:id` |
| `src/routes/products.routes.js` | Modifié — upload Cloudinary conditionnel |
| `src/routes/payments.routes.js` | Créé — `POST /create-intent` |
| `src/config/mailer.js` | Créé — Nodemailer SMTP |
| `src/config/cloudinary.js` | Créé — Cloudinary + Multer storage |
| `src/app.js` | Modifié — montage `paymentRoutes` |
| `.env.example` | Modifié — nouvelles variables SMTP / Stripe / Cloudinary |
| `src/__tests__/products.test.js` | Modifié — +8 tests |
| `src/__tests__/admin.test.js` | Modifié — +10 tests (2FA, paiements, delete user) |

### Frontend

| Fichier | Type |
|---|---|
| `src/context/AuthContext.jsx` | Modifié — `verify2FA()`, `login()` gère 2FA |
| `src/pages/Login.jsx` | Modifié — étape TOTP |
| `src/pages/Profile.jsx` | Modifié — section 2FA |
| `src/pages/Checkout.jsx` | Modifié — Stripe Elements |
| `src/pages/admin/Users.jsx` | Modifié — bouton suppression |
| `src/pages/admin/Products.jsx` | Modifié — pagination serveur |
| `src/components/ErrorBoundary.jsx` | Créé — capture erreurs React |
| `src/App.jsx` | Modifié — ErrorBoundary |

---

## Variables d'environnement à configurer

```env
# Nodemailer (laisser vide → mode dev, lien dans la réponse JSON)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@nikebasket.fr
SMTP_PASS=...
SMTP_FROM=no-reply@nikebasket.fr

# Stripe (laisser vide → paiement simulé)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary (laisser vide → stockage local /uploads)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Redis (laisser vide → mode dégradé sans cache)
REDIS_URL=redis://localhost:6379
```

```env
# Frontend (.env)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```
