/**
 * Utility functions for sportoto-telebot
 * 
 * This module exports all helper functions used throughout the application:
 * - Text normalization and canonicalization
 * - Date and score parsing
 * - Playwright browser automation helpers
 */

// Text utilities
export {
  canonicalizeTeam,
  normalizeText,
  canonicalizeCompetition,
  extractCountry,
  calculateTeamSimilarity
} from './text';

// Parsing utilities
export {
  parseScore,
  parseDate,
  parseTime,
  parseWeek,
  parseOdds,
  type Score
} from './parsers';

// Playwright utilities
export {
  safeClick,
  safeGetText,
  safeGetAttribute,
  safeScroll,
  safeWaitFor,
  safeGetAll,
  safeType,
  safeSelect,
  waitForNavigation,
  takeScreenshot,
  elementExists,
  getPageMetrics,
  sleep,
  type SafeOptions
} from './playwright';

// Common utility functions

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise with function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Create a random delay between min and max milliseconds
 * Useful for avoiding rate limits
 * 
 * @param min - Minimum delay in milliseconds
 * @param max - Maximum delay in milliseconds
 * @returns Promise that resolves after random delay
 */
export function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Convert object to URL search parameters
 * 
 * @param params - Object with parameters
 * @returns URL search parameters string
 */
export function objectToParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  }
  
  return searchParams.toString();
}

/**
 * Validate URL format
 * 
 * @param url - URL string to validate
 * @returns True if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format number with thousand separators
 * 
 * @param num - Number to format
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: string = 'tr-TR'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Truncate string to specified length with ellipsis
 * 
 * @param str - String to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export function truncateString(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) {
    return str;
  }
  
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Deep clone an object
 * 
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Check if string contains any of the given substrings
 * 
 * @param str - String to check
 * @param substrings - Array of substrings to search for
 * @param caseSensitive - Whether to perform case-sensitive search
 * @returns True if any substring is found
 */
export function containsAny(str: string, substrings: string[], caseSensitive: boolean = false): boolean {
  const searchStr = caseSensitive ? str : str.toLowerCase();
  const searchSubstrings = caseSensitive ? substrings : substrings.map(s => s.toLowerCase());
  
  return searchSubstrings.some(substring => searchStr.includes(substring));
}

/**
 * Remove duplicate items from array based on a key function
 * 
 * @param array - Array to deduplicate
 * @param keyFn - Function to generate key for each item
 * @returns Array with duplicates removed
 */
export function removeDuplicates<T>(array: T[], keyFn: (item: T) => string | number = item => String(item)): T[] {
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Group array items by a key function
 * 
 * @param array - Array to group
 * @param keyFn - Function to generate grouping key
 * @returns Object with grouped items
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Calculate percentage change between two numbers
 * 
 * @param oldValue - Original value
 * @param newValue - New value
 * @returns Percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100;
  }
  
  return ((newValue - oldValue) / oldValue) * 100;
}