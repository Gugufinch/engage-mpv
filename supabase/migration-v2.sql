-- Engage MVP Database Schema v2
-- Run this in your Supabase SQL editor
-- If upgrading from v1, run the ALTER statements at the bottom instead

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  context TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'relationship', 'money', 'travel', 'work', 'fun', 'food', 'home', 'parenting')),
  session_type TEXT DEFAULT 'decide' CHECK (session_type IN ('decide', 'resolve', 'plan', 'debate')),
  creator_name TEXT NOT NULL,
  partner_name TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'both_locked', 'analyzing', 'complete', 'failed', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inputs table
CREATE TABLE IF NOT EXISTS inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'partner')),
  content TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, role)
);

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  content JSONB NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_slug ON sessions(slug);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_category ON sessions(category);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_inputs_session_id ON inputs(session_id);
CREATE INDEX IF NOT EXISTS idx_analyses_session_id ON analyses(session_id);

-- Enable Row Level Security (open for MVP — tighten for production)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Permissive policies for MVP (no auth required)
DO $$ BEGIN
  CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access to inputs" ON inputs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all access to analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Expire old sessions automatically (run via cron or manually)
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET status = 'expired' 
  WHERE status IN ('waiting', 'active') 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════
-- UPGRADE FROM V1: Run these if tables already exist
-- ═══════════════════════════════════════
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS context TEXT;
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
-- ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours');
-- ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
-- ALTER TABLE sessions ADD CONSTRAINT sessions_status_check CHECK (status IN ('waiting', 'active', 'both_locked', 'analyzing', 'complete', 'failed', 'expired'));
-- ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_category_check;
-- ALTER TABLE sessions ADD CONSTRAINT sessions_category_check CHECK (category IN ('general', 'relationship', 'money', 'travel', 'work', 'fun', 'food', 'home', 'parenting'));
