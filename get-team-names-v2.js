const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * İY/MS dönen maçların ev takım isimlerini gerçek isimlerle beraber çeker
 */
async function getReversedMatchesWithTeamNames() {
  try {
    console.log('🔍 İY/MS dönen maçlar ve takım isimleri alınıyor...');
    
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
        week,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .in('pattern', ['IY1MS2', 'IY2MS1'])
      .order('match_date');

    if (error) {
      console.error('❌ Veritabanı hatası:', error);
      return { dates: [], matches: [] };
    }

    console.log(`📊 Toplam ${matches.length} İY/MS dönen maç bulundu:\n`);

    // Maçları detaylı şekilde listele
    const dates = [];
    const matchDetails = [];
    
    matches.forEach((match, idx) => {
      const homeTeamName = match.home_team?.name || `Team${match.home_team_id}`;
      const awayTeamName = match.away_team?.name || `Team${match.away_team_id}`;
      
      console.log(`${idx + 1}. ${match.match_date} (Hafta ${match.week})`);
      console.log(`   ${homeTeamName} ${match.ht_home}-${match.ht_away} ${awayTeamName} (İY)`);
      console.log(`   ${homeTeamName} ${match.ft_home}-${match.ft_away} ${awayTeamName} (MS)`);
      console.log(`   Pattern: ${match.pattern}`);
      console.log('');
      
      dates.push(match.match_date);
      
      // Maç detaylarını sakla (gerçek takım isimleriyle)
      matchDetails.push({
        date: match.match_date,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeTeamName: homeTeamName,
        awayTeamName: awayTeamName,
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

    return {
      dates: uniqueDates,
      matches: matchDetails,
      totalMatches: matches.length,
      uniqueDates: uniqueDates.length
    };

  } catch (error) {
    console.error('❌ İşlem hatası:', error);
    return { dates: [], matches: [] };
  }
}

/**
 * Belirli bir maç sonucu türüne göre maçları getirir
 * @param {string} scoreType - Maç sonucu türü (örn: '0x0', '1x2', '2x1')
 */
async function getMatchesByScoreType(scoreType) {
  try {
    const [ftHome, ftAway] = scoreType.split('x').map(Number);
    
    console.log(`🔍 ${scoreType} (${ftHome}-${ftAway}) maç sonuçları alınıyor...`);
    
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        match_date, 
        home_team_id,
        away_team_id,
        ht_home, 
        ht_away, 
        ft_home, 
        ft_away,
        week,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('ft_home', ftHome)
      .eq('ft_away', ftAway)
      .order('match_date');

    if (error) {
      console.error('❌ Veritabanı hatası:', error);
      return { dates: [], matches: [], totalMatches: 0, scoreType: scoreType };
    }

    console.log(`📊 Toplam ${matches.length} adet ${scoreType} maç bulundu\n`);

    // Maçları detaylı şekilde listele (sadece ilk 3 tanesini)
    const dates = [];
    const matchDetails = [];
    
    matches.forEach((match, idx) => {
      const homeTeamName = match.home_team?.name || `Team${match.home_team_id}`;
      const awayTeamName = match.away_team?.name || `Team${match.away_team_id}`;
      
      if (idx < 3) {
        console.log(`${idx + 1}. ${match.match_date} (Hafta ${match.week})`);
        console.log(`   ${homeTeamName} ${match.ht_home}-${match.ht_away} ${awayTeamName} (İY)`);
        console.log(`   ${homeTeamName} ${match.ft_home}-${match.ft_away} ${awayTeamName} (MS)`);
        console.log('');
      }
      
      dates.push(match.match_date);
      
      // Maç detaylarını sakla
      matchDetails.push({
        date: match.match_date,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeTeamName: homeTeamName,
        awayTeamName: awayTeamName,
        scoreType: scoreType,
        week: match.week,
        htScore: `${match.ht_home}-${match.ht_away}`,
        ftScore: `${match.ft_home}-${match.ft_away}`
      });
    });

    // Benzersiz tarihleri al
    const uniqueDates = [...new Set(dates)];
    
    console.log(`📅 ${scoreType} maçları için özet:`);
    console.log(`   Toplam ${matches.length} maç, ${uniqueDates.length} farklı tarih`);
    console.log('');

    return {
      dates: uniqueDates,
      matches: matchDetails,
      totalMatches: matches.length,
      uniqueDates: uniqueDates.length,
      scoreType: scoreType
    };

  } catch (error) {
    console.error('❌ İşlem hatası:', error);
    return { dates: [], matches: [], totalMatches: 0, scoreType: scoreType };
  }
}

// Test için çalıştır
if (require.main === module) {
  // Komut satırından argüman varsa o türü test et
  const scoreType = process.argv[2];
  
  if (scoreType) {
    getMatchesByScoreType(scoreType).then(result => {
      console.log(`\n🎯 ${scoreType.toUpperCase()} ÖZETİ:`);
      console.log(`   Toplam maç: ${result.totalMatches}`);
      console.log(`   Tarih sayısı: ${result.uniqueDates}`);
    });
  } else {
    getReversedMatchesWithTeamNames().then(result => {
      console.log('\n🎯 TAKIM İSİMLERİ ÖRNEKLERİ:');
      result.matches.slice(0, 5).forEach((match, idx) => {
        console.log(`${idx + 1}. ${match.date}: ${match.homeTeamName} vs ${match.awayTeamName}`);
      });
    });
  }
}

module.exports = { getReversedMatchesWithTeamNames, getMatchesByScoreType };