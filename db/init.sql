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

-- Table des refresh tokens (schéma auth)
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON auth.refresh_tokens (user_id);

-- Table des soumissions d'onboarding (schéma onboarding)
CREATE TABLE IF NOT EXISTS onboarding.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  website_url VARCHAR(500),
  activity TEXT,
  pack VARCHAR(50) DEFAULT 'essentiel',
  pages TEXT,
  primary_color VARCHAR(7) DEFAULT '#00D4FF',
  secondary_color VARCHAR(7) DEFAULT '#0A1628',
  logo_path VARCHAR(500),
  content TEXT,
  notes TEXT,
  status VARCHAR(30) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON onboarding.submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON onboarding.submissions (created_at DESC);
