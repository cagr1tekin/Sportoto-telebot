// Telegram Bot servisi - Sağlık kontrolü komutları
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const logger = require('./util/logger');
const { supabase } = require('./services/db');
const { getFixtures, getOdds } = require('./apiClient');
const { getTopTeams, findTeamDetail } = require('./services/stats');
const { settleMatches } = require('./workers/settlement');
const { comebackRanker } = require('./workers/comebackRanker');

// Bot konfigürasyonu
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;

if (!botToken || !adminChatId) {
  logger.error('❌ TELEGRAM_BOT_TOKEN veya ADMIN_CHAT_ID eksik!');
  process.exit(1);
}

// Bot instance oluştur
const bot = new TelegramBot(botToken, { polling: true });

// Bot başlangıç mesajı
const sendStartupMessage = async () => {
  try {
    await bot.sendMessage(adminChatId, '🤖 Bot up & running ✅');
    logger.info('✅ Bot başlangıç mesajı gönderildi');
  } catch (error) {
    logger.error('❌ Bot başlangıç mesajı gönderilemedi:', error.message);
  }
};

// /ping komutu - Sağlık kontrolü
bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, '🏓 pong');
    logger.info(`Ping komutu yanıtlandı - Chat ID: ${chatId}`);
  } catch (error) {
    logger.error('Ping komutu hatası:', error.message);
  }
});

// /dbtime komutu - Veritabanı zaman kontrolü
bot.onText(/\/dbtime/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    // Supabase ile zaman sorgusu
    const { data, error } = await supabase
      .rpc('current_timestamp');
    
    if (error) {
      // Alternatif yöntem
      const now = new Date();
      await bot.sendMessage(chatId, `⏰ DB Time (local): ${now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
    } else {
      await bot.sendMessage(chatId, `⏰ DB Time: ${data}`);
    }
    
    logger.info(`DBTime komutu yanıtlandı - Chat ID: ${chatId}`);
  } catch (error) {
    logger.error('DBTime komutu hatası:', error.message);
    await bot.sendMessage(chatId, '❌ Veritabanı sorgu hatası');
  }
});

// /start komutu - Chat ID öğrenmek için
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || msg.from.username || 'Bilinmeyen';
  
  logger.info(`🆔 /start komutu - Chat ID: ${chatId}, Kullanıcı: ${userName}`);
  
  await bot.sendMessage(chatId, 
    `👋 Merhaba ${userName}!\n\n` +
    `🆔 Chat ID'niz: \`${chatId}\`\n\n` +
    `📋 Kullanılabilir komutlar:\n` +
    `/ping - Bot sağlık kontrolü\n` +
    `/dbtime - Veritabanı zaman kontrolü\n` +
    `/fixtures_today - Bugünkü Premier League maçları\n` +
    `/odds <fixture_id> - Maç bahis oranları\n` +
    `/top20 - En iyi comeback takımları\n` +
    `/team <isim> - Takım comeback analizi\n` +
    `/settle_test - Settlement test (Popüler Ligler)\n` +
    `/ranker_test - Comeback ranker test (Mevcut Veri)`,
    { parse_mode: 'Markdown' }
  );
});

// /fixtures_today komutu - Bugünkü Premier League maçları
bot.onText(/\/fixtures_today/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, '🔍 Bugünkü Premier League maçları alınıyor...');
    
    const today = new Date().toISOString().slice(0, 10);
    const response = await getFixtures({ 
      date: today, 
      league: 39 // Premier League ID
    });
    
    const fixtures = response.response || [];
    
    if (fixtures.length === 0) {
      await bot.sendMessage(chatId, '⚠️ Bugün Premier League maçı bulunamadı.');
      return;
    }
    
    let message = `🏆 **Premier League - ${today}**\n\n`;
    
    fixtures.forEach((fixture, index) => {
      const f = fixture.fixture;
      const teams = fixture.teams;
      const status = f.status?.short || 'N/A';
      const time = new Date(f.date).toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
      });
      
      message += `**${index + 1}.** ID ${f.id} | ${time} | ${teams.home.name} - ${teams.away.name} | ${status}\n`;
    });
    
    message += `\n💡 Bahis oranları için: \`/odds <fixture_id>\``;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    logger.info(`Fixtures_today komutu yanıtlandı - Chat ID: ${chatId}, Bulunan: ${fixtures.length}`);
    
  } catch (error) {
    logger.error('Fixtures_today komutu hatası:', error.message);
    await bot.sendMessage(chatId, '❌ Maçlar alınamadı. API hatası.');
  }
});

