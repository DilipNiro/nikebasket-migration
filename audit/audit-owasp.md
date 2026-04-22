# Audit de sécurité OWASP — Projet NikeBasket (PHP/MySQL)

> Référence : **OWASP Top 10 — 2021**
> Périmètre : lecture complète du code source PHP du projet NikeBasket
> Date : Semaine 1 du stage (février 2026)

---

## Résumé exécutif

Le code PHP de NikeBasket présente des **pratiques globalement saines** pour un projet pédagogique :
utilisation systématique de PDO avec requêtes préparées, hashage des mots de passe via Argon2id,
authentification à deux facteurs (2FA) via Google Authenticator. Quatre failles ont néanmoins
été identifiées — principalement des problèmes de configuration, non des vulnérabilités structurelles.

---

## Tableau de bord des failles

| # | OWASP | Faille | Fichier | Criticité | Statut |
|---|-------|--------|---------|-----------|--------|
| 1 | A05 | Credentials hardcodés en base | `config/dbconnect.php` | 🔴 Haute | Corrigé |
| 2 | A09 | Erreur BDD exposée à l'utilisateur | `config/dbconnect.php` | 🟠 Moyenne | Corrigé |
| 3 | A09 | `var_dump()` en code de production | `auth/functionInsription.php` | 🟠 Moyenne | Corrigé |
| 4 | A07 | Absence de rate limiting sur le login | `auth/functionLogin.php` | 🟡 Faible | Corrigé |

---

## Détail des failles

---

### Faille 1 — A05 : Security Misconfiguration

**Fichier :** `config/dbconnect.php` — Lignes 8–11

#### Code vulnérable

```php
$host     = 'localhost';
$dbname   = 'basketnike';
$username = 'root';
$password = '';
```

#### Criticité : Haute

**Description :** Les identifiants de connexion à la base de données sont hardcodés directement
dans le fichier source. Si ce fichier est exposé (serveur mal configuré, dépôt Git public),
les credentials sont compromis. L'utilisation du compte `root` avec mot de passe vide constitue
une surface d'attaque maximale.

**Risques :**
- Exposition des credentials si le dépôt devient public
- Compte `root` MySQL : accès total à toutes les bases, possibilité de `DROP DATABASE`
- Aucune rotation de mot de passe possible sans modifier le code

#### Correctif appliqué

Déplacement de la configuration vers un fichier `.env` chargé via la bibliothèque `vlucas/phpdotenv`,
et utilisation d'un compte MySQL dédié avec droits restreints.

```php
// config/dbconnect.php — version corrigée
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$host     = $_ENV['DB_HOST'];
$dbname   = $_ENV['DB_NAME'];
$username = $_ENV['DB_USER'];
$password = $_ENV['DB_PASSWORD'];
```

```ini
# .env (jamais commité — ajouté dans .gitignore)
DB_HOST=localhost
DB_NAME=basketnike
DB_USER=basketnike_user
DB_PASSWORD=MotDePasseComplexe!2026
```

---

### Faille 2 — A09 : Security Logging and Monitoring Failures

**Fichier :** `config/dbconnect.php` — Ligne 22

#### Code vulnérable

```php
die("Échec de la connexion : " . $e->getMessage());
```

#### Criticité : Moyenne

**Description :** En cas d'erreur de connexion à la base de données, le message d'exception PDO
(qui peut contenir le nom du serveur, le port, les informations de version MySQL) est affiché
directement à l'utilisateur. Un attaquant peut exploiter ces informations pour cibler son attaque
(ex : `SQLSTATE[HY000] [2002] Connection refused — mysql 8.0.32 on localhost:3306`).

#### Correctif appliqué

Séparation du log interne (fichier de log serveur) et du message générique affiché à l'utilisateur.

```php
// Version corrigée
} catch (PDOException $e) {
    error_log("[DB_ERROR] " . $e->getMessage());
    die("Une erreur interne est survenue. Veuillez réessayer.");
}
```

---

### Faille 3 — A09 : Security Logging (débogage en production)

**Fichier :** `auth/functionInsription.php` — Ligne 45

#### Code vulnérable

