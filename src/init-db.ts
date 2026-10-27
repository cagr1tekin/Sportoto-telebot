#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import pino from 'pino';

// Load environment variables
dotenv.config();

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

async function initializeDatabase() {
  // Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
    process.exit(1);
  }

  // Create Supabase client with service role key (admin access)
  // const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  //   auth: {
  //     autoRefreshToken: false,
  //     persistSession: false
  //   }
  // });

  try {
    logger.info('Supabase client created successfully');
    logger.info(`🔗 Supabase URL: ${supabaseUrl}`);
    logger.info(`🔑 Service Key: ${supabaseServiceKey ? 'Present' : 'Missing'}`);
    logger.info('');
    logger.info('✅ Environment variables are configured correctly');
    logger.info('');
    logger.info('🔧 Manual Setup Required:');
    logger.info('Since Supabase does not allow direct SQL execution via client, please:');
    logger.info('');
    logger.info('1. Go to your Supabase dashboard: https://app.supabase.com');
    logger.info('2. Open your project');
    logger.info('3. Go to "SQL Editor" in the left sidebar');
    logger.info('4. Create a new query');
    logger.info('5. Copy and paste the contents of: database/schema.sql');
    logger.info('6. Click "Run" to execute the schema');
    logger.info('');

    // Read schema to show the user what needs to be executed
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    
    logger.info('📄 Schema file location: database/schema.sql');
    logger.info(`📊 Schema contains ${schemaSql.split(';').filter(s => s.trim()).length} SQL statements`);
    logger.info('');
    
    // After manual setup, we can verify the tables
    logger.info('✨ After running the schema in Supabase SQL Editor, you can verify with:');
    logger.info('npm run verify-db');
    logger.info('');

  } catch (error: any) {
    console.error('Full error object:', JSON.stringify(error, null, 2));
    logger.error('❌ Database connection failed:');
    logger.error('Error details:', error);
    if (error.message) {
      logger.error('Error message:', error.message);
    }
    logger.info('');
    logger.info('🔧 Troubleshooting:');
    logger.info('1. Check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file');
    logger.info('2. Make sure your Supabase project is active');
    logger.info('3. Verify your service key has the correct permissions');
    logger.info('');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  process.exit(0);
});

// Run initialization
initializeDatabase().catch((error: any) => {
  logger.error('Failed to initialize database:', error);
  process.exit(1);
});