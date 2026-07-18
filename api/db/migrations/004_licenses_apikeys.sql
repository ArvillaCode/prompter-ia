-- ============================================================
-- Migration 004: Licencias con vigencia + API key de Gemini por usuario
-- ============================================================

CREATE TABLE IF NOT EXISTS licenses (
  id            TEXT PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'available', -- available | used | revoked
  created_by    TEXT,
  used_by       TEXT,
  created_at    INTEGER NOT NULL,
  activated_at  INTEGER,
  expires_at    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_licenses_code ON licenses(code);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_used_by ON licenses(used_by);

ALTER TABLE users ADD COLUMN license_id TEXT;
ALTER TABLE users ADD COLUMN license_expires_at INTEGER;
ALTER TABLE users ADD COLUMN gemini_api_key_enc TEXT;
