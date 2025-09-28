// API-Sports test scripti - fixtures ve odds verilerini test et
require('dotenv').config();
const { getFixtures, getOdds } = require('../src/apiClient');
const logger = require('../src/util/logger');

(async () => {
  try {
    logger.info('🏈 API-Sports test başlatılıyor...');
    
    // Bugünün tarihi (YYYY-MM-DD formatında)
    const today = new Date().toISOString().slice(0, 10);
    logger.info(`📅 Test tarihi: ${today}`);
    
    // Premier League (ID: 39) için bugünkü maçları al
    logger.info('🔍 Premier League (ID: 39) fixtures alınıyor...');
    const fixturesResponse = await getFixtures({ 
      date: today, 
      league: 39 // Premier League ID
    });
    
    logger.info(`📊 Bulunan fixtures: ${fixturesResponse.results}`);
    
    const fixtures = fixturesResponse.response || [];
    
    if (fixtures.length === 0) {
      logger.info('⚠️ Bugün Premier League maçı yok. Genel fixtures deneniyor...');
      
      // Tarih bazlı genel arama
      const generalResponse = await getFixtures({ date: today });
      const generalFixtures = generalResponse.response || [];
      
      logger.info(`📊 Genel fixtures: ${generalFixtures.length}`);
      
      // İlk 3 fixture'ı göster
      for (let i = 0; i < Math.min(3, generalFixtures.length); i++) {
        const item = generalFixtures[i];
        await logFixtureDetails(item, i + 1);
      }
      
    } else {
      // Premier League maçlarını göster
      for (let i = 0; i < fixtures.length; i++) {
        const item = fixtures[i];
        await logFixtureDetails(item, i + 1);
      }
    }
    
    logger.info('✅ API test tamamlandı!');
    
  } catch (error) {
    logger.error('❌ API test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
})();

// Fixture detaylarını logla
async function logFixtureDetails(item, index) {
  try {
    console.log(`\n--- Fixture ${index} ---`);
    
    const fixture = item.fixture || item;
    const teams = item.teams || {};
    const league = item.league || {};
    const score = item.score || {};
    
    console.log(`🆔 Fixture ID: ${fixture.id}`);
    console.log(`📅 Date: ${fixture.date}`);
    console.log(`🏆 League: ${league.name || 'N/A'} (ID: ${league.id || 'N/A'})`);
    console.log(`🏠 Home: ${teams.home?.name || 'N/A'}`);
    console.log(`✈️ Away: ${teams.away?.name || 'N/A'}`);
    console.log(`📊 Status: ${fixture.status?.short || item.status || 'N/A'}`);
    
    // Skor bilgisi
    if (score.fulltime) {
      console.log(`⚽ Score: ${score.fulltime.home || 0} - ${score.fulltime.away || 0}`);
    }
    
    // Eğer fixture ID varsa, odds'larını da çek
    if (fixture.id) {
      try {
        logger.info(`🎰 Fixture ${fixture.id} için odds alınıyor...`);
        const oddsResponse = await getOdds({ fixture: fixture.id });
        
        if (oddsResponse.response && oddsResponse.response.length > 0) {
          const firstBookmaker = oddsResponse.response[0].bookmakers?.[0];
          
          if (firstBookmaker) {
            console.log(`📈 Bookmaker: ${firstBookmaker.name}`);
            
            // 1X2 (Match Winner) bahisini bul
            const matchWinnerBet = firstBookmaker.bets?.find(bet => bet.name === 'Match Winner');
            
            if (matchWinnerBet && matchWinnerBet.values) {
              console.log('💰 1X2 Odds:');
              matchWinnerBet.values.forEach(odd => {
                console.log(`  ${odd.value}: ${odd.odd}`);
              });
            } else {
              console.log('💰 1X2 odds bulunamadı');
            }
          } else {
            console.log('💰 Bookmaker bulunamadı');
          }
        } else {
          console.log('💰 Odds bulunamadı');
        }
        
      } catch (oddsError) {
        console.log(`💰 Odds error: ${oddsError.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Fixture ${index} detay hatası:`, error.message);
  }
}