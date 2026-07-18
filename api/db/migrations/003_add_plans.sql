-- ============================================================
-- Migration 003: Add plan columns to users table
-- ============================================================

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN ai_generations_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN ai_generations_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN max_scripts INTEGER NOT NULL DEFAULT 3;
ALTER TABLE users ADD COLUMN max_devices INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
