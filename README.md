# NikeBasket — Migration Full-Stack

> Projet d'Étude Professionnel — Bachelor 3 Développeur Web & Application
> Efrei Paris 2026 | Entreprise : ADNCLLY.DEV | Tuteur : Nabil ADNANE

Migration d'un site e-commerce **PHP/MySQL** vers une architecture **React / Node.js / PostgreSQL**.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + React Router v6 |
| Backend | Node.js + Express 4 + JWT (cookie httpOnly) |
| Base de données | PostgreSQL 16 |
| Client BDD | pg (node-postgres) |
| Authentification | bcrypt + JWT |
| Upload fichiers | multer |
| Documentation API | Swagger/OpenAPI |
| Environnement | Docker Compose |

---

## Démarrage rapide

### Avec Docker (recommandé)

> Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et lancé.

```bash
# 1. Cloner le projet
git clone <url-du-depot>
cd nikebasket-migration

# 2. Lancer les 3 services (PostgreSQL + backend + frontend)
docker-compose up

# 3. Peupler la base avec des données de test (dans un autre terminal)
docker exec nikebasket_api node scripts/seed.js
```

**Accès :**
| Service | URL |
|---------|-----|
| Frontend (site) | http://localhost:5173 |
| API REST | http://localhost:3001 |
| Swagger (doc API) | http://localhost:3001/api/docs |

---

### Sans Docker (installation manuelle)

**Prérequis :** Node.js 20+, PostgreSQL 16

```bash
# 1. Cloner le projet
git clone <url-du-depot>
cd nikebasket-migration

# 2. Créer la base de données PostgreSQL
psql -U postgres -c "CREATE DATABASE ecommerce;"
psql -U postgres -d ecommerce -f database/schema.sql

# 3. Configurer le backend
cd backend
cp .env.example .env
# ⚠️  Éditer .env avec vos paramètres PostgreSQL
npm install
npm run dev
# → Backend disponible sur http://localhost:3001

# 4. Lancer le frontend (nouveau terminal)
cd ../frontend
npm install
npm run dev
# → Frontend disponible sur http://localhost:5173

# 5. Peupler la base avec des données de test
cd ../backend
node scripts/seed.js
# Options disponibles :
# node scripts/seed.js --rows=100    → 100 produits
# node scripts/seed.js --rows=50     → 50 produits (défaut)
```

---

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** | `pie74@yahoo.fr` | `Admin1234!` |
| **Client** | `client@test.fr` | `Client1234!` |

> L'admin a accès au panel `/admin` (Dashboard, Produits, Stock, Commandes, Utilisateurs).

---

## Architecture du projet

```
nikebasket-migration/
├── audit/
│   └── audit-owasp.md        ← Audit sécurité OWASP Top 10
├── database/
│   └── schema.sql             ← Schéma PostgreSQL (12 tables)
├── backend/
│   ├── uploads/               ← Images uploadées via l'admin
│   ├── scripts/
│   │   ├── migrate.js         ← Migration MySQL → PostgreSQL
│   │   └── seed.js            ← Génération de données de test (Faker)
│   └── src/
│       ├── config/db.js       ← Pool de connexions PostgreSQL
│       ├── middleware/
│       │   ├── auth.js        ← Vérification JWT + rôles
│       │   └── errorHandler.js← Erreurs centralisées
│       ├── routes/            ← auth / products / cart / orders / admin
│       ├── controllers/       ← Logique métier
│       └── app.js             ← Point d'entrée Express
├── frontend/
│   └── src/
│       ├── api/axios.js       ← Instance Axios + intercepteur JWT
│       ├── context/           ← AuthContext + CartContext
│       ├── components/        ← Navbar, Footer, ProductCard, ProtectedRoute
│       └── pages/
│           ├── Home.jsx            ← Accueil + slider
│           ├── Products.jsx        ← Catalogue avec filtres sidebar
│           ├── ProductDetail.jsx   ← Fiche produit (taille/couleur/stock)
│           ├── Cart.jsx            ← Panier
│           ├── Checkout.jsx        ← Validation commande
│           ├── Orders.jsx          ← Historique commandes
│           ├── OrderDetail.jsx     ← Détail commande + historique statut
│           ├── Login.jsx / Register.jsx
│           ├── Profile.jsx         ← Profil utilisateur
│           ├── ForgotPassword.jsx / ResetPassword.jsx / ChangePassword.jsx
│           └── admin/
│               ├── Dashboard.jsx   ← Statistiques temps réel
│               ├── Products.jsx    ← CRUD produits + upload image
│               ├── Stock.jsx       ← Vue stock complète (grille couleur×taille)
│               ├── Orders.jsx      ← Gestion commandes
│               └── Users.jsx       ← Gestion utilisateurs et rôles
├── postman_collection.json    ← Collection Postman (tous les endpoints)
├── docker-compose.yml
└── .env.example
```

---

## API REST — Endpoints

### Authentification

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | — | Inscription |
| POST | `/api/auth/login` | — | Connexion → cookie httpOnly JWT |
| POST | `/api/auth/logout` | — | Déconnexion |
| GET  | `/api/auth/me` | JWT | Profil connecté |
| POST | `/api/auth/forgot-password` | — | Demande reset mot de passe |
| POST | `/api/auth/reset-password` | — | Réinitialisation avec token |

