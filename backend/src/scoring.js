// Comeback puanı hesaplama sistemi - Maç analiz ve skorlama
const logger = require('./util/logger');

/**
 * Maç için comeback puanı hesaplar
 * @param {Object} params - Hesaplama parametreleri
 * @param {number} params.deepest_trail - En derin geri düşme skoru (pozitif değer)
 * @param {number} params.goals_while_trailing - Gerideyken atılan gol sayısı
 * @param {number|null} params.equalize_min - Eşitleme dakikası (null olabilir)
 * @param {number|null} params.first_lead_min - İlk öne geçme dakikası (null olabilir)
 * @param {number} params.lead_flips - Liderlik değişim sayısı
 * @param {string} params.result - Maç sonucu ('WIN'|'DRAW'|'LOSE')
 * @param {boolean} params.context_away - Deplasman maçı mı
 * @param {number} params.odd_team - Takımın prematch oranı
 * @param {number} params.odd_opp - Rakibin prematch oranı
 * @param {Date} params.played_at - Maçın oynandığı tarih
 * @returns {number} Hesaplanmış maç puanı
 */
function computeMatchScore({
  deepest_trail,
  goals_while_trailing,
  equalize_min,
  first_lead_min,
  lead_flips,
  result,
  context_away,
  odd_team,
  odd_opp,
  played_at
}) {
  try {
    // Gerideyken hiç kalmamışsa puan yok
    if (!deepest_trail || deepest_trail <= 0) {
      return 0;
    }

    const d = deepest_trail; // Derinlik

    // DP (Derinlik Puanı): DP = 2*d*d + d
    const DP = 2 * d * d + d;
    logger.debug(`DP hesaplandı: 2*${d}*${d} + ${d} = ${DP}`);

    // Recovery oranı hesaplama
    let r = 0;
    if (equalize_min !== null) {
      // Eşitleme olduysa
      r = 1;
    } else {
      // Eşitleme olmadıysa, kapanmayan fark var
      // Basit yaklaşım: r = min(1, goals_while_trailing / d)
      r = Math.min(1, goals_while_trailing / d);
    }
    logger.debug(`Recovery oranı: r = ${r}`);

    // Sonuç çarpanı O
    let O = 0;
    if (result === 'WIN') {
      O = 1.00;
    } else if (result === 'DRAW') {
      O = 0.65;
    } else if (result === 'LOSE') {
      if (equalize_min !== null) {
        // Eşitledi ama sonra kaybetti
        O = 0.30;
      } else {
        // Hiç eşitlemedi, farkı sadece kapattı
        O = 0.30 * r;
      }
    }
    logger.debug(`Sonuç çarpanı: O = ${O}`);

    // KO (Comeback Oranı)
    const KO = DP * r * O;
    logger.debug(`KO hesaplandı: ${DP} * ${r} * ${O} = ${KO}`);

    // LDB (Liderlik Değişimleri Bonusu)
    let LDB = 0;
    
    // Eşitleme bonusu
    if (equalize_min !== null) {
      LDB += 4;
    }
    
    // Geriden öne geçme bonusu
    if (first_lead_min !== null) {
      LDB += 6;
    }
    
    // Ekstra liderlik değişimleri
    const baseFlips = (equalize_min ? 1 : 0) + (first_lead_min ? 1 : 0);
    const extraFlips = Math.max(0, lead_flips - baseFlips);
    LDB += Math.min(2, extraFlips) * 5; // Max 2 extra flip için +10
    
    logger.debug(`LDB hesaplandı: eşitleme=${equalize_min ? 4 : 0} + öne_geçme=${first_lead_min ? 6 : 0} + extra=${Math.min(2, extraFlips) * 5} = ${LDB}`);

    // YMD (Yaratıcı Mücadele Değeri)
    const trailingGoals = Math.min(5, goals_while_trailing); // Max 5 gol
    const equalizeBonus = equalize_min ? Math.min(9, 0.1 * equalize_min) : 0; // Max +9
    const YMD = trailingGoals + equalizeBonus;
    logger.debug(`YMD hesaplandı: gol_bonus=${trailingGoals} + eşitleme_bonus=${equalizeBonus} = ${YMD}`);

    // Bağlam çarpanı A (Away)
    const A = context_away ? 1.10 : 1.00;
    logger.debug(`Deplasman çarpanı: A = ${A}`);

    // Risk çarpanı R (Odds bazlı)
    let R = 0.90; // Default
    if (odd_team >= 2.20) {
      R = 1.15; // Yüksek risk
    } else if (odd_team >= 1.60) {
      R = 1.05; // Orta risk
    }
    logger.debug(`Risk çarpanı: R = ${R} (odd_team: ${odd_team})`);

    // Güncellik çarpanı W
    const today = new Date();
    const daysPassed = (today - played_at) / (1000 * 60 * 60 * 24);
    const W = Math.exp(-daysPassed / 180); // 180 gün yarılanma süresi
    logger.debug(`Güncellik çarpanı: W = ${W.toFixed(3)} (${daysPassed.toFixed(1)} gün önce)`);

    // Final puan hesaplama
    const matchScore = (KO + LDB + YMD) * A * R * W;
    
    logger.info(`Match score hesaplandı: (${KO.toFixed(2)} + ${LDB} + ${YMD.toFixed(2)}) * ${A} * ${R} * ${W.toFixed(3)} = ${matchScore.toFixed(2)}`);
    
    return Math.round(matchScore * 100) / 100; // 2 ondalık

  } catch (error) {
    logger.error('Match score hesaplama hatası:', error.message);
    return 0;
  }
}

/**
 * Wilson alt güven aralığı hesaplama (başarı oranı için)
 * @param {number} wins - Başarı sayısı
 * @param {number} n - Toplam deneme sayısı  
 * @param {number} z - Z skoru (1.96 = %95 güven)
 * @returns {number} Wilson alt sınırı
 */
function wilsonLower(wins, n, z = 1.96) {
  if (n === 0) return 0;
  
  const p = wins / n;
  const term = z * z / (2 * n);
  const numerator = p + term - z * Math.sqrt((p * (1 - p) + term) / n);
  const denominator = 1 + z * z / n;
  
  return Math.max(0, numerator / denominator);
}

/**
 * Bayesian başarı oranı hesaplama 
 * @param {number} wins - Gözlemlenen başarı sayısı
 * @param {number} n - Toplam deneme sayısı
 * @param {number} p0 - Prior başarı oranı (0.20 = %20)
 * @param {number} alpha - Prior güçlü (10 = 10 örnek değerinde)
 * @returns {number} Bayesian posterior ortalama
 */
function bayesRate(wins, n, p0 = 0.20, alpha = 10) {
  // Beta dağılımı: Beta(wins + α*p0, n - wins + α*(1-p0))
  const priorWins = alpha * p0;
  const priorLosses = alpha * (1 - p0);
  
  const posteriorWins = wins + priorWins;
  const posteriorTotal = n + alpha;
  
  return posteriorWins / posteriorTotal;
}

module.exports = {
  computeMatchScore,
  wilsonLower,
  bayesRate
};