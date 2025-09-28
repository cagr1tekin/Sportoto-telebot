// Settlement Worker - Biten maçları analiz edip match_events'leri doldur
const { getFixtures, getFixtureEvents, getOdds } = require('../apiClient');
const { supabase } = require('../services/db');
const { upsertMatchEvents } = require('../services/stats');
const { computeMatchScore } = require('../scoring');
const logger = require('../util/logger');

/**
 * Biten maçları settle et (events analizi + puanlama)
 * @param {Date} date - Hangi günün maçları (default: dün)
 */
async function settleMatches(date = null) {
  try {
    // Sadece popüler ligleri takip et (API quota koruması)
    const POPULAR_LEAGUES = [
      'Premier League',
      'La Liga', 
      'Bundesliga',
      'Serie A',
      'Ligue 1',
      'Süper Lig',
      'Primeira Liga',
      'Eredivisie',
      'UEFA Champions League',
      'UEFA Europa League'
    ];

    // Default olarak dünkü maçları settle et
    const targetDate = date || (() => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    })();
    
    const dateStr = targetDate.toISOString().slice(0, 10);
    logger.info(`⚽ Settlement başlatılıyor - Tarih: ${dateStr}`);
    
    // API'den o günkü biten maçları al
    const fixturesResponse = await getFixtures({ date: dateStr });
    const fixtures = fixturesResponse.response || [];
    
    const finishedFixtures = fixtures.filter(f => {
      const isFinished = f.fixture?.status?.short === 'FT' || f.fixture?.status?.short === 'AET';
      const isPopularLeague = POPULAR_LEAGUES.includes(f.league?.name);
      return isFinished && isPopularLeague;
    });
    
    if (finishedFixtures.length === 0) {
      logger.info(`⚠️ ${dateStr} tarihinde popüler liglerde biten maç bulunamadı`);
      return;
    }
    
    logger.info(`🔍 ${finishedFixtures.length} popüler lig maçı analiz ediliyor...`);
    
    let processedCount = 0;
    
    for (const fixture of finishedFixtures) {
      try {
        const fixtureId = fixture.fixture.id;
        const homeTeam = fixture.teams.home.name;
        const awayTeam = fixture.teams.away.name;
        const homeGoals = fixture.goals?.home || 0;
        const awayGoals = fixture.goals?.away || 0;
        
        logger.info(`📊 Analiz ediliyor: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam} (ID: ${fixtureId})`);
        
        // Zaten işlenmiş mi kontrol et
        const { data: existing } = await supabase
          .from('match_events')
          .select('id')
          .eq('fixture_id', fixtureId)
          .single();
          
        if (existing) {
          logger.debug(`⚠️ Fixture ${fixtureId} zaten işlenmiş, atlanıyor`);
          continue;
        }
        
        // Match events analizi
        const matchEventData = await analyzeMatchEvents(
          fixtureId, 
          homeTeam, 
          awayTeam, 
          homeGoals, 
          awayGoals,
          fixture.fixture.date
        );
        
        // Match events'i kaydet
        await upsertMatchEvents(fixtureId, matchEventData);
        
        processedCount++;
        
        // Rate limit koruması
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (fixtureError) {
        logger.error(`Fixture ${fixture.fixture.id} işleme hatası:`, fixtureError.message);
      }
    }
    
    logger.info(`✅ Settlement tamamlandı: ${processedCount} maç işlendi`);
    
  } catch (error) {
    logger.error('❌ Settlement hatası:', error.message);
    throw error;
  }
}

/**
 * Tek maçın event analizini yap
 * @param {number} fixtureId - Fixture ID
 * @param {string} homeTeam - Ev sahibi takım
 * @param {string} awayTeam - Deplasman takımı  
 * @param {number} homeGoals - Ev sahibi goller
 * @param {number} awayGoals - Deplasman goller
 * @param {string} playedAt - Oynanma tarihi
 * @returns {Object} Match event verileri
 */
