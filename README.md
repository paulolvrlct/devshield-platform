# DevShield Platform

Plateforme interne [DevShield](https://devshield.fr) pour la gestion de clients, la facturation, l'audit de sécurité OWASP, l'onboarding et la supervision d'un honeypot SSH.

Hebergée sur un VPS OVH (Debian 12), sécurisée par WireGuard VPN, conçue pour les artisans et PME.

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Backend** | Node.js 20, Express, PostgreSQL 16, Socket.io, Zod, PDFKit |
| **Frontend** | React 18, React Router v6, Tailwind CSS, Recharts, Leaflet.js |
| **Infra** | Docker Compose, Caddy (HTTPS auto), WireGuard (VPN admin) |
| **Sécurité** | JWT (httpOnly cookies), bcrypt, Helmet, CORS, rate limiting |

## Fonctionnalités

### 1. Authentification
- Login / Register avec JWT (access token 15min + refresh token 7j)
- Tokens stockés en cookies httpOnly sécurisés
- Rate limiting sur les tentatives de connexion

### 2. Formulaire d'onboarding
- Formulaire multi-étapes (entreprise, projet, design, confirmation)
- Route publique accessible sans authentification
- Vue admin pour consulter et gérer les soumissions

### 3. Gestion clients et facturation
- CRUD clients avec recherche
- Création de devis et factures avec packs prédéfinis (Landing Page / Essentiel / Optimal)
- Numérotation automatique (YYYY-NNN)
- Génération de PDF brandés DevShield avec mentions légales
- Gestion des statuts (brouillon, envoyée, payée, annulée)

### 4. Dashboard client
- Monitoring uptime (HTTP ping toutes les 5 minutes)
- Graphiques temps de réponse (Recharts)
- Vérification certificat SSL (émetteur, expiration, alerte < 30 jours)
- Historique des interventions par type (maintenance, MAJ, fix, sécurité)
- Vue admin avec sélection de client + ajout de sites et interventions

### 5. Scanner OWASP
- Analyse des headers de sécurité (HSTS, CSP, X-Frame-Options, etc.)
- Vérification SSL et protocole TLS
- Test de redirection HTTP vers HTTPS
- Analyse des flags cookies (Secure, HttpOnly, SameSite)
- Détection de technologies (Nginx, Apache, Cloudflare, etc.)
- Score global (0-100) avec note A à F
- Historique des scans
- Rate limiting strict (10 scans/min)

### 6. Dashboard honeypot SSH
- Parsing des logs Cowrie en temps réel
- Carte mondiale des attaques (Leaflet.js, thème dark)
- Géolocalisation IP (ip-api.com)
- WebSocket temps réel (Socket.io)
- Statistiques : top mots de passe, usernames, commandes, pays, IPs
- Graphique d'attaques par jour
- Timeline interactive avec filtres temporels

## Architecture

```mermaid
graph TB
    subgraph Internet["Internet"]
        U["Utilisateur"]
        LE["Let's Encrypt"]
        CF["Cloudflare DNS"]
    end

    subgraph VPS["VPS OVH — Debian 12 — Docker Compose"]
        subgraph Reverse["Reverse Proxy"]
            CADDY["Caddy\nHTTPS auto\nSecurity Headers\nVPN IP Filter"]
        end

        subgraph Apps["Applications"]
            API["API REST\nNode.js 20\nExpress + Socket.io"]
            FRONT["Frontend\nReact 18 + Tailwind\nCaddy static serve"]
            KUMA["Uptime Kuma\nMonitoring"]
        end

        subgraph Data["Stockage"]
            PG[("PostgreSQL 16\n6 schemas")]
        end
    end

    subgraph VPN["WireGuard VPN"]
        ADMIN["Admin\n10.0.0.2"]
    end

    U -- "audit.devshield.fr\nonboard.devshield.fr" --> CF
    CF --> CADDY
    CADDY -- "/api/*" --> API
    CADDY -- "/*" --> FRONT
    CADDY -- "status.*" --> KUMA
    API --> PG
    LE -. "ACME HTTP-01" .-> CADDY

    ADMIN -- "clients.devshield.fr\nfactures.devshield.fr\nhoneypot.devshield.fr\nstatus.devshield.fr" --> CADDY

    style Internet fill:#1e293b,stroke:#0ea5e9,color:#e2e8f0
    style VPS fill:#0f172a,stroke:#0ea5e9,color:#e2e8f0
    style Reverse fill:#0a2540,stroke:#00d4ff,color:#e2e8f0
    style Apps fill:#0a2540,stroke:#00d4ff,color:#e2e8f0
    style Data fill:#0a2540,stroke:#00d4ff,color:#e2e8f0
    style VPN fill:#0a2540,stroke:#22c55e,color:#e2e8f0
    style CADDY fill:#0ea5e9,stroke:#0284c7,color:#fff
    style API fill:#22c55e,stroke:#16a34a,color:#fff
    style FRONT fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style PG fill:#f59e0b,stroke:#d97706,color:#fff
    style KUMA fill:#6366f1,stroke:#4f46e5,color:#fff
    style ADMIN fill:#22c55e,stroke:#16a34a,color:#fff
    style U fill:#64748b,stroke:#475569,color:#fff
    style CF fill:#f97316,stroke:#ea580c,color:#fff
    style LE fill:#ef4444,stroke:#dc2626,color:#fff
```

### Sous-domaines

| Sous-domaine | Accès | Description |
|---|---|---|
| `clients.devshield.fr` | VPN only | Dashboard admin, clients, factures, honeypot |
| `factures.devshield.fr` | VPN only | Redirection facturation |
| `honeypot.devshield.fr` | VPN only | Dashboard honeypot SSH |
| `status.devshield.fr` | VPN only | Uptime Kuma monitoring |
| `audit.devshield.fr` | Public | Scanner OWASP gratuit |
| `onboard.devshield.fr` | Public | Formulaire de prise en charge |

```mermaid
graph LR
    subgraph Public["Pages publiques"]
        SCAN["Scanner OWASP\naudit.devshield.fr/scan"]
        FORM["Formulaire projet\nonboard.devshield.fr/onboarding"]
    end

    subgraph Private["Intranet VPN"]
        DASH["Dashboard Admin\nclients, monitoring,\nfactures, interventions"]
        HONEY["Honeypot SSH\ncarte mondiale,\nstats temps réel"]
        STATUS["Uptime Kuma\nsurveillance uptime"]
    end

    style Public fill:#0f172a,stroke:#0ea5e9,color:#e2e8f0
    style Private fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style SCAN fill:#0ea5e9,stroke:#0284c7,color:#fff
    style FORM fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style DASH fill:#22c55e,stroke:#16a34a,color:#fff
    style HONEY fill:#ef4444,stroke:#dc2626,color:#fff
    style STATUS fill:#6366f1,stroke:#4f46e5,color:#fff
```

## Structure du monorepo

```
devshield-platform/
├── docker-compose.yml
├── Caddyfile
├── .env.example
├── db/
│   └── init.sql                 Schema complet PostgreSQL
├── packages/
│   ├── api/
│   │   └── src/
│   │       ├── index.js         Point d'entrée (Express + Socket.io)
│   │       ├── config/db.js     Connexion PostgreSQL
│   │       ├── middleware/       Auth JWT, validation Zod, rate limiting
│   │       ├── routes/          auth, clients, invoices, dashboard, audits, honeypot, onboarding
│   │       ├── services/        monitor, scanner, pdf, cowrie, geoip
│   │       └── utils/           logger, errors
│   └── frontend/
│       └── src/
│           ├── App.jsx          Routing React Router
│           ├── api/client.js    Fetch wrapper avec refresh auto
│           ├── components/      Layout, Card, Button, Input, Modal, StatusBadge
│           ├── pages/           Dashboard, Clients, Invoices, Audit, Honeypot, Onboarding
│           └── hooks/           useAuth
├── cowrie/                      Config honeypot SSH
├── backups/                     Scripts de sauvegarde
└── scripts/                     Setup VPS et déploiement
```

## Démarrage local

**Prérequis** : Docker et Docker Compose.

```bash
# 1. Configurer les variables d'environnement
cp .env.example .env
# Renseigner : DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# 2. Lancer les services
docker compose up -d --build

# 3. Créer un compte admin
docker compose exec api node src/seed/admin.js
```

L'application est disponible sur `http://localhost` et l'API sur `http://localhost/api/v1`.

## API

Toutes les routes sont préfixées par `/api/v1/`.

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/auth/login` | Connexion |
| `POST` | `/auth/register` | Inscription |
| `POST` | `/auth/refresh` | Rafraîchir le token |
| `GET` | `/clients` | Liste des clients |
| `POST` | `/clients` | Créer un client |
| `GET/POST` | `/invoices` | Devis et factures |
| `GET` | `/invoices/:id/pdf` | Télécharger le PDF |
| `GET` | `/dashboard/overview` | Vue d'ensemble client |
| `GET` | `/dashboard/sites/:id/uptime` | Historique uptime |
| `GET` | `/dashboard/sites/:id/ssl` | Info certificat SSL |
| `POST` | `/audits/scan` | Lancer un scan OWASP |
| `GET` | `/audits` | Historique des scans |
| `GET` | `/honeypot/stats` | Statistiques honeypot |
| `GET` | `/honeypot/map` | Données carte attaques |
| `GET` | `/honeypot/events` | Timeline événements |
| `POST` | `/onboarding` | Soumission onboarding |

## Déploiement (VPS)

```bash
git pull origin main
sudo docker compose up -d --build
```

## Sécurité

- JWT stockés en cookies httpOnly (pas de localStorage)
- Mots de passe hashés avec bcrypt (cost 12)
- Validation de toutes les entrées avec Zod
- Requêtes SQL paramétrées uniquement
- Helmet.js (headers de sécurité)
- CORS configuré strictement
- Rate limiting sur toutes les routes
- Accès admin via VPN WireGuard

## Variables d'environnement

Voir `.env.example` pour la liste complète des variables requises.

## Licence

Projet propriétaire — [DevShield](https://devshield.fr)