```php
var_dump($stmt->errorInfo());
return false;
```

#### Criticité : Moyenne

**Description :** `var_dump()` affiche en clair les informations de débogage PDO, incluant
le code d'erreur SQL, le message SQLSTATE et la requête concernée. En production, cela expose
la structure interne de la base de données.

**Exemple de fuite :**
```
array(3) { [0]=> string(5) "23000" [1]=> int(1062) [2]=> string(67)
"Duplicate entry 'user@example.com' for key 'user.email'" }
```

Un attaquant apprend ainsi : le nom de la table (`user`), le champ unique (`email`),
et peut en déduire la structure de la base.

#### Correctif appliqué

Remplacement par un `error_log()` silencieux pour l'utilisateur.

```php
// Version corrigée
error_log("[INSCRIPTION_ERROR] " . json_encode($stmt->errorInfo()));
return false;
```

---

### Faille 4 — A07 : Identification and Authentication Failures

**Fichier :** `auth/functionLogin.php` — Ligne 55

#### Code vulnérable

```php
echo "<div class='error-message'>Identifiants incorrects.</div>";
return false;
```

#### Criticité : Faible

**Description :** Aucune limitation du nombre de tentatives de connexion (rate limiting).
Le formulaire est donc exposé aux attaques par force brute : un attaquant peut tester des
milliers de combinaisons email/mot de passe sans être bloqué. De plus, le message d'erreur
est rendu via `echo` dans la logique métier, ce qui mélange les responsabilités.

#### Correctif appliqué

Retour d'un code d'erreur depuis la fonction et affichage dans le template.
Ajout d'un compteur de tentatives en session pour bloquer après 5 échecs.

```php
// Version corrigée — functionLogin.php
function login($email, $password) {
    // Initialisation du compteur de tentatives
    if (!isset($_SESSION['login_attempts'])) {
        $_SESSION['login_attempts'] = 0;
        $_SESSION['login_last_attempt'] = time();
    }

    // Blocage après 5 tentatives (10 minutes)
    if ($_SESSION['login_attempts'] >= 5) {
        $elapsed = time() - $_SESSION['login_last_attempt'];
        if ($elapsed < 600) {
            return 'rate_limited';
        }
        $_SESSION['login_attempts'] = 0;
    }

    // ... vérification email/password ...

    if (!password_verify($password, $user['password'])) {
        $_SESSION['login_attempts']++;
        $_SESSION['login_last_attempt'] = time();
        return 'invalid_credentials'; // Code d'erreur, pas echo
    }

    $_SESSION['login_attempts'] = 0;
    return true;
}
```

```php
// login.php — affichage dans le template
$result = login($email, $password);
if ($result === 'rate_limited') {
    $error = "Trop de tentatives. Réessayez dans 10 minutes.";
} elseif ($result === 'invalid_credentials') {
    $error = "Identifiants incorrects.";
}
```

---

## Points positifs constatés

| Pratique | OWASP | Statut |
|----------|-------|--------|
| PDO avec requêtes préparées (protection injection SQL) | A03 | ✅ Conforme |
| Hashage Argon2id via `password_hash()` / `password_verify()` | A02 | ✅ Conforme |
| Authentification 2FA via Google Authenticator | A07 | ✅ Bonne pratique |
| Validation des statuts de commande par liste blanche | A01 | ✅ Conforme |
| Transactions SQL pour le traitement des commandes | A04 | ✅ Bonne pratique |

---

## Conclusion

Le code PHP de NikeBasket est **globalement bien sécurisé pour un projet pédagogique**.
Les failles identifiées relèvent principalement de mauvaises pratiques de configuration,
non de vulnérabilités structurelles. L'audit a permis d'identifier et de corriger les points
de risque avant migration vers la nouvelle architecture Node.js/PostgreSQL.

La nouvelle stack corrige structurellement certaines failles :
- Variables d'environnement via `.env` : standard Node.js (faille 1 → inexistante dans la nouvelle archi)
- Gestion centralisée des erreurs via `errorHandler.js` (failles 2 & 3)
- `express-rate-limit` intégré nativement dans l'API REST (faille 4)
