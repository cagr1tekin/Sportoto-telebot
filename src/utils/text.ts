/**
 * Text normalization and canonicalization utilities
 * Used for standardizing team names and text data
 */

/**
 * Turkish character normalization map
 */
const TURKISH_CHAR_MAP: Record<string, string> = {
  'ç': 'c', 'Ç': 'C',
  'ğ': 'g', 'Ğ': 'G', 
  'ı': 'i', 'I': 'I',
  'ö': 'o', 'Ö': 'O',
  'ş': 's', 'Ş': 'S',
  'ü': 'u', 'Ü': 'U',
  'ё': 'e', 'Ё': 'E',
};

/**
 * Normalize Turkish characters to ASCII equivalent
 */
function normalizeTurkishChars(text: string): string {
  return text.replace(/[çÇğĞıIöÖşŞüÜёЁ]/g, (char) => TURKISH_CHAR_MAP[char] || char);
}

/**
 * Canonicalize team name for consistent storage and matching
 * 
 * Rules:
 * - Convert to lowercase
 * - Normalize Turkish characters 
 * - Remove special characters and extra spaces
 * - Standardize common abbreviations
 * 
 * @param name - Original team name
 * @returns Canonical team name
 * 
 * @example
 * canonicalizeTeam("Fenerbahçe S.K.") // "fenerbahce"
 * canonicalizeTeam("Real Madrid CF") // "real madrid"
 * canonicalizeTeam("Manchester United F.C.") // "manchester united"
 */
export function canonicalizeTeam(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let canonical = name.trim();
  
  // Convert to lowercase
  canonical = canonical.toLowerCase();
  
  // Normalize Turkish characters
  canonical = normalizeTurkishChars(canonical);
  
  // Specific team name mappings for better standardization
  const teamMappings: Record<string, string> = {
    'fenerbahce s.k.': 'fenerbahce',
    'galatasaray a.s.': 'galatasaray', 
    'besiktas jk': 'besiktas_jk',
    'real madrid cf': 'real_madrid',
    'manchester united f.c.': 'manchester_united',
    'fc barcelona': 'barcelona',
    'bayern munchen': 'bayern_munchen'
  };
  
  // Check for exact mappings first
  const mappedName = teamMappings[canonical];
  if (mappedName) {
    return mappedName;
  }
  
  // Remove common suffixes and abbreviations
  const suffixes = [
    's.k.', 'spor kulübü', 'spor klubu',
    'f.c.', 'football club',
    'c.f.', 'club de futbol', 
    'a.s.', 'associazione sportiva',
    'ac', 'associazione calcio',
    'sc', 'sporting club'
  ];
  
  // Remove suffixes
  for (const suffix of suffixes) {
    const regex = new RegExp(`\\b${suffix.replace(/\./g, '\\.')}\\b`, 'gi');
    canonical = canonical.replace(regex, '');
  }
  
  // Remove special characters except spaces and dashes
  canonical = canonical.replace(/[^\w\s-]/g, '');
  
  // Replace multiple spaces with single space
  canonical = canonical.replace(/\s+/g, ' ');
  
  // Remove leading/trailing spaces
  canonical = canonical.trim();
  
  // Replace spaces with underscores for database storage
  canonical = canonical.replace(/\s+/g, '_');
  
  // Remove trailing underscores
  canonical = canonical.replace(/_+$/g, '');
  
  return canonical;
}

/**
 * Normalize general text for comparison
 * Less aggressive than team canonicalization
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Clean and normalize competition/league names
 */
export function canonicalizeCompetition(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  let canonical = name.trim();
  
  // Convert to lowercase and normalize Turkish chars
  canonical = canonical.toLowerCase();
  canonical = normalizeTurkishChars(canonical);
  
  // Replace common league abbreviations with full names
  const replacements: Record<string, string> = {
    'süper lig': 'super_lig',
    'champions league': 'champions_league',
    'europa league': 'europa_league',
    'premier league': 'premier_league',
    'la liga': 'la_liga',
    'serie a': 'serie_a',
    'bundesliga': 'bundesliga',
    'ligue 1': 'ligue_1'
  };
  
  for (const [original, replacement] of Object.entries(replacements)) {
    if (canonical.includes(original)) {
      canonical = replacement;
      break;
    }
  }
  
  // Remove special characters and normalize spaces
  canonical = canonical.replace(/[^\w\s]/g, '');
  canonical = canonical.replace(/\s+/g, '_');
  canonical = canonical.replace(/_+$/g, '');
  
  return canonical;
}

/**
 * Extract country from competition name or description
 */
export function extractCountry(competitionName: string): string {
  const countryMap: Record<string, string> = {
    'süper lig': 'Turkey',
    'super lig': 'Turkey',
    'tff': 'Turkey',
    'premier league': 'England',
    'championship': 'England',
    'la liga': 'Spain',
    'serie a': 'Italy',
    'bundesliga': 'Germany',
    'ligue 1': 'France',
    'eredivisie': 'Netherlands',
    'primeira liga': 'Portugal'
  };
  
  const normalized = normalizeText(competitionName);
  
  for (const [league, country] of Object.entries(countryMap)) {
    if (normalized.includes(league)) {
      return country;
    }
  }
  
  return 'Unknown';
}

/**
 * Fuzzy match team names for finding similar teams
 * Returns a similarity score between 0 and 1
 * Uses simple string comparison for performance
 */
export function calculateTeamSimilarity(name1: string, name2: string): number {
  const canonical1 = canonicalizeTeam(name1);
  const canonical2 = canonicalizeTeam(name2);
  
  if (canonical1 === canonical2) {
    return 1.0;
  }
  
  if (canonical1.length === 0 || canonical2.length === 0) {
    return 0.0;
  }
  
  // Use Levenshtein distance for better similarity calculation
  const len1 = canonical1.length;
  const len2 = canonical2.length;
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = canonical1[i - 1] === canonical2[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,      // deletion
        matrix[i]![j - 1]! + 1,      // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1]![len2]!;
  const maxLength = Math.max(len1, len2);
  
  return 1 - (distance / maxLength);
}