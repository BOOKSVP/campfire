-- Campfire — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the tables

-- Teams
CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  uuid TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team Users
CREATE TABLE team_users (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, username)
);

-- Status Updates
CREATE TABLE status_updates (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_user_id BIGINT NOT NULL REFERENCES team_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_updates_team ON status_updates(team_id);
CREATE INDEX idx_status_updates_user_created ON status_updates(team_user_id, created_at DESC);
CREATE INDEX idx_status_updates_expires ON status_updates(expires_at);

-- Row Level Security (allow public read, authenticated write via anon key)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read team_users" ON team_users FOR SELECT USING (true);
CREATE POLICY "Public read status_updates" ON status_updates FOR SELECT USING (true);

-- Allow inserts via anon key (for posting statuses)
CREATE POLICY "Anon insert status_updates" ON status_updates FOR INSERT WITH CHECK (true);

-- Seed: ARTSVP team
INSERT INTO teams (name) VALUES ('ARTSVP');

-- Seed: Team members (update profile_pic_url with real avatars)
INSERT INTO team_users (team_id, username, profile_pic_url) VALUES
  (1, 'Max', NULL),
  (1, 'Mike', NULL),
  (1, 'Scott', NULL),
  (1, 'Sy', NULL),
  (1, 'Grace', NULL);
