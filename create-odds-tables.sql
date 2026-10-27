-- Maç sonucu türlerine göre oran tabloları oluşturma

-- 0x0 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_0x0 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL, -- İlk yarı skoru
  ft_score VARCHAR(10) NOT NULL, -- Maç sonu skoru
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 0x1 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_0x1 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 0x2 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_0x2 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 1x0 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_1x0 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 1x1 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_1x1 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 1x2 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_1x2 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 2x0 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_2x0 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 2x1 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_2x1 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 2x2 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_2x2 (
  id SERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(6,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_odds_0x0_match_date ON odds_0x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x0_teams ON odds_0x0(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_0x1_match_date ON odds_0x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_teams ON odds_0x1(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_0x2_match_date ON odds_0x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_teams ON odds_0x2(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_1x0_match_date ON odds_1x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_teams ON odds_1x0(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_1x1_match_date ON odds_1x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_teams ON odds_1x1(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_1x2_match_date ON odds_1x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_teams ON odds_1x2(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_2x0_match_date ON odds_2x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_teams ON odds_2x0(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_2x1_match_date ON odds_2x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_teams ON odds_2x1(home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_odds_2x2_match_date ON odds_2x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_teams ON odds_2x2(home_team_id, away_team_id);