-- Database Schema for Sportoto Telebot
-- This file contains all the table definitions and necessary indexes

-- Competition table - stores different competitions/leagues
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  country TEXT,
  name TEXT,
  UNIQUE(country, name)
);

-- Seasons table - stores seasons for each competition
CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  competition_id INT REFERENCES competitions(id),
  label TEXT NOT NULL,
  UNIQUE(competition_id, label)
);

-- Teams table - stores team information
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  name_canonical TEXT NOT NULL UNIQUE
);

-- Create unique index on teams.name_canonical
CREATE UNIQUE INDEX idx_teams_name_canonical ON teams(name_canonical);

-- Matches table - stores match information
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  competition_id INT REFERENCES competitions(id),
  season_id INT REFERENCES seasons(id),
  week INT,
  match_date DATE,
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  ht_home INT,
  ht_away INT,
  ft_home INT,
  ft_away INT,
  pattern TEXT,
  source_url TEXT,
  UNIQUE(season_id, match_date, home_team_id, away_team_id)
);

-- Markets table - stores betting market types
CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

-- Outcomes table - stores possible outcomes for each market
CREATE TABLE outcomes (
  id SERIAL PRIMARY KEY,
  market_id INT REFERENCES markets(id),
  code TEXT,
  name TEXT,
  UNIQUE(market_id, code)
);

-- Odds table - stores odds data with snapshots
CREATE TABLE odds (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT REFERENCES matches(id),
  market_id INT REFERENCES markets(id),
  outcome_id INT REFERENCES outcomes(id),
  value NUMERIC(6,2),
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, market_id, outcome_id, value, snapshot_at)
);

-- Scraping runs table - tracks scraping sessions
CREATE TABLE scraping_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  matches_scraped INT DEFAULT 0,
  odds_scraped INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  error_details JSONB,
  source_url TEXT,
  notes TEXT
);

-- Function to calculate match pattern based on half-time and full-time scores
CREATE OR REPLACE FUNCTION calculate_match_pattern(ht_home INT, ht_away INT, ft_home INT, ft_away INT)
RETURNS TEXT AS $$
DECLARE
  ht_result TEXT;
  ft_result TEXT;
BEGIN
  -- Return null if any score is null
  IF ht_home IS NULL OR ht_away IS NULL OR ft_home IS NULL OR ft_away IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculate half-time result
  IF ht_home > ht_away THEN
    ht_result := '1';
  ELSIF ht_home < ht_away THEN
    ht_result := '2';
  ELSE
    ht_result := 'X';
  END IF;
  
  -- Calculate full-time result
  IF ft_home > ft_away THEN
    ft_result := '1';
  ELSIF ft_home < ft_away THEN
    ft_result := '2';
  ELSE
    ft_result := 'X';
  END IF;
  
  -- Return pattern in format IY{ht_result}MS{ft_result}
  RETURN 'IY' || ht_result || 'MS' || ft_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically calculate pattern when scores are updated
CREATE OR REPLACE FUNCTION update_match_pattern()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pattern := calculate_match_pattern(NEW.ht_home, NEW.ht_away, NEW.ft_home, NEW.ft_away);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update pattern
CREATE TRIGGER trigger_update_match_pattern
  BEFORE INSERT OR UPDATE OF ht_home, ht_away, ft_home, ft_away
  ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_match_pattern();

-- Create indexes for better performance
CREATE INDEX idx_matches_competition_season ON matches(competition_id, season_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_teams ON matches(home_team_id, away_team_id);
CREATE INDEX idx_odds_match ON odds(match_id);
CREATE INDEX idx_odds_market_outcome ON odds(market_id, outcome_id);
CREATE INDEX idx_odds_snapshot ON odds(snapshot_at);
CREATE INDEX idx_scraping_runs_status ON scraping_runs(status);
CREATE INDEX idx_scraping_runs_started ON scraping_runs(started_at);

-- Insert some common markets
INSERT INTO markets (code, name) VALUES 
  ('1X2', 'Match Result'),
  ('BTTS', 'Both Teams To Score'),
  ('O25', 'Over 2.5 Goals'),
  ('U25', 'Under 2.5 Goals'),
  ('HT_1X2', 'Half Time Result'),
  ('DC', 'Double Chance'),
  ('HT_BTTS', 'Half Time Both Teams To Score');

-- Insert common outcomes for 1X2 market
INSERT INTO outcomes (market_id, code, name) VALUES 
  ((SELECT id FROM markets WHERE code = '1X2'), '1', 'Home Win'),
  ((SELECT id FROM markets WHERE code = '1X2'), 'X', 'Draw'),
  ((SELECT id FROM markets WHERE code = '1X2'), '2', 'Away Win');

-- Insert outcomes for BTTS market
INSERT INTO outcomes (market_id, code, name) VALUES 
  ((SELECT id FROM markets WHERE code = 'BTTS'), 'YES', 'Yes'),
  ((SELECT id FROM markets WHERE code = 'BTTS'), 'NO', 'No');

-- Insert outcomes for Over/Under 2.5 markets
INSERT INTO outcomes (market_id, code, name) VALUES 
  ((SELECT id FROM markets WHERE code = 'O25'), 'OVER', 'Over 2.5'),
  ((SELECT id FROM markets WHERE code = 'U25'), 'UNDER', 'Under 2.5');

-- Insert outcomes for Half Time 1X2
INSERT INTO outcomes (market_id, code, name) VALUES 
  ((SELECT id FROM markets WHERE code = 'HT_1X2'), '1', 'Home Win'),
  ((SELECT id FROM markets WHERE code = 'HT_1X2'), 'X', 'Draw'),
  ((SELECT id FROM markets WHERE code = 'HT_1X2'), '2', 'Away Win');

-- Insert outcomes for Double Chance
INSERT INTO outcomes (market_id, code, name) VALUES 
  ((SELECT id FROM markets WHERE code = 'DC'), '1X', 'Home Win or Draw'),
  ((SELECT id FROM markets WHERE code = 'DC'), '12', 'Home Win or Away Win'),
  ((SELECT id FROM markets WHERE code = 'DC'), 'X2', 'Draw or Away Win');

-- Insert outcomes for Half Time BTTS
INSERT INTO outcomes (market_id, code, name) VALUES 
  ((SELECT id FROM markets WHERE code = 'HT_BTTS'), 'YES', 'Yes'),
  ((SELECT id FROM markets WHERE code = 'HT_BTTS'), 'NO', 'No');