/**
 * Standings page scraper for fixture data
 * Handles navigation and data extraction from standings/fixture pages
 */

import { Page, chromium } from 'playwright';
import pino from 'pino';
import { 
  safeClick, 
  takeScreenshot
} from '../utils/playwright';

const logger = pino({
  level: 'info',
  name: 'standings-scraper'
});

/**
 * Match data interface for scraped fixture data
 */
export interface MatchData {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  week: number;
  htScore: { home: number; away: number } | null; // Half-time score
  ftScore: { home: number; away: number } | null; // Full-time score
  pattern: string | null;
}

/**
 * Pattern calculation based on half-time and full-time scores
 */
export function calculateMatchPattern(
  htHome: number, 
  htAway: number, 
  ftHome: number, 
  ftAway: number
): string {
  // Half-time result
  let htResult: string;
  if (htHome > htAway) htResult = "1";
  else if (htHome < htAway) htResult = "2";
  else htResult = "X";

  // Full-time result
  let ftResult: string;
  if (ftHome > ftAway) ftResult = "1";
  else if (ftHome < ftAway) ftResult = "2";
  else ftResult = "X";

  // Pattern format: IY{htResult}MS{ftResult}
  return `IY${htResult}MS${ftResult}`;
}

/**
 * Navigate to the fixtures/haftalık tab
 */
async function navigateToFixtures(page: Page): Promise<void> {
  logger.info('🏃 Navigating to fixtures tab...');
  
  const fixtureSelectors = [
    'a:has-text("Haftalık")',
    'a:has-text("Fixtures")',
    'a:has-text("Fikstür")',
    'a[href*="fixtures"]',
    'a[href*="haftalik"]',
    '.tab-link:has-text("Haftalık")',
    '.fixtures-tab'
  ];
  
  for (const selector of fixtureSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      await safeClick(page, selector);
      logger.info(`✅ Found and clicked fixture tab with selector: ${selector}`);
      await page.waitForTimeout(2000); // Wait for tab content to load
      return;
    } catch (error) {
      continue;
    }
  }
  
  throw new Error('Could not find fixtures tab');
}

/**
 * Navigate to week 1 by clicking left arrow or week 1 link
 */
async function navigateToWeek1(page: Page): Promise<void> {
  logger.info('🔄 Navigating to week 1...');
  
  // First try to click week "1" directly
  const weekLinkSelectors = [
    'a:has-text("1")',
    'span:has-text("1")',
    'td:has-text("1")',
    '.week-1',
    '[data-week="1"]'
  ];
  
  for (const selector of weekLinkSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        const text = await element.textContent();
        if (text?.trim() === '1') {
          await safeClick(page, selector);
          logger.info('✅ Clicked week 1 link');
          await page.waitForTimeout(2000);
          return;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  // If direct week link doesn't work, try arrow navigation
  logger.info('🔄 Trying arrow navigation to week 1...');
  
  const weekSelectors = [
    '.week-nav-left',
    '.arrow-left', 
    'a[title*="Previous"]',
    'a[title*="Önceki"]',
    '.prev-week',
    'img[src*="left"]',
    'img[src*="prev"]'
  ];
  
  // Try to navigate using left arrows
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let leftArrowFound = false;
    
    for (const selector of weekSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await safeClick(page, selector);
        leftArrowFound = true;
        logger.info(`⬅️  Clicked left arrow (attempt ${attempts + 1})`);
        await page.waitForTimeout(1500);
        break;
      } catch (error) {
        continue;
      }
    }
    
    if (!leftArrowFound) {
      logger.warn('⚠️  Could not find left arrow for week navigation');
      break;
    }
    
    attempts++;
  }
}

/**
 * Check if a text looks like a valid team name
 */
function isValidTeamName(text: string): boolean {
  if (!text || text.length < 2) return false;
  
  // Skip common headers and navigation elements
  const invalidPatterns = [
    /^(Genel|İç Saha|Dış Saha|İçerde|Deplasmanda)$/i,
    /^[OB]$/,
    /^\d+$/, // Just numbers
    /^Hafta\s*:/, // Week navigation
    /^(O|B)\s*vs\s*(O|B)$/i, // Header patterns
    /^(İç|Dış)\s*(Saha|vs)/i
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(text.trim())) {
      return false;
    }
  }
  
  // Valid teams should have letters and be reasonable length
  return /[A-Za-zÇĞıİÖŞÜçğıöşü]/.test(text) && text.length >= 3;
}

