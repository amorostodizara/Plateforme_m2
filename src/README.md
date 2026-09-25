# Backend

Tout le code serveur de la plateforme est regroupé ici, séparé de l'interface.

| Dossier / fichier | Rôle |
|---|---|
| `src/backend/functions/*.functions.ts` | Logique serveur appelée par les pages (vérification des droits, lecture des données, IA). |
| `src/routes/api/` | Points d'entrée HTTP publics (webhooks, services externes), à créer au besoin. |
| `drizzle/schema.ts` + `drizzle/migrations/` | Structure de la base de données et son historique. |
| `local/` | Backend complet exécutable sur votre machine (base, comptes, fichiers). |
| `src/integrations/supabase/` | Connexion générée automatiquement à la base : ne pas modifier. |

Règles :

- Les pages (`src/routes`, `src/components`) n'accèdent jamais directement aux
  secrets : elles appellent une fonction de `src/backend/functions`.
- Chaque fonction serveur vérifie l'utilisateur et ses droits avant de renvoyer
  des données.
- Les fichiers `*.functions.ts` sont importables depuis l'interface ; les
  fichiers `*.server.ts` restent strictement côté serveur.
