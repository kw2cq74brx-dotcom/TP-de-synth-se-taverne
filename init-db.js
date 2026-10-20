// Fichier : init-db.js
// Petit script utilitaire (lancé à la main : `npm run init-db`) qui exécute schema.sql sur Neon.
// QUAND L'UTILISER ? Une seule fois, pour créer la table. Ce n'est PAS le serveur :
// il se connecte, exécute le SQL, puis s'arrête.
const fs = require("fs");
const pool = require("./db");

async function init() {
  try {
    // On lit le fichier SQL comme du texte brut...
    const sql = fs.readFileSync(__dirname + "/schema.sql", "utf8");
    // ...et on l'envoie à PostgreSQL. Pas de données utilisateur ici,
    // donc pas de risque d'injection : pas besoin de $1, $2.
    await pool.query(sql);
    const resultat = await pool.query("SELECT COUNT(*) FROM Personnage");
    console.log(`Table Personnage prête (${resultat.rows[0].count} PNJ).`);
  } catch (erreur) {
    console.error("Échec de l'initialisation :", erreur.message);
  } finally {
    // finally s'exécute TOUJOURS (succès ou erreur) : on ferme le pool
    // sinon le script resterait bloqué, connecté à la base.
    await pool.end();
  }
}

init();
