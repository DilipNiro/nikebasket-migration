-- =============================================================
-- Schéma PostgreSQL — NikeBasket E-Commerce
-- Migration depuis MySQL (basketnike) → PostgreSQL (ecommerce)
-- =============================================================
-- Règles de conversion appliquées :
--   INT AUTO_INCREMENT     → SERIAL
--   BIGINT AUTO_INCREMENT  → BIGSERIAL
--   TINYINT(1)             → BOOLEAN
--   DATETIME / TIMESTAMP   → TIMESTAMPTZ
--   ENUM(...)              → VARCHAR(50) avec contrainte CHECK
--   Backticks `table`      → Guillemets "table"
--   LIMIT x, y             → LIMIT y OFFSET x
-- =============================================================

-- Suppression dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS "paiement" CASCADE;
DROP TABLE IF EXISTS "commande_historique" CASCADE;
DROP TABLE IF EXISTS "commande_produits" CASCADE;
DROP TABLE IF EXISTS "commande" CASCADE;
DROP TABLE IF EXISTS "panier" CASCADE;
DROP TABLE IF EXISTS "stock" CASCADE;
DROP TABLE IF EXISTS "produit_images" CASCADE;
DROP TABLE IF EXISTS "produits" CASCADE;
DROP TABLE IF EXISTS "taille" CASCADE;
DROP TABLE IF EXISTS "couleur" CASCADE;
DROP TABLE IF EXISTS "categorie" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- =============================================================
-- Table : user
-- Utilisateurs (clients, employés, admins) avec 2FA
-- =============================================================
CREATE TABLE "user" (
    id                    SERIAL PRIMARY KEY,
    nom                   VARCHAR(100) NOT NULL,
    email                 VARCHAR(100) NOT NULL UNIQUE,
    password              VARCHAR(255) NOT NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    role                  VARCHAR(20)  NOT NULL DEFAULT 'client'
                            CHECK (role IN ('client', 'admin', 'employe')),
    secret                VARCHAR(32),                         -- Secret Google Authenticator
    reset_token_hash      VARCHAR(64) UNIQUE,
    reset_token_expires_at TIMESTAMPTZ,
    password_changed      BOOLEAN DEFAULT FALSE
);

-- Index sur email pour les lookups de login
CREATE INDEX idx_user_email ON "user"(email);