### Produits

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/products` | — | Liste avec filtres (`?categorie=&search=&taille=&couleur=&prix_min=&prix_max=&page=&limit=`) |
| GET | `/api/products/:id` | — | Détail + stock par taille/couleur |
| GET | `/api/products/categories` | — | Liste des catégories |
| GET | `/api/products/tailles` | — | Liste des tailles |
| GET | `/api/products/couleurs` | — | Liste des couleurs |
| POST | `/api/products` | Admin | Création produit |
| PUT | `/api/products/:id` | Admin | Modification produit |
| DELETE | `/api/products/:id` | Admin | Suppression produit |
| POST | `/api/products/upload` | Admin | Upload image → retourne l'URL |
| GET | `/api/products/:id/stock` | Admin | Stock complet (toutes quantités) |
| PUT | `/api/products/:id/stock` | Admin | Mise à jour quantité (couleur × taille) |

### Panier

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/cart` | JWT | Contenu du panier |
| POST | `/api/cart` | JWT | Ajout article (produit + taille + couleur) |
| PUT | `/api/cart/:itemId` | JWT | Modification quantité |
| DELETE | `/api/cart/:itemId` | JWT | Suppression article |
| DELETE | `/api/cart` | JWT | Vider le panier |

### Commandes

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/orders` | JWT | Mes commandes |
| GET | `/api/orders/:id` | JWT | Détail + historique statut |
| POST | `/api/orders` | JWT | Création depuis le panier (transaction SQL) |

### Administration

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/admin/stats` | Admin/Employé | CA, commandes du jour, ruptures |
| GET | `/api/admin/orders` | Admin/Employé | Toutes les commandes |
| PUT | `/api/admin/orders/:id` | Admin/Employé | Modifier statut commande |
| GET | `/api/admin/users` | Admin | Liste utilisateurs |
| PUT | `/api/admin/users/:id/role` | Admin | Modifier rôle utilisateur |

---

## Panel Administration

Accessible sur `/admin` (rôles `admin` et `employe`) :

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | CA, commandes du jour, ruptures de stock en temps réel |
| Produits | `/admin/products` | CRUD complet + upload image + gestion statut |
| Stock | `/admin/stock` | Grille couleur × taille pour tous les produits, totaux calculés |
| Commandes | `/admin/orders` | Suivi et modification de statut |
| Utilisateurs | `/admin/users` | Gestion des rôles (admin uniquement) |

> **Comportement automatique du stock** : quand le stock total d'un produit passe à 0, son statut devient automatiquement `en_rupture`. Quand du stock est ajouté, il repasse à `actif`.

---

## Sécurité — Points clés

| Mesure | Détail |
|--------|--------|
| **JWT httpOnly** | Protection XSS — token inaccessible depuis JavaScript |
| **bcrypt** | Hashage mots de passe (saltRounds: 10) |
| **Rate limiting** | 10 tentatives login / 15 min (OWASP A07) |
| **express-validator** | Validation des entrées (OWASP A03) |
| **Requêtes paramétrées** | Aucune injection SQL possible |
| **Variables d'environnement** | Aucun credential dans le code (OWASP A05) |
| **Erreurs centralisées** | Aucun détail technique exposé en production (OWASP A09) |
| **Transactions SQL** | Verrouillage `FOR UPDATE` sur commandes — pas de race condition |

---

## Correspondance PHP → React

| Page PHP | Composant React | Fonctionnalité |
|----------|-----------------|----------------|
| `index.php` | `Home.jsx` | Accueil + slider |
| `produits/produits.php` | `Products.jsx` | Catalogue avec filtres sidebar (taille, couleur, prix, catégorie) |
| `produits/produit.php` | `ProductDetail.jsx` | Fiche produit + sélection taille/couleur réactive |
| `panier/panier.php` | `Cart.jsx` | Panier |
| `paiement/checkout.php` | `Checkout.jsx` | Validation commande |
| `auth/login.php` | `Login.jsx` | Connexion |
| `auth/register.php` | `Register.jsx` | Inscription |
| `commande/commandes.php` | `Orders.jsx` | Historique commandes |
| `commande/detail-commande.php` | `OrderDetail.jsx` | Détail + historique statut |
| `produits/managementProduits.php` | `admin/Products.jsx` | CRUD produits + upload image |
| `stock/listeStock.php` | `admin/Stock.jsx` | Vue stock complète (nouveau : grille interactive) |
| `commande/gestionCommandes.php` | `admin/Orders.jsx` | Gestion commandes |
| *(nouveau)* | `admin/Dashboard.jsx` | Tableau de bord statistiques |
| *(nouveau)* | `admin/Users.jsx` | Gestion utilisateurs et rôles |

---

## Plan pédagogique — 6 étapes

| Étape | Mission | Notion apprise |
|-------|---------|----------------|
| S1 | Audit sécurité OWASP | Sécurité web, bonnes pratiques PHP |
| S2 | Schéma PostgreSQL | Modélisation BDD, SQL avancé |
| S2–S3 | Scripts migrate.js / seed.js | Node.js, async/await, npm, Faker |
| S3 | Backend Express — API REST | REST, JWT, middleware, MVC, Swagger |
| S3–S4 | Frontend React | Composants, hooks, routing, Context API |
| S4 | Tests + Documentation | Jest, Supertest, Postman, README |

---

## Tests

```bash
cd backend
npm test              # Tous les tests
npm test -- --coverage # Avec couverture de code
```

La suite de tests couvre : authentification, produits, panier, commandes, administration, sécurité.

---

## Variables d'environnement

Copier `backend/.env.example` en `backend/.env` et renseigner :

```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=ecommerce

JWT_SECRET=changez_ce_secret_en_production_minimum_32_chars
JWT_EXPIRES_IN=24h

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```
