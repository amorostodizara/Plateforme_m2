# Plateforme de suivi des activités de formation

Application web permettant de gérer et de suivre les activités de formation, depuis la création des formations et des sessions jusqu'au suivi des inscriptions, des présences, des évaluations et à la délivrance des attestations.

## 🎯 Objectif du projet

La plateforme a pour objectif de centraliser la gestion et le suivi des activités de formation au sein d'une même application.

Elle permet notamment de :

* gérer les formations et leurs sessions ;
* gérer les formateurs, participants et responsables ;
* publier et consulter le catalogue des formations ;
* gérer les inscriptions aux formations ;
* suivre les présences et les absences ;
* organiser et gérer les évaluations ;
* générer et vérifier les attestations ;
* afficher les activités dans un agenda ;
* publier des actualités ;
* faciliter la communication entre les utilisateurs ;
* fournir un assistant IA pour répondre aux questions des utilisateurs ;
* gérer les rôles et les permissions.

---

## 🏗️ Architecture générale

L'application est développée avec une architecture moderne basée sur :

```text
┌─────────────────────────────────────────────┐
│                 Frontend                    │
│            React + TypeScript               │
│                                             │
│       TanStack Start + TanStack Router      │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              Services Backend               │
│                                             │
│       TanStack Start Server Functions       │
│                                             │
│  Supabase Auth │ Supabase API │ OpenAI API  │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  Supabase                   │
│                                             │
│ PostgreSQL │ Auth │ Storage │ Row Level     │
│                         Security (RLS)       │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Technologies utilisées

### Frontend

* React
* TypeScript
* TanStack Start
* TanStack Router
* TanStack Query
* Tailwind CSS
* Radix UI
* Lucide React
* React Hook Form
* Zod

### Backend et données

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Storage
* Drizzle ORM
* Drizzle Kit

### Intelligence artificielle

* OpenAI API
* Assistant IA basé sur les données et les ressources de la plateforme

### Autres bibliothèques

* Recharts
* date-fns
* React Day Picker
* Sonner
* jsPDF
* QRCode
* html5-qrcode
* Nodemailer
* Embla Carousel
* React Resizable Panels

---

## 👥 Rôles utilisateurs

La plateforme prévoit plusieurs rôles :

| Rôle           | Description                                 |
| -------------- | ------------------------------------------- |
| Administrateur | Administration générale de la plateforme    |
| Responsable    | Gestion et suivi des activités de formation |
| Formateur      | Gestion et animation des formations         |
| Participant    | Inscription et participation aux formations |

Les accès aux fonctionnalités sont contrôlés par un système de rôles et de permissions.

---

## 📚 Principales fonctionnalités

### Dashboard

Le tableau de bord permet de consulter les indicateurs liés aux activités de formation :

* nombre d'inscrits ;
* nombre de bénéficiaires ;
* formations réalisées ;
* formateurs en collaboration ;
* attestations distribuées ;
* évolution des inscriptions et des bénéficiaires ;
* taux de participation ;
* répartition par genre ;
* répartition par catégorie ;
* statistiques par formation.

### Formations

Gestion :

* des formations ;
* des sessions ;
* des catégories ;
* des formateurs ;
* des dates ;
* des lieux ;
* du nombre de séances par jour ;
* du statut des sessions.

### Catalogue

Le catalogue permet de présenter les formations disponibles et de permettre aux participants de consulter les informations et de s'inscrire.

### Inscriptions

Gestion du cycle d'inscription :

```text
En attente
    ↓
Acceptée / Refusée / Liste d'attente
    ↓
Participation
    ↓
Évaluation
    ↓
