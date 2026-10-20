// Fichier : db.js
// Ce fichier crée la connexion à la base de données Neon.
// Les autres fichiers l'utilisent avec : require("./db")

// On charge le fichier .env pour lire DATABASE_URL.
require("dotenv").config();

// On importe l'outil Pool du package "pg".
const { Pool } = require("pg");

// On crée le pool de connexions.
// Un pool garde plusieurs connexions ouvertes et les réutilise.
// C'est plus rapide que d'ouvrir une connexion à chaque requête.
const pool = new Pool({
  // L'adresse de la base vient du .env.
  // Le mot de passe n'est donc jamais écrit dans le code.
  connectionString: process.env.DATABASE_URL,
  // Neon demande une connexion sécurisée (SSL).
  ssl: {
    rejectUnauthorized: false,
  },
});

// On teste la connexion au démarrage.
pool.connect((err, client, release) => {
  if (err) {
    console.error("Erreur de connexion à la base Neon :", err.message);
  } else {
    console.log("✅ Connecté avec succès à la base de données PostgreSQL !");
    // On rend la connexion au pool pour qu'elle serve à nouveau.
    release();
  }
});

// On partage le pool avec les autres fichiers.
module.exports = pool;
