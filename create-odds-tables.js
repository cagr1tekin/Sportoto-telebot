const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Maç sonucu türlerine göre oran tablolarını oluşturur
 */
async function createOddsTables() {
  console.log('📊 Oran tabloları oluşturuluyor...\n');

  const scoreTypes = ['0x0', '0x1', '0x2', '1x0', '1x1', '1x2', '2x0', '2x1', '2x2'];
  
  for (const scoreType of scoreTypes) {
    const tableName = `odds_${scoreType}`;
    console.log(`🔧 ${tableName} tablosu oluşturuluyor...`);
    
    // Önce tabloyu sil (varsa)
    const { error: dropError } = await supabase
      .from(tableName)
      .delete()
      .gte('id', 0);
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.log(`   ⚠️  ${tableName} temizlenirken uyarı:`, dropError.message);
    }

    // Test amaçlı bir kayıt ekleyerek tabloyu oluştur
    const { error: insertError } = await supabase
      .from(tableName)
      .insert([{
        match_date: '2024-01-01',
        home_team_id: 1,
        away_team_id: 2,
        home_team_name: 'Test Home',
        away_team_name: 'Test Away',
        week: 1,
        ht_score: '0-0',
        ft_score: scoreType.replace('x', '-'),
        market_name: 'Test Market',
        market_id: '12345',
        option_name: 'Test Option',
        option_id: 1,
        odds_value: 2.50
      }]);

    if (insertError) {
      console.log(`   ❌ ${tableName} oluşturulamadı:`, insertError.message);
    } else {
      console.log(`   ✅ ${tableName} oluşturuldu`);
      
      // Test kaydını sil
      await supabase
        .from(tableName)
        .delete()
        .eq('home_team_name', 'Test Home');
    }
  }
  
  console.log('\n🎯 Tüm oran tabloları hazır!');
  
  // Tablolarını listele
  console.log('\n📋 Oluşturulan tablolar:');
  scoreTypes.forEach(scoreType => {
    console.log(`   - odds_${scoreType} (${scoreType.replace('x', '-')} maç sonuçları için)`);
  });
}

// Çalıştır
if (require.main === module) {
  createOddsTables();
}

module.exports = { createOddsTables };