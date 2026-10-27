import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getSeasonById } from './utils/season-mapping';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing in .env file');
}

// Client for public access (if needed)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for admin access (bypassing RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Database helper functions
 */
export const supabaseDb = {
  /**
   * Create or get competition
   */
  async createCompetition(country: string, name: string) {
    // Check if exists
    const { data: existing } = await supabase
      .from('competitions')
      .select('*')
      .eq('country', country)
      .eq('name', name)
      .single();

    if (existing) return existing;

    // Create new
    const { data, error } = await supabase
      .from('competitions')
      .insert({ country, name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create or get season
   */
  async createSeason(competitionId: number, label: string) {
    // Check if exists
    const { data: existing } = await supabase
      .from('seasons')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('label', label)
      .single();

    if (existing) return existing;

    // Create new
    const { data, error } = await supabase
      .from('seasons')
      .insert({ competition_id: competitionId, label })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upsert team (create if not exists, update if exists)
   */
  async upsertTeam(name: string, canonicalName: string) {
    const { data, error } = await supabase
      .from('teams')
      .upsert({ name, name_canonical: canonicalName }, { onConflict: 'name_canonical' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Find team by canonical name
   */
  async findTeamByCanonicalName(canonicalName: string) {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('name_canonical', canonicalName)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  },

  /**
   * Create match
   */
  async createMatch(matchData: any) {
    // Check if match already exists (by date, home team, away team)
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('match_date', matchData.matchDate)
      .eq('home_team_id', matchData.homeTeamId)
      .eq('away_team_id', matchData.awayTeamId)
      .single();

    if (existing) {
      // Update existing match
      const { data, error } = await supabase
        .from('matches')
        .update({
          ht_home: matchData.htHome,
          ht_away: matchData.htAway,
          ft_home: matchData.ftHome,
          ft_away: matchData.ftAway,
          pattern: matchData.pattern,
          week: matchData.week,
          source_url: matchData.sourceUrl
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Insert new match
    const { data, error } = await supabase
      .from('matches')
      .insert({
        competition_id: matchData.competitionId,
        season_id: matchData.seasonId,
        week: matchData.week,
        match_date: matchData.matchDate,
        home_team_id: matchData.homeTeamId,
        away_team_id: matchData.awayTeamId,
        ht_home: matchData.htHome,
        ht_away: matchData.htAway,
        ft_home: matchData.ftHome,
        ft_away: matchData.ftAway,
        pattern: matchData.pattern,
        source_url: matchData.sourceUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Calculate match pattern (IYxMSx)
 */
export function calculateMatchPattern(htHome?: number, htAway?: number, ftHome?: number, ftAway?: number): string {
  if (htHome === undefined || htAway === undefined || ftHome === undefined || ftAway === undefined) {
    return 'IYXMSX'; // X for unknown
  }

  let iyResult: string;
  let msResult: string;

  // İlk Yarı (Half Time) result
  if (htHome > htAway) {
    iyResult = '1';
  } else if (htHome < htAway) {
    iyResult = '2';
  } else {
    iyResult = 'X';
  }

  // Maç Sonu (Full Time) result
  if (ftHome > ftAway) {
    msResult = '1';
  } else if (ftHome < ftAway) {
    msResult = '2';
  } else {
    msResult = 'X';
  }

  return `IY${iyResult}MS${msResult}`;
}

/**
 * Convert date string from Turkish format to proper ISO date
 * Handles formats like "16/08", "17/08" etc. and assigns correct year
 */
export function parseMatchDate(dateStr: string, week?: number, seasonStartYear?: number): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString().split('T')[0]!;
  }

  // Handle "16/08" format (day/month)
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    const day = parseInt(parts[0]?.trim() || '0');
    const month = parseInt(parts[1]?.trim() || '0');

    if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
      return new Date().toISOString().split('T')[0]!;
    }

    let year = 2024; // Default fallback

    if (seasonStartYear) {
      // Use provided season start year
      // Premier League seasons typically: August-December (start year) + January-May (end year)
      if (month >= 8 && month <= 12) {
        year = seasonStartYear; // August to December uses start year
      } else {
        year = seasonStartYear + 1; // January to July uses end year
      }
    } else {
      // Fallback logic if no seasonStartYear provided
      // Get current season ID from environment and find season info
      const currentSeasonId = process.env.PREMIER_LEAGUE_SEASON_ID;
      const seasonInfo = getSeasonById(currentSeasonId || '67180');

      if (seasonInfo) {
        // Get start and end years from season dates
        const startYear = new Date(seasonInfo.startDate).getFullYear();
        const endYear = new Date(seasonInfo.endDate).getFullYear();

        if (month >= 8 && month <= 12) {
          year = startYear;
        } else if (month >= 1 && month <= 7) {
          year = endYear;
        } else if (week && week > 20) {
          year = endYear;
        } else {
          year = startYear;
        }
      } else {
        // Fallback for unmapped seasons - try to infer from current date
        const currentYear = new Date().getFullYear();
        if (month >= 8 && month <= 12) {
          year = currentYear;
        } else if (month >= 1 && month <= 7) {
          year = currentYear + 1;
        }
      }
    }

    // Create date object and return ISO string
    const date = new Date(year, month - 1, day); // month is 0-indexed

    // Convert to YYYY-MM-DD format manually to avoid timezone issues
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  // If already in ISO format, return as is
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.split('T')[0]!;
  }

  // Fallback to current date
  return new Date().toISOString().split('T')[0]!;
}

export default supabase;