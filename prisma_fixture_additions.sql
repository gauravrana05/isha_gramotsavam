-- Add missing fields to existing Fixture model
-- These are the ONLY additions needed to the existing schema

-- 1. Add champion tracking to fixtures table
ALTER TABLE fixtures ADD COLUMN champion_team_id UUID REFERENCES teams(id);
ALTER TABLE fixtures ADD COLUMN champion_team_name VARCHAR(200);
ALTER TABLE fixtures ADD COLUMN completed_at TIMESTAMPTZ(6);

-- 2. Add scheduled time to matches table (if not already present)
ALTER TABLE matches ADD COLUMN scheduled_time TIMESTAMPTZ(6);
ALTER TABLE matches ADD COLUMN actual_start_time TIMESTAMPTZ(6);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_fixtures_level ON fixtures(level);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_time ON matches(scheduled_time);

-- That's it! The existing schema is already comprehensive.