/**
 * Parse individual match row
 */
async function parseMatchRow(_page: Page, row: any, week: number, index: number): Promise<MatchData | null> {
  try {
    // Get all cells in the row
    const cells = await row.$$('td, th');
    if (cells.length === 0) {
      return null;
    }
    
    // Extract all cell texts
    const cellTexts: string[] = [];
    for (const cell of cells) {
      const text = await cell.textContent() || '';
      cellTexts.push(text.trim());
    }
    
    // Debug logging for first few rows
    if (index < 5) {
      logger.info(`🔍 Row ${index}: ${cellTexts.join(' | ')}`);
    }
    
    // Extract team names from different approaches
    let homeTeam = '';
    let awayTeam = '';
    
    // Method 1: Try to find teams in specific cells (usually columns 2-3 or similar)
    if (cellTexts.length >= 3) {
      // Check different column combinations for teams
      const teamPairs = [
        [cellTexts[0], cellTexts[1]], // First two columns
        [cellTexts[1], cellTexts[2]], // Second and third columns  
        [cellTexts[0], cellTexts[2]], // First and third columns
      ];
      
      for (const [team1, team2] of teamPairs) {
        if (team1 && team2 && isValidTeamName(team1) && isValidTeamName(team2)) {
          homeTeam = team1;
          awayTeam = team2;
          break;
        }
      }
    }
    
    // Method 2: If no valid teams found, try full row text parsing
    if (!homeTeam || !awayTeam) {
      const fullRowText = cellTexts.join(' ');
      
      // Look for "vs" pattern or similar
      const vsMatch = fullRowText.match(/(.+?)\s+(?:vs|v|x|-)\s+(.+)/i);
      if (vsMatch && vsMatch[1] && vsMatch[2]) {
        const team1 = vsMatch[1].trim();
        const team2 = vsMatch[2].trim();
        if (isValidTeamName(team1) && isValidTeamName(team2)) {
          homeTeam = team1;
          awayTeam = team2;
        }
      }
    }
    
    // Skip invalid rows
    if (!homeTeam || !awayTeam || !isValidTeamName(homeTeam) || !isValidTeamName(awayTeam)) {
      return null;
    }
    
    // Extract scores (this is complex and may not always be available)
    let htScore: { home: number; away: number } | null = null;
    let ftScore: { home: number; away: number } | null = null;
    
    // Look for score patterns in the row
    const fullRowText = cellTexts.join(' ');
    const scoreMatches = fullRowText.match(/(\d+)[\s\-:]+(\d+)/g);
    if (scoreMatches && scoreMatches.length >= 1) {
      // Try to parse the first score as final score
      const scoreMatch = scoreMatches[0].match(/(\d+)[\s\-:]+(\d+)/);
      if (scoreMatch && scoreMatch[1] && scoreMatch[2]) {
        ftScore = {
          home: parseInt(scoreMatch[1], 10),
          away: parseInt(scoreMatch[2], 10)
        };
      }
    }
    
    // Generate pattern if we have final score
    let pattern: string | null = null;
    if (ftScore) {
      if (htScore) {
        const ht = htScore as { home: number; away: number };
        pattern = calculateMatchPattern(ht.home, ht.away, ftScore.home, ftScore.away);
      } else {
        // If no half-time score available, assume 0-0 at half-time
        pattern = calculateMatchPattern(0, 0, ftScore.home, ftScore.away);
      }
    }
    
    return {
      homeTeam,
      awayTeam,
      matchDate: '', // Date parsing can be added later
      week,
      htScore,
      ftScore,
      pattern
    };
    
  } catch (error) {
    logger.error(`❌ Error parsing match row ${index}: ${error}`);
    return null;
  }
}

/**
 * Parse match data from current page
 */
