-- Migration: Add sketch_config column to summaries table
-- Purpose: Store algorithmic art engine configuration per summary
-- Feature: Algorithmic Art (feat/algorithmic-art)

ALTER TABLE summaries ADD COLUMN IF NOT EXISTS sketch_config JSONB DEFAULT NULL;

COMMENT ON COLUMN summaries.sketch_config IS 'Algorithmic art config: {engine, mode, defaultSeed, enabled}';

-- Example sketch_config values:
-- {
--   "engine": "nervioso",        -- engine identifier (nervioso, renal, digestivo, etc.)
--   "mode": "normal",            -- default preset/mode
--   "defaultSeed": 42,           -- seed for deterministic rendering
--   "enabled": true              -- whether art is shown for this summary
-- }
