-- Engage MVP Database Schema
-- Run this in your Supabase SQL editor

-- Sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  session_type TEXT DEFAULT 'decide' CHECK (session_type IN ('decide', 'resolve', 'plan', 'debate')),
  creator_name TEXT NOT NULL,
  partner_name TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'both_locked', 'analyzing', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inputs table
CREATE TABLE inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'partner')),
  content TEXT NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, role)
);

-- Analyses table
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  content JSONB NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_slug ON sessions(slug);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_inputs_session_id ON inputs(session_id);
CREATE INDEX idx_analyses_session_id ON analyses(session_id);

-- Enable Row Level Security (open for MVP — tighten for production)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Permissive policies for MVP (no auth required)
CREATE POLICY "Allow all access to sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to inputs" ON inputs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;

-- Function to generate short slugs
CREATE OR REPLACE FUNCTION generate_slug()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
