// =====================================================================
//  Fichier : server.js — Point d'entrée de l'API REST "La Taverne"
// =====================================================================

// Charge le fichier .env dans process.env. Toujours en LIGNE 1 :
// tout le code qui suit peut alors lire process.env.DATABASE_URL, process.env.PORT...
require("dotenv").config();

// 1. On importe la bibliothèque Express
const express = require("express");

// ⚠️ CORRIGÉ : il manquait cet import ! La route GET utilisait `pool.query(...)`
// alors que `pool` n'existait pas dans ce fichier -> "ReferenceError: pool is not defined".
// require("./db") exécute db.js et récupère ce qu'il exporte (module.exports = pool).
const pool = require("./db");

// 2. On instancie l'application
const app = express();

// ⚠️ AMÉLIORÉ : le port vient du .env (bonne pratique, cf. Mini-exercice 3).
// `||` = valeur de secours : si PORT n'est pas défini dans .env, on prend 3000.
const PORT = process.env.PORT || 3000;

// MIDDLEWARE express.json()
// QUAND ? Toujours, dès que l'API reçoit du JSON (POST, PUT, PATCH).
// Sans lui, req.body vaut undefined. Il doit être placé AVANT les routes,
// car Express exécute les app.use / app.get... dans l'ordre du fichier.
app.use(express.json());

// ---------------------------------------------------------------------
// Fonction utilitaire : vérifier qu'un id d'URL est un entier positif.
// POURQUOI ? req.params.id est TOUJOURS une chaîne ("45", "abc"...).
// Si on envoie "abc" à PostgreSQL pour une colonne INTEGER, il lève une
// erreur -> on renverrait un 500 alors que c'est la faute du client (400).
// ---------------------------------------------------------------------
function estUnIdValide(valeur) {
  return /^\d+$/.test(valeur) && Number(valeur) > 0;
}

