# Plateforme de suivi des activités de formation

Application web permettant de gérer et de suivre les activités de formation, depuis la création des formations et des sessions jusqu'au suivi des inscriptions, des présences, des évaluations et à la délivrance des attestations.

## 🎯 Objectif du projet

La plateforme a pour objectif de centraliser la gestion et le suivi des activités de formation au sein d'une même application.

Elle permet notamment de :

- gérer les formations et leurs sessions ;
- gérer les formateurs, participants et responsables ;
- publier et consulter le catalogue des formations ;
- gérer les inscriptions aux formations ;
- suivre les présences et les absences ;
- organiser et gérer les évaluations ;
- générer et vérifier les attestations ;
- afficher les activités dans un agenda ;
- publier des actualités ;
- faciliter la communication entre les utilisateurs ;
- fournir un assistant IA pour répondre aux questions des utilisateurs ;
- gérer les rôles et les permissions.

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

- React
- TypeScript
- TanStack Start
- TanStack Router
- TanStack Query
- Tailwind CSS

### Backend et données

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Drizzle ORM
- Drizzle Kit

### Intelligence artificielle

- OpenAI API
- Assistant IA basé sur les données et les ressources de la plateforme

### Autres bibliothèques

- Recharts
- date-fns
- React Day Picker
- Sonner
- jsPDF
- QRCode
- html5-qrcode
- Nodemailer
- Embla Carousel
- React Resizable Panels

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
