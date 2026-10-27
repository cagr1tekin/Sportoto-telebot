#!/usr/bin/env node

/**
 * Standings/Fikstür scraper for Sportoto
 * Scrapes match data from standings page fixture tab
 */

import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger';
import { supabaseDb, calculateMatchPattern, parseMatchDate, supabase } from '../supabase';
import { getSeasonById } from '../utils/season-mapping';

/**
 * Main scraper for standings fixture data
 */
export class StandingsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private currentWeekData: any[] | null = null;
  private currentWeekNumber: number | null = null;
  private seasonId: string = '';

  constructor() {
    // No database initialization needed - using Supabase client
    this.seasonId = process.env.PREMIER_LEAGUE_SEASON_ID || '67180';
  }

  /**
   * Get season info and dates based on environment variable
   */
  private getSeasonInfo() {
    const seasonId = this.seasonId;
    const seasonInfo = getSeasonById(seasonId);

    if (!seasonInfo) {
      logger.warn(`⚠️ Season not found for ID ${seasonId}, using fallback dates`);

      // Dynamic fallback based on season ID or ENV
      const envSeasonLabel = process.env.SEASON_LABEL;

      if (envSeasonLabel) {
        // Try to parse years from "2023-24" format
        const parts = envSeasonLabel.split('-');
        if (parts.length === 2) {
          const startYear = parts[0];
          return {
            seasonId,
            startYear,
            startMonth: '08',
            startDay: '15',
            seasonName: `${process.env.LEAGUE_NAME || 'Premier League'} ${envSeasonLabel}`
          };
        }
      }

      // Dynamic fallback based on season ID
      const getYearFromSeasonId = (sId: string): string => {
        const seasonMap: { [key: string]: string } = {
          '67180': '2024', // 2024-25
          '63837': '2023', // 2023-24  
          '61588': '2022', // 2022-23
          '34827': '2015', // 2015-16
          '31539': '2014', // 2014-15
          '29077': '2013', // 2013-14
          '26726': '2012', // 2012-13
          '24304': '2011', // 2011-12
          '21777': '2010'  // 2010-11
        };
        return seasonMap[sId] || '2024'; // Default fallback
      };

      return {
        seasonId,
        startYear: getYearFromSeasonId(seasonId),
        startMonth: '08',
        startDay: '16',
        seasonName: 'Unknown Season'
      };
    }

    const startDate = new Date(seasonInfo.startDate);
    return {
      seasonId,
      startYear: startDate.getFullYear().toString(),
      startMonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
      startDay: startDate.getDate().toString().padStart(2, '0'),
      seasonName: seasonInfo.name
    };
  }

  /**
   * Get database season ID from mackolik season ID
   */
  private async getDatabaseSeasonId(competitionId: number): Promise<number> {
    const seasonInfo = this.getSeasonInfo();
    const leagueName = process.env.LEAGUE_NAME || 'Premier League';

    // Extract label (e.g. "2023-24")
    let seasonLabel = seasonInfo.seasonName.replace(`${leagueName} `, '');
    if (seasonLabel === 'Unknown Season' && process.env.SEASON_LABEL) {
      seasonLabel = process.env.SEASON_LABEL;
    }

    try {
      const { data: season, error } = await supabase
        .from('seasons')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('label', seasonLabel)
        .single();

      if (error || !season) {
        logger.warn(`⚠️ Database season not found for ${seasonLabel}, creating it...`);

        // Create new season
        const newSeason = await supabaseDb.createSeason(competitionId, seasonLabel);
        logger.info(`✅ Created new season: ${seasonLabel} (ID: ${newSeason.id})`);
        return newSeason.id;
      }

      logger.info(`🎯 Found database season ID ${season.id} for ${seasonLabel}`);
      return season.id;
    } catch (error) {
      logger.error(`❌ Error finding/creating database season ID: ${error}`);
      return 1; // Fallback
    }
  }

  /**
   * Initialize browser and page
   */
  async init(): Promise<void> {
    logger.info('🚀 Initializing Standings scraper...');

    this.browser = await chromium.launch({
      headless: false, // Reklam handling için görünür mod
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });

    this.page = await this.browser.newPage();

    // User agent ve viewport ayarları
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await this.page.setViewportSize({ width: 1920, height: 1080 });

    // Console log'ları yakala
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        logger.debug(`Browser console error: ${msg.text()}`);
      }
    });
  }

  /**
   * Handle ads and popups that appear on page load
   */
  async handleAds(): Promise<void> {
    logger.info('🚫 Handling ads and popups...');

    try {
      // Wait for initial page load to stabilize
      await this.page!.waitForTimeout(3000);

      // First, handle popup overlays without removing content
      const popupCloseSelectors = [
        'button:has-text("×")',
        '[aria-label="Close"]',
        '[aria-label="Kapat"]',
        '.close',
        '.popup-close',
        '.modal-close'
      ];

      for (const selector of popupCloseSelectors) {
        try {
          const closeButton = await this.page!.$(selector);
          if (closeButton) {
            logger.info(`📱 Closing popup with: ${selector}`);
            await closeButton.click();
            await this.page!.waitForTimeout(1000);
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      // Handle ad overlays more carefully - hide instead of remove to prevent layout shift
      await this.page!.evaluate(() => {
        // Hide fixed positioned elements that are likely ads
        const fixedElements = document.querySelectorAll('[style*="position: fixed"]');
        fixedElements.forEach(element => {
          const el = element as HTMLElement;
          const rect = el.getBoundingClientRect();

          // Hide large fixed elements that cover significant screen area
          if (rect.height > 200 || rect.width > 400) {
            el.style.display = 'none';
          }
        });

        // Hide video elements that might be ads
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const el = video as HTMLElement;
          const rect = el.getBoundingClientRect();

          // Hide videos that are positioned like ads
          if (rect.height > 100 && rect.width > 300) {
            el.style.display = 'none';
          }
        });

        // Hide elements with ad-related content but preserve layout
        const adRelatedSelectors = ['iframe[src*="ad"]', '[id*="advertisement"]', '[class*="banner"]'];
        adRelatedSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const element = el as HTMLElement;
            element.style.visibility = 'hidden'; // Hide but keep space
            element.style.height = '0px'; // Minimize space
          });
        });
      });

      // Wait for layout to stabilize
      await this.page!.waitForTimeout(2000);

      logger.info('✅ Ad handling completed');

    } catch (error) {
      logger.warn('⚠️ Error handling ads:', error as any);
    }
  }

  /**
   * Navigate to standings page with retry logic
   */
  async navigateToStandings(seasonId: string = process.env.PREMIER_LEAGUE_SEASON_ID || '67180'): Promise<void> {
    const url = `https://arsiv.mackolik.com/Standings/Default.aspx?sId=${seasonId}`;
    logger.info(`🌐 Navigating to: ${url}`);

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        logger.info(`📡 Loading attempt ${attempts}/${maxAttempts}`);

        await this.page!.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        // Wait for page to stabilize
        await this.page!.waitForTimeout(2000);

        // Check if we're on the right page
        const isCorrectPage = await this.page!.evaluate(() => {
          // Look for key elements that indicate we're on the standings page
          const hasStandingsTable = document.querySelector('table') !== null;
          const hasSeasonSelector = document.querySelector('[name*="season"], select') !== null;
          const urlCheck = window.location.href.includes('Standings');

          return hasStandingsTable || hasSeasonSelector || urlCheck;
        });

        if (!isCorrectPage) {
          logger.warn(`⚠️ Page doesn't seem to be loaded correctly, retrying...`);
          await this.page!.waitForTimeout(2000);
          continue;
        }

        // Handle ads carefully
        await this.handleAds();

        // Verify page is still functional after ad handling
        const isStillWorking = await this.page!.evaluate(() => {
          return document.body && document.body.children.length > 0;
        });

        if (isStillWorking) {
          logger.info('✅ Successfully loaded mackolik archive standings page');
          return;
        } else {
          logger.warn('⚠️ Page seems broken after ad removal, retrying...');
        }

      } catch (error) {
        logger.warn(`⚠️ Attempt ${attempts} failed:`, error as any);

        if (attempts === maxAttempts) {
          logger.error('❌ Failed to navigate to standings page after all attempts:', error as any);
          throw error;
        }

        // Wait before retrying
        await this.page!.waitForTimeout(3000);
      }
    }
  }

  /**
   * Debug function to inspect page structure
   */
  async debugPageStructure(): Promise<void> {
    logger.info('🔍 Debugging page structure...');

    try {
      // Find all navigation elements with more detailed analysis
      const pageInfo = await this.page!.evaluate(() => {
        const info = {
          allText: [] as string[],
          navigationElements: [] as string[],
          tableElements: [] as string[],
          buttons: [] as string[]
        };

        // Get all text content to understand page structure
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        let textNode;
        while (textNode = walker.nextNode()) {
          const text = textNode.textContent?.trim();
          if (text && text.length > 2 && text.length < 50) {
            info.allText.push(text);
          }
        }

        // Find all buttons and clickable elements
        document.querySelectorAll('button, input[type="button"], a, td[onclick], div[onclick]').forEach((el, index) => {
          const text = el.textContent?.trim();
          const tag = el.tagName.toLowerCase();
          const onclick = (el as any).onclick ? 'hasClick' : 'noClick';
          if (text) {
            info.buttons.push(`${tag}[${index}]: "${text}" (${onclick})`);
          }
        });

        // Find all table structures
        document.querySelectorAll('table').forEach((table, tIndex) => {
          const rows = table.querySelectorAll('tr');
          info.tableElements.push(`Table ${tIndex}: ${rows.length} rows`);

          rows.forEach((row, rIndex) => {
            if (rIndex < 3) { // Only first 3 rows
              const cells = row.querySelectorAll('td, th');
              const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim()).filter(text => text);
              if (cellTexts.length > 0) {
                info.tableElements.push(`  Row ${rIndex}: ${cellTexts.join(' | ')}`);
              }
            }
          });
        });

        return info;
      });

      logger.info(`Found ${pageInfo.allText.length} text elements (showing first 30):`);
      pageInfo.allText.slice(0, 30).forEach(text => {
        logger.info(`  Text: "${text}"`);
      });

      logger.info(`Found ${pageInfo.buttons.length} clickable elements (showing first 20):`);
      pageInfo.buttons.slice(0, 20).forEach(button => {
        logger.info(`  ${button}`);
      });

      logger.info(`Found table structures:`);
      pageInfo.tableElements.forEach(table => {
        logger.info(`  ${table}`);
      });

    } catch (error) {
      logger.error('❌ Failed to debug page structure:', error as any);
    }
  }

  /**
   * Click on Fikstür (Fixture) tab
   */
  async clickFixtureTab(): Promise<void> {
    logger.info('🎯 Looking for Fikstür tab...');

    try {
      // Wait for page to be ready
      await this.page!.waitForTimeout(3000);

      // First debug the page structure
      await this.debugPageStructure();

      // Look for Fikstür tab - it should be visible in the navigation
      const fixtureSelectors = [
        // Direct text matching
        'text=Fikstür',
        'a:has-text("Fikstür")',
        // Link with Fikstür text
        'a[href*="Fixture"]',
        'a[href*="Fikstur"]',
        // Table cell or div containing Fikstür
        'td:has-text("Fikstür")',
        'div:has-text("Fikstür")',
        // By ID or class
        '#fikstür',
        '.fikstür',
        // Navigation specific
        '.nav a:has-text("Fikstür")',
        '.navigation a:has-text("Fikstür")'
      ];

      let tabFound = false;

      // Try each selector
      for (const selector of fixtureSelectors) {
        try {
          await this.page!.waitForSelector(selector, { timeout: 2000 });
          const tab = await this.page!.$(selector);
          if (tab) {
            logger.info(`📑 Found Fikstür tab: ${selector}`);

            // Scroll into view if needed
            await tab.scrollIntoViewIfNeeded();
            await this.page!.waitForTimeout(500);

            // Click the tab
            await tab.click();
            await this.page!.waitForTimeout(3000);

            tabFound = true;
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!tabFound) {
        // Fallback: search through all clickable elements
        logger.info('🔍 Searching through all clickable elements for Fikstür...');

        const clickableElements = await this.page!.$$('a, button, td, div');
        for (const element of clickableElements) {
          try {
            const text = await element.textContent();
            if (text && text.trim().toLowerCase().includes('fikstür')) {
              logger.info(`📑 Found Fikstür tab via text search: "${text.trim()}"`);

              await element.scrollIntoViewIfNeeded();
              await this.page!.waitForTimeout(500);
              await element.click();
              await this.page!.waitForTimeout(3000);

              tabFound = true;
              break;
            }
          } catch (error) {
            // Continue
          }
        }
      }

      if (tabFound) {
        logger.info('✅ Successfully clicked Fikstür tab');
      } else {
        logger.warn('⚠️ Fikstür tab not found, will continue anyway');
      }

    } catch (error) {
      logger.error('❌ Failed to click fixture tab:', error as any);
      // Don't throw error, continue execution
    }
  }

  /**
   * Navigate to the actual first week (August dates) using AJAX endpoints
   */
  async navigateToWeek1(): Promise<void> {
    logger.info('🔄 Using direct AJAX approach for week navigation...');

    try {
      const currentUrl = this.page!.url();
      logger.info(`Current URL: ${currentUrl}`);

      // Use the real AJAX endpoint discovered from network analysis
      const baseUrl = 'https://arsiv.mackolik.com/AjaxHandlers/FixtureHandler.aspx';
      const seasonId = process.env.PREMIER_LEAGUE_SEASON_ID || '67180'; // Premier League from ENV

      // First get the weeks list to understand the structure
      logger.info('📋 Fetching weeks list from AJAX endpoint...');
      const weeksResponse = await this.page!.evaluate(async (url: string) => {
        const response = await fetch(url, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': window.location.href
          }
        });
        return await response.text();
      }, `${baseUrl}?command=getWeeks&id=${seasonId}`);

      logger.info(`📊 Weeks response sample: ${weeksResponse.substring(0, 300)}`);

      // Parse weeks to find week 1 (August dates)
      let week1Data;
      try {
        const seasonInfo = this.getSeasonInfo();
        const targetDate = `${seasonInfo.startDay}.${seasonInfo.startMonth}.${seasonInfo.startYear}`;
        logger.info(`🔍 Looking for week 1 with target date: ${targetDate}`);

        const weeksArray = JSON.parse(weeksResponse);
        week1Data = weeksArray.find((week: any[]) =>
          week[0] === 1 && week[1].includes(targetDate)
        );
        logger.info(`🎯 Found week 1 data: ${JSON.stringify(week1Data)}`);
      } catch (parseError) {
        logger.warn('⚠️ Could not parse weeks response as JSON');
      }

      // Now fetch week 1 fixtures using the AJAX endpoint
      logger.info('🎯 Fetching week 1 fixtures from AJAX endpoint...');
      const week1Response = await this.page!.evaluate(async (url: string) => {
        const response = await fetch(url, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': window.location.href
          }
        });
        return await response.text();
      }, `${baseUrl}?command=getMatches&id=${seasonId}&week=1`);

      logger.info(`📊 Week 1 fixtures response sample: ${week1Response.substring(0, 500)}`);

      // Parse and inject the fixture data into the page DOM
      try {
        const fixturesArray = JSON.parse(week1Response);
        logger.info(`📊 Parsed ${fixturesArray.length} fixtures for week 1`);

        // Inject the fixture data into the page by updating the existing table
        await this.page!.evaluate((fixtures: any[]) => {
          // Find the fixture table (usually the second table)
          const tables = Array.from(document.querySelectorAll('table'));
          let fixtureTable = null;

          // Look for the table with fixture headers
          for (const table of tables) {
            const headerText = table.textContent || '';
            if (headerText.includes('MAÇ SONUÇLARI') || headerText.includes('IY') || headerText.includes('MS')) {
              fixtureTable = table;
              break;
            }
          }

          if (!fixtureTable && tables.length > 1) {
            // Fallback to second table if header search fails
            fixtureTable = tables[1];
          }

          if (fixtureTable) {
            console.log('🔄 Found fixture table, updating with week 1 data...');

            // Clear existing rows except header
            const tbody = fixtureTable.querySelector('tbody');
            if (tbody) {
              // Keep header row, clear data rows
              const rows = Array.from(tbody.querySelectorAll('tr'));
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row) {
                  row.remove();
                }
              }

              // Add new fixture rows from AJAX data
              fixtures.forEach((fixture, index) => {
                const row = document.createElement('tr');

                // Extract fixture data from the array
                // Format: [id, date, type, homeTeamId, homeTeam, awayTeamId, awayTeam, ?, ?, htHome, htAway, odds...]
                const [, date, type, , homeTeam, , awayTeam, , , htHome, htAway] = fixture;
                const result = `${htHome || 0} - ${htAway || 0}`;

                // Create cells matching the expected format
                row.innerHTML = `
                  <td>${date}</td>
                  <td>${type}</td>
                  <td>${index + 1}</td>
                  <td>${homeTeam}</td>
                  <td>${result}</td>
                  <td>${awayTeam}</td>
                  <td>${index + 1}</td>
                  <td>${htHome || 0} - ${htAway || 0}</td>
                `;

                tbody.appendChild(row);
              });

              console.log(`✅ Injected ${fixtures.length} fixtures into table`);
            }
          } else {
            console.warn('⚠️ Could not find fixture table to update');
          }
        }, fixturesArray);

        logger.info('✅ Successfully injected week 1 fixture data into page');

      } catch (parseError) {
        logger.warn('⚠️ Could not parse week 1 fixtures response as JSON:', parseError as any);
      }

    } catch (error) {
      logger.error('❌ Failed to use AJAX approach:', error as any);

      // Fallback to old dropdown approach if AJAX fails
      logger.info('🔄 Falling back to dropdown approach...');
      return this.navigateToWeek1Fallback();
    }
  }

  /**
   * Fallback method using dropdown approach
   */
  async navigateToWeek1Fallback(): Promise<void> {

    try {
      // First try URL manipulation approach
      const currentUrl = this.page!.url();
      logger.info(`Current URL: ${currentUrl}`);

      logger.info('🔍 Trying dropdown approach for week selection...');

      // Fallback to original dropdown approach
      // Wait for fixture page to load properly
      await this.page!.waitForTimeout(2000);

      // Try to find actual week 1 by looking for dropdown specifically for week navigation
      logger.info('📅 Searching for week dropdown that contains August dates...');

      const augustWeekFound = await this.page!.evaluate(() => {
        // Look for dropdowns that might contain week selection
        const selects = Array.from(document.querySelectorAll('select'));

        for (const select of selects) {
          const options = Array.from(select.querySelectorAll('option'));

          // Skip if this dropdown doesn't look like a week selector
          // Week dropdowns typically have many options (30+) and contain dates
          if (options.length < 10) continue;

          // Check if this dropdown contains multiple week options with dates
          let weekOptionsCount = 0;
          let augustOption = null;

          for (const option of options) {
            const text = option.textContent?.trim() || '';

            // Count options that look like week entries (contain dates or numbers)
            if (text.match(/\d+\.\d+/) || text.match(/\d+\/\d+/) || text.match(/\(\d+/)) {
              weekOptionsCount++;
            }

            // Check if this contains August dates specifically
            if (text.includes('16.08') || text.includes('17.08') ||
              text.includes('18.08') || text.includes('19.08') ||
              text.includes('16/08') || text.includes('17/08') ||
              text.includes('18/08') || text.includes('19/08')) {
              augustOption = option;
            }
          }

          // If this looks like a week dropdown (10+ week-like options) and has August dates
          if (weekOptionsCount >= 10 && augustOption) {
            console.log(`Found August week in proper week dropdown: ${augustOption.value} (${augustOption.textContent})`);

            // Set the option as selected
            augustOption.selected = true;

            // Trigger multiple events to ensure dropdown change is registered
            const changeEvent = new Event('change', {
              bubbles: true,
              cancelable: true
            });
            select.dispatchEvent(changeEvent);

            // Also trigger input event
            const inputEvent = new Event('input', {
              bubbles: true,
              cancelable: true
            });
            select.dispatchEvent(inputEvent);

            // Try form submission if select is in a form
            const form = select.closest('form');
            if (form) {
              console.log('Found form, submitting...');
              form.submit();
            }

            // Also try to focus and simulate keyboard events
            select.focus();
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              bubbles: true
            });
            select.dispatchEvent(enterEvent);

            // And click event on the option for good measure
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            augustOption.dispatchEvent(clickEvent);

            // Try to submit any forms that might contain this dropdown
            const forms = Array.from(document.querySelectorAll('form'));
            for (const form of forms) {
              if (form.contains(select)) {
                console.log('Found form containing dropdown, submitting...');
                form.submit();
                break;
              }
            }

            return { found: true, value: augustOption.value, text: augustOption.textContent };
          }
        }

        return { found: false };
      });

      if (augustWeekFound.found) {
        logger.info(`🔄 Attempting to select August week: ${augustWeekFound.text}`);

        // Store current URL and fixture data before dropdown change
        const urlBefore = this.page!.url();
        const fixturesBefore = await this.page!.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('tbody tr'));
          return rows.slice(0, 3).map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            return {
              date: cells[1]?.textContent?.trim() || '',
              homeTeam: cells[2]?.textContent?.trim() || '',
              awayTeam: cells[4]?.textContent?.trim() || ''
            };
          });
        });

        logger.info(`📊 Fixtures before dropdown change: ${JSON.stringify(fixturesBefore, null, 2)}`);
        logger.info(`🔗 URL before dropdown change: ${urlBefore}`);

        // Try multiple approaches for dropdown selection
        for (let attempt = 1; attempt <= 10; attempt++) {
          logger.info(`🎯 Attempt ${attempt} to change dropdown...`);

          // Re-trigger the dropdown selection
          await this.page!.evaluate(() => {
            // Find the dropdown with the August option again
            const selects = Array.from(document.querySelectorAll('select'));

            for (const select of selects) {
              const options = Array.from(select.querySelectorAll('option'));

              const seasonInfo = this.getSeasonInfo();
              const targetMonth = `${seasonInfo.startMonth}.${seasonInfo.startYear}`;
              const targetDate = `${seasonInfo.startDay}.${seasonInfo.startMonth}.${seasonInfo.startYear}`;

              const augustOption = options.find(option =>
                option.textContent?.includes(targetMonth) &&
                option.textContent?.includes(targetDate)
              );

              if (augustOption) {
                console.log(`Selecting option: ${augustOption.textContent} with value: ${augustOption.value}`);

                // Set the value directly
                select.value = augustOption.value;
                augustOption.selected = true;

                // Trigger all possible events
                select.dispatchEvent(new Event('change', { bubbles: true }));
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('click', { bubbles: true }));

                // Try focus and blur events
                select.focus();
                select.dispatchEvent(new Event('focus', { bubbles: true }));
                select.dispatchEvent(new Event('blur', { bubbles: true }));

                // Try keyboard events
                select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                select.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

                // Check for any submit buttons and click them
                const submitButtons = Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"]'));
                for (const btn of submitButtons) {
                  console.log('Clicking submit button...');
                  (btn as HTMLElement).click();
                }

                return true;
              }
            }
            return false;
          });

          // Wait for potential page change
          await this.page!.waitForTimeout(2000);

          const fixturesAfter = await this.page!.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            return rows.slice(0, 3).map(row => {
              const cells = Array.from(row.querySelectorAll('td'));
              return {
                date: cells[1]?.textContent?.trim() || '',
                homeTeam: cells[2]?.textContent?.trim() || '',
                awayTeam: cells[4]?.textContent?.trim() || ''
              };
            });
          });

          const urlAfter = this.page!.url();

          logger.info(`🎯 Attempt ${attempt} - Fixtures after: ${JSON.stringify(fixturesAfter, null, 2)}`);
          logger.info(`🔗 URL after: ${urlAfter}`);

          // Check if anything changed
          if (JSON.stringify(fixturesBefore) !== JSON.stringify(fixturesAfter) || urlBefore !== urlAfter) {
            logger.info('✅ Content or URL changed - dropdown selection may have worked!');
            break;
          }

          if (attempt === 10) {
            logger.warn('⚠️ Page content did not change after 10 attempts');

            // Try direct URL manipulation as last resort
            logger.info('🎯 Trying direct URL manipulation...');
            const baseUrl = urlBefore.split('?')[0];
            const weekUrls = [
              `${baseUrl}?sId=67180&wId=1`,
              `${baseUrl}?sId=67180&weekId=1`,
              `${baseUrl}?sId=67180&week=1`,
              `${baseUrl}?sId=67180&w=1`,
              `${baseUrl}?sId=67180&gameWeek=1`
            ];

            for (const weekUrl of weekUrls) {
              try {
                logger.info(`🔗 Trying URL: ${weekUrl}`);
                await this.page!.goto(weekUrl, { waitUntil: 'networkidle', timeout: 30000 });
                await this.page!.waitForTimeout(3000);

                const fixturesAfterUrl = await this.page!.evaluate(() => {
                  const rows = Array.from(document.querySelectorAll('tbody tr'));
                  return rows.slice(0, 3).map(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    return {
                      date: cells[1]?.textContent?.trim() || '',
                      homeTeam: cells[2]?.textContent?.trim() || '',
                      awayTeam: cells[4]?.textContent?.trim() || ''
                    };
                  });
                });

                if (JSON.stringify(fixturesBefore) !== JSON.stringify(fixturesAfterUrl)) {
                  logger.info('✅ URL manipulation worked!');
                  break;
                }
              } catch (urlError) {
                logger.warn(`⚠️ URL attempt failed: ${weekUrl}`);
              }
            }
          }
        }

        // Wait for page content to actually change
        let contentChanged = false;
        for (let attempt = 1; attempt <= 10; attempt++) {
          await this.page!.waitForTimeout(2000);

          const fixturesAfter = await this.page!.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tbody tr'));
            return rows.slice(0, 3).map(row => {
              const cells = Array.from(row.querySelectorAll('td'));
              return {
                date: cells[1]?.textContent?.trim() || '',
                homeTeam: cells[2]?.textContent?.trim() || '',
                awayTeam: cells[4]?.textContent?.trim() || ''
              };
            });
          });

          logger.info(`📊 Attempt ${attempt} - Fixtures after: ${JSON.stringify(fixturesAfter, null, 2)}`);

          // Check if any fixture data has changed
          const hasChanged = fixturesAfter.some((fixture, index) => {
            const before = fixturesBefore[index];
            return before && (
              fixture.date !== before.date ||
              fixture.homeTeam !== before.homeTeam ||
              fixture.awayTeam !== before.awayTeam
            );
          });

          if (hasChanged) {
            contentChanged = true;
            logger.info(`✅ Page content changed after ${attempt} attempts`);

            // Check if we have August dates
            const hasAugustDates = fixturesAfter.some(f =>
              f.date.includes('08.') || f.date.includes('/08') || f.date.includes('Aug')
            );

            if (hasAugustDates) {
              logger.info('🎯 Found August dates in fixtures!');
              return;
            } else {
              logger.warn('⚠️ Content changed but no August dates found');
            }
            break;
          }
        }

        if (!contentChanged) {
          logger.warn('⚠️ Page content did not change after dropdown selection');
        }

      } else {
        logger.warn('⚠️ Could not find August week in week dropdown');
      }

    } catch (error) {
      logger.error(`❌ Failed to navigate to week 1: ${error as any}`);
      throw error;
    }
  }

  /**
   * Extract fixture data from current week AJAX data
   */
  async extractFixtureData(): Promise<any[]> {
    if (!this.currentWeekData || !this.currentWeekNumber) {
      logger.error('❌ No current week data available. Call navigateToWeek() first.');
      return [];
    }

    try {
      const fixtures: any[] = [];

      // Process all AJAX fixture data
      // Format: [id,'16/08','MS',homeId,'Manchester United',awayId,'Fulham',...,htHome,htAway,ftHome,ftAway,'0 - 0',round]
      const debugData = this.currentWeekData; // Process all fixtures
      for (let index = 0; index < debugData.length; index++) {
        const fixtureData = debugData[index];
        try {
          const dateText = fixtureData[1]; // '16/08'
          const homeTeam = fixtureData[4];
          const awayTeam = fixtureData[6];

          // Score data from AJAX response - parse the score strings
          // Debug: Log the full array to understand the structure (only first fixture)
          if (index === 0) {
            logger.info(`🔍 Debug fixture data for ${homeTeam} vs ${awayTeam}`);
            logger.info(`🔍 HT score (Index 23): "${fixtureData[23]}", FT scores (Index 9,10): ${fixtureData[9]}-${fixtureData[10]}`);
          }

          let ftHome = 0, ftAway = 0, htHome = 0, htAway = 0;
          const scoreStrings: string[] = [];

          // Find all score strings first
          for (let i = 0; i < fixtureData.length; i++) {
            const field = fixtureData[i];
            if (typeof field === 'string' && field.includes(' - ')) {
              scoreStrings.push(field);
              if (index === 0) logger.info(`🔍 Score string at index ${i}: "${field}"`);
            }
          }

          // Based on analysis:
          // Index 23: HT score string (format "X - Y") 
          // Index 9: FT home goals (number)
          // Index 10: FT away goals (number)
          if (scoreStrings.length >= 1 && scoreStrings[0]) {
            // Score string at index 23 is HT score
            const htScoreString = scoreStrings[0];

            // Check if HT score is empty or invalid (indicates unplayed match)
            if (!htScoreString || htScoreString.trim() === '' || !htScoreString.includes('-')) {
              logger.warn(`⚠️ Skipping unplayed match: ${homeTeam} vs ${awayTeam} (HT score empty)`);
              continue;
            }

            const htParts = htScoreString.split(' - ');
            if (htParts.length === 2 && htParts[0] && htParts[1]) {
              htHome = parseInt(htParts[0].trim()) || 0;
              htAway = parseInt(htParts[1].trim()) || 0;
            }
          }

          // FT scores are at indexes 9 and 10
          if (typeof fixtureData[9] === 'number' && typeof fixtureData[10] === 'number') {
            ftHome = fixtureData[9] || 0;
            ftAway = fixtureData[10] || 0;
          } else {
            // Fallback: if no numeric FT scores, use HT as FT
            ftHome = htHome;
            ftAway = htAway;
          }

          logger.info(`🔍 Parsed scores - FT: ${ftHome}-${ftAway}, HT: ${htHome}-${htAway}`);
          const round = fixtureData[25] || 0;

          // Get season start year for correct date parsing
          const seasonInfo = this.getSeasonInfo();
          const startYear = parseInt(seasonInfo.startYear || '2023') || 2023;

          // Create match date using the new parsing function with explicit year
          const matchDateStr = parseMatchDate(dateText, this.currentWeekNumber || undefined, startYear);
          const matchDate = new Date(matchDateStr);

          // Calculate patterns
          // Half-time result
          let htResult = 'X';
          if (htHome > htAway) htResult = '1';
          else if (htHome < htAway) htResult = '2';

          // Full-time result
          let ftResult = 'X';
          if (ftHome > ftAway) ftResult = '1';
          else if (ftHome < ftAway) ftResult = '2';

          const pattern = `IY${htResult}MS${ftResult}`;

          const fixture = {
            date: matchDate,
            dateText: dateText,
            week: this.currentWeekNumber,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: ftHome,
            awayScore: ftAway,
            halfTimeHome: htHome,
            halfTimeAway: htAway,
            pattern: pattern,
            round: round
          };

          fixtures.push(fixture);

        } catch (error) {
          logger.warn('⚠️ Error parsing fixture data:', error as any);
        }
      }

      logger.info(`📊 Extracted ${fixtures.length} fixtures from AJAX data`);

      // Log detailed fixture data for debugging
      if (fixtures.length > 0) {
        logger.info('🔍 Detailed fixture data:');
        fixtures.forEach((fixture, index) => {
          logger.info(`  ${index + 1}. ${fixture.homeTeam} ${fixture.homeScore}-${fixture.awayScore} ${fixture.awayTeam} (Week: ${fixture.week}, Date: ${fixture.dateText}) [${fixture.pattern}]`);
        });
      }

      return fixtures;

    } catch (error) {
      logger.error(`💥 Error extracting fixture data: ${error}`);
      return [];
    }
  }

  /**
   * Save fixtures to database using Supabase client
   */
  async saveFixturesToDatabase(fixtures: any[]): Promise<any[]> {
    if (fixtures.length === 0) {
      logger.warn('⚠️ No fixtures to save');
      return [];
    }

    try {
      logger.info(`💾 Saving ${fixtures.length} fixtures to database using Supabase...`);

      // Create competition and season
      const competition = await supabaseDb.createCompetition(process.env.COUNTRY_NAME || 'İngiltere', process.env.LEAGUE_NAME || 'Premier League');

      // Get database season ID dynamically
      const dbSeasonId = await this.getDatabaseSeasonId(competition.id);
      const seasonInfo = this.getSeasonInfo();
      const seasonLabel = seasonInfo.seasonName.replace(`${process.env.LEAGUE_NAME || 'Premier League'} `, ''); // e.g., "2023-24"

      // Use existing season from database (created in setup-seasons.ts)
      const season = { id: dbSeasonId };
      logger.info(`🎯 Using season ${seasonLabel} with database ID ${dbSeasonId}`);

      // Prepare teams for individual upsert (avoid batch issues)
      const uniqueTeams = new Set<string>();
      for (const fixture of fixtures) {
        uniqueTeams.add(fixture.homeTeam.toLowerCase().trim());
        uniqueTeams.add(fixture.awayTeam.toLowerCase().trim());
      }

      // Upsert teams individually
      logger.info(`📝 Upserting ${uniqueTeams.size} unique teams individually...`);
      for (const teamCanonical of uniqueTeams) {
        // Find the exact matching team name
        let teamName = '';
        for (const fixture of fixtures) {
          if (fixture.homeTeam.toLowerCase().trim() === teamCanonical) {
            teamName = fixture.homeTeam;
            break;
          }
          if (fixture.awayTeam.toLowerCase().trim() === teamCanonical) {
            teamName = fixture.awayTeam;
            break;
          }
        }

        if (teamName) {
          await supabaseDb.upsertTeam(teamName, teamCanonical);
        }
      }

      // Process matches individually
      let savedCount = 0;
      let errorCount = 0;

      for (const fixture of fixtures) {
        try {
          // Get team IDs
          const homeTeam = await supabaseDb.findTeamByCanonicalName(fixture.homeTeam.toLowerCase().trim());
          const awayTeam = await supabaseDb.findTeamByCanonicalName(fixture.awayTeam.toLowerCase().trim());

          if (!homeTeam || !awayTeam) {
            logger.error(`❌ Team not found: ${fixture.homeTeam} vs ${fixture.awayTeam}`);
            errorCount++;
            continue;
          }

          // Calculate pattern with our new function
          const pattern = calculateMatchPattern(
            fixture.halfTimeHome,
            fixture.halfTimeAway,
            fixture.homeScore,
            fixture.awayScore
          );

          const matchData = {
            competitionId: competition.id,
            seasonId: season.id,
            week: fixture.week,
            matchDate: fixture.date.toISOString().split('T')[0], // YYYY-MM-DD format
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            htHome: fixture.halfTimeHome,
            htAway: fixture.halfTimeAway,
            ftHome: fixture.homeScore,
            ftAway: fixture.awayScore,
            pattern: pattern,
            sourceUrl: `https://arsiv.mackolik.com/Standings/Default.aspx?sId=${this.seasonId}`
          };

          await supabaseDb.createMatch(matchData);
          savedCount++;

          logger.info(`✅ Saved: ${fixture.homeTeam} ${fixture.homeScore}-${fixture.awayScore} ${fixture.awayTeam} (${pattern})`);

        } catch (error) {
          errorCount++;
          logger.error(`❌ Error saving fixture ${fixture.homeTeam} vs ${fixture.awayTeam}: ${JSON.stringify(error, null, 2)}`);
        }
      }

      logger.info(`💾 Database save completed: ${savedCount} saved, ${errorCount} errors`);
      return fixtures;

    } catch (error) {
      logger.error(`💥 Database save error: ${JSON.stringify(error, null, 2)}`);
      throw error;
    }
  }

  /**
   * Get all available weeks from AJAX endpoint
   */
  async getAvailableWeeks(): Promise<number[]> {
    try {
      logger.info('📋 Fetching weeks list from AJAX endpoint...');

      // Get season ID from environment variable
      const seasonId = process.env.PREMIER_LEAGUE_SEASON_ID || '67180';

      const weeksResponse = await this.page!.evaluate(async (sId: string) => {
        try {
          const response = await fetch(`https://arsiv.mackolik.com/AjaxHandlers/FixtureHandler.aspx?command=getWeeks&id=${sId}`, {
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          return await response.text();
        } catch (error) {
          return `Error: ${error}`;
        }
      }, seasonId);

      // Parse weeks response
      try {
        const weeksData = eval(weeksResponse);
        const weekNumbers = weeksData.map((week: any[]) => week[0]);
        logger.info(`📊 Found weeks: ${weekNumbers.slice(0, 5).join(', ')}${weekNumbers.length > 5 ? '...' : ''} (${weekNumbers.length} total)`);
        return weekNumbers;
      } catch (parseError) {
        logger.warn('⚠️ Could not parse weeks response, using default range 1-38');
        return Array.from({ length: 38 }, (_, i) => i + 1);
      }
    } catch (error) {
      logger.error('❌ Failed to get available weeks:', error as any);
      logger.info('📋 Using default week range 1-38');
      return Array.from({ length: 38 }, (_, i) => i + 1);
    }
  }

  /**
   * Navigate to specific week using AJAX approach
   */
  async navigateToWeek(weekNumber: number): Promise<void> {
    try {
      logger.info(`🔄 Navigating to week ${weekNumber} using AJAX...`);

      // Get season ID from environment variable
      const seasonId = process.env.PREMIER_LEAGUE_SEASON_ID || '67180';

      // Fetch week fixtures directly using AJAX endpoint
      const ajaxResponse = await this.page!.evaluate(async (params: { week: number, seasonId: string }) => {
        try {
          const response = await fetch(`https://arsiv.mackolik.com/AjaxHandlers/FixtureHandler.aspx?command=getMatches&id=${params.seasonId}&week=${params.week}`, {
            headers: {
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          return await response.text();
        } catch (error) {
          return `Error: ${error}`;
        }
      }, { week: weekNumber, seasonId });

      // Parse the fixtures data for this week
      try {
        const fixturesData = eval(ajaxResponse as string);
        logger.info(`📊 Parsed ${fixturesData.length} fixtures for week ${weekNumber}`);

        // Store the week data for extraction later
        this.currentWeekData = fixturesData;
        this.currentWeekNumber = weekNumber;

        logger.info(`✅ Successfully loaded week ${weekNumber} data`);

      } catch (parseError) {
        logger.warn(`⚠️ Could not parse week ${weekNumber} fixtures: ${parseError}`);
        throw parseError;
      }

    } catch (error) {
      logger.error(`❌ Failed to navigate to week ${weekNumber}:`, error as any);
      throw error;
    }
  }

  async getCurrentWeek(): Promise<number> {
    try {
      // First try to get from the week dropdown/selector that's visible in the screenshot
      const weekFromDropdown = await this.page!.evaluate(() => {
        // Look for the dropdown with week format "28 (8.03.2025 - 10.03.2025)"
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
          const selectedOption = select.querySelector('option[selected]') || select.options[select.selectedIndex];
          if (selectedOption) {
            const text = selectedOption.textContent?.trim() || '';
            // Match pattern like "28 (date - date)"
            const match = text.match(/^(\d+)\s*\([0-9]{1,2}\.[0-9]{1,2}\.[0-9]{4}/);
            if (match && match[1]) {
              return parseInt(match[1], 10);
            }
          }
        }
        return 0;
      });

      if (weekFromDropdown > 0) {
        logger.info(`📊 Found current week from dropdown: ${weekFromDropdown}`);
        return weekFromDropdown;
      }

      // Fallback: look for "Hafta : XX" pattern specifically
      const weekFromText = await this.page!.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        for (const el of elements) {
          const text = el.textContent?.trim() || '';
          // Look for "Hafta : 28" pattern specifically
          const match = text.match(/Hafta\s*:\s*(\d+)/i);
          if (match && match[1]) {
            return parseInt(match[1], 10);
          }
        }
        return 0;
      });

      if (weekFromText > 0) {
        logger.info(`📊 Found current week from text: ${weekFromText}`);
        return weekFromText;
      }

      logger.warn('⚠️ Could not determine current week reliably');
      return 28; // Default to current week
    } catch (error) {
      logger.warn(`⚠️ Error determining current week: ${error}`);
      return 28;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const scraper = new StandingsScraper();

  try {
    await scraper.init();
    // Use dynamic season ID from environment variable
    const seasonId = process.env.PREMIER_LEAGUE_SEASON_ID || '67180';
    await scraper.navigateToStandings(seasonId);
    await scraper.clickFixtureTab();

    // Get all available weeks
    logger.info('📋 Fetching all available weeks...');
    const weeks = await scraper.getAvailableWeeks();
    logger.info(`📊 Found ${weeks.length} weeks to scrape for season ${seasonId}`);

    let totalFixtures = 0;

    // Scrape all available weeks
    for (const week of weeks) {
      try {
        logger.info(`\n🔄 Processing Week ${week}...`);

        // Navigate to specific week using AJAX approach
        await scraper.navigateToWeek(week);

        // Extract fixture data
        const fixtures = await scraper.extractFixtureData();
        logger.info(`🎯 Extracted ${fixtures.length} fixtures from week ${week}`);

        if (fixtures.length > 0) {
          // Log sample fixtures
          logger.info('📋 Sample fixtures:');
          fixtures.slice(0, 2).forEach((fixture, index) => {
            logger.info(`  ${index + 1}. ${fixture.homeTeam} ${fixture.homeScore}-${fixture.awayScore} ${fixture.awayTeam} [${fixture.pattern}] (${fixture.date})`);
          });

          // Save to database
          await scraper.saveFixturesToDatabase(fixtures);
          totalFixtures += fixtures.length;
          logger.info(`✅ Week ${week} processed successfully with database save`);
        }        // Small delay between weeks
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (weekError) {
        logger.error(`❌ Error processing week ${week}: ${JSON.stringify(weekError, null, 2)}`);
        continue; // Continue with next week
      }
    }

    logger.info(`🎉 Standings scraper completed successfully! Total fixtures processed: ${totalFixtures} for season ${seasonId}`);

  } catch (error) {
    logger.error(`💥 Scraper failed: ${error}`);
  } finally {
    // Don't cleanup immediately, let user see the result
    logger.info('⏳ Keeping browser open for inspection. Close manually when done.');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}