-- DevShield — initialisation de la base
-- Base unique, un schema par application. Les tables sont créées phase par phase.

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS clients;
CREATE SCHEMA IF NOT EXISTS invoices;
CREATE SCHEMA IF NOT EXISTS audits;
CREATE SCHEMA IF NOT EXISTS onboarding;
CREATE SCHEMA IF NOT EXISTS honeypot;
-- Table des utilisateurs (schéma auth)
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);