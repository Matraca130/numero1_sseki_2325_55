-- Migration: Create sketch_interactions table
-- Purpose: Track student interactions with algorithmic art engines
-- Feature: Algorithmic Art (feat/algorithmic-art)

CREATE TABLE IF NOT EXISTS sketch_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  summary_id UUID REFERENCES summaries(id) NOT NULL,
  engine TEXT NOT NULL,
  mode TEXT,
  seed INTEGER NOT NULL,
  params JSONB NOT NULL,
  interaction_type TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_sketch_interactions_student ON sketch_interactions(student_id, created_at DESC);
CREATE INDEX idx_sketch_interactions_summary ON sketch_interactions(summary_id);

-- Row Level Security
ALTER TABLE sketch_interactions ENABLE ROW LEVEL SECURITY;

-- Students can only read and insert their own interactions
CREATE POLICY "Students can view own interactions"
  ON sketch_interactions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own interactions"
  ON sketch_interactions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Professors can view all interactions (for analytics)
CREATE POLICY "Professors can view all interactions"
  ON sketch_interactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN user_profiles up ON up.id = u.id
      WHERE u.id = auth.uid()
        AND up.role = 'professor'
    )
  );

-- Comments on columns
COMMENT ON TABLE sketch_interactions IS 'Tracks student interactions with algorithmic art (p5.js) engines per summary';
COMMENT ON COLUMN sketch_interactions.engine IS 'Engine identifier: nervioso, renal, digestivo, semiologia_general, etc.';
COMMENT ON COLUMN sketch_interactions.mode IS 'Preset/mode selected: Normal, Fiebre, Shock, etc.';
COMMENT ON COLUMN sketch_interactions.seed IS 'Random seed used for deterministic rendering';
COMMENT ON COLUMN sketch_interactions.params IS 'Full parameter snapshot at time of interaction';
COMMENT ON COLUMN sketch_interactions.interaction_type IS 'Type: view_start, view_end, preset_change, param_change, seed_reset';
COMMENT ON COLUMN sketch_interactions.duration_ms IS 'Time spent viewing the sketch in milliseconds (for view_end events)';
