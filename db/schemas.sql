-- Sportoto-telebot veritabanı şeması
-- Çekirdek tabloları ve ileride kullanacağımız puanlama tabloları dahil

-- Lig konfig
create table if not exists leagues(
  id serial primary key,
  code text unique not null,
  name text not null,
  is_active boolean default true
);

-- Puan durumu snapshot
create table if not exists standings_snapshot(
  id bigserial primary key,
  league_code text not null,
  taken_at timestamptz default now(),
  team_name text not null,
  rank int not null
);
create index if not exists idx_standings on standings_snapshot(league_code, taken_at);

-- Fikstür
create table if not exists fixtures(
  id bigserial primary key,
  ext_id text unique,
  league_code text not null,
  ko timestamptz not null,
  home_team text not null,
  away_team text not null,
  status text default 'NS' -- NS, LIVE, FT
);

-- Prematch MS oranları
create table if not exists odds_prematch(
  id bigserial primary key,
  fixture_id bigint references fixtures(id),
  collected_at timestamptz default now(),
  home numeric, draw numeric, away numeric
);

-- Takip listesi
create table if not exists watchlist(
  id bigserial primary key,
  fixture_id bigint references fixtures(id),
  favorite text not null,        -- 'HOME' | 'AWAY'
  fav_team text not null,
  fav_odd numeric not null,
  inserted_at timestamptz default now(),
  active boolean default true
);

-- Canlı skor (minimal)
create table if not exists live_score(
  fixture_id bigint primary key references fixtures(id),
  updated_at timestamptz,
  home_goals int default 0,
  away_goals int default 0
);

-- Sinyaller
create table if not exists signals(
  id bigserial primary key,
  fixture_id bigint references fixtures(id),
  signal_type text not null,     -- 'COME_FROM_BEHIND_FAVORITE'
  emitted_at timestamptz default now(),
  meta jsonb default '{}'::jsonb
);

-- Sanal kupon defteri
create table if not exists bet_ledger(
  id bigserial primary key,
  fixture_id bigint references fixtures(id),
  strategy text not null,        -- 'fav_behind_win'
  selection text not null,       -- 'HOME' | 'AWAY'
  stake numeric default 1,
  placed_at timestamptz default now(),
  status text default 'OPEN',    -- OPEN | WIN | LOSE | VOID
  settled_at timestamptz
);

-- Günlük özet
create table if not exists stats_daily(
  id bigserial primary key,
  day date not null unique,
  signals int default 0,
  bets int default 0,
  wins int default 0,
  losses int default 0,
  hit_rate numeric,
  created_at timestamptz default now()
);

-- Maç olayı özetleri (puanlama için)
create table if not exists match_events (
  id bigserial primary key,
  fixture_id bigint not null,  -- foreign key referansını kaldırdık
  league_code text,
  season int,
  home_team text,
  away_team text,
  home_goals int,
  away_goals int,
  home_trailed boolean,
  away_trailed boolean,
  home_comeback_win boolean,
  away_comeback_win boolean,
  goals_while_trailing int default 0,
  deepest_trail int default 0,
  equalize_min int,      -- null olabilir
  first_lead_min int,    -- null olabilir
  lead_flips int default 0,
  context_away boolean,
  odd_team numeric,
  odd_opp numeric,
  played_at timestamptz,
  updated_at timestamptz default now()
);
create index if not exists idx_match_events_dt on match_events(played_at);

-- Takım bazlı comeback istatistikleri (rolling window)
create table if not exists team_comeback_stats (
  id bigserial primary key,
  team_name text not null,
  league_code text,
  window_days int not null,
  as_of_date date not null,
  samples int not null,
  wins int not null,
  raw_rate numeric,
  bayes_rate numeric,
  wilson_low numeric,
  updated_at timestamptz default now()
);
create index if not exists idx_tcs on team_comeback_stats(as_of_date, window_days, team_name);

-- Takım puan tablosu (rolling pencere, aggregate skor)
create table if not exists team_scores (
  id bigserial primary key,
  team_name text not null,
  window_days int not null,
  as_of_date date not null,
  samples int not null,            -- geride düşülen maç sayısı
  total_score numeric not null,    -- match_score toplamı
  avg_score numeric not null,      -- total_score / samples
  last60_avg numeric,              -- son 60 gün ort
  deepest_avg numeric,             -- ortalama en derin fark
  updated_at timestamptz default now(),
  unique(team_name, window_days, as_of_date)
);
create index if not exists idx_team_scores on team_scores(as_of_date, window_days, avg_score desc);