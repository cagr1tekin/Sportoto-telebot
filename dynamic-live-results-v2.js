const { getMatchesByScoreType } = require('./get-team-names-v2.js');
const { LiveResultsScraperV3 } = require('./live-results-scraper-v3.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/**
 * Belirli bir maç sonucu türü için oranları çeker ve kaydeder
 * @param {string} scoreType - Maç sonucu türü ('0x0', '1x2', vb.)
 */
async function processScoreType(scoreType) {
  console.log(`\n🎯 ${scoreType} MAÇLARI İÇİN İŞLEM BAŞLATIYOR...`);
  console.log('='.repeat(50));
  
  try {
    // 1. Bu maç sonucu türündeki maçları al
    console.log(`📊 ${scoreType} maç sonuçları database'den alınıyor...`);
    const scoreData = await getMatchesByScoreType(scoreType);
    
    if (scoreData.matches.length === 0) {
      console.log(`❌ ${scoreType} maç sonucu bulunamadı`);
      return {
        scoreType: scoreType,
        totalMatches: 0,
        success: false
      };
    }
    
    console.log(`✅ ${scoreData.matches.length} adet ${scoreType} maç bulundu`);
    console.log(`📅 ${scoreData.dates.length} farklı tarih tespit edildi\n`);
    
    // 2. Tarihlere göre maçları grupla
    const matchesByDate = {};
    scoreData.matches.forEach(match => {
      const dateKey = match.date;
      if (!matchesByDate[dateKey]) {
        matchesByDate[dateKey] = [];
      }
      matchesByDate[dateKey].push({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        scoreType: match.scoreType,
        week: match.week,
        htScore: match.htScore,
        ftScore: match.ftScore
      });
    });
    
    // 3. Scraper'ı başlat
    const scraper = new LiveResultsScraperV3();
    await scraper.init();
    
    // 4. Her tarih için işlem yap
    const results = {
      scoreType: scoreType,
      totalDates: Object.keys(matchesByDate).length,
      totalMatches: scoreData.matches.length,
      processedDates: 0,
      foundMatches: 0,
      clickedButtons: 0,
      savedOdds: 0,
      dateResults: []
    };
    
    for (const [dateStr, matches] of Object.entries(matchesByDate)) {
      // Tarih formatını DD/MM/YYYY'ye çevir
      const [year, month, day] = dateStr.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      console.log(`\n🗓️ TARİH: ${formattedDate} (${matches.length} maç - ${scoreType})`);
      matches.forEach((match, idx) => {
        console.log(`   ${idx + 1}. ${match.homeTeamName} vs ${match.awayTeamName}`);
        console.log(`      İY: ${match.htScore}, MS: ${match.ftScore}, Hafta: ${match.week}`);
      });
      
      // Bu tarihteki maçları işle ve oranları çek
      const dateResult = await scraper.processDate(formattedDate, matches);
      
      // Oranları database'e kaydet
      let savedOddsCount = 0;
      if (dateResult.details && dateResult.details.length > 0) {
        for (const matchDetail of dateResult.details) {
          if (matchDetail.odds && matchDetail.odds.length > 0) {
            // Scraper'dan gelen veriyi doğru formata çevir
            const originalMatch = matches.find(m => m.homeTeamName === matchDetail.homeTeamName);
            if (originalMatch) {
              const formattedMatchData = {
                date: dateStr, // YYYY-MM-DD formatında
                homeTeamId: originalMatch.homeTeamId,
                awayTeamId: originalMatch.awayTeamId,
                homeTeamName: originalMatch.homeTeamName,
                awayTeamName: originalMatch.awayTeamName,
                week: originalMatch.week,
                htScore: originalMatch.htScore,
                ftScore: originalMatch.ftScore,
                odds: matchDetail.odds
              };
              savedOddsCount += await saveOddsToDatabase(formattedMatchData, scoreType);
            }
          }
        }
      }
      
      results.processedDates++;
      results.foundMatches += dateResult.foundMatches;
      results.clickedButtons += dateResult.clickedCount;
      results.savedOdds += savedOddsCount;
      results.dateResults.push({
        date: formattedDate,
        originalDate: dateStr,
        expectedMatches: matches.length,
        foundMatches: dateResult.foundMatches,
        clickedButtons: dateResult.clickedCount,
        savedOdds: savedOddsCount,
        success: dateResult.success,
        details: dateResult.details
      });
      
      // Tarihler arası bekleme
      if (Object.keys(matchesByDate).length > 1) {
        console.log('⏳ Sonraki tarihe geçmeden önce 5 saniye bekleniyor...');
        await scraper.wait(5000);
      }
    }
    
    // 5. Browser'ı kapat
    await scraper.close();
    
    // 6. Özet rapor
    console.log(`\n🎯 ${scoreType.toUpperCase()} MAÇLARI ÖZETİ:`);
    console.log(`   Toplam tarih: ${results.totalDates}`);
    console.log(`   İşlenen tarih: ${results.processedDates}`);
    console.log(`   Toplam ${scoreType} maç: ${results.totalMatches}`);
    console.log(`   Bulunan maç: ${results.foundMatches}`);
    console.log(`   Tıklanan "Diğer" buton: ${results.clickedButtons}`);
    console.log(`   Kaydedilen oran sayısı: ${results.savedOdds}`);
    console.log(`   Başarı oranı: ${results.totalMatches > 0 ? Math.round((results.clickedButtons / results.totalMatches) * 100) : 0}%`);
    
    return results;
    
  } catch (error) {
    console.error(`❌ ${scoreType} işlemi hatası:`, error);
    return {
      scoreType: scoreType,
      totalMatches: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Oranları database'e kaydeder
 * @param {object} matchDetail - Maç detayları ve oranları
 * @param {string} scoreType - Maç sonucu türü
 */
async function saveOddsToDatabase(matchDetail, scoreType) {
  try {
    let savedCount = 0;
    const tableName = `odds_${scoreType}`;
    
    // Önce match_id'yi bul
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id')
      .eq('home_team_id', matchDetail.homeTeamId)
      .eq('away_team_id', matchDetail.awayTeamId)
      .eq('match_date', matchDetail.date)
      .single();
    
    if (matchError || !matchData) {
      console.log(`   ❌ Maç bulunamadı: ${matchDetail.homeTeamName} vs ${matchDetail.awayTeamName}`);
      return 0;
    }
    
    const matchId = matchData.id;
    
    for (const market of matchDetail.odds) {
      // Market kaydını kontrol et/oluştur
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .select('id')
        .eq('name', market.marketName)
        .single();
      
      let marketId;
      if (marketError) {
        // Market yoksa oluştur
        const { data: newMarket, error: createMarketError } = await supabase
          .from('markets')
          .insert([{
            name: market.marketName,
            code: market.marketId
          }])
          .select('id')
          .single();
        
        if (createMarketError) {
          console.log(`   ⚠️ Market oluşturulamadı: ${market.marketName} - ${createMarketError.message}`);
          continue;
        }
        marketId = newMarket.id;
        console.log(`   ✅ Yeni market oluşturuldu: ${market.marketName}`);
      } else {
        marketId = marketData.id;
      }
      
      for (const option of market.options) {
        // Outcome kaydını kontrol et/oluştur
        const { data: outcomeData, error: outcomeError } = await supabase
          .from('outcomes')
          .select('id')
          .eq('name', option.optionName)
          .eq('market_id', marketId)
          .single();
        
        let outcomeId;
        if (outcomeError) {
          // Outcome yoksa oluştur
          const { data: newOutcome, error: createOutcomeError } = await supabase
            .from('outcomes')
            .insert([{
              name: option.optionName,
              market_id: marketId,
              code: option.optionId.toString()
            }])
            .select('id')
            .single();
          
          if (createOutcomeError) {
            console.log(`   ⚠️ Outcome oluşturulamadı: ${option.optionName} - ${createOutcomeError.message}`);
            continue;
          }
          outcomeId = newOutcome.id;
        } else {
          outcomeId = outcomeData.id;
        }
        
        // Ana odds tablosuna kaydet
        const { error: oddsError } = await supabase
          .from('odds')
          .upsert([{
            match_id: matchId,
            market_id: marketId,
            outcome_id: outcomeId,
            value: option.oddsValue,
            snapshot_at: new Date()
          }], {
            onConflict: 'match_id,market_id,outcome_id,value,snapshot_at'
          });
        
        // Özel tür tablosuna da kaydet (kolay analiz için)
        const oddsRecord = {
          match_date: matchDetail.date,
          home_team_id: matchDetail.homeTeamId,
          away_team_id: matchDetail.awayTeamId,
          home_team_name: matchDetail.homeTeamName ? matchDetail.homeTeamName.substring(0, 100) : '',
          away_team_name: matchDetail.awayTeamName ? matchDetail.awayTeamName.substring(0, 100) : '',
          week: matchDetail.week,
          ht_score: matchDetail.htScore,
          ft_score: matchDetail.ftScore,
          market_name: market.marketName ? market.marketName.substring(0, 100) : '',
          market_id: market.marketId ? market.marketId.substring(0, 20) : '',
          option_name: option.optionName ? option.optionName.substring(0, 50) : '',
          option_id: option.optionId,
          odds_value: option.oddsValue
        };
        
        const { error: typeTableError } = await supabase
          .from(tableName)
          .upsert([oddsRecord], {
            onConflict: 'home_team_id,away_team_id,match_date,market_id,option_id'
          });
        
        if (!oddsError && !typeTableError) {
          savedCount++;
        } else {
          if (oddsError) console.log(`   ⚠️ Ana tablo kaydetme hatası:`, oddsError.message);
          if (typeTableError) console.log(`   ⚠️ ${tableName} kaydetme hatası:`, typeTableError.message);
        }
      }
    }
    
    if (savedCount > 0) {
      console.log(`   💾 ${savedCount} oran kaydedildi (${scoreType})`);
    }
    
    return savedCount;
    
  } catch (error) {
    console.error('Oran kaydetme hatası:', error);
    return 0;
  }
}

/**
 * Tüm maç sonucu türleri için sırayla işlem yapar
 */
async function processAllScoreTypes() {
  const scoreTypes = ['0x0', '0x1', '0x2', '1x0', '1x1', '1x2', '2x0', '2x1', '2x2'];
  
  console.log('🚀 TÜM MAÇ SONUCU TÜRLERİ İÇİN İŞLEM BAŞLATIYOR...');
  console.log(`📋 İşlenecek türler: ${scoreTypes.join(', ')}`);
  console.log('='.repeat(80));
  
  const allResults = [];
  
  for (let i = 0; i < scoreTypes.length; i++) {
    const scoreType = scoreTypes[i];
    console.log(`\n🔄 ${i + 1}/${scoreTypes.length}: ${scoreType} işleniyor...`);
    
    const result = await processScoreType(scoreType);
    allResults.push(result);
    
    // Son türse bekleme, değilse sonraki türe geçmek için bekleme
    if (i < scoreTypes.length - 1) {
      console.log(`\n⏳ Sonraki tür (${scoreTypes[i + 1]}) için 10 saniye bekleniyor...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Genel özet
  console.log('\n🎯 GENEL ÖZET - TÜM MAÇ SONUCU TÜRLERİ:');
  console.log('='.repeat(80));
  
  let totalMatches = 0;
  let totalFound = 0;
  let totalClicked = 0;
  let totalSaved = 0;
  
  allResults.forEach((result, idx) => {
    const status = result.success !== false ? '✅' : '❌';
    console.log(`${idx + 1}. ${result.scoreType}: ${status}`);
    console.log(`   Maç: ${result.totalMatches || 0}, Bulunan: ${result.foundMatches || 0}, Tıklanan: ${result.clickedButtons || 0}, Kaydedilen: ${result.savedOdds || 0}`);
    
    totalMatches += result.totalMatches || 0;
    totalFound += result.foundMatches || 0;
    totalClicked += result.clickedButtons || 0;
    totalSaved += result.savedOdds || 0;
  });
  
  console.log('\n📊 TOPLAM SAYILAR:');
  console.log(`   Toplam maç: ${totalMatches}`);
  console.log(`   Bulunan maç: ${totalFound}`);
  console.log(`   Tıklanan buton: ${totalClicked}`);
  console.log(`   Kaydedilen oran: ${totalSaved}`);
  console.log(`   Genel başarı oranı: ${totalMatches > 0 ? Math.round((totalClicked / totalMatches) * 100) : 0}%`);
  
  return allResults;
}

// Eğer doğrudan çalıştırılırsa
if (require.main === module) {
  // Komut satırı argümanı varsa sadece o türü işle
  const scoreType = process.argv[2];
  
  if (scoreType) {
    console.log(`🎯 Sadece ${scoreType} türü işlenecek...`);
    processScoreType(scoreType);
  } else {
    // Argüman yoksa tüm türleri işle
    processAllScoreTypes();
  }
}

module.exports = { 
  processScoreType, 
  processAllScoreTypes, 
  saveOddsToDatabase 
};