// /odds <fixture_id> komutu - Bahis oranları
bot.onText(/\/odds (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const fixtureId = match[1];
  
  try {
    await bot.sendMessage(chatId, `🎰 Fixture ${fixtureId} için bahis oranları alınıyor...`);
    
    const response = await getOdds({ fixture: parseInt(fixtureId) });
    
    if (!response.response || response.response.length === 0) {
      await bot.sendMessage(chatId, '❌ Bu maç için bahis oranları bulunamadı.');
      return;
    }
    
    const firstBookmaker = response.response[0].bookmakers?.[0];
    
    if (!firstBookmaker) {
      await bot.sendMessage(chatId, '❌ Bookmaker bulunamadı.');
      return;
    }
    
    // 1X2 (Match Winner) bahisini bul
    const matchWinnerBet = firstBookmaker.bets?.find(bet => bet.name === 'Match Winner');
    
    if (!matchWinnerBet || !matchWinnerBet.values) {
      await bot.sendMessage(chatId, '❌ 1X2 bahis oranları bulunamadı.');
      return;
    }
    
    let message = `💰 **Bahis Oranları** (${firstBookmaker.name})\n`;
    message += `🆔 Fixture ID: ${fixtureId}\n\n`;
    
    message += `**1X2 Oranları:**\n`;
    matchWinnerBet.values.forEach(odd => {
      const emoji = odd.value === 'Home' ? '🏠' : odd.value === 'Draw' ? '🤝' : '✈️';
      message += `${emoji} ${odd.value}: **${odd.odd}**\n`;
    });
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    logger.info(`Odds komutu yanıtlandı - Chat ID: ${chatId}, Fixture: ${fixtureId}`);
    
  } catch (error) {
    logger.error('Odds komutu hatası:', error.message);
    await bot.sendMessage(chatId, '❌ Bahis oranları alınamadı. API hatası.');
  }
});

// /top20 komutu - En iyi comeback takımları
bot.onText(/\/top20/, async (msg) => {
  const chatId = msg.chat.id;
  try {
    await bot.sendMessage(chatId, '🏆 En iyi comeback takımları alınıyor...');
    
    const topTeams = await getTopTeams({
      window_days: 180,
      limit: 20,
      minSamples: 1  // Minimum sample şartını düşürdük
    });
    
    if (topTeams.length === 0) {
      await bot.sendMessage(chatId, '⚠️ Henüz hiç comeback verisi yok.\n💡 Önce /settle_test sonra /ranker_test çalıştırın.');
      return;
    }
    
    let message = `🏆 **Top 20 Comeback Takımları** (Avg Score)\n\n`;
    
    topTeams.forEach((team, index) => {
      const rank = index + 1;
      const avgScore = team.avg_score?.toFixed(2) || '0.00';
      const samples = team.samples || 0;
      const deepest = team.deepest_avg?.toFixed(1) || '0.0';
      
      // Telegram mesaj limiti kontrolü
      if (message.length > 3500) {
        message += `... ve ${topTeams.length - rank} takım daha`;
        return; // break yerine return kullan
      }
      
      message += `**${rank}.** ${team.team_name}\n`;
      message += `📊 Score: ${avgScore} | Samples: ${samples} | Deep: ${deepest}\n\n`;
    });
    
    message += `\n💡 Detay için: \`/team <takım_adı>\``;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    logger.info(`Top20 komutu yanıtlandı - Chat ID: ${chatId}, Takım sayısı: ${topTeams.length}`);
    
  } catch (error) {
    logger.error('Top20 komutu hatası:', error.message);
    await bot.sendMessage(chatId, '❌ Top 20 listesi alınamadı. Veri hatası.');
  }
});

// /team <isim> komutu - Takım detay analizi
bot.onText(/\/team (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const teamName = match[1].trim();
  
  try {
    await bot.sendMessage(chatId, `🔍 "${teamName}" takımı aranıyor...`);
    
    const teamDetail = await findTeamDetail({
      nameLike: teamName,
      window_days: 180
    });
    
    if (!teamDetail) {
      await bot.sendMessage(chatId, `⚠️ "${teamName}" takımı bulunamadı veya yeterli veri yok.`);
      return;
    }
    
    let message = `⚽ **${teamDetail.team_name}** - Comeback Analizi\n\n`;
    
    // Temel istatistikler
    message += `📊 **Genel İstatistik (180 gün):**\n`;
    message += `• Comeback başarısı: ${teamDetail.wins}/${teamDetail.samples}\n`;
    message += `• Başarı oranı: ${(teamDetail.win_rate * 100).toFixed(1)}%\n`;
    message += `• Ortalama puan: ${teamDetail.avg_score?.toFixed(2) || '0.00'}\n`;
    message += `• Ortalama en derin fark: ${teamDetail.deepest_avg?.toFixed(1) || '0.0'}\n`;
    
    if (teamDetail.last60_avg) {
      message += `• Son 60 gün ort: ${(teamDetail.last60_avg * 100).toFixed(1)}%\n`;
    }
    
    // Son maçlar
    if (teamDetail.recent_matches && teamDetail.recent_matches.length > 0) {
      message += `\n🕒 **Son Maçlar:**\n`;
      teamDetail.recent_matches.forEach(match => {
        const date = new Date(match.date).toLocaleDateString('tr-TR');
        const vs = match.isHome ? 'vs' : '@';
        const result = match.comebackWin ? '✅' : '❌';
        message += `${date} | ${vs} ${match.opponent} ${result}\n`;
      });
    }
    
    message += `\n🔄 Son güncelleme: ${new Date(teamDetail.updated_at).toLocaleDateString('tr-TR')}`;
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    logger.info(`Team komutu yanıtlandı - Chat ID: ${chatId}, Takım: ${teamDetail.team_name}`);
    
  } catch (error) {
    logger.error('Team komutu hatası:', error.message);
    await bot.sendMessage(chatId, '❌ Takım bilgisi alınamadı. Veri hatası.');
  }
});

