import { chromium } from 'playwright';

async function findCurrentSeasonId() {
  console.log('🔍 Finding current season ID from mackolik.com...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Go to main mackolik page first
    await page.goto('https://mackolik.com', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    // Look for Premier League or other league links
    console.log('\n=== LOOKING FOR LEAGUE LINKS ===');
    
    const leagueSelectors = [
      'a[href*="premier-lig"]',
      'a[href*="super-lig"]', 
      'a[href*="standings"]',
      'a[href*="puan-durumu"]'
    ];
    
    for (const selector of leagueSelectors) {
      try {
        const elements = await page.$$(selector);
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        for (let i = 0; i < Math.min(elements.length, 3); i++) {
          const element = elements[i];
          if (element) {
            const href = await element.getAttribute('href');
            const text = await element.textContent();
            console.log(`  [${i}] "${text?.trim()}" -> ${href}`);
          }
        }
      } catch (error) {
        console.log(`  Error with ${selector}: ${(error as Error).message}`);
      }
    }
    
    // Try to go to a specific league page
    console.log('\n=== TRYING PREMIER LEAGUE ===');
    try {
      const plLink = await page.$('a[href*="premier-lig"]');
      if (plLink) {
        const href = await plLink.getAttribute('href');
        console.log(`Navigating to Premier League: ${href}`);
        
        await plLink.click();
        await page.waitForTimeout(3000);
        
        // Look for season ID in URL or data attributes
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);
        
        // Check for season IDs in the page
        const seasonMatch = currentUrl.match(/sId=(\d+)/);
        if (seasonMatch) {
          console.log(`✅ Found season ID: ${seasonMatch[1]}`);
        }
        
        // Check for any data attributes with season info
        const seasonElements = await page.$$('[data-season-id], [data-sid], [data-season]');
        console.log(`Found ${seasonElements.length} elements with season data`);
        
        for (const element of seasonElements) {
          const seasonId = await element.getAttribute('data-season-id') || 
                          await element.getAttribute('data-sid') ||
                          await element.getAttribute('data-season');
          if (seasonId) {
            console.log(`✅ Found season ID in data attribute: ${seasonId}`);
          }
        }
      }
    } catch (error) {
      console.log(`Error accessing Premier League: ${(error as Error).message}`);
    }
    
    // Take a screenshot 
    await page.screenshot({ path: 'current-season.png', fullPage: true });
    console.log('\n📸 Screenshot saved as current-season.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

findCurrentSeasonId().catch(console.error);