-- ============================================================
-- Migration 001: Initial schema for auth + script storage
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  email_lower   TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(email_lower);

CREATE TABLE IF NOT EXISTS scripts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user_updated ON scripts(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  user_id    TEXT PRIMARY KEY,
  settings    TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
