# Database Schema Documentation

## Overview

This document describes the database schema for the Sportoto Telebot application. The schema is designed to store sports competition data, teams, matches, betting markets, odds, and scraping information.

## Tables

### competitions
Stores different competitions/leagues information.
- `id` (SERIAL PRIMARY KEY)
- `country` (TEXT) - Country where the competition takes place
- `name` (TEXT) - Name of the competition
- Unique constraint on `(country, name)`

### seasons
Stores seasons for each competition.
- `id` (SERIAL PRIMARY KEY)
- `competition_id` (INT) - References competitions(id)
- `label` (TEXT NOT NULL) - Season label (e.g., "2023/24")
- Unique constraint on `(competition_id, label)`

### teams
Stores team information.
- `id` (SERIAL PRIMARY KEY)
- `name` (TEXT NOT NULL) - Original team name
- `name_canonical` (TEXT NOT NULL UNIQUE) - Canonical/normalized team name
- Unique index on `name_canonical`

### matches
Stores match information with automatic pattern calculation.
- `id` (BIGSERIAL PRIMARY KEY)
- `competition_id` (INT) - References competitions(id)
- `season_id` (INT) - References seasons(id)
- `week` (INT) - Week number
- `match_date` (DATE) - Date of the match
- `home_team_id` (INT) - References teams(id)
- `away_team_id` (INT) - References teams(id)
- `ht_home` (INT) - Half-time home team score
- `ht_away` (INT) - Half-time away team score
- `ft_home` (INT) - Full-time home team score
- `ft_away` (INT) - Full-time away team score
- `pattern` (TEXT) - Auto-calculated pattern (e.g., "IY1MS2")
- `source_url` (TEXT) - URL where the match data was scraped from
- Unique constraint on `(season_id, match_date, home_team_id, away_team_id)`

### markets
Stores betting market types.
- `id` (SERIAL PRIMARY KEY)
- `code` (TEXT NOT NULL UNIQUE) - Market code (e.g., "1X2", "BTTS")
- `name` (TEXT NOT NULL) - Human-readable market name

### outcomes
Stores possible outcomes for each market.
- `id` (SERIAL PRIMARY KEY)
- `market_id` (INT) - References markets(id)
- `code` (TEXT) - Outcome code (e.g., "1", "X", "2")
- `name` (TEXT) - Human-readable outcome name
- Unique constraint on `(market_id, code)`

### odds
Stores odds data with snapshot timestamps.
- `id` (BIGSERIAL PRIMARY KEY)
- `match_id` (BIGINT) - References matches(id)
- `market_id` (INT) - References markets(id)
- `outcome_id` (INT) - References outcomes(id)
- `value` (NUMERIC(6,2)) - Odds value
- `snapshot_at` (TIMESTAMPTZ) - When the odds were captured (default: NOW())
- Unique constraint on `(match_id, market_id, outcome_id, value, snapshot_at)`

### scraping_runs
Tracks scraping sessions and their results.
- `id` (BIGSERIAL PRIMARY KEY)
- `started_at` (TIMESTAMPTZ) - When the scraping started (default: NOW())
- `completed_at` (TIMESTAMPTZ) - When the scraping completed
- `status` (TEXT) - Status: 'running', 'completed', 'failed'
- `matches_scraped` (INT) - Number of matches scraped
- `odds_scraped` (INT) - Number of odds records scraped
- `errors_count` (INT) - Number of errors encountered
- `error_details` (JSONB) - Detailed error information
- `source_url` (TEXT) - Source URL that was scraped
- `notes` (TEXT) - Additional notes

## Pattern Calculation

The `matches.pattern` field is automatically calculated using a trigger function whenever match scores are updated:

- **Format**: `IY{ht_result}MS{ft_result}`
- **Half-time result**: `1` (home win), `X` (draw), `2` (away win)
- **Full-time result**: `1` (home win), `X` (draw), `2` (away win)

Examples:
- `IY1MS1` - Home leading at half-time, home wins full-time
- `IYXMS2` - Draw at half-time, away wins full-time
- `IY2MSX` - Away leading at half-time, draw at full-time

## Pre-populated Data

The schema includes common betting markets and their outcomes:

### Markets
- `1X2` - Match Result
- `BTTS` - Both Teams To Score
- `O25` - Over 2.5 Goals
- `U25` - Under 2.5 Goals
- `HT_1X2` - Half Time Result
- `DC` - Double Chance
- `HT_BTTS` - Half Time Both Teams To Score

### Common Outcomes
- **1X2**: 1 (Home Win), X (Draw), 2 (Away Win)
- **BTTS**: YES, NO
- **Over/Under**: OVER, UNDER
- **Double Chance**: 1X, 12, X2

## Setup Instructions

1. **Initialize Database**: Run the schema setup:
   ```bash
   npm run init-db
   ```

2. **Environment Variables**: Ensure your `.env` file contains:
   ```
   SUPABASE_URL=your_supabase_url
   # or
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

3. **Database Connection**: Use the provided database utility:
   ```typescript
   import { getDatabase, db } from './database';
   
   // Test connection
   const database = getDatabase();
   await database.testConnection();
   
   // Use helper functions
   const team = await db.createTeam('Arsenal', 'arsenal');
   ```

## Indexes

The schema includes several indexes for optimal query performance:

- `idx_teams_name_canonical` - Unique index on teams.name_canonical
- `idx_matches_competition_season` - Index on matches(competition_id, season_id)
- `idx_matches_date` - Index on matches(match_date)
- `idx_matches_teams` - Index on matches(home_team_id, away_team_id)
- `idx_odds_match` - Index on odds(match_id)
- `idx_odds_market_outcome` - Index on odds(market_id, outcome_id)
- `idx_odds_snapshot` - Index on odds(snapshot_at)
- `idx_scraping_runs_status` - Index on scraping_runs(status)
- `idx_scraping_runs_started` - Index on scraping_runs(started_at)

## Database Utility Functions

The `database.ts` file provides helper functions for common operations:

- **Teams**: `db.createTeam()`, `db.findTeamByCanonicalName()`
- **Competitions**: `db.createCompetition()`, `db.findCompetition()`
- **Seasons**: `db.createSeason()`
- **Matches**: `db.createMatch()`
- **Odds**: `db.insertOdds()`
- **Scraping**: `db.createScrapingRun()`, `db.updateScrapingRun()`