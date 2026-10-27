const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * İY/MS dönen maçların tarihlerini ve ev takım isimlerini dinamik olarak çeker
 * Pattern'i IY1MS2 veya IY2MS1 olan maçları bulur
 */
async function getReversedMatchDates() {
  try {
    console.log('🔍 İY/MS dönen maçlar aranıyor...');
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        match_date, 
        home_team_id,
        away_team_id,
        pattern, 
        ht_home, 
        ht_away, 
        ft_home, 
        ft_away,
        week
      `)
      .in('pattern', ['IY1MS2', 'IY2MS1'])
      .order('match_date');

    if (error) {
      console.error('❌ Veritabanı hatası:', error);
      return { dates: [], matches: [] };
    }

    console.log(`📊 Toplam ${matches.length} İY/MS dönen maç bulundu:\n`);

    // Maçları detaylı şekilde listele ve ev takım isimlerini al
    const dates = [];
    const matchDetails = [];
    
    matches.forEach((match, idx) => {
      console.log(`${idx + 1}. ${match.match_date} (Hafta ${match.week})`);
      console.log(`   Team${match.home_team_id} ${match.ht_home}-${match.ht_away} Team${match.away_team_id} (İY)`);
      console.log(`   Team${match.home_team_id} ${match.ft_home}-${match.ft_away} Team${match.away_team_id} (MS)`);
      console.log(`   Pattern: ${match.pattern}`);
      console.log('');
      
      dates.push(match.match_date);
      
      // Maç detaylarını sakla (ev takım ismi için)
      matchDetails.push({
        date: match.match_date,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        pattern: match.pattern,
        week: match.week,
        htScore: `${match.ht_home}-${match.ht_away}`,
        ftScore: `${match.ft_home}-${match.ft_away}`
      });
    });

    // Benzersiz tarihleri al
    const uniqueDates = [...new Set(dates)];
    
    console.log('📅 İkinci aşama için tarih listesi:');
    console.log(`   Toplam ${dates.length} maç, ${uniqueDates.length} farklı tarih`);
    console.log('');
    
    uniqueDates.forEach((date, idx) => {
      const matchCount = dates.filter(d => d === date).length;
      console.log(`${idx + 1}. ${date} (${matchCount} maç)`);
    });

    console.log('\n📋 Array formatında tarihler:');
    console.log(JSON.stringify(uniqueDates, null, 2));

    return {
      dates: uniqueDates,
      matches: matchDetails, // Sadece tarih değil, maç detayları da döndür
      rawMatches: matches, // Orijinal database verileri
      totalMatches: matches.length,
      uniqueDates: uniqueDates.length
    };

  } catch (error) {
    console.error('❌ İşlem hatası:', error);
    return { dates: [], matches: [] };
  }
}

/**
 * İstatistiksel özet çıkarır
 */
async function getReversedMatchStats() {
  try {
    const result = await getReversedMatchDates();
    
    if (result.matches.length === 0) {
      console.log('📊 İY/MS dönen maç bulunamadı.');
      return;
    }

    console.log('\n📈 İSTATİSTİKLER:');
    console.log(`   • Toplam dönen maç: ${result.totalMatches}`);
    console.log(`   • Farklı tarih sayısı: ${result.uniqueDates}`);
    console.log(`   • Ortalama günlük dönen maç: ${(result.totalMatches / result.uniqueDates).toFixed(1)}`);
    
    // Pattern dağılımı
    const patternCounts = {};
    result.matches.forEach(match => {
      patternCounts[match.pattern] = (patternCounts[match.pattern] || 0) + 1;
    });
    
    console.log('\n🔄 Pattern Dağılımı:');
    Object.entries(patternCounts).forEach(([pattern, count]) => {
      const percentage = ((count / result.totalMatches) * 100).toFixed(1);
      console.log(`   • ${pattern}: ${count} maç (${percentage}%)`);
    });

    // Haftalık dağılım
    const weekCounts = {};
    result.matches.forEach(match => {
      weekCounts[match.week] = (weekCounts[match.week] || 0) + 1;
    });
    
    const sortedWeeks = Object.entries(weekCounts)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .slice(0, 10); // İlk 10 haftayı göster
    
    console.log('\n📅 En Çok Dönen Maçların Olduğu Haftalar (İlk 10):');
    sortedWeeks.forEach(([week, count]) => {
      console.log(`   • Hafta ${week}: ${count} maç`);
    });

    return result;

  } catch (error) {
    console.error('❌ İstatistik hatası:', error);
  }
}

/**
 * Tarih aralığında dönen maçları filtreler
 */
async function getReversedMatchesByDateRange(startDate, endDate) {
  try {
    console.log(`🔍 ${startDate} - ${endDate} arasındaki İY/MS dönen maçlar aranıyor...`);
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        match_date, 
        home_team_id,
        away_team_id,
        pattern, 
        ht_home, 
        ht_away, 
        ft_home, 
        ft_away,
        week
      `)
      .in('pattern', ['IY1MS2', 'IY2MS1'])
      .gte('match_date', startDate)
      .lte('match_date', endDate)
      .order('match_date');

    if (error) {
      console.error('❌ Veritabanı hatası:', error);
      return [];
    }

    console.log(`📊 ${matches.length} İY/MS dönen maç bulundu (${startDate} - ${endDate})`);
    
    const dates = matches.map(match => match.match_date);
    const uniqueDates = [...new Set(dates)];
    
    return {
      dates: uniqueDates,
      matches: matches
    };

  } catch (error) {
    console.error('❌ İşlem hatası:', error);
    return [];
  }
}

// Eğer doğrudan çalıştırılırsa
if (require.main === module) {
  // Komut satırı argümanlarını kontrol et
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Varsayılan: Tüm dönen maçları getir
    getReversedMatchStats();
  } else if (args.length === 2) {
    // Tarih aralığı verilmişse
    const [startDate, endDate] = args;
    getReversedMatchesByDateRange(startDate, endDate);
  } else if (args[0] === '--dates-only') {
    // Sadece tarihleri getir
    getReversedMatchDates().then(result => {
      console.log(JSON.stringify(result.dates, null, 2));
    });
  } else {
    console.log('Kullanım:');
    console.log('  node get-reversed-matches.js                    # Tüm dönen maçları getir');
    console.log('  node get-reversed-matches.js 2024-08-01 2024-12-31  # Tarih aralığı');
    console.log('  node get-reversed-matches.js --dates-only       # Sadece tarihleri JSON olarak');
  }
}

module.exports = {
  getReversedMatchDates,
  getReversedMatchStats,
  getReversedMatchesByDateRange
};