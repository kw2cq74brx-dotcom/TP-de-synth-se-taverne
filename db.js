// Fichier : db.js
// RÔLE : créer UNE SEULE FOIS le pool de connexions vers PostgreSQL (Neon)
// et le partager avec tous les autres fichiers (server.js, init-db.js...).
// On isole ça dans un fichier dédié pour garder server.js lisible :
// server.js s'occupe des routes, db.js s'occupe de la base.

// Charge le fichier .env dans process.env (DATABASE_URL, PORT...).
// À appeler AVANT de lire process.env, sinon les variables valent undefined.
require("dotenv").config();

// On récupère uniquement la classe Pool du package "pg" (déstructuration { }).
const { Pool } = require("pg");

// ⚠️ CORRIGÉ : il y avait ici `const pool = require("./db");`
// -> un fichier qui s'importe lui-même ! En plus, `pool` était déclaré deux fois,
//    ce qui provoque une SyntaxError et empêche le serveur de démarrer.
//    L'import `require("./db")` se fait dans server.js, pas ici.

// Création du bassin de connexions.
// ⚠️ CORRIGÉ : `newPool(...)` -> `new Pool(...)` (le mot-clé `new` + un espace).
// `new` sert à construire un objet à partir d'une classe.
// POURQUOI UN POOL ET PAS UN CLIENT ? Le pool garde plusieurs connexions ouvertes
// et les réutilise : beaucoup plus rapide quand plusieurs requêtes arrivent en même temps.
const pool = new Pool({
  // L'URL secrète est lue depuis .env : elle n'apparaît JAMAIS dans le code.
  connectionString: process.env.DATABASE_URL,
  // Neon impose une connexion chiffrée (SSL).
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test de connexion au démarrage (optionnel mais pratique pour déboguer).
// pool.connect() emprunte une connexion ; release() la rend au pool.
// Si on oublie release(), la connexion reste "bloquée" et le pool finit par saturer.
pool.connect((err, client, release) => {
  if (err) {
    console.error("Erreur de connexion à la base Neon :", err.message);
  } else {
    console.log("✅ Connecté avec succès à la base de données PostgreSQL !");
    release();
  }
});

// On exporte le pool : tout fichier qui fait `require("./db")` reçoit CE pool.
module.exports = pool;
