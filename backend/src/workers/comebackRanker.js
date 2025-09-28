// Comeback Ranker Worker - Takım puanlarını güncelleyen günlük iş
const { supabase } = require('../services/db');
const { upsertTeamScores } = require('../services/stats');
const { bayesRate, wilsonLower } = require('../scoring');
const logger = require('../util/logger');

/**
 * Comeback sıralamasını güncelle (günlük çalışır)
 * Window: 180 gün geriye dönük analiz
 */
async function comebackRanker() {
  try {
    logger.info('🏆 Comeback Ranker başlatılıyor...');
    
    const today = new Date();
    const windowDays = 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    
    logger.info(`📅 Analiz penceresi: ${cutoffDate.toISOString().slice(0, 10)} - ${today.toISOString().slice(0, 10)}`);
    
    // Mevcut tüm match events'leri al (tarih filtresi kaldırıldı - şimdilik tüm veri)
    const { data: matchEvents, error } = await supabase
      .from('match_events')
      .select('*')
      .order('played_at', { ascending: false });
      
    if (error) {
      logger.error('Match events sorgu hatası:', error.message);
      throw error;
    }
    
    if (!matchEvents || matchEvents.length === 0) {
      logger.warn('⚠️ Henüz hiç match event bulunamadı - önce settlement çalıştırın');
      return;
    }
    
    logger.info(`📊 ${matchEvents.length} match event analiz ediliyor...`);
    
    // Takım bazlı aggregation
    const teamStats = new Map();
    
    matchEvents.forEach(match => {
      // Home team analizi
      if (match.home_trailed) {
        const homeKey = match.home_team;
        if (!teamStats.has(homeKey)) {
          teamStats.set(homeKey, {
            team_name: homeKey,
            samples: 0,
            wins: 0,
            totalScore: 0,
            deepestSum: 0,
            matches: []
          });
        }
        
        const homeStat = teamStats.get(homeKey);
        homeStat.samples++;
        if (match.home_comeback_win) {
          homeStat.wins++;
        }
        homeStat.deepestSum += match.deepest_trail || 0;
        homeStat.matches.push({
          date: match.played_at,
          opponent: match.away_team,
          won: match.home_comeback_win
        });
      }
      
      // Away team analizi
      if (match.away_trailed) {
        const awayKey = match.away_team;
        if (!teamStats.has(awayKey)) {
          teamStats.set(awayKey, {
            team_name: awayKey,
            samples: 0,
            wins: 0,
            totalScore: 0,
            deepestSum: 0,
            matches: []
          });
        }
        
        const awayStat = teamStats.get(awayKey);
        awayStat.samples++;
        if (match.away_comeback_win) {
          awayStat.wins++;
        }
        awayStat.deepestSum += match.deepest_trail || 0;
        awayStat.matches.push({
          date: match.played_at,
          opponent: match.home_team,
          won: match.away_comeback_win
        });
      }
    });
    
    logger.info(`👥 ${teamStats.size} takım için istatistik hesaplanıyor...`);
    
    // Her takım için team_scores tablosunu güncelle
    let updatedCount = 0;
    // Minimum sample şartını kaldırdık - şimdilik tüm verilerle çalış
    
    for (const [teamName, stats] of teamStats.entries()) {
      // Minimum sample kontrolü kaldırıldı
      logger.debug(`📊 ${teamName}: ${stats.samples} sample, ${stats.wins} win`);
      
      // Temel hesaplamalar
      const avgScore = stats.totalScore / stats.samples;
      const deepestAvg = stats.deepestSum / stats.samples;
      const rawRate = stats.wins / stats.samples;
      const bayesianRate = bayesRate(stats.wins, stats.samples, 0.20, 10);
      const wilsonLowerBound = wilsonLower(stats.wins, stats.samples);
      
      // Son 60 gün ortalaması (basit hesap)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const recentMatches = stats.matches.filter(m => 
        new Date(m.date) >= sixtyDaysAgo
      );
      
      let last60Avg = null;
      if (recentMatches.length > 0) {
        const recentWins = recentMatches.filter(m => m.won).length;
        last60Avg = recentWins / recentMatches.length;
      }
      
      try {
        // Team scores tablosunu güncelle
        const { error: upsertError } = await supabase
          .from('team_scores')
          .upsert({
            team_name: teamName,
            window_days: windowDays,
            as_of_date: today.toISOString().slice(0, 10),
            samples: stats.samples,
            total_score: stats.totalScore,
            avg_score: avgScore,
            last60_avg: last60Avg,
            deepest_avg: deepestAvg,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'team_name,window_days,as_of_date'
          });
          
        if (upsertError) {
          logger.error(`Team scores upsert hatası (${teamName}):`, upsertError.message);
          continue;
        }
        
        // Team comeback stats tablosunu da güncelle
        await supabase
          .from('team_comeback_stats')
          .upsert({
            team_name: teamName,
            window_days: windowDays,
            as_of_date: today.toISOString().slice(0, 10),
            samples: stats.samples,
            wins: stats.wins,
            raw_rate: rawRate,
            bayes_rate: bayesianRate,
            wilson_low: wilsonLowerBound,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'team_name,window_days,as_of_date'
          });
        
        updatedCount++;
        
        logger.debug(`✅ ${teamName}: ${stats.wins}/${stats.samples} (${(rawRate*100).toFixed(1)}%) - bayes: ${bayesianRate.toFixed(3)}`);
        
      } catch (updateError) {
        logger.error(`${teamName} güncelleme hatası:`, updateError.message);
      }
    }
    
    logger.info(`🏆 Comeback Ranker tamamlandı: ${updatedCount} takım güncellendi`);
    
  } catch (error) {
    logger.error('❌ Comeback Ranker hatası:', error.message);
    throw error;
  }
}

module.exports = { comebackRanker };