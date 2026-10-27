/**
 * LiveResultsScraperV4 - Enhanced Premier League "Diğer" Button Scraper
 * V4 iyileştirmeleri:
 * - Kupa maçları filtreleme (K) işaretli maçlar
 * - Genişletilmiş Premier League section detection
 * - Daha sıkı lig sınırları
 * - Extra clicks önleme
 */

const puppeteer = require('puppeteer');

class LiveResultsScraperV4 {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 LiveResultsScraperV4 başlatılıyor...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized'],
      defaultViewport: null
    });
    
    this.page = await this.browser.newPage();
    console.log('✅ Browser başlatıldı (tam ekran)');
  }

  async navigateToLiveResults() {
    console.log('📖 Canlı Sonuçlar sayfasına gidiliyor...');
    await this.page.goto('https://arsiv.mackolik.com/Canli-Sonuclar', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✅ Sayfa yüklendi');
  }

  async setDateFilter(targetDate) {
    console.log(`📅 Tarih filtresi ayarlanıyor: ${targetDate}`);
    
    // Tarih input'unu bul ve değeri değiştir
    await this.page.evaluate((date) => {
      const dateInput = document.querySelector('input[type="text"]');
      if (dateInput) {
        dateInput.value = date;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, targetDate);
    
    await this.page.waitForTimeout(2000);
    console.log(`✅ Tarih ${targetDate} olarak ayarlandı`);
  }

  async clickIddaaButton() {
    console.log('🎯 İddaa butonuna tıklanıyor...');
    
    const buttons = await this.page.$$('input[type="checkbox"]');
    let buttonInfo = `   Total buttons found: ${buttons.length}`;
    
    if (buttons.length >= 2) {
      await buttons[1].click();
      const buttonId = await this.page.evaluate(el => el.id, buttons[1]);
      console.log(`✅ İddaa butonuna tıklandı!\n   Button Index: 1, ID: ${buttonId}\n${buttonInfo}`);
    } else {
      throw new Error('İddaa butonu bulunamadı');
    }
    
    await this.page.waitForTimeout(3000);
  }

  async clickDigerButtonByHomeTeam(matches) {
    console.log(`🎯 ${matches.length} maç için "Diğer" butonları aranıyor (Premier League section - V4)...\n`);
    
    const results = [];
    const allRows = await this.page.$$('tr');
    console.log(`📊 SONUÇLAR:\n   Toplam satır: ${allRows.length}`);
    
    try {
      const foundMatches = await this.page.evaluate((matches) => {
        const rows = Array.from(document.querySelectorAll('tr'));
        const foundMatches = [];
        let isPremierLeagueSection = false;
        
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const text = row.textContent.trim();
          
          // Premier League başlığını tespit et (sadece ana Premier League)
          if (text.includes('İngiltere - Premier Lig İY') || 
              (text.includes('Premier Lig') && text.includes('İngiltere') && text.includes('İY'))) {
            isPremierLeagueSection = true;
            console.log(`🏈 Premier League section başladı: Satır ${rowIndex}`);
            continue;
          }
          
          // V4: Genişletilmiş section bitme koşulları
          if (isPremierLeagueSection && text && (
              text.includes('U18') ||
              text.includes('U21') ||
              text.includes('U23') ||
              text.includes('Championship') ||
              text.includes('LaLiga') ||
              text.includes('Serie A') ||
              text.includes('Bundesliga') ||
              text.includes('Ligue 1') ||
              text.includes('Türkiye') ||
              text.includes('İtalya') ||
              text.includes('Almanya') ||
              text.includes('Fransa') ||
              text.includes('İspanya') ||
              text.includes('Kupa') ||
              text.includes('Cup') ||
              text.includes('FA Cup') ||
              text.includes('Carabao') ||
              text.includes('Europa') ||
              text.includes('Champions') ||
              text.includes('UEFA') ||
              text.includes('Conference') ||
              (text.includes('Premier Lig') && !text.includes('İngiltere'))
            )) {
            isPremierLeagueSection = false;
            console.log(`🛑 Premier League section bitti: Satır ${rowIndex}`);
            continue;
          }
          
          // V4: Kupa maçları ve gençlik takımları filtresi
          if (isPremierLeagueSection && text && text.length > 10 && 
              !text.includes('U18') && !text.includes('U21') && !text.includes('U23') && 
              !text.includes('(K)') && !text.includes('Kupa') && !text.includes('Cup') &&
              !text.includes('Youth') && !text.includes('Reserve')) {
            
            console.log(`🔍 Premier League satır ${rowIndex} kontrol ediliyor: ${text.substring(0, 100)}`);
            
            // Her match için ev takım kontrolü yap
            for (const match of matches) {
              const homeTeamName = match.homeTeamName;
              let teamFound = false;
              
              // Takım isminin kısmi eşleşmelerini kontrol et
              if (homeTeamName.includes('Brighton')) {
                teamFound = text.includes('Brighton');
              } else if (homeTeamName.includes('Crystal Palace')) {
                teamFound = text.includes('Crystal Palace');
              } else if (homeTeamName.includes('Manchester City')) {
                teamFound = text.includes('Manchester City');
              } else if (homeTeamName.includes('Manchester United')) {
                teamFound = text.includes('Manchester United');
              } else if (homeTeamName.includes('Tottenham')) {
                teamFound = text.includes('Tottenham');
              } else if (homeTeamName.includes('West Ham')) {
                teamFound = text.includes('West Ham');
              } else if (homeTeamName.includes('Newcastle')) {
                teamFound = text.includes('Newcastle');
              } else if (homeTeamName.includes('Nottingham')) {
                teamFound = text.includes('Nottingham');
              } else {
                teamFound = text.includes(homeTeamName);
              }
              
              if (teamFound) {
                console.log(`✅ Takım bulundu: ${homeTeamName} (Satır ${rowIndex})`);
                
                // V4: Sadece gerçek Premier League maçları için devam et
                // Kupa maçı kontrolü tekrar yap
                if (text.includes('(K)') || text.includes('Cup') || text.includes('Kupa')) {
                  console.log(`⚠️ Kupa maçı atlandı: ${text.substring(0, 80)}`);
                  continue;
                }
                
                // 4-step "Diğer" button arama algoritması
                let digerButton = null;
                let searchMethod = '';
                
                // 1. Aynı satırda "Diğer" arama
                digerButton = row.querySelector('a[onclick*="Others"]');
                if (digerButton) {
                  searchMethod = 'same-row';
                } else {
                  // 2. Sonraki satırda arama
                  const nextRow = row.nextElementSibling;
                  if (nextRow) {
                    digerButton = nextRow.querySelector('a[onclick*="Others"]');
                    if (digerButton) searchMethod = 'next-row';
                  }
                  
                  if (!digerButton) {
                    // 3. Match ID extraction ile arama
                    const links = row.querySelectorAll('a[href]');
                    for (const link of links) {
                      const href = link.href;
                      const matchIdMatch = href.match(/\/(\d+)$/);
                      if (matchIdMatch) {
                        const matchId = matchIdMatch[1];
                        digerButton = document.querySelector(`a[id="${matchId}_Others"]`);
                        if (digerButton) {
                          searchMethod = 'match-id';
                          break;
                        }
                      }
                    }
                  }
                  
                  if (!digerButton) {
                    // 4. Yakındaki satırları tara (5 satır)
                    for (let offset = -2; offset <= 2; offset++) {
                      if (offset === 0) continue;
                      const nearbyRowIndex = rowIndex + offset;
                      if (nearbyRowIndex >= 0 && nearbyRowIndex < rows.length) {
                        const nearbyRow = rows[nearbyRowIndex];
                        digerButton = nearbyRow.querySelector('a[onclick*="Others"]');
                        if (digerButton) {
                          searchMethod = 'nearby-rows';
                          break;
                        }
                      }
                    }
                  }
                }
                
                if (digerButton) {
                  // Button'a tıkla
                  digerButton.click();
                  
                  const buttonInfo = {
                    homeTeamId: match.homeTeamId,
                    homeTeamName: match.homeTeamName,
                    awayTeamName: match.awayTeamName,
                    pattern: match.pattern,
                    rowIndex: rowIndex,
                    clicked: true,
                    buttonElement: `<A> id="${digerButton.id || 'no-id'}"`,
                    searchMethod: searchMethod,
                    text: text.substring(0, 120)
                  };
                  
                  foundMatches.push(buttonInfo);
                  console.log(`✅ "${homeTeamName}" için "Diğer" butonuna tıklandı! (${searchMethod})`);
                } else {
                  const buttonInfo = {
                    homeTeamId: match.homeTeamId,
                    homeTeamName: match.homeTeamName,
                    awayTeamName: match.awayTeamName,
                    pattern: match.pattern,
                    rowIndex: rowIndex,
                    clicked: false,
                    searchMethod: 'not-found',
                    text: text.substring(0, 120)
                  };
                  
                  foundMatches.push(buttonInfo);
                  console.log(`❌ "${homeTeamName}" için "Diğer" butonu bulunamadı`);
                }
              }
            }
          }
        }
        
        return foundMatches;
      }, matches);
      
      // Sonuçları organize et
      const clickedCount = foundMatches.filter(m => m.clicked).length;
      console.log(`   Bulunan maç sayısı: ${foundMatches.length}`);
      console.log(`   "Diğer" butonuna tıklanan: ${clickedCount}\n`);
      
      if (foundMatches.length > 0) {
        console.log('📋 BULUNAN MAÇLAR:');
        foundMatches.forEach((match, idx) => {
          const status = match.clicked ? '✅ Tıklandı' : '❌ Tıklanamadı';
          console.log(`${idx + 1}. ${match.homeTeamName} vs ${match.awayTeamName} (${match.pattern}) - Satır ${match.rowIndex}: ${status}`);
          console.log(`   Text: ${match.text}`);
          if (match.clicked) {
            console.log(`   Diğer Button: ${match.buttonElement}`);
            console.log(`   Search Method: ${match.searchMethod}`);
          }
          console.log('');
        });
      }
      
      return { foundMatches, clickedCount };
      
    } catch (error) {
      console.log(`❌ Ev takım eşleştirme hatası: ${error.message}`);
      return { foundMatches: [], clickedCount: 0 };
    }
  }

  async processDate(targetDate, matchesToFind) {
    console.log(`\n🗓️ ${targetDate} tarihi işleniyor...`);
    console.log(`🔍 Aranacak maç sayısı: ${matchesToFind.length}`);
    
    await this.navigateToLiveResults();
    await this.setDateFilter(targetDate);
    await this.clickIddaaButton();
    
    const { foundMatches, clickedCount } = await this.clickDigerButtonByHomeTeam(matchesToFind);
    
    const successRate = matchesToFind.length > 0 ? 
      Math.round((clickedCount / matchesToFind.length) * 100) : 0;
    
    console.log(`\n📊 ${targetDate} TARİHİ ÖZET:`);
    console.log(`   Aranacak maç: ${matchesToFind.length}`);
    console.log(`   Bulunan maç: ${foundMatches.length}`);
    console.log(`   Tıklanan buton: ${clickedCount}`);
    console.log(`   Başarı oranı: ${successRate}%`);
    
    return { 
      date: targetDate,
      expected: matchesToFind.length,
      found: foundMatches.length,
      clicked: clickedCount,
      successRate,
      details: foundMatches
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser kapatıldı');
    }
  }
}

module.exports = { LiveResultsScraperV4 };