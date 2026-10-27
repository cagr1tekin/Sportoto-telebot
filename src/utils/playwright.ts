/**
 * Playwright helper utilities for safe web scraping
 * Provides retry logic, error handling, and common browser interactions
 */

import { Page, Locator, ElementHandle } from 'playwright';
import pino from 'pino';

const logger = pino({
  level: 'info',
  name: 'playwright-helpers'
});

/**
 * Options for safe operations
 */
export interface SafeOptions {
  timeout?: number;
  retries?: number;
  delay?: number;
  waitFor?: 'visible' | 'attached' | 'detached' | 'hidden';
  scrollIntoView?: boolean;
}

/**
 * Default options for safe operations
 */
const DEFAULT_OPTIONS: Required<SafeOptions> = {
  timeout: 10000,
  retries: 3,
  delay: 1000,
  waitFor: 'visible',
  scrollIntoView: true
};

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely click an element with retry logic
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param options - Click options
 * @returns Promise<boolean> - Success status
 */
export async function safeClick(
  page: Page, 
  selector: string | Locator, 
  options: SafeOptions = {}
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      logger.debug(`Attempting to click "${selector}" (attempt ${attempt}/${opts.retries})`);
      
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      
      // Wait for element to be ready
      await locator.waitFor({ 
        state: opts.waitFor, 
        timeout: opts.timeout 
      });
      
      // Scroll into view if needed
      if (opts.scrollIntoView) {
        await locator.scrollIntoViewIfNeeded({ timeout: opts.timeout });
      }
      
      // Click the element
      await locator.click({ timeout: opts.timeout });
      
      logger.debug(`Successfully clicked "${selector}"`);
      return true;
      
    } catch (error: any) {
      logger.warn(`Click attempt ${attempt} failed for "${selector}":`, error.message);
      
      if (attempt === opts.retries) {
        logger.error(`All click attempts failed for "${selector}"`);
        return false;
      }
      
      await sleep(opts.delay);
    }
  }
  
  return false;
}

/**
 * Safely get text content from an element
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param options - Get text options
 * @returns Promise<string | null> - Text content or null if failed
 */
export async function safeGetText(
  page: Page, 
  selector: string | Locator, 
  options: SafeOptions = {}
): Promise<string | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      logger.debug(`Attempting to get text from "${selector}" (attempt ${attempt}/${opts.retries})`);
      
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      
      // Wait for element to be ready
      await locator.waitFor({ 
        state: opts.waitFor, 
        timeout: opts.timeout 
      });
      
      // Get text content
      const text = await locator.textContent({ timeout: opts.timeout });
      
      if (text !== null) {
        logger.debug(`Successfully got text from "${selector}": "${text.substring(0, 50)}..."`);
        return text.trim();
      }
      
    } catch (error: any) {
      logger.warn(`Get text attempt ${attempt} failed for "${selector}":`, error.message);
      
      if (attempt === opts.retries) {
        logger.error(`All get text attempts failed for "${selector}"`);
        return null;
      }
      
      await sleep(opts.delay);
    }
  }
  
  return null;
}

/**
 * Safely get attribute value from an element
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param attribute - Attribute name
 * @param options - Get attribute options
 * @returns Promise<string | null> - Attribute value or null if failed
 */
export async function safeGetAttribute(
  page: Page, 
  selector: string | Locator, 
  attribute: string,
  options: SafeOptions = {}
): Promise<string | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      logger.debug(`Attempting to get attribute "${attribute}" from "${selector}" (attempt ${attempt}/${opts.retries})`);
      
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      
      // Wait for element to be ready
      await locator.waitFor({ 
        state: opts.waitFor, 
        timeout: opts.timeout 
      });
      
      // Get attribute value
      const value = await locator.getAttribute(attribute, { timeout: opts.timeout });
      
      if (value !== null) {
        logger.debug(`Successfully got attribute "${attribute}" from "${selector}": "${value}"`);
        return value;
      }
      
    } catch (error: any) {
      logger.warn(`Get attribute attempt ${attempt} failed for "${selector}":`, error.message);
      
      if (attempt === opts.retries) {
        logger.error(`All get attribute attempts failed for "${selector}"`);
        return null;
      }
      
      await sleep(opts.delay);
    }
  }
  
  return null;
}

/**
 * Safely scroll to an element
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param options - Scroll options
 * @returns Promise<boolean> - Success status
 */
export async function safeScroll(
  page: Page, 
  selector: string | Locator, 
  options: SafeOptions = {}
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      logger.debug(`Attempting to scroll to "${selector}" (attempt ${attempt}/${opts.retries})`);
      
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      
      // Wait for element to be ready
      await locator.waitFor({ 
        state: 'attached', 
        timeout: opts.timeout 
      });
      
      // Scroll into view
      await locator.scrollIntoViewIfNeeded({ timeout: opts.timeout });
      
      logger.debug(`Successfully scrolled to "${selector}"`);
      return true;
      
    } catch (error: any) {
      logger.warn(`Scroll attempt ${attempt} failed for "${selector}":`, error.message);
      
      if (attempt === opts.retries) {
        logger.error(`All scroll attempts failed for "${selector}"`);
        return false;
      }
      
      await sleep(opts.delay);
    }
  }
  
  return false;
}

/**
 * Safely wait for an element to appear
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param options - Wait options
 * @returns Promise<boolean> - Success status
 */
