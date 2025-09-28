// Supabase Client bağlantı servisi
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../util/logger');

// Supabase client yapılandırması
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ SUPABASE_URL veya SUPABASE_KEY eksik!');
  process.exit(1);
}

// Supabase client oluştur
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Test bağlantısı fonksiyonu
const testConnection = async () => {
  try {
    // Supabase REST API health check
    const healthUrl = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok || response.status === 404) {
      // 200 OK veya 404 (endpoint yok ama server erişilebilir) başarılı sayılır
      logger.info('✅ Supabase REST API erişilebilir');
      return true;
    }
    
    logger.error('❌ Supabase REST API yanıt vermiyor:', response.status, response.statusText);
    return false;
    
  } catch (error) {
    logger.error('❌ Supabase bağlantı hatası:', error.message);
    return false;
  }
};

// SQL sorgusu çalıştırma (Raw SQL)
const query = async (sql, params = []) => {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql,
      params: params 
    });

    if (error) throw error;
    return { rows: data };
  } catch (error) {
    logger.error('Query error:', error.message);
    throw error;
  }
};

// Alternatif: Supabase REST API kullanarak tablo sorguları
const selectFrom = (tableName) => supabase.from(tableName);

module.exports = { 
  supabase, 
  query, 
  testConnection,
  selectFrom 
};