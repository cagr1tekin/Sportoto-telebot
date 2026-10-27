/**
 * Date and score parsing utilities
 * Used for converting scraped text data into structured formats
 */

/**
 * Turkish character normalization for month names
 */
function normalizeTurkishChars(text: string): string {
  const charMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g', 
    'ı': 'i', 'I': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };
  return text.replace(/[çÇğĞıIöÖşŞüÜ]/g, (char) => charMap[char] || char);
}

/**
 * Score interface for match results
 */
export interface Score {
  home: number;
  away: number;
}

/**
 * Parse score string into structured format
 * Supports various score formats commonly found on sports websites
 * 
 * @param scoreText - Score text to parse
 * @returns Parsed score object or null if invalid
 * 
 * @example
 * parseScore("1 - 0") // { home: 1, away: 0 }
 * parseScore("2:1") // { home: 2, away: 1 }
 * parseScore("0-3") // { home: 0, away: 3 }
 * parseScore("1 (0)") // null (penalty format not supported)
 */
export function parseScore(scoreText: string): Score | null {
  if (!scoreText || typeof scoreText !== 'string') {
    return null;
  }

  // Clean the input
  const cleaned = scoreText.trim().replace(/\s+/g, ' ');

  // Common score patterns
  const patterns = [
    /^(\d+)\s*[-–—]\s*(\d+)$/, // "1 - 0", "1-0", "1–0"
    /^(\d+)\s*:\s*(\d+)$/, // "1:0", "1 : 0"
    /^(\d+)\s+(\d+)$/, // "1 0"
    /^(\d+)\/(\d+)$/, // "1/0" (less common)
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1] && match[2]) {
      const home = parseInt(match[1], 10);
      const away = parseInt(match[2], 10);
      
      // Validate reasonable score values
      if (home >= 0 && away >= 0 && home <= 20 && away <= 20) {
        return { home, away };
      }
    }
  }

  return null;
}

/**
 * Parse date string into ISO format (YYYY-MM-DD)
 * Supports various Turkish and international date formats
 * 
 * @param dateText - Date text to parse
 * @returns ISO date string or null if invalid
 * 
 * @example
 * parseDate("16.08.2024") // "2024-08-16"
 * parseDate("16/08/2024") // "2024-08-16"
 * parseDate("Aug 16, 2024") // "2024-08-16"
 * parseDate("16 Ağustos 2024") // "2024-08-16"
 */
export function parseDate(dateText: string): string | null {
  if (!dateText || typeof dateText !== 'string') {
    return null;
  }

  const cleaned = dateText.trim();

  // Turkish month names to numbers (include normalized versions)
  const turkishMonths: Record<string, number> = {
    'ocak': 1, 'şubat': 2, 'mart': 3, 'nisan': 4,
    'mayıs': 5, 'haziran': 6, 'temmuz': 7, 'ağustos': 8, 'agustos': 8,
    'eylül': 9, 'ekim': 10, 'kasım': 11, 'aralık': 12
  };

  // English month names to numbers
  const englishMonths: Record<string, number> = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
    'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
    'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
    'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
    'oct': 10, 'october': 10, 'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
  };

  // Pattern 1: DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmyPattern = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/;
  let match = cleaned.match(dmyPattern);
  if (match && match[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    if (isValidDate(day, month, year)) {
      return formatDate(year, month, day);
    }
  }

  // Pattern 2: YYYY-MM-DD (ISO format)
  const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  match = cleaned.match(isoPattern);
  if (match && match[1] && match[2] && match[3]) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    
    if (isValidDate(day, month, year)) {
      return formatDate(year, month, day);
    }
  }

  // Pattern 3: DD Month YYYY (Turkish) - use unicode for Turkish characters
  const turkishPattern = /^(\d{1,2})\s+([\wçÇğĞıIöÖşŞüÜ]+)\s+(\d{4})$/i;
  match = cleaned.toLowerCase().match(turkishPattern);
  if (match && match[1] && match[2] && match[3]) {
    const day = parseInt(match[1], 10);
    const monthName = normalizeTurkishChars(match[2].toLowerCase());
    const year = parseInt(match[3], 10);
    const month = turkishMonths[monthName];
    
    if (month && isValidDate(day, month, year)) {
      return formatDate(year, month, day);
    }
  }

  // Pattern 4: Month DD, YYYY (English)
  const englishPattern = /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i;
  match = cleaned.toLowerCase().match(englishPattern);
  if (match && match[1] && match[2] && match[3]) {
    const monthName = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const month = englishMonths[monthName];
    
    if (month && isValidDate(day, month, year)) {
      return formatDate(year, month, day);
    }
  }

  // Pattern 5: DD/MM (current year assumed)
  const shortPattern = /^(\d{1,2})[.\/-](\d{1,2})$/;
  match = cleaned.match(shortPattern);
  if (match && match[1] && match[2]) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = new Date().getFullYear();
    
    if (isValidDate(day, month, year)) {
      return formatDate(year, month, day);
    }
  }

  return null;
}