async function analyzeMatchEvents(fixtureId, homeTeam, awayTeam, homeGoals, awayGoals, playedAt) {
  try {
    // Default veriler (event API yoksa)
    let matchEventData = {
      league_code: 'UNKNOWN',
      season: new Date().getFullYear(),
      home_team: homeTeam,
      away_team: awayTeam,
      home_goals: homeGoals,
      away_goals: awayGoals,
      home_trailed: false,
      away_trailed: false,
      home_comeback_win: false,
      away_comeback_win: false,
      goals_while_trailing: 0,
      deepest_trail: 0,
      equalize_min: null,
      first_lead_min: null,
      lead_flips: 0,
      context_away: false, // Basit: false default
      odd_team: 2.0, // Default odds
      odd_opp: 2.0,
      played_at: playedAt
    };
    
    try {
      // Maç olaylarını API'den çek
      logger.debug(`🎮 Fixture ${fixtureId} events alınıyor...`);
      const eventsResponse = await getFixtureEvents({ fixture: fixtureId });
      const events = eventsResponse.response || [];
      
      if (events.length > 0) {
        // Events varsa detaylı analiz yap
        const analysis = analyzeGoalEvents(events, homeTeam, awayTeam);
        Object.assign(matchEventData, analysis);
        
        logger.debug(`⚽ Events analizi: Home trail=${analysis.home_trailed}, Away trail=${analysis.away_trailed}`);
      } else {
        // Events yoksa basit mantık: sadece final skora bak
        if (homeGoals < awayGoals && homeGoals > 0) {
          // Home team geride kaldı ama en az 1 gol attı
          matchEventData.home_trailed = true;
          matchEventData.deepest_trail = awayGoals - homeGoals;
          matchEventData.goals_while_trailing = Math.min(homeGoals, awayGoals);
        } else if (awayGoals < homeGoals && awayGoals > 0) {
          // Away team geride kaldı ama en az 1 gol attı
          matchEventData.away_trailed = true;
          matchEventData.deepest_trail = homeGoals - awayGoals;
          matchEventData.goals_while_trailing = Math.min(awayGoals, homeGoals);
        }
        
        logger.debug(`⚽ Basit analiz: Final ${homeGoals}-${awayGoals}`);
      }
      
    } catch (eventsError) {
      logger.warn(`Events API hatası (${fixtureId}):`, eventsError.message);
    }
    
    try {
      // Odds bilgisini al
      const oddsResponse = await getOdds({ fixture: fixtureId });
      if (oddsResponse.response && oddsResponse.response.length > 0) {
        const firstBookmaker = oddsResponse.response[0].bookmakers?.[0];
        const matchWinner = firstBookmaker?.bets?.find(bet => bet.name === 'Match Winner');
        
        if (matchWinner && matchWinner.values) {
          const homeOdd = matchWinner.values.find(v => v.value === 'Home')?.odd || 2.0;
          const awayOdd = matchWinner.values.find(v => v.value === 'Away')?.odd || 2.0;
          
          matchEventData.odd_team = homeOdd; // Home takım perspektifi
          matchEventData.odd_opp = awayOdd;
          
          logger.debug(`💰 Odds: Home ${homeOdd}, Away ${awayOdd}`);
        }
      }
    } catch (oddsError) {
      logger.warn(`Odds API hatası (${fixtureId}):`, oddsError.message);
    }
    
    return matchEventData;
    
  } catch (error) {
    logger.error(`Match events analiz hatası (${fixtureId}):`, error.message);
    throw error;
  }
}

/**
 * Goal events'lerini analiz et (detaylı skor akışı)
 * @param {Array} events - API events listesi
 * @param {string} homeTeam - Ev sahibi takım
 * @param {string} awayTeam - Deplasman takımı
 * @returns {Object} Analiz sonuçları
 */
