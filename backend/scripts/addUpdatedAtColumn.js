// Add updated_at column to match_events table
const { supabase } = require('../src/services/db');
const logger = require('../src/util/logger');

async function addUpdatedAtColumn() {
  try {
    logger.info('🔧 Adding updated_at column to match_events table...');
    
    // Try to add the column using raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE match_events ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();'
    });
    
    if (error) {
      // If RPC doesn't work, try direct query
      logger.warn('RPC failed, trying direct query...');
      
      const { error: directError } = await supabase
        .from('match_events')
        .select('updated_at')
        .limit(1);
      
      if (directError && directError.message.includes('updated_at')) {
        logger.error('❌ Column does not exist and cannot be added via Supabase client');
        logger.info('💡 Please manually run this SQL on your database:');
        logger.info('   ALTER TABLE match_events ADD COLUMN updated_at timestamptz DEFAULT now();');
        return false;
      } else {
        logger.info('✅ Column already exists or was added successfully!');
        return true;
      }
    } else {
      logger.info('✅ Column added successfully via RPC!');
      return true;
    }
    
  } catch (error) {
    logger.error('❌ Error adding column:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  addUpdatedAtColumn()
    .then((success) => {
      if (success) {
        logger.info('🎉 Migration completed successfully!');
        process.exit(0);
      } else {
        logger.error('💥 Migration failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('💥 Migration error:', error.message);
      process.exit(1);
    });
}

module.exports = { addUpdatedAtColumn };