/**
 * Validate if day, month, year form a valid date
 */
function isValidDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  // Check for valid day in month
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeapYear && month === 2) {
    daysInMonth[1] = 29;
  }
  
  const maxDays = daysInMonth[month - 1];
  return maxDays !== undefined && day <= maxDays;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
function formatDate(year: number, month: number, day: number): string {
  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
}

/**
 * Parse time string (HH:MM format)
 * 
 * @param timeText - Time text to parse
 * @returns Object with hour and minute or null if invalid
 * 
 * @example
 * parseTime("14:30") // { hour: 14, minute: 30 }
 * parseTime("9:15") // { hour: 9, minute: 15 }
 */
export function parseTime(timeText: string): { hour: number; minute: number } | null {
  if (!timeText || typeof timeText !== 'string') {
    return null;
  }

  const timePattern = /^(\d{1,2}):(\d{2})$/;
  const match = timeText.trim().match(timePattern);
  
  if (match && match[1] && match[2]) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  
  return null;
}

/**
 * Parse match week/round from text
 * 
 * @param weekText - Week text to parse
 * @returns Week number or null if invalid
 * 
 * @example
 * parseWeek("Hafta 15") // 15
 * parseWeek("Round 8") // 8
 * parseWeek("15. Hafta") // 15
 */
export function parseWeek(weekText: string): number | null {
  if (!weekText || typeof weekText !== 'string') {
    return null;
  }

  const patterns = [
    /hafta\s+(\d+)/i,
    /(\d+)\.\s*hafta/i,
    /round\s+(\d+)/i,
    /week\s+(\d+)/i,
    /^\s*(\d+)\s*$/
  ];

  for (const pattern of patterns) {
    const match = weekText.trim().match(pattern);
    if (match && match[1]) {
      const week = parseInt(match[1], 10);
      if (week > 0 && week <= 50) { // Reasonable week range
        return week;
      }
    }
  }

  return null;
}

/**
 * Parse odds value from text
 * 
 * @param oddsText - Odds text to parse
 * @returns Numeric odds value or null if invalid
 * 
 * @example
 * parseOdds("1.85") // 1.85
 * parseOdds("2,50") // 2.50
 * parseOdds("1/2") // 0.50 (fractional to decimal)
 */
export function parseOdds(oddsText: string): number | null {
  if (!oddsText || typeof oddsText !== 'string') {
    return null;
  }

  const cleaned = oddsText.trim().replace(',', '.');

  // Decimal odds (1.85, 2.50)
  const decimalPattern = /^(\d+(?:\.\d+)?)$/;
  let match = cleaned.match(decimalPattern);
  if (match && match[1]) {
    const odds = parseFloat(match[1]);
    if (odds >= 1.01 && odds <= 1000) { // Reasonable odds range
      return Math.round(odds * 100) / 100; // Round to 2 decimal places
    }
  }

  // Fractional odds (1/2, 5/1)
  const fractionalPattern = /^(\d+)\/(\d+)$/;
  match = cleaned.match(fractionalPattern);
  if (match && match[1] && match[2]) {
    const numerator = parseInt(match[1], 10);
    const denominator = parseInt(match[2], 10);
    if (denominator > 0) {
      const decimal = (numerator / denominator) + 1;
      if (decimal >= 1.01 && decimal <= 1000) {
        return Math.round(decimal * 100) / 100;
      }
    }
  }

  return null;
}