// =====================================================================
//  FONCTIONNALITÉ 1 : Le Registre de la Taverne
//  GET /api/pnj -> liste complète des PNJ
//  GET = LIRE (équivalent SQL : SELECT). Ne modifie jamais la base.
// =====================================================================
// `async` : la fonction contient des opérations longues (appel réseau vers Neon).
app.get("/api/pnj", async (req, res) => {
  // try / catch : si Neon est en panne ou si le SQL est faux, l'erreur est
  // "attrapée" dans le catch au lieu de faire planter tout le serveur.
  try {
    // `await` : on ATTEND la réponse de PostgreSQL avant de passer à la ligne suivante.
    // Pas de donnée utilisateur dans cette requête -> pas besoin de $1.
    // ORDER BY id : un ordre stable, plus agréable pour le Front-end.
    const resultat = await pool.query("SELECT * FROM Personnage ORDER BY id");

    // ⚠️ CORRIGÉ : avant, tu renvoyais le tableau "inventaire" écrit en dur
    // et le résultat SQL était ignoré. Les vraies lignes sont dans resultat.rows.
    res.status(200).json(resultat.rows);
  } catch (erreur) {
    // 1. Pour nous (développeurs) : le détail technique dans le terminal.
    console.error("Erreur GET /api/pnj :", erreur.message);
    // 2. Pour le client : un message neutre, sans détails piratables.
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// =====================================================================
//  GET /api/pnj/:id -> la fiche d'UN PNJ (vu dans le cours, partie 4.C)
//  `:id` = paramètre dynamique, lu avec req.params.id.
//  QUAND utiliser req.params ? Pour IDENTIFIER une ressource précise (GET, DELETE, PATCH).
// =====================================================================
app.get("/api/pnj/:id", async (req, res) => {
  try {
    const idSaisi = req.params.id;

    if (!estUnIdValide(idSaisi)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }

    // REQUÊTE PARAMÉTRÉE : $1 est un "marque-place", la valeur est passée à part
    // dans le tableau [idSaisi]. Le pilote pg empêche ainsi toute injection SQL.
    // QUAND ? DÈS QU'UNE donnée vient du client (params, body, query). Toujours.
    const resultat = await pool.query(
      "SELECT * FROM Personnage WHERE id = $1",
      [idSaisi],
    );

    // Aucune ligne trouvée -> 404 Not Found.
    // Le `return` arrête la fonction : sinon Express essaierait d'envoyer
    // une 2e réponse plus bas (erreur "Cannot set headers after they are sent").
    if (resultat.rows.length === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    res.status(200).json(resultat.rows[0]); // un seul PNJ -> un objet, pas un tableau
  } catch (erreur) {
    console.error("Erreur GET /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// =====================================================================
//  FONCTIONNALITÉ 2 : L'Enrôlement d'une recrue
//  POST /api/pnj -> crée un PNJ à partir du corps de la requête (req.body)
//  POST = CRÉER (équivalent SQL : INSERT). Succès -> 201 Created.
//  QUAND utiliser req.body ? Pour ENVOYER des données (création, modification).
// =====================================================================
app.post("/api/pnj", async (req, res) => {
  try {
    // Déstructuration : équivaut à
    //   const nom = req.body.nom; const classe = req.body.classe; const niveau = req.body.niveau;
    // ⚠️ CORRIGÉ : `niveau` n'était pas extrait, alors que le TP le demande.
    const { nom, classe, niveau } = req.body;

    // ---------- BONUS D'ARCHITECTURE : validation AVANT d'appeler Neon ----------
    // POURQUOI ? Inutile de faire un aller-retour réseau vers la base pour une
    // requête qu'on sait déjà invalide. On répond 400 Bad Request (faute du client).
    // typeof ... !== "string" : refuse aussi les nombres, null, undefined...
    // .trim() : enlève les espaces, pour refuser un nom composé uniquement d'espaces "   ".
    if (typeof nom !== "string" || nom.trim() === "") {
      return res.status(400).json({ erreur: "Le champ 'nom' est obligatoire" });
    }
    if (typeof classe !== "string" || classe.trim() === "") {
      return res
        .status(400)
        .json({ erreur: "Le champ 'classe' est obligatoire" });
    }
    // Number.isInteger : vrai pour 10, faux pour "10", 2.5, undefined...
    if (!Number.isInteger(niveau) || niveau < 1) {
      return res.status(400).json({
        erreur: "Le champ 'niveau' est obligatoire et doit être un entier ≥ 1",
      });
    }
    // ---------------------------------------------------------------------------

    // 3 valeurs -> 3 marque-places ($1, $2, $3), dans le MÊME ordre que le tableau.
    // RETURNING * : PostgreSQL renvoie la ligne créée (avec son id généré),
    // on évite ainsi un second SELECT pour connaître l'id du nouveau PNJ.
    const resultat = await pool.query(
      "INSERT INTO Personnage (nom, classe, niveau) VALUES ($1, $2, $3) RETURNING *",
      [nom.trim(), classe.trim(), niveau],
    );
    const nouveauPnj = resultat.rows[0];

    res.status(201).json({
      message: `${nouveauPnj.nom} le ${nouveauPnj.classe} a rejoint la taverne !`,
      pnj: nouveauPnj,
    });
  } catch (erreur) {
    console.error("Erreur POST /api/pnj :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// =====================================================================
//  MINI-EXERCICE 4 (version REST) : modifier le niveau d'un PNJ
//  PATCH /api/pnj/:id   body : { "niveau": 12 }
//  PATCH = modifier UN champ précis (PUT remplacerait l'objet entier).
//  L'id est dans l'URL (il identifie la ressource), la nouvelle valeur dans le body.
// =====================================================================
app.patch("/api/pnj/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const nouveauNiveau = req.body.niveau;

    if (!estUnIdValide(id)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }
    if (!Number.isInteger(nouveauNiveau) || nouveauNiveau < 1) {
      return res
        .status(400)
        .json({ erreur: "Le champ 'niveau' doit être un entier ≥ 1" });
    }

    const resultat = await pool.query(
      "UPDATE Personnage SET niveau = $1 WHERE id = $2 RETURNING *",
      [nouveauNiveau, id],
    );

    // rowCount = nombre de lignes modifiées. 0 -> aucun PNJ avec cet id.
    if (resultat.rowCount === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    res
      .status(200)
      .json({ message: "Niveau mis à jour !", pnj: resultat.rows[0] });
  } catch (erreur) {
    console.error("Erreur PATCH /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// =====================================================================
//  MINI-EXERCICE 2 : supprimer un PNJ
//  DELETE /api/pnj/:id -> succès : 200 OK
// ⚠️ CORRIGÉ : ta route était `app.delete("/api/pnj")` avec l'id lu dans req.body.
//   L'exercice demande l'id DANS L'URL (/api/pnj/:id) et une constante `idCible`.
//   Convention REST : l'URL désigne la ressource ciblée, le verbe dit quoi en faire.
//   (Certains outils n'envoient d'ailleurs pas de body avec DELETE.)
// =====================================================================
app.delete("/api/pnj/:id", async (req, res) => {
  try {
    const idCible = req.params.id;

    if (!estUnIdValide(idCible)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }

    const resultat = await pool.query(
      "DELETE FROM Personnage WHERE id = $1",
      [idCible],
    );

    if (resultat.rowCount === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    res.status(200).json({ message: `Le PNJ numéro ${idCible} a été supprimé` });
  } catch (erreur) {
    console.error("Erreur DELETE /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// =====================================================================
//  Garder TOUTES les réponses en JSON (contrainte "Format d'échange")
// =====================================================================

// Route inconnue (ex : GET /api/dragons). Placée APRÈS toutes les routes :
// Express n'arrive ici que si aucune route au-dessus n'a répondu.
// Sans ça, Express renverrait une page HTML "Cannot GET ...".
app.use((req, res) => {
  res.status(404).json({ erreur: "Cette route n'existe pas dans la Taverne" });
});

// Middleware d'erreur : on le reconnaît à ses 4 paramètres (err, req, res, next).
// QUAND est-il utilisé ? Par exemple si le client envoie un JSON mal formé
// ({ "nom": "Gimli", } avec une virgule en trop) : express.json() échoue
// avant même d'atteindre nos routes, donc nos try/catch ne voient rien.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erreur: "Le corps de la requête n'est pas un JSON valide" });
  }
  console.error("Erreur inattendue :", err.message);
  res
    .status(500)
    .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
});

// 3. On demande au serveur d'écouter sur le port défini (toujours en dernier)
app.listen(PORT, () => {
  console.log(
    `Le serveur de la Taverne est ouvert sur http://localhost:${PORT}`,
  );
});
