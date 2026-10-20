-- Fichier : schema.sql
-- Structure de la base "La Taverne aux PNJ".
-- À exécuter UNE fois (dans l'éditeur SQL de Neon, ou via : node init-db.js).
-- "IF NOT EXISTS" : si la table existe déjà, PostgreSQL ne fait rien (aucune donnée écrasée).

CREATE TABLE IF NOT EXISTS Personnage (
    id     SERIAL PRIMARY KEY,                          -- SERIAL = entier auto-incrémenté (1, 2, 3...) géré par PostgreSQL
    nom    VARCHAR(100) NOT NULL,                       -- NOT NULL = champ obligatoire
    classe VARCHAR(50)  NOT NULL,
    niveau INTEGER      NOT NULL DEFAULT 1 CHECK (niveau >= 1)  -- CHECK = la base refuse un niveau < 1
);

-- Quelques PNJ de départ, insérés seulement si la table est vide
INSERT INTO Personnage (nom, classe, niveau)
SELECT * FROM (VALUES
    ('Gimli',   'Guerrier', 10),
    ('Gandalf', 'Mage',     20),
    ('Legolas', 'Archer',   15)
) AS v(nom, classe, niveau)
WHERE NOT EXISTS (SELECT 1 FROM Personnage);
