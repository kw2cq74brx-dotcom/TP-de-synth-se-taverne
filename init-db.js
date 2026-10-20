// Fichier : init-db.js
// Ce script crée la table Personnage dans Neon.
// On le lance une seule fois avec : npm run init-db
// Il exécute le fichier schema.sql, puis il s'arrête.
const fs = require("fs");
const pool = require("./db");

async function init() {
  try {
    // On lit le contenu du fichier schema.sql.
    const sql = fs.readFileSync(__dirname + "/schema.sql", "utf8");
    // On envoie ce SQL à la base.
    await pool.query(sql);
    // On compte les PNJ pour vérifier que tout est bon.
    const resultat = await pool.query("SELECT COUNT(*) FROM Personnage");
    console.log(`Table Personnage prête (${resultat.rows[0].count} PNJ).`);
  } catch (erreur) {
    console.error("Échec de l'initialisation :", erreur.message);
  } finally {
    // "finally" s'exécute toujours, qu'il y ait une erreur ou non.
    // On ferme la connexion pour que le script se termine.
    await pool.end();
  }
}

init();