// /settle_test komutu - Settlement worker test (sadece admin)
bot.onText(/\/settle_test/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Admin kontrolü
  if (chatId.toString() !== adminChatId.toString()) {
    await bot.sendMessage(chatId, '⛔ Bu komut sadece admin kullanıcısı için.');
    return;
  }
  
  try {
    await bot.sendMessage(chatId, '🔄 Settlement test başlatılıyor...\n🏆 Popüler liglerden veri çekiliyor...');
    
    const startTime = Date.now();
    
    // Dünkü maçları settle et
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await settleMatches(yesterday);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    await bot.sendMessage(chatId, 
      `✅ Settlement test tamamlandı!\n` +
      `⏱️ Süre: ${duration}s\n` +
      `📅 Analiz edilen tarih: ${yesterday.toISOString().slice(0, 10)}\n` +
      `🏆 Sadece popüler ligler analiz edildi\n` +
      `📊 Detaylar loglarda...`
    );
    
    logger.info(`Settlement test tamamlandı - Chat ID: ${chatId}, Süre: ${duration}s`);
    
  } catch (error) {
    logger.error('Settlement test hatası:', error.message);
    await bot.sendMessage(chatId, `❌ Settlement test hatası: ${error.message}`);
  }
});

// /ranker_test komutu - Comeback ranker test (sadece admin)
bot.onText(/\/ranker_test/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Admin kontrolü  
  if (chatId.toString() !== adminChatId.toString()) {
    await bot.sendMessage(chatId, '⛔ Bu komut sadece admin kullanıcısı için.');
    return;
  }
  
  try {
    await bot.sendMessage(chatId, '🏆 Comeback ranker test başlatılıyor...\n💾 Mevcut match events analiz ediliyor...');
    
    const startTime = Date.now();
    
    // Comeback ranker çalıştır
    await comebackRanker();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Güncellenmiş takım sayısını kontrol et
    const { data: teamScores } = await supabase
      .from('team_scores')
      .select('team_name')
      .eq('window_days', 180)
      .eq('as_of_date', new Date().toISOString().slice(0, 10));
    
    const count = teamScores ? teamScores.length : 0;
    
    await bot.sendMessage(chatId, 
      `✅ Comeback ranker test tamamlandı!\n` +
      `⏱️ Süre: ${duration}s\n` +
      `👥 Güncellenen takım: ${count}\n` +
      `💡 Henüz az veri varsa önce /settle_test çalıştır\n` +
      `📊 /top20 komutuyla sonuçları görebilirsin`
    );
    
    logger.info(`Comeback ranker test tamamlandı - Chat ID: ${chatId}, Süre: ${duration}s`);
    
  } catch (error) {
    logger.error('Comeback ranker test hatası:', error.message);
    await bot.sendMessage(chatId, `❌ Comeback ranker test hatası: ${error.message}`);
  }
});

// Bot hata yönetimi
bot.on('error', (error) => {
  logger.error('Bot hatası:', error.message);
});

bot.on('polling_error', (error) => {
  logger.error('Bot polling hatası:', error.message);
});

// Bot başlatma fonksiyonu
const startBot = async () => {
  try {
    logger.info('🤖 Telegram Bot başlatılıyor...');
    
    // Bot bilgilerini al
    const botInfo = await bot.getMe();
    logger.info(`✅ Bot aktif: @${botInfo.username} (${botInfo.first_name})`);
    
    // Admin'e başlangıç mesajı gönder
    await sendStartupMessage();
    
    return true;
  } catch (error) {
    logger.error('❌ Bot başlatma hatası:', error.message);
    return false;
  }
};

// Bot durdurma fonksiyonu
const stopBot = () => {
  try {
    bot.stopPolling();
    logger.info('🛑 Bot durduruldu');
  } catch (error) {
    logger.error('Bot durdurma hatası:', error.message);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🔄 SIGINT sinyali alındı, bot kapatılıyor...');
  stopBot();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🔄 SIGTERM sinyali alındı, bot kapatılıyor...');
  stopBot();
  process.exit(0);
});

module.exports = { 
  bot, 
  startBot, 
  stopBot 
};