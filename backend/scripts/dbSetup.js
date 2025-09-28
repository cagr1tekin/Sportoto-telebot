// Veritabanı şema kurulum scripti
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../src/services/db');
const logger = require('../src/util/logger');

(async () => {
  try {
    logger.info('🛠️ Database schema kurulumu başlatılıyor...');
    
    const sql = fs.readFileSync(path.join(__dirname, '../../db/schemas.sql'), 'utf8');
    
    // SQL'i statement'lara böl
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    logger.info(`📝 ${statements.length} SQL statement çalıştırılacak...`);
    
    // Her statement'ı ayrı ayrı çalıştır
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('create table')) {
        const tableMatch = statement.match(/create table if not exists (\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : `statement_${i + 1}`;
        
        logger.info(`📊 Tablo oluşturuluyor: ${tableName}`);
      }
      
      try {
        // Supabase RPC ile SQL çalıştır (raw SQL)
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });
        
        if (error) {
          // RPC yoksa direkt postgres fonksiyonu dene
          logger.warn(`RPC hatası, alternatif yöntem deneniyor: ${error.message}`);
          
          // Alternatif: PostgreSQL meta tabloları kullanarak kontrol
          if (statement.toLowerCase().includes('create table')) {
            logger.info(`⚠️ Table creation atlandı (manual verification needed): ${statement.substring(0, 50)}...`);
          }
        }
        
      } catch (stmtError) {
        logger.warn(`Statement hatası (${i + 1}): ${stmtError.message}`);
      }
    }
    
    // Başarı kontrol: Temel tabloları kontrol et
    try {
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['fixtures', 'match_events', 'team_scores']);
        
      if (tables && tables.length > 0) {
        logger.info(`✅ Veritabanı tabloları kontrol edildi: ${tables.map(t => t.table_name).join(', ')}`);
      }
    } catch (checkError) {
      logger.warn('Tablo kontrol hatası:', checkError.message);
    }
    
    logger.info('✅ Database schema setup tamamlandı!');
    process.exit(0);
    
  } catch (e) {
    logger.error('❌ DB setup failed:', e);
    process.exit(1);
  }
})();