Attestation
```

### Présences

Le suivi des présences peut être effectué :

* par QR Code ;
* manuellement ;
* automatiquement selon les fonctionnalités disponibles.

Les statuts comprennent notamment :

* Présent ;
* Absent ;
* Retard ;
* Excusé.

### Évaluations

La plateforme permet de créer des évaluations comprenant notamment :

* questions à choix unique ;
* questions à choix multiples ;
* vrai ou faux.

### Attestations

Une attestation peut être générée lorsque les conditions prévues par la plateforme sont satisfaites, notamment la participation et la validation de l'évaluation.

Les attestations peuvent être vérifiées à l'aide d'un identifiant ou d'un QR Code de vérification.

### Agenda

L'agenda permet de visualiser les sessions de formation programmées.

Les formations gérées dans l'espace d'administration peuvent apparaître dans l'agenda indépendamment de leur publication dans le catalogue.

### Fil d'actualité

Le fil d'actualité permet de publier des informations et des contenus destinés aux utilisateurs selon leur niveau de visibilité.

### Assistant IA

Un assistant IA est intégré à la plateforme afin de répondre aux questions des utilisateurs concernant notamment :

* les formations disponibles ;
* les inscriptions ;
* les dates de formation ;
* les sessions ;
* les présences ;
* les absences et retards ;
* les évaluations ;
* les attestations ;
* les informations générales de la plateforme.

L'assistant peut combiner les ressources documentaires de la plateforme avec les données métier accessibles selon les permissions de l'utilisateur.

---

## 🔐 Authentification

L'authentification est assurée par Supabase Auth.

La plateforme peut utiliser :

* authentification par email ;
* authentification Google ;
* gestion des sessions ;
* vérification de l'adresse email ;
* gestion des rôles et permissions.

L'identité Supabase est associée à l'utilisateur applicatif via `auth_user_id`.

---

## 🗄️ Base de données

La base de données utilise PostgreSQL via Supabase.

La gestion du schéma et des migrations est réalisée avec Drizzle ORM et Drizzle Kit.

Les principales entités comprennent notamment :

```text
UTILISATEUR
ROLE
PERMISSION
FORMATION
SESSION
FORMATEUR
PARTICIPANT
INSCRIPTION
PRESENCE
EVALUATION
QUESTION
TENTATIVE_EVALUATION
ATTESTATION
CATEGORIE_FORMATION
ACTUALITE
AI_CONVERSATION
AI_MESSAGE
AI_FEEDBACK
```

---

## 🔒 Sécurité

La sécurité de l'application repose notamment sur :

* Supabase Auth ;
* Row Level Security (RLS) ;
* système de rôles et permissions ;
* séparation entre les clés publiques et les clés secrètes ;
* validation des données avec Zod ;
* authentification côté serveur pour les opérations sensibles ;
* utilisation de la clé Service Role uniquement côté serveur.

### ⚠️ Variables sensibles

La clé suivante ne doit jamais être exposée au frontend :

```env
SUPABASE_SERVICE_ROLE_KEY
```

Elle doit uniquement être utilisée dans le code serveur.

De même, la clé API OpenAI doit rester côté serveur :

```env
OPENAI_API_KEY
```

---

## ⚙️ Installation

### Prérequis

Installer :

* Node.js ;
* npm ;
* un projet Supabase ;
* les variables d'environnement nécessaires.

### Installation des dépendances

```bash
npm install
```

### Lancer le serveur de développement

```bash
npm run dev
```

L'application est disponible par défaut sur :

```text
http://localhost:5173
```

---

## 🔑 Variables d'environnement

Créer un fichier `.env` à la racine du projet.

Exemple :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=

DATABASE_URL=
DB_MIGRATION_URL=
```

Les valeurs réelles ne doivent jamais être ajoutées au dépôt Git.

---

## 🧩 Scripts disponibles

```bash
# Développement
npm run dev

# Génération des routes
npm run generate-routes

# Build de production
npm run build

# Prévisualisation du build
npm run preview

# Vérification ESLint
npm run lint

# Formatage
npm run format

# Vérification du formatage
npm run check
```

---

## 🗂️ Gestion des migrations

Les modifications du schéma de base de données sont gérées avec Drizzle.

Les migrations sont générées avec :

```bash
npx drizzle-kit generate
```

Puis appliquées à la base de données avec la configuration prévue pour le projet.

Le schéma de la base de données doit rester synchronisé avec les fichiers Drizzle.

---

## 🚀 Déploiement

Avant un déploiement en production :

1. vérifier les variables d'environnement ;
2. vérifier les migrations de base de données ;
3. vérifier les règles RLS ;
4. vérifier les permissions utilisateurs ;
5. effectuer un build de production ;
6. tester l'authentification ;
7. tester les fonctionnalités sensibles ;
8. vérifier que les clés secrètes ne sont pas exposées côté client.

---

## 📌 État du projet

Projet en cours de développement.

Les différentes fonctionnalités sont progressivement intégrées et testées avant la mise en production.

---

## 📄 Licence

Projet développé dans le cadre d'un projet académique et professionnel.
