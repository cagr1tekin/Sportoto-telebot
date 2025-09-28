// İstatistik ve puan veri servisleri - Team scores ve match events
const { supabase } = require('./db');
const logger = require('../util/logger');

/**
 * Match events kaydını güncelle/oluştur
 * @param {number} fixtureId - Fixture ID
 * @param {Object} payload - Event verileri
 */
async function upsertMatchEvents(fixtureId, payload) {
  try {
    // updated_at field'ını sadece tablo destekliyorsa ekle
    const upsertData = {
      fixture_id: fixtureId,
      ...payload
    };
    
    // updated_at sütunu mevcut mu kontrol et
    try {
      const { data: testQuery } = await supabase
        .from('match_events')
        .select('updated_at')
        .limit(1);
      
      // Eğer hata yok ise sütun var, ekle
      upsertData.updated_at = new Date().toISOString();
    } catch (columnError) {
      // Sütun yok, updated_at eklemeden devam et
      logger.debug('updated_at sütunu bulunamadı, atlanıyor...');
    }

    // Önce mevcut kaydı kontrol et
    const { data: existing } = await supabase
      .from('match_events')
      .select('id')
      .eq('fixture_id', fixtureId)
      .single();

    let result;
    if (existing) {
      // Kayıt var, güncelle
      const { data, error } = await supabase
        .from('match_events')
        .update(upsertData)
        .eq('fixture_id', fixtureId)
        .select();
      
      if (error) throw error;
      result = data;
    } else {
      // Kayıt yok, yeni ekle
      const { data, error } = await supabase
        .from('match_events')
        .insert(upsertData)
        .select();
      
      if (error) throw error;
      result = data;
    }

    logger.info(`✅ Match events ${existing ? 'güncellendi' : 'eklendi'}: Fixture ${fixtureId}`);
    return result;

  } catch (error) {
    logger.error('upsertMatchEvents hatası:', error.message);
    throw error;
  }
}

/**
 * Takım puanlarını güncelle/oluştur
 * @param {Object} params - Güncelleme parametreleri
 * @param {string} params.team_name - Takım adı
 * @param {number} params.window_days - Pencere gün sayısı
 * @param {Date} params.as_of_date - Tarih
 * @param {number} params.samples_inc - Sample artışı
 * @param {number} params.score_inc - Puan artışı
 * @param {number} params.deepest_trail - En derin geri düşme
 * @param {Date} params.played_at - Oynanma tarihi
 */
async function upsertTeamScores({ 
  team_name, 
  window_days, 
  as_of_date, 
  samples_inc, 
  score_inc, 
  deepest_trail, 
  played_at 
}) {
  try {
    // Mevcut kaydı getir
    const { data: existing } = await supabase
      .from('team_scores')
      .select('*')
      .eq('team_name', team_name)
      .eq('window_days', window_days)
      .eq('as_of_date', as_of_date.toISOString().slice(0, 10))
      .single();

    let newSamples = samples_inc;
    let newTotalScore = score_inc;
    let newDeepestSum = deepest_trail || 0;

    if (existing) {
      newSamples = existing.samples + samples_inc;
      newTotalScore = existing.total_score + score_inc;
      newDeepestSum = existing.deepest_avg * existing.samples + (deepest_trail || 0);
    }

    const avgScore = newSamples > 0 ? newTotalScore / newSamples : 0;
    const deepestAvg = newSamples > 0 ? newDeepestSum / newSamples : 0;

    // Son 60 gün ortalaması (basit hesap - ileride optimize edilebilir)
    let last60Avg = null;
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: last60Data } = await supabase
      .from('match_events')
      .select('home_team, away_team, played_at')
      .or(`home_team.eq.${team_name},away_team.eq.${team_name}`)
      .gte('played_at', sixtyDaysAgo.toISOString())
      .order('played_at', { ascending: false });

    if (last60Data && last60Data.length > 0) {
      // Basit hesap - gerçek match_score'ları toplamak gerekir
      last60Avg = avgScore; // Placeholder - ileride düzgün hesaplanacak
    }

    // Upsert işlemi
    const { data, error } = await supabase
      .from('team_scores')
      .upsert({
        team_name,
        window_days,
        as_of_date: as_of_date.toISOString().slice(0, 10),
        samples: newSamples,
        total_score: newTotalScore,
        avg_score: avgScore,
        last60_avg: last60Avg,
        deepest_avg: deepestAvg,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'team_name,window_days,as_of_date'
      });

    if (error) {
      logger.error(`Team scores upsert hatası (${team_name}):`, error.message);
      throw error;
    }

    logger.info(`✅ Team scores güncellendi: ${team_name} - samples: ${newSamples}, avg: ${avgScore.toFixed(2)}`);
    return data;

  } catch (error) {
    logger.error('upsertTeamScores hatası:', error.message);
    throw error;
  }
}

