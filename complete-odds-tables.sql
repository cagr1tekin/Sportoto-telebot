-- ============================================================================
-- MAÇ SONUCU TÜRLERİNE GÖRE ORAN TABLOLARI
-- Her maç sonucu türü için ayrı tablo (0x0, 0x1, 0x2, 1x0, 1x1, 1x2, 2x0, 2x1, 2x2)
-- ============================================================================

-- Genel odds tablosu (tüm oranlar için backup)
CREATE TABLE IF NOT EXISTS odds (
  id BIGSERIAL PRIMARY KEY,
  match_date DATE NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  week INTEGER NOT NULL,
  ht_score VARCHAR(10) NOT NULL,
  ft_score VARCHAR(10) NOT NULL,
  score_type VARCHAR(10) NOT NULL,
  market_name VARCHAR(100) NOT NULL,
  market_id VARCHAR(20) NOT NULL,
  option_name VARCHAR(50) NOT NULL,
  option_id INTEGER NOT NULL,
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id, score_type)
);

-- 0x0 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_0x0 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 0x1 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_0x1 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 0x2 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_0x2 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 1x0 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_1x0 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 1x1 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_1x1 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 1x2 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_1x2 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 2x0 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_2x0 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 2x1 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_2x1 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- 2x2 maçları için oran tablosu
CREATE TABLE IF NOT EXISTS odds_2x2 (
  id BIGSERIAL PRIMARY KEY,
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
  odds_value DECIMAL(8,2) NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_team_id, away_team_id, match_date, market_id, option_id)
);

-- ============================================================================
-- İNDEKSLER (Performans için)
-- ============================================================================

-- Genel odds tablosu indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_match_date ON odds(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_teams ON odds(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_score_type ON odds(score_type);
CREATE INDEX IF NOT EXISTS idx_odds_market ON odds(market_id);

-- 0x0 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_0x0_match_date ON odds_0x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x0_teams ON odds_0x0(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x0_market ON odds_0x0(market_id);

-- 0x1 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_0x1_match_date ON odds_0x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_teams ON odds_0x1(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_market ON odds_0x1(market_id);

-- 0x2 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_0x2_match_date ON odds_0x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_teams ON odds_0x2(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_market ON odds_0x2(market_id);

-- 1x0 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_1x0_match_date ON odds_1x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_teams ON odds_1x0(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_market ON odds_1x0(market_id);

-- 1x1 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_1x1_match_date ON odds_1x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_teams ON odds_1x1(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_market ON odds_1x1(market_id);

-- 1x2 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_1x2_match_date ON odds_1x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_teams ON odds_1x2(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_market ON odds_1x2(market_id);

-- 2x0 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_2x0_match_date ON odds_2x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_teams ON odds_2x0(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_market ON odds_2x0(market_id);

-- 2x1 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_2x1_match_date ON odds_2x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_teams ON odds_2x1(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_market ON odds_2x1(market_id);

-- 2x2 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_2x2_match_date ON odds_2x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_teams ON odds_2x2(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_market ON odds_2x2(market_id);

-- ============================================================================
-- ÖRNEK SORGULAR (Test için)
-- ============================================================================

-- Her tablo için kayıt sayısı kontrol sorgusu:
/*
SELECT 'odds' as table_name, COUNT(*) as record_count FROM odds
UNION ALL
SELECT 'odds_0x0', COUNT(*) FROM odds_0x0
UNION ALL
SELECT 'odds_0x1', COUNT(*) FROM odds_0x1
UNION ALL
SELECT 'odds_0x2', COUNT(*) FROM odds_0x2
UNION ALL
SELECT 'odds_1x0', COUNT(*) FROM odds_1x0
UNION ALL
SELECT 'odds_1x1', COUNT(*) FROM odds_1x1
UNION ALL
SELECT 'odds_1x2', COUNT(*) FROM odds_1x2
UNION ALL
SELECT 'odds_2x0', COUNT(*) FROM odds_2x0
UNION ALL
SELECT 'odds_2x1', COUNT(*) FROM odds_2x1
UNION ALL
SELECT 'odds_2x2', COUNT(*) FROM odds_2x2
ORDER BY table_name;
*/

-- Belirli bir maç sonucu türü için oran analizi:
/*
SELECT 
  market_name,
  COUNT(*) as oran_sayisi,
  AVG(odds_value) as ortalama_oran,
  MIN(odds_value) as min_oran,
  MAX(odds_value) as max_oran
FROM odds_1x2 
GROUP BY market_name 
ORDER BY oran_sayisi DESC;
*/