async function parseMatchRows(page: Page, week: number): Promise<MatchData[]> {
  try {
    logger.info(`🔍 Parsing match data for week ${week}...`);
    
    const matches: MatchData[] = [];
    
    // Try different row selectors 
    const rowSelectors = [
      'table.fixtures tbody tr',
      'table.fixtures tr',
      '.fixtures tbody tr',
      '.fixtures tr',
      '#tblResult tbody tr',
      '#tblResult tr',
      '.list-table tbody tr',
      '.list-table tr',
      'table.live-table tr',
      '.fixture-row',
      '.match-row',
      '.game-row'
    ];
    
    let matchRows: any[] = [];
    
    // Try to find match rows
    for (const selector of rowSelectors) {
      try {
        matchRows = await page.$$(selector);
        if (matchRows.length > 0) {
          logger.info(`✅ Found ${matchRows.length} match rows with selector: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (matchRows.length === 0) {
      logger.warn('⚠️  No match rows found');
      await takeScreenshot(page, 'no-match-rows');
      return matches;
    }
    
    // Parse each match row
    for (let i = 0; i < matchRows.length; i++) {
      try {
        const row = matchRows[i];
        const matchData = await parseMatchRow(page, row, week, i);
        
        if (matchData) {
          matches.push(matchData);
          logger.info(`✅ Parsed match: ${matchData.homeTeam} vs ${matchData.awayTeam}`);
        }
      } catch (error) {
        logger.error(`❌ Error parsing match row ${i}: ${error}`);
        continue;
      }
    }
    
    logger.info(`🏁 Successfully parsed ${matches.length} matches for week ${week}`);
    return matches;
    
  } catch (error) {
    logger.error(`❌ Error parsing match rows: ${error}`);
    await takeScreenshot(page, 'parse-error');
    return [];
  }
}

/**
 * Main scraper function
 */
export async function scrapeStandingsFixtures(seasonId: string, maxWeeks: number = 38): Promise<boolean> {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    logger.info(`🚀 Starting standings/fixtures scraping for season ${seasonId}...`);
    
    // Navigate to standings page
    const url = `https://arsiv.mackolik.com/Standings/Default.aspx?sId=${seasonId}`;
    logger.info(`🌐 Navigating to standings page: ${url}`);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    // Navigate to fixtures tab
    await navigateToFixtures(page);
    
    // Navigate to week 1
    await navigateToWeek1(page);
    
    let totalMatches = 0;
    let week = 1;
    
    // Scrape each week
    while (week <= maxWeeks) {
      logger.info(`🔄 Scraping week ${week}...`);
      
      // Parse matches for current week
      const matches = await parseMatchRows(page, week);
      
      if (matches.length > 0) {
        totalMatches += matches.length;
        logger.info(`📊 Found ${matches.length} matches for week ${week}`);
        
        // Here you would normally save to database
        // await upsertMatchesToDatabase(matches);
        
      } else {
        logger.warn(`⚠️  No matches found for week ${week}`);
      }
      
      // Try to navigate to next week
      if (week < maxWeeks) {
        try {
          // Try to find and click next week arrow or week number
          const nextWeekSelectors = [
            '.week-nav-right',
            '.arrow-right',
            'a[title*="Next"]',
            'a[title*="Sonraki"]',
            '.next-week',
            'img[src*="right"]',
            'img[src*="next"]'
          ];
          
          let nextWeekFound = false;
          for (const selector of nextWeekSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 3000 });
              await safeClick(page, selector);
              nextWeekFound = true;
              logger.info(`➡️  Clicked next week arrow`);
              await page.waitForTimeout(2000);
              break;
            } catch (error) {
              continue;
            }
          }
          
          if (!nextWeekFound) {
            logger.warn(`⚠️  Could not find right arrow for next week`);
            logger.warn(`⚠️  Could not navigate to week ${week + 1}, stopping`);
            break;
          }
        } catch (error) {
          logger.error(`❌ Error navigating to week ${week + 1}: ${error}`);
          break;
        }
      }
      
      week++;
    }
    
    logger.info(`🏁 Scraping completed! Processed ${totalMatches} total matches across ${week - 1} weeks`);
    return true;
    
  } catch (error) {
    logger.error(`❌ Fatal error in standings scraper: ${error}`);
    await takeScreenshot(page, 'fatal-error');
    return false;
  } finally {
    await browser.close();
  }
}