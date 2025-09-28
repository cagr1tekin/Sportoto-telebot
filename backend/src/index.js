// Ana uygulama giriş noktası - health check ve bootstrap
require('dotenv').config();
const cron = require('node-cron');
const logger = require('./util/logger');
const { supabase, testConnection } = require('./services/db');
const { startBot } = require('./bot');
const { comebackRanker } = require('./workers/comebackRanker');
const { settleMatches } = require('./workers/settlement');

(async () => {
  try {
    logger.info('🚀 Sportoto Telebot başlatılıyor...');
    
    // Supabase client bağlantı testi
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error('❌ Supabase bağlantısı kurulamadı. Çıkış yapılıyor...');
      process.exit(1);
    }

    // Supabase ile basit bir test sorgusu
    try {
      // Supabase versiyonu veya sistem tablosu kontrolü
      const { data, error } = await supabase
        .rpc('version');  // PostgreSQL version function
      
      if (data) {
        logger.info('✅ Supabase PostgreSQL version:', data);
      } else {
        logger.info('✅ Supabase client bağlantısı aktif');
      }
    } catch (e) {
      logger.info('✅ Supabase client aktif (version query başarısız ama bağlantı var)');
    }

    // Telegram Bot'u başlat
    const botStarted = await startBot();
    if (!botStarted) {
      logger.error('❌ Telegram Bot başlatılamadı');
      process.exit(1);
    }

    logger.info('✅ Bootstrap tamamlandı! Bot aktif ve komutları dinliyor.');
    
    // Cron job'ları başlat
    logger.info('⏰ Cron joblar başlatılıyor...');
    
    // Her gece 23:59'da comeback ranker çalıştır
    cron.schedule('59 23 * * *', async () => {
      logger.info('🌙 Gece comeback ranker başlatılıyor...');
      try {
        await comebackRanker();
      } catch (error) {
        logger.error('Gece comeback ranker hatası:', error.message);
      }
    }, {
      timezone: 'Europe/Istanbul'
    });
    
    // Her sabah 10:30'da comeback ranker çalıştır  
    cron.schedule('30 10 * * *', async () => {
      logger.info('🌅 Sabah comeback ranker başlatılıyor...');
      try {
        await comebackRanker();
      } catch (error) {
        logger.error('Sabah comeback ranker hatası:', error.message);
      }
    }, {
      timezone: 'Europe/Istanbul'
    });
    
    // Her sabah 09:00'da önceki günün maçlarını settle et
    cron.schedule('0 9 * * *', async () => {
      logger.info('🔄 Daily settlement başlatılıyor...');
      try {
        await settleMatches(); // Dün
      } catch (error) {
        logger.error('Settlement hatası:', error.message);
      }
    }, {
      timezone: 'Europe/Istanbul'
    });
    
    logger.info('✅ Cron joblar aktif');
    
    // Uygulama çalışır durumda kalsın
    process.stdin.resume();
    
  } catch (e) {
    logger.error('❌ Startup error:', e.message);
    logger.error('Stack:', e.stack);
    process.exit(1);
  }
})();