/**
 * En iyi takımları getir
 * @param {Object} params - Filtreleme parametreleri
 * @param {Date} params.day - Hangi gün
 * @param {number} params.window_days - Pencere gün sayısı
 * @param {number} params.limit - Limit
 * @param {number} params.minSamples - Minimum sample sayısı
 * @returns {Array} Top takımlar listesi
 */
async function getTopTeams({ 
  day = new Date(), 
  window_days = 180, 
  limit = 20, 
  minSamples = 1  // Default minimum sample'ı düşürdük
} = {}) {
  try {
    const { data, error } = await supabase
      .from('team_scores')  // Şimdilik team_scores kullan
      .select(`
        team_name,
        samples,
        total_score,
        avg_score,
        deepest_avg,
        last60_avg,
        updated_at
      `)
      .eq('as_of_date', day.toISOString().slice(0, 10))
      .eq('window_days', window_days)
      .gte('samples', minSamples)
      .order('avg_score', { ascending: false })  // avg_score'a göre sırala
      .limit(limit);

    if (error) {
      logger.error('getTopTeams hatası:', error.message);
      throw error;
    }

    logger.info(`✅ Top teams sorgusu: ${data?.length || 0} takım bulundu`);
    return data || [];

  } catch (error) {
    logger.error('getTopTeams hatası:', error.message);
    return [];
  }
}

/**
 * Takım detayını ara
 * @param {Object} params - Arama parametreleri  
 * @param {string} params.nameLike - Takım adı (LIKE arama)
 * @param {Date} params.day - Hangi gün
 * @param {number} params.window_days - Pencere gün sayısı
 * @returns {Object|null} Takım detayları
 */
async function findTeamDetail({ 
  nameLike, 
  day = new Date(), 
  window_days = 180 
}) {
  try {
    // Team scores kaydını ara
    const { data: teamScore, error: scoreError } = await supabase
      .from('team_scores')
      .select('*')
      .eq('as_of_date', day.toISOString().slice(0, 10))
      .eq('window_days', window_days)
      .ilike('team_name', `%${nameLike}%`)
      .single();

    if (scoreError && scoreError.code !== 'PGRST116') {
      logger.error('Team detail sorgu hatası:', scoreError.message);
      throw scoreError;
    }

    if (!teamScore) {
      logger.info(`Takım bulunamadı: ${nameLike}`);
      return null;
    }

    // Match events'tan wins/losses hesapla
    const { data: matchEvents } = await supabase
      .from('match_events')
      .select('home_team, away_team, home_comeback_win, away_comeback_win, played_at')
      .or(`home_team.eq.${teamScore.team_name},away_team.eq.${teamScore.team_name}`)
      .gte('played_at', new Date(Date.now() - window_days * 24 * 60 * 60 * 1000).toISOString())
      .order('played_at', { ascending: false })
      .limit(50);

    let wins = 0;
    const recentMatches = [];

    if (matchEvents) {
      matchEvents.forEach(match => {
        const isHome = match.home_team === teamScore.team_name;
        const teamWon = isHome ? match.home_comeback_win : match.away_comeback_win;
        
        if (teamWon) wins++;
        
        recentMatches.push({
          date: match.played_at,
          opponent: isHome ? match.away_team : match.home_team,
          isHome,
          comebackWin: teamWon
        });
      });
    }

    const result = {
      ...teamScore,
      wins,
      win_rate: teamScore.samples > 0 ? wins / teamScore.samples : 0,
      recent_matches: recentMatches.slice(0, 3)
    };

    logger.info(`✅ Team detail bulundu: ${teamScore.team_name} - ${wins}/${teamScore.samples} wins`);
    return result;

  } catch (error) {
    logger.error('findTeamDetail hatası:', error.message);
    return null;
  }
}

module.exports = {
  upsertMatchEvents,
  upsertTeamScores,
  getTopTeams,
  findTeamDetail
};