function analyzeGoalEvents(events, homeTeam, awayTeam) {
  const goalEvents = events
    .filter(e => e.type === 'Goal' && e.detail !== 'Own Goal')
    .sort((a, b) => a.time.elapsed - b.time.elapsed);
    
  if (goalEvents.length === 0) {
    return {
      home_trailed: false,
      away_trailed: false,
      home_comeback_win: false,
      away_comeback_win: false,
      goals_while_trailing: 0,
      deepest_trail: 0,
      equalize_min: null,
      first_lead_min: null,
      lead_flips: 0
    };
  }
  
  let homeScore = 0;
  let awayScore = 0;
  let homeDeepest = 0;
  let awayDeepest = 0;
  let homeTrailingGoals = 0;
  let awayTrailingGoals = 0;
  let homeEqualize = null;
  let awayEqualize = null;
  let homeFirstLead = null;
  let awayFirstLead = null;
  let leadFlips = 0;
  let prevLeader = 'NONE'; // 'HOME', 'AWAY', 'TIE', 'NONE'
  
  goalEvents.forEach(goal => {
    const isHomeGoal = goal.team.name === homeTeam;
    const minute = goal.time.elapsed;
    
    if (isHomeGoal) {
      homeScore++;
      // Home gerideyse gol sayılır
      if (homeScore <= awayScore) {
        homeTrailingGoals++;
      }
    } else {
      awayScore++;
      // Away gerideyse gol sayılır
      if (awayScore <= homeScore) {
        awayTrailingGoals++;
      }
    }
    
    // Liderlik durumu
    let currentLeader = 'TIE';
    if (homeScore > awayScore) currentLeader = 'HOME';
    else if (awayScore > homeScore) currentLeader = 'AWAY';
    
    // Liderlik değişimi
    if (prevLeader !== 'NONE' && currentLeader !== prevLeader) {
      leadFlips++;
    }
    
    // Eşitleme anı
    if (homeScore === awayScore && homeScore > 0) {
      if (!homeEqualize) homeEqualize = minute;
      if (!awayEqualize) awayEqualize = minute;
    }
    
    // İlk öne geçiş
    if (currentLeader === 'HOME' && !homeFirstLead && homeScore > awayScore) {
      homeFirstLead = minute;
    }
    if (currentLeader === 'AWAY' && !awayFirstLead && awayScore > homeScore) {
      awayFirstLead = minute;
    }
    
    // En derin fark
    const diff = homeScore - awayScore;
    if (diff < 0) homeDeepest = Math.max(homeDeepest, Math.abs(diff));
    if (diff > 0) awayDeepest = Math.max(awayDeepest, diff);
    
    prevLeader = currentLeader;
  });
  
  // Final sonuçları
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;
  
  return {
    home_trailed: homeDeepest > 0,
    away_trailed: awayDeepest > 0,
    home_comeback_win: homeDeepest > 0 && homeWon,
    away_comeback_win: awayDeepest > 0 && awayWon,
    goals_while_trailing: Math.max(homeTrailingGoals, awayTrailingGoals),
    deepest_trail: Math.max(homeDeepest, awayDeepest),
    equalize_min: homeEqualize || awayEqualize,
    first_lead_min: homeFirstLead || awayFirstLead,
    lead_flips: leadFlips
  };
}

/**
 * Fixture'ı fixtures tablosuna kaydet/güncelle
 * @param {Object} fixture - API'den gelen fixture verisi
 */
async function upsertFixture(fixture) {
  try {
    const fixtureData = {
      ext_id: fixture.fixture.id.toString(),
      league_code: fixture.league?.name || 'UNKNOWN',
      ko: new Date(fixture.fixture.date).toISOString(),
      home_team: fixture.teams.home.name,
      away_team: fixture.teams.away.name,
      status: fixture.fixture.status.short
    };

    // Önce mevcut kaydı kontrol et
    const { data: existing } = await supabase
      .from('fixtures')
      .select('id')
      .eq('ext_id', fixture.fixture.id.toString())
      .single();

    if (existing) {
      // Kayıt var, güncelle
      const { error } = await supabase
        .from('fixtures')
        .update(fixtureData)
        .eq('ext_id', fixture.fixture.id.toString());
      
      if (error) {
        logger.debug(`Fixture update hatası (${fixture.fixture.id}):`, error.message);
      }
    } else {
      // Kayıt yok, yeni ekle
      const { error } = await supabase
        .from('fixtures')
        .insert(fixtureData);
      
      if (error) {
        logger.debug(`Fixture insert hatası (${fixture.fixture.id}):`, error.message);
      }
    }

  } catch (error) {
    logger.debug(`upsertFixture hatası (${fixture.fixture.id}):`, error.message);
  }
}

module.exports = { settleMatches };