-- Fichier : schema.sql
-- Ce fichier crée la table des PNJ.
-- On le lance avec : npm run init-db (ou dans l'éditeur SQL de Neon).
-- "IF NOT EXISTS" : si la table existe déjà, rien n'est modifié.

CREATE TABLE IF NOT EXISTS Personnage (
    id     SERIAL PRIMARY KEY,                          -- numéro créé automatiquement (1, 2, 3...)
    nom    VARCHAR(100) NOT NULL,                       -- NOT NULL = champ obligatoire
    classe VARCHAR(50)  NOT NULL,
    niveau INTEGER      NOT NULL DEFAULT 1 CHECK (niveau >= 1)  -- le niveau doit être au moins 1
);

-- On ajoute 3 PNJ de départ, seulement si la table est vide.
INSERT INTO Personnage (nom, classe, niveau)
SELECT * FROM (VALUES
    ('Gimli',   'Guerrier', 10),
    ('Gandalf', 'Mage',     20),
    ('Legolas', 'Archer',   15)
) AS v(nom, classe, niveau)
WHERE NOT EXISTS (SELECT 1 FROM Personnage);
