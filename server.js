
// On charge le fichier .env.
require("dotenv").config();

// On importe Express.
const express = require("express");

// On importe la connexion à la base de données (fichier db.js).
const pool = require("./db");

// On crée l'application.
const app = express();

// On prend le port écrit dans le .env.
// S'il n'y en a pas, on utilise 3000.
const PORT = process.env.PORT || 3000;

// Ce middleware permet de lire le JSON envoyé par le client.
// Sans lui, req.body est vide (undefined).
// Il doit être placé avant les routes.
app.use(express.json());
function estUnIdValide(valeur) {
  return /^\d+$/.test(valeur) && Number(valeur) > 0;
}

// ---------------------------------------------------------------
// GET /api/pnj : afficher tous les PNJ
// GET sert à lire des données. Il ne modifie rien.
// ---------------------------------------------------------------
// "async" veut dire que la fonction va attendre la base de données.
app.get("/api/pnj", async (req, res) => {
  // "try" : on essaie d'exécuter le code.
  // En cas de problème, on passe dans "catch" et le serveur ne plante pas.
  try {
    // "await" attend la réponse de la base avant de continuer.
    const resultat = await pool.query("SELECT * FROM Personnage ORDER BY id");
    res.status(200).json(resultat.rows);
  } catch (erreur) {
    console.error("Erreur GET /api/pnj :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// ---------------------------------------------------------------
// GET /api/pnj/:id : afficher un seul PNJ
// ":id" est une variable dans l'URL. Exemple : /api/pnj/2
// ---------------------------------------------------------------
app.get("/api/pnj/:id", async (req, res) => {
  try {
    // On récupère l'id écrit dans l'URL.
    const idSaisi = req.params.id;

    // Si l'id n'est pas valide, on arrête ici.
    // Code 400 = le client a envoyé une mauvaise demande.
    if (!estUnIdValide(idSaisi)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }

    const resultat = await pool.query(
      "SELECT * FROM Personnage WHERE id = $1",
      [idSaisi],
    );

    if (resultat.rows.length === 0) {
      return res
        .status(404)
        .json({ erreur: "PNJ introuvable dans la Taverne" });
    }

    // On renvoie le PNJ trouvé (la première ligne).
    res.status(200).json(resultat.rows[0]);
  } catch (erreur) {
    console.error("Erreur GET /api/pnj/:id :", erreur.message);
    res
      .status(500)
      .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
  }
});

// ---------------------------------------------------------------
// POST /api/pnj : créer un nouveau PNJ
// ---------------------------------------------------------------
app.post("/api/pnj", async (req, res) => {
  try {
    // On récupère nom, classe et niveau envoyés par le client.
    const { nom, classe, niveau } = req.body;
    if (typeof nom !== "string" || nom.trim() === "") {
      return res.status(400).json({ erreur: "Le champ 'nom' est obligatoire" });
    }
    // La classe doit être un texte, et pas vide.
    if (typeof classe !== "string" || classe.trim() === "") {
      return res
        .status(400)
        .json({ erreur: "Le champ 'classe' est obligatoire" });
    }
    // Le niveau doit être un nombre entier, au minimum 1.
    if (!Number.isInteger(niveau) || niveau < 1) {
      return res.status(400).json({
        erreur: "Le champ 'niveau' est obligatoire et doit être un entier ≥ 1",
      });
    }

    // On ajoute le PNJ dans la base.
    const resultat = await pool.query(
      "INSERT INTO Personnage (nom, classe, niveau) VALUES ($1, $2, $3) RETURNING *",
      [nom.trim(), classe.trim(), niveau],
    );
    const nouveauPnj = resultat.rows[0];

    // Code 201 = la création a réussi.
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

// ---------------------------------------------------------------
// PATCH /api/pnj/:id : changer le niveau d'un PNJ
// ---------------------------------------------------------------
app.patch("/api/pnj/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const nouveauNiveau = req.body.niveau;

    // On vérifie l'id et le niveau.
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

    // On modifie le niveau dans la base.
    const resultat = await pool.query(
      "UPDATE Personnage SET niveau = $1 WHERE id = $2 RETURNING *",
      [nouveauNiveau, id],
    );

    // rowCount donne le nombre de lignes modifiées.
    // Si c'est 0, aucun PNJ n'a cet id.
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

// ---------------------------------------------------------------
// DELETE /api/pnj/:id : supprimer un PNJ
// ---------------------------------------------------------------
app.delete("/api/pnj/:id", async (req, res) => {
  try {
    const idCible = req.params.id;

    if (!estUnIdValide(idCible)) {
      return res
        .status(400)
        .json({ erreur: "L'identifiant doit être un nombre entier positif" });
    }

    // On supprime le PNJ dans la base.
    const resultat = await pool.query(
      "DELETE FROM Personnage WHERE id = $1",
      [idCible],
    );

    // Si rien n'a été supprimé, le PNJ n'existait pas.
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

// ---------------------------------------------------------------
// Gestion des erreurs générales
// But : toujours répondre en JSON, même en cas d'erreur.
// ---------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ erreur: "Cette route n'existe pas dans la Taverne" });
});

// Ce bloc attrape les autres erreurs.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ erreur: "Le corps de la requête n'est pas un JSON valide" });
  }
  console.error("Erreur inattendue :", err.message);
  res
    .status(500)
    .json({ erreur: "Une erreur interne est survenue dans la Taverne" });
});

// On démarre le serveur sur le port choisi.
app.listen(PORT, () => {
  console.log(
    `Le serveur de la Taverne est ouvert sur http://localhost:${PORT}`,
  );
});
