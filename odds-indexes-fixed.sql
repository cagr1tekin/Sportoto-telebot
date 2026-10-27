-- ============================================================================
-- MEVCUT ODDS TABLOSU İÇİN İNDEKSLER
-- ============================================================================

-- Ana odds tablosu indeksleri (mevcut yapı: match_id, market_id, outcome_id, value, snapshot_at)
CREATE INDEX IF NOT EXISTS idx_odds_match_id ON odds(match_id);
CREATE INDEX IF NOT EXISTS idx_odds_market_id ON odds(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_outcome_id ON odds(outcome_id);
CREATE INDEX IF NOT EXISTS idx_odds_snapshot_at ON odds(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_odds_match_market ON odds(match_id, market_id);

-- ============================================================================
-- MAÇ SONUCU TÜRLERİNE GÖRE ORAN TABLOLARI İNDEKSLERİ
-- ============================================================================

-- 0x0 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_0x0_match_date ON odds_0x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x0_teams ON odds_0x0(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x0_market ON odds_0x0(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x0_week ON odds_0x0(week);

-- 0x1 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_0x1_match_date ON odds_0x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_teams ON odds_0x1(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_market ON odds_0x1(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_week ON odds_0x1(week);

-- 0x2 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_0x2_match_date ON odds_0x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_teams ON odds_0x2(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_market ON odds_0x2(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_week ON odds_0x2(week);

-- 1x0 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_1x0_match_date ON odds_1x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_teams ON odds_1x0(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_market ON odds_1x0(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_week ON odds_1x0(week);

-- 1x1 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_1x1_match_date ON odds_1x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_teams ON odds_1x1(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_market ON odds_1x1(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_week ON odds_1x1(week);

-- 1x2 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_1x2_match_date ON odds_1x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_teams ON odds_1x2(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_market ON odds_1x2(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_week ON odds_1x2(week);

-- 2x0 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_2x0_match_date ON odds_2x0(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_teams ON odds_2x0(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_market ON odds_2x0(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_week ON odds_2x0(week);

-- 2x1 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_2x1_match_date ON odds_2x1(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_teams ON odds_2x1(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_market ON odds_2x1(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_week ON odds_2x1(week);

-- 2x2 indeksleri
CREATE INDEX IF NOT EXISTS idx_odds_2x2_match_date ON odds_2x2(match_date);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_teams ON odds_2x2(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_market ON odds_2x2(market_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_week ON odds_2x2(week);

-- ============================================================================
-- PERFORMANS İÇİN KOMBİNE İNDEKSLER
-- ============================================================================

-- Sık kullanılacak sorgular için
CREATE INDEX IF NOT EXISTS idx_odds_0x0_date_teams ON odds_0x0(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x1_date_teams ON odds_0x1(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_0x2_date_teams ON odds_0x2(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x0_date_teams ON odds_1x0(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x1_date_teams ON odds_1x1(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_1x2_date_teams ON odds_1x2(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x0_date_teams ON odds_2x0(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x1_date_teams ON odds_2x1(match_date, home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_odds_2x2_date_teams ON odds_2x2(match_date, home_team_id, away_team_id);