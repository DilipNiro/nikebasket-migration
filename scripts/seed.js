// =============================================================
// scripts/seed.js — Génération de données de test (faker)
// =============================================================
// Usage :
//   node scripts/seed.js                   # 50 lignes par table
//   node scripts/seed.js --rows=100        # 100 lignes par table
//   node scripts/seed.js --table=produits  # Seulement la table produits
//   node scripts/seed.js --format=csv      # Export CSV au lieu de INSERT
//
// Ce script utilise @faker-js/faker en locale française pour
// générer des datasets réalistes à destination des TD étudiants.
// =============================================================

'use strict';

require('dotenv').config({ path: '../.env' });
const { faker } = require('@faker-js/faker/locale/fr');
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const fs = require('fs');

// -- Arguments CLI ------------------------------------------------
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const ROW_COUNT   = parseInt(args.rows  || '50');
const ONLY_TABLE  = args.table  || null;
const FORMAT_CSV  = args.format === 'csv';

// -- Connexion PostgreSQL -----------------------------------------
const pgConfig = {
  host:     process.env.PG_HOST     || 'localhost',
  port:     parseInt(process.env.PG_PORT || '5432'),
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'ecommerce',
};

// -- Générateurs de données ---------------------------------------

/**
 * Génère un utilisateur réaliste (client, employé ou admin).
 * Le mot de passe est hashé avec bcrypt (saltRounds: 10).
 */
async function generateUser() {
  const roles = ['client', 'client', 'client', 'employe', 'admin']; // 60% clients
  return {
    nom:              faker.person.fullName(),
    email:            faker.internet.email().toLowerCase(),
    password:         await bcrypt.hash(faker.internet.password(), 10),
    role:             faker.helpers.arrayElement(roles),
    created_at:       faker.date.between({ from: '2024-01-01', to: new Date() }),
    password_changed: faker.datatype.boolean(),
  };
}

/**
 * Génère un produit Nike fictif avec prix et statut réalistes.
 */
function generateProduit(categorieIds) {
  const modeles = [
    'Air Max 90', 'Air Force 1', 'Air Jordan 1', 'React Infinity',
    'Pegasus 40', 'Zoom Vomero', 'Dunk Low', 'Blazer Mid',
    'Free Run 5', 'Metcon 9', 'LeBron 21', 'KD 16',
  ];
  const statuts = ['actif', 'actif', 'actif', 'en_rupture', 'archive'];

  return {
    nom:             faker.helpers.arrayElement(modeles) + ' ' + faker.number.int({ min: 1, max: 99 }),
    categorie_id:    faker.helpers.arrayElement(categorieIds),
    description:     faker.commerce.productDescription(),
    prix:            parseFloat(faker.commerce.price({ min: 59, max: 249, dec: 2 })),
    image_url:       `/images/product_${faker.number.int({ min: 1, max: 20 })}.webp`,
    image_hover_url: `/images/product_${faker.number.int({ min: 1, max: 20 })}_hover.webp`,
    date_sortie:     faker.date.between({ from: '2023-01-01', to: new Date() }),
    quantite:        faker.number.int({ min: 0, max: 200 }),
    statut:          faker.helpers.arrayElement(statuts),
  };
}

/**
 * Génère une entrée de stock pour un produit × taille × couleur.
 */
function generateStock(produitId, tailleId, couleurId) {
  return {
    produit_id: produitId,
    taille_id:  tailleId,
    couleur_id: couleurId,
    quantite:   faker.number.int({ min: 0, max: 50 }),
  };
}

/**
 * Génère une commande avec montant cohérent.
 */
function generateCommande(userId) {
  const statuts = ['en_attente', 'payee', 'en_preparation', 'expediee', 'livree', 'annulee'];
  return {
    user_id:       userId,
    montant_total: parseFloat(faker.commerce.price({ min: 59, max: 500, dec: 2 })),
    commandee_le:  faker.date.between({ from: '2024-01-01', to: new Date() }),
    statut:        faker.helpers.arrayElement(statuts),
  };
}

// -- Insertion PostgreSQL -----------------------------------------

async function seedUsers(pgClient, count) {
  console.log(`\n→ Génération de ${count} utilisateurs...`);
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await generateUser());
  }

  for (const user of users) {
    try {
      await pgClient.query(
        `INSERT INTO "user" (nom, email, password, role, created_at, password_changed)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [user.nom, user.email, user.password, user.role, user.created_at, user.password_changed]
      );
    } catch (err) {
      // Email dupliqué — ignoré silencieusement
    }
  }
  console.log(`  ✓ ${count} utilisateurs insérés`);
}

async function seedProduits(pgClient, count) {
  console.log(`\n→ Génération de ${count} produits...`);

  // Récupérer les IDs de catégories existantes
  const { rows: cats } = await pgClient.query('SELECT id FROM "categorie"');
  const categorieIds = cats.map(r => r.id);

  for (let i = 0; i < count; i++) {
    const p = generateProduit(categorieIds);
    await pgClient.query(
      `INSERT INTO "produits" (nom, categorie_id, description, prix, image_url, image_hover_url, date_sortie, quantite, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [p.nom, p.categorie_id, p.description, p.prix, p.image_url, p.image_hover_url, p.date_sortie, p.quantite, p.statut]
    );
  }
  console.log(`  ✓ ${count} produits insérés`);
}

async function seedStock(pgClient) {
  console.log('\n→ Génération du stock (produit × taille × couleur)...');

  const { rows: produits } = await pgClient.query('SELECT id FROM "produits" LIMIT 20');
  const { rows: tailles }  = await pgClient.query('SELECT id FROM "taille"');
  const { rows: couleurs } = await pgClient.query('SELECT id FROM "couleur"');

  let count = 0;
  for (const produit of produits) {
    // Chaque produit a 3 tailles × 2 couleurs aléatoires
    const taillesSample  = faker.helpers.arrayElements(tailles,  3);
    const couleursSample = faker.helpers.arrayElements(couleurs, 2);

    for (const taille of taillesSample) {
      for (const couleur of couleursSample) {
        const s = generateStock(produit.id, taille.id, couleur.id);
        try {
          await pgClient.query(
            `INSERT INTO "stock" (produit_id, taille_id, couleur_id, quantite)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (produit_id, taille_id, couleur_id) DO NOTHING`,
            [s.produit_id, s.taille_id, s.couleur_id, s.quantite]
          );
          count++;
        } catch (err) {
          // Conflict ignoré
        }
      }
    }
  }
  console.log(`  ✓ ${count} entrées de stock insérées`);
}

async function seedCommandes(pgClient, count) {
  console.log(`\n→ Génération de ${count} commandes...`);

  const { rows: users }    = await pgClient.query('SELECT id FROM "user" LIMIT 20');
  const { rows: produits } = await pgClient.query('SELECT id, prix FROM "produits" LIMIT 20');
  const { rows: tailles }  = await pgClient.query('SELECT id FROM "taille" LIMIT 5');
  const { rows: couleurs } = await pgClient.query('SELECT id FROM "couleur" LIMIT 2');

  if (users.length === 0 || produits.length === 0) {
    console.log('  ⚠ Pas assez de données pour générer des commandes');
    return;
  }

  for (let i = 0; i < count; i++) {
    const user = faker.helpers.arrayElement(users);
    const cmd  = generateCommande(user.id);

    const { rows: [commande] } = await pgClient.query(
      `INSERT INTO "commande" (user_id, montant_total, commandee_le, statut)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [cmd.user_id, cmd.montant_total, cmd.commandee_le, cmd.statut]
    );

    // Ajouter 1 à 3 produits par commande
    const nbProduits = faker.number.int({ min: 1, max: 3 });
    const produitsSample = faker.helpers.arrayElements(produits, nbProduits);

    for (const p of produitsSample) {
      const taille  = faker.helpers.arrayElement(tailles);
      const couleur = faker.helpers.arrayElement(couleurs);
      const qte     = faker.number.int({ min: 1, max: 3 });

      await pgClient.query(
        `INSERT INTO "commande_produits" (commande_id, produit_id, taille_id, couleur_id, quantite, prix_unitaire)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [commande.id, p.id, taille.id, couleur.id, qte, p.prix]
      );
    }

    // Historique initial
    await pgClient.query(
      `INSERT INTO "commande_historique" (commande_id, ancien_statut, nouveau_statut, modifie_par)
       VALUES ($1, NULL, $2, $3)`,
      [commande.id, cmd.statut, user.id]
    );
  }
  console.log(`  ✓ ${count} commandes insérées`);
}

// -- Comptes de test garantis -------------------------------------

async function seedTestAccounts(pgClient) {
  console.log('\n→ Comptes de test...');
  const accounts = [
    { nom: 'Admin NikeBasket', email: 'admin@nikebasket.fr', password: 'Admin1234!', role: 'admin' },
    { nom: 'Client Test',      email: 'client@nikebasket.fr', password: 'Client1234!', role: 'client' },
  ];
  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.password, 10);
    await pgClient.query(
      `INSERT INTO "user" (nom, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
      [acc.nom, acc.email, hash, acc.role]
    );
    console.log(`  ✓ ${acc.role.padEnd(7)} : ${acc.email} / ${acc.password}`);
  }
}

// -- Export CSV ---------------------------------------------------

function exportCSV(data, filename) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row).map(v =>
      v === null ? '' : `"${String(v).replace(/"/g, '""')}"`
    ).join(',')
  );
  fs.writeFileSync(filename, [headers, ...rows].join('\n'));
  console.log(`  ✓ Export CSV : ${filename}`);
}

// -- Point d'entrée -----------------------------------------------

async function main() {
  console.log(`\n=== Seed NikeBasket (${ROW_COUNT} lignes/table) ===`);
  if (FORMAT_CSV) console.log('Mode : export CSV');

  const pgClient = new Client(pgConfig);
  await pgClient.connect();

  try {
    if (!ONLY_TABLE || ONLY_TABLE === 'user')      await seedUsers(pgClient, ROW_COUNT);
    if (!ONLY_TABLE || ONLY_TABLE === 'produits')  await seedProduits(pgClient, ROW_COUNT);
    if (!ONLY_TABLE || ONLY_TABLE === 'stock')     await seedStock(pgClient);
    if (!ONLY_TABLE || ONLY_TABLE === 'commandes') await seedCommandes(pgClient, ROW_COUNT);

    // -- Comptes de test garantis (toujours créés/mis à jour) -------
    await seedTestAccounts(pgClient);

    console.log('\n=== Seed terminé avec succès ! ===\n');

  } catch (err) {
    console.error('\n✗ Erreur lors du seed :', err.message);
    console.error(err.stack);
    process.exit(1);

  } finally {
    await pgClient.end();
  }
}

main();