-- =============================================================
-- Table : categorie
-- 5 catégories : Lifestyle, Running, Basketball, Training, Casual
-- =============================================================
CREATE TABLE "categorie" (
    id  SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================================
-- Table : couleur
-- Couleurs disponibles : Rouge, Noir, Blanc, Bleu
-- =============================================================
CREATE TABLE "couleur" (
    id  SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================================
-- Table : taille
-- Pointures : 40 à 50.5
-- =============================================================
CREATE TABLE "taille" (
    id     SERIAL PRIMARY KEY,
    valeur VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================================
-- Table : produits
-- Catalogue avec statut (actif / en_rupture / archive)
-- =============================================================
CREATE TABLE "produits" (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(50)   NOT NULL,
    categorie_id    INTEGER       NOT NULL REFERENCES "categorie"(id) ON DELETE CASCADE,
    description     TEXT,
    prix            DECIMAL(10,2) NOT NULL CHECK (prix >= 0),
    image_url       VARCHAR(255)  NOT NULL,
    image_hover_url VARCHAR(255)  NOT NULL,
    date_sortie     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    quantite        INTEGER       NOT NULL DEFAULT 0 CHECK (quantite >= 0),
    statut          VARCHAR(20)   NOT NULL DEFAULT 'actif'
                        CHECK (statut IN ('actif', 'archive', 'en_rupture'))
);

-- Index pour les filtres fréquents
CREATE INDEX idx_produits_categorie ON "produits"(categorie_id);
CREATE INDEX idx_produits_statut    ON "produits"(statut);
CREATE INDEX idx_produits_prix      ON "produits"(prix);

-- =============================================================
-- Table : produit_images
-- Images supplémentaires par produit (galerie)
-- =============================================================
CREATE TABLE "produit_images" (
    id          SERIAL PRIMARY KEY,
    produit_id  INTEGER      NOT NULL REFERENCES "produits"(id) ON DELETE CASCADE,
    image_url   VARCHAR(255) NOT NULL,
    ordre       INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX idx_produit_images_produit ON "produit_images"(produit_id);

-- =============================================================
-- Table : stock
-- Quantité disponible par produit × taille × couleur
-- =============================================================
CREATE TABLE "stock" (
    id          SERIAL PRIMARY KEY,
    produit_id  INTEGER NOT NULL REFERENCES "produits"(id) ON DELETE CASCADE,
    taille_id   INTEGER NOT NULL REFERENCES "taille"(id)   ON DELETE CASCADE,
    couleur_id  INTEGER NOT NULL REFERENCES "couleur"(id)  ON DELETE CASCADE,
    quantite    INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
    UNIQUE (produit_id, taille_id, couleur_id)
);

CREATE INDEX idx_stock_produit ON "stock"(produit_id);

-- =============================================================
-- Table : panier
-- Articles en panier par utilisateur (identifiés par user+produit+couleur+taille)
-- =============================================================
CREATE TABLE "panier" (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER       NOT NULL REFERENCES "user"(id)     ON DELETE CASCADE,
    produit_id  INTEGER       NOT NULL REFERENCES "produits"(id) ON DELETE CASCADE,
    couleur_id  INTEGER       NOT NULL REFERENCES "couleur"(id)  ON DELETE CASCADE,
    taille_id   INTEGER       NOT NULL REFERENCES "taille"(id)   ON DELETE CASCADE,
    quantite    INTEGER       NOT NULL DEFAULT 1 CHECK (quantite > 0),
    prix        DECIMAL(10,2) NOT NULL,
    ajout_date  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, produit_id, couleur_id, taille_id)
);

CREATE INDEX idx_panier_user ON "panier"(user_id);

-- =============================================================
-- Table : commande
-- Commandes passées avec statut workflow
-- =============================================================
CREATE TABLE "commande" (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER       NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    montant_total DECIMAL(10,2) NOT NULL CHECK (montant_total >= 0),
    commandee_le  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    statut        VARCHAR(20)   NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN (
                        'en_attente', 'payee', 'en_preparation',
                        'expediee', 'livree', 'annulee'
                    ))
);

CREATE INDEX idx_commande_user   ON "commande"(user_id);
CREATE INDEX idx_commande_statut ON "commande"(statut);

-- =============================================================
-- Table : commande_produits
-- Détail des lignes de commande
-- =============================================================
CREATE TABLE "commande_produits" (
    id            SERIAL PRIMARY KEY,
    commande_id   INTEGER       NOT NULL REFERENCES "commande"(id)  ON DELETE CASCADE,
    produit_id    INTEGER       NOT NULL REFERENCES "produits"(id)  ON DELETE CASCADE,
    taille_id     INTEGER       NOT NULL REFERENCES "taille"(id)    ON DELETE CASCADE,
    couleur_id    INTEGER       NOT NULL REFERENCES "couleur"(id)   ON DELETE CASCADE,
    quantite      INTEGER       NOT NULL CHECK (quantite > 0),
    prix_unitaire DECIMAL(10,2) NOT NULL CHECK (prix_unitaire >= 0)
);

CREATE INDEX idx_commande_produits_commande ON "commande_produits"(commande_id);

-- =============================================================
-- Table : commande_historique
-- Journal des changements de statut d'une commande
-- =============================================================
CREATE TABLE "commande_historique" (
    id            SERIAL PRIMARY KEY,
    commande_id   INTEGER     NOT NULL REFERENCES "commande"(id) ON DELETE CASCADE,
    ancien_statut VARCHAR(20),
    nouveau_statut VARCHAR(20) NOT NULL,
    modifie_par   INTEGER     REFERENCES "user"(id) ON DELETE SET NULL,
    modifie_le    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historique_commande ON "commande_historique"(commande_id);

-- =============================================================
-- Table : paiement
-- Enregistrement des paiements (Stripe PaymentIntent)
-- =============================================================
CREATE TABLE "paiement" (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER       NOT NULL REFERENCES "user"(id)     ON DELETE CASCADE,
    commande_id      INTEGER       NOT NULL REFERENCES "commande"(id) ON DELETE CASCADE,
    mode_paiement    VARCHAR(50)   NOT NULL DEFAULT 'carte',
    montant          DECIMAL(10,2) NOT NULL CHECK (montant >= 0),
    date_paiement    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    statut_paiement  VARCHAR(20)   NOT NULL DEFAULT 'en_attente'
                        CHECK (statut_paiement IN ('en_attente', 'succes', 'echec', 'rembourse')),
    transaction_id   VARCHAR(255) UNIQUE   -- Stripe PaymentIntent ID
);

CREATE INDEX idx_paiement_commande ON "paiement"(commande_id);
CREATE INDEX idx_paiement_user     ON "paiement"(user_id);

-- =============================================================
-- Données de référence initiales
-- =============================================================

-- Catégories
INSERT INTO "categorie" (nom) VALUES
    ('Lifestyle'),
    ('Running'),
    ('Basketball'),
    ('Training'),
    ('Casual');

-- Couleurs
INSERT INTO "couleur" (nom) VALUES
    ('Rouge'),
    ('Noir'),
    ('Blanc'),
    ('Bleu');

-- Tailles (pointures 40 à 50.5)
INSERT INTO "taille" (valeur) VALUES
    ('40'), ('40.5'), ('41'), ('41.5'), ('42'), ('42.5'),
    ('43'), ('43.5'), ('44'), ('44.5'), ('45'), ('45.5'),
    ('46'), ('47'), ('47.5'), ('48'), ('48.5'), ('49'),
    ('49.5'), ('50'), ('50.5');
