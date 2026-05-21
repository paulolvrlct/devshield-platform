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

-- Table des clients (schéma clients)
CREATE TABLE IF NOT EXISTS clients.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  address TEXT,
  siret VARCHAR(20),
  website_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients.clients (email);

-- Table des factures/devis (schéma invoices)
CREATE TABLE IF NOT EXISTS invoices.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients.clients(id) ON DELETE RESTRICT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('devis', 'facture')),
  number VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  pack VARCHAR(50) NOT NULL,
  description TEXT,
  amount_ht INTEGER NOT NULL,
  tax_rate INTEGER DEFAULT 0,
  amount_ttc INTEGER NOT NULL,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at DATE,
  paid_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices.invoices (number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices.invoices (status);

-- Séquence pour la numérotation automatique (YYYY-NNN)
CREATE SEQUENCE IF NOT EXISTS invoices.invoice_seq START 1;

-- Sites monitorés (schéma clients)
CREATE TABLE IF NOT EXISTS clients.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients.clients(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  label VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sites_client ON clients.sites (client_id);

-- Résultats des checks uptime (schéma clients)
CREATE TABLE IF NOT EXISTS clients.uptime_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES clients.sites(id) ON DELETE CASCADE,
  status_code INTEGER,
  response_time_ms INTEGER,
  is_up BOOLEAN NOT NULL,
  error TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uptime_site ON clients.uptime_checks (site_id);
CREATE INDEX IF NOT EXISTS idx_uptime_checked ON clients.uptime_checks (checked_at DESC);

-- Interventions / historique actions (schéma clients)
CREATE TABLE IF NOT EXISTS clients.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients.clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'maintenance',
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interventions_client ON clients.interventions (client_id);

-- Résultats des scans OWASP (schéma audits)
CREATE TABLE IF NOT EXISTS audits.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients.clients(id) ON DELETE SET NULL,
  url VARCHAR(500) NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  grade CHAR(1) NOT NULL,
  score INTEGER NOT NULL,
  duration_ms INTEGER,
  technologies TEXT DEFAULT '[]',
  checks TEXT DEFAULT '[]',
  summary TEXT DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scans_client ON audits.scans (client_id);
CREATE INDEX IF NOT EXISTS idx_scans_created ON audits.scans (created_at DESC);

-- Événements honeypot Cowrie (schéma honeypot)
CREATE TABLE IF NOT EXISTS honeypot.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  src_ip VARCHAR(45) NOT NULL,
  src_port INTEGER,
  dst_port INTEGER DEFAULT 22,
  username VARCHAR(255),
  password VARCHAR(255),
  command TEXT,
  session_id VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  raw_log TEXT,
  event_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_honeypot_ip ON honeypot.events (src_ip);
CREATE INDEX IF NOT EXISTS idx_honeypot_type ON honeypot.events (event_type);
CREATE INDEX IF NOT EXISTS idx_honeypot_event_at ON honeypot.events (event_at DESC);

-- Lien entre un client et son user account (schéma clients)
CREATE TABLE IF NOT EXISTS clients.client_users (
  client_id UUID NOT NULL REFERENCES clients.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, user_id)
);
