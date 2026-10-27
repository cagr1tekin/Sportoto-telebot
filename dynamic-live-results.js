const { getReversedMatchesWithTeamNames } = require('./get-team-names.js');
const { LiveResultsScraperV3 } = require('./live-results-scraper-v3.js');

/**
 * Database'den İY/MS dönen maçları alır ve
 * Live Results sayfasında ev takım ismiyle eşleştirerek "Diğer" butonlarına tıklar
 */
async function processReversedMatches() {
  console.log('🚀 İY/MS dönen maçlar için Live Results işlemi başlatılıyor...\n');
  
  try {
    // 1. Database'den tersine dönen maçları al
    console.log('📊 Database den IY/MS dönen maçlar alınıyor...');
    const reversedData = await getReversedMatchesWithTeamNames();
    
    if (reversedData.matches.length === 0) {
      console.log('❌ İY/MS dönen maç bulunamadı');
      return;
    }
    
    console.log(`✅ ${reversedData.matches.length} İY/MS dönen maç bulundu`);
    console.log(`📅 ${reversedData.dates.length} farklı tarih tespit edildi\n`);
    
    // 2. Tarihlere göre maçları grupla
    const matchesByDate = {};
    reversedData.matches.forEach(match => {
      const dateKey = match.date;
      if (!matchesByDate[dateKey]) {
        matchesByDate[dateKey] = [];
      }
      matchesByDate[dateKey].push({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeamName,
        awayTeamName: match.awayTeamName,
        pattern: match.pattern,
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
      totalDates: Object.keys(matchesByDate).length,
      totalMatches: reversedData.matches.length,
      processedDates: 0,
      foundMatches: 0,
      clickedButtons: 0,
      dateResults: []
    };
    
    for (const [dateStr, matches] of Object.entries(matchesByDate)) {
      // Tarih formatını DD/MM/YYYY'ye çevir
      const [year, month, day] = dateStr.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      console.log(`\n🗓️ TARİH: ${formattedDate} (${matches.length} maç)`);
      matches.forEach((match, idx) => {
        console.log(`   ${idx + 1}. ${match.homeTeamName} vs ${match.awayTeamName} (${match.pattern})`);
        console.log(`      İY: ${match.htScore}, MS: ${match.ftScore}, Hafta: ${match.week}`);
      });
      
      // Bu tarihteki maçları işle
      const dateResult = await scraper.processDate(formattedDate, matches);
      
      results.processedDates++;
      results.foundMatches += dateResult.foundMatches;
      results.clickedButtons += dateResult.clickedCount;
      results.dateResults.push({
        date: formattedDate,
        originalDate: dateStr,
        expectedMatches: matches.length,
        foundMatches: dateResult.foundMatches,
        clickedButtons: dateResult.clickedCount,
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
    console.log('\n🎯 GENEL ÖZET:');
    console.log(`   Toplam tarih: ${results.totalDates}`);
    console.log(`   İşlenen tarih: ${results.processedDates}`);
    console.log(`   Toplam İY/MS maç: ${results.totalMatches}`);
    console.log(`   Bulunan maç: ${results.foundMatches}`);
    console.log(`   Tıklanan "Diğer" buton: ${results.clickedButtons}`);
    console.log(`   Başarı oranı: ${results.totalMatches > 0 ? Math.round((results.clickedButtons / results.totalMatches) * 100) : 0}%`);
    
    console.log('\n📋 TARİH BAZLI DETAYLAR:');
    results.dateResults.forEach((dateResult, idx) => {
      const status = dateResult.success ? '✅' : '❌';
      const successRate = dateResult.expectedMatches > 0 ? 
        Math.round((dateResult.clickedButtons / dateResult.expectedMatches) * 100) : 0;
      
      console.log(`${idx + 1}. ${dateResult.date} ${status}`);
      console.log(`   Beklenen: ${dateResult.expectedMatches}, Bulunan: ${dateResult.foundMatches}, Tıklanan: ${dateResult.clickedButtons} (${successRate}%)`);
      
      if (dateResult.details.length > 0) {
        dateResult.details.forEach((detail, detailIdx) => {
          const detailStatus = detail.digerClicked ? '✅' : '❌';
          console.log(`      ${detailIdx + 1}. Team${detail.homeTeamId} (${detail.pattern}) ${detailStatus}`);
        });
      }
      console.log('');
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ İşlem hatası:', error);
    return null;
  }
}

// Eğer doğrudan çalıştırılırsa
if (require.main === module) {
  processReversedMatches();
}

module.exports = { processReversedMatches };