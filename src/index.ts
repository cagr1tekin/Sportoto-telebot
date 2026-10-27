import dotenv from 'dotenv';
import pino from 'pino';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

async function main() {
  logger.info('Sportoto Telebot starting...');
  
  // Check if required environment variables are present
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }
  
  logger.info('Environment variables loaded successfully');
  
  // Test the standings scraper
  try {
    logger.info('Testing standings scraper...');
    await import('./scrapers/standings');
    // main function is exported from the file and contains all the test logic
  } catch (error) {
    logger.error('Failed to test standings scraper:', error as any);
  }
  
  logger.info('Bot setup complete');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the application
main().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});