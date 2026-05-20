# DevShield Platform

Plateforme interne DevShield : suite d'applications web pour la gestion de clients,
la facturation, l'audit de sécurité OWASP, l'onboarding et la supervision d'un honeypot.

## Stack

- **API** : Node.js 20 + Express + PostgreSQL 16
- **Frontend** : React 18 + React Router + Tailwind CSS
- **Infra** : Docker Compose + Caddy (reverse proxy)

## Démarrage local

Prérequis : Docker et Docker Compose.

```bash
cp .env.example .env     # renseigner DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
docker compose up --build
```

L'application est disponible sur http://localhost et l'API sur http://localhost/api/v1.

## Structure

```
packages/api        API REST Express
packages/frontend   Application React
db/                 Initialisation PostgreSQL
scripts/            Setup VPS et déploiement
backups/            Sauvegardes
```

## Licence

Projet propriétaire — DevShield.