export async function safeWaitFor(
  page: Page, 
  selector: string | Locator, 
  options: SafeOptions = {}
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    logger.debug(`Waiting for "${selector}"`);
    
    const locator = typeof selector === 'string' ? page.locator(selector) : selector;
    
    await locator.waitFor({ 
      state: opts.waitFor, 
      timeout: opts.timeout 
    });
    
    logger.debug(`Successfully found "${selector}"`);
    return true;
    
  } catch (error: any) {
    logger.warn(`Wait failed for "${selector}":`, error.message);
    return false;
  }
}

/**
 * Safely get all matching elements
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector
 * @param options - Get all options
 * @returns Promise<ElementHandle[]> - Array of elements
 */
export async function safeGetAll(
  page: Page, 
  selector: string, 
  options: SafeOptions = {}
): Promise<ElementHandle[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    logger.debug(`Getting all elements for "${selector}"`);
    
    // Wait a bit for elements to load
    await sleep(opts.delay);
    
    const elements = await page.$$(selector);
    
    logger.debug(`Found ${elements.length} elements for "${selector}"`);
    return elements;
    
  } catch (error: any) {
    logger.warn(`Get all failed for "${selector}":`, error.message);
    return [];
  }
}

/**
 * Safely type text into an input
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param text - Text to type
 * @param options - Type options
 * @returns Promise<boolean> - Success status
 */
export async function safeType(
  page: Page, 
  selector: string | Locator, 
  text: string,
  options: SafeOptions = {}
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      logger.debug(`Attempting to type into "${selector}" (attempt ${attempt}/${opts.retries})`);
      
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      
      // Wait for element to be ready
      await locator.waitFor({ 
        state: 'visible', 
        timeout: opts.timeout 
      });
      
      // Clear and type
      await locator.clear({ timeout: opts.timeout });
      await locator.fill(text, { timeout: opts.timeout });
      
      logger.debug(`Successfully typed into "${selector}"`);
      return true;
      
    } catch (error: any) {
      logger.warn(`Type attempt ${attempt} failed for "${selector}":`, error.message);
      
      if (attempt === opts.retries) {
        logger.error(`All type attempts failed for "${selector}"`);
        return false;
      }
      
      await sleep(opts.delay);
    }
  }
  
  return false;
}

/**
 * Safely select an option from a dropdown
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector or locator
 * @param value - Option value to select
 * @param options - Select options
 * @returns Promise<boolean> - Success status
 */
export async function safeSelect(
  page: Page, 
  selector: string | Locator, 
  value: string,
  options: SafeOptions = {}
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      logger.debug(`Attempting to select "${value}" in "${selector}" (attempt ${attempt}/${opts.retries})`);
      
      const locator = typeof selector === 'string' ? page.locator(selector) : selector;
      
      // Wait for element to be ready
      await locator.waitFor({ 
        state: 'visible', 
        timeout: opts.timeout 
      });
      
      // Select the option
      await locator.selectOption(value, { timeout: opts.timeout });
      
      logger.debug(`Successfully selected "${value}" in "${selector}"`);
      return true;
      
    } catch (error: any) {
      logger.warn(`Select attempt ${attempt} failed for "${selector}":`, error.message);
      
      if (attempt === opts.retries) {
        logger.error(`All select attempts failed for "${selector}"`);
        return false;
      }
      
      await sleep(opts.delay);
    }
  }
  
  return false;
}

/**
 * Wait for page navigation to complete
 * 
 * @param page - Playwright page instance
 * @param timeout - Timeout in milliseconds
 * @returns Promise<boolean> - Success status
 */
export async function waitForNavigation(page: Page, timeout: number = 30000): Promise<boolean> {
  try {
    logger.debug('Waiting for navigation to complete');
    
    await page.waitForLoadState('networkidle', { timeout });
    
    logger.debug('Navigation completed');
    return true;
    
  } catch (error: any) {
    logger.warn('Navigation wait failed:', error.message);
    return false;
  }
}

/**
 * Take a screenshot for debugging
 * 
 * @param page - Playwright page instance
 * @param name - Screenshot name
 * @param path - Screenshot directory path
 */
export async function takeScreenshot(
  page: Page, 
  name: string, 
  path: string = './screenshots'
): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${path}/${name}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: filename,
      fullPage: true 
    });
    
    logger.debug(`Screenshot saved: ${filename}`);
    
  } catch (error: any) {
    logger.warn('Screenshot failed:', error.message);
  }
}

/**
 * Safely check if an element exists
 * 
 * @param page - Playwright page instance
 * @param selector - CSS selector
 * @param timeout - Timeout in milliseconds
 * @returns Promise<boolean> - True if element exists
 */
export async function elementExists(
  page: Page, 
  selector: string, 
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout, state: 'attached' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get page performance metrics
 * 
 * @param page - Playwright page instance
 * @returns Promise<any> - Performance metrics
 */
export async function getPageMetrics(page: Page): Promise<any> {
  try {
    const metrics = await page.evaluate(() => {
      // Simple performance measurement using Date.now()
      const now = Date.now();
      return {
        timestamp: now,
        userAgent: navigator.userAgent,
        url: window.location.href,
        title: document.title
      };
    });
    
    return metrics;
  } catch (error: any) {
    logger.warn('Failed to get page metrics:', error.message);
    return null;
  }
}