const puppeteer = require('puppeteer');

/**
 * Canlı Sonuçlar sayfası scraper'ı - Geliştirilmiş "Diğer" buton bulma
 * Premier League section'ında dinamik ev takım eşleştirmesi ile "Diğer" butonlarına tıklar
 */
class LiveResultsScraperV3 {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 LiveResultsScraperV3 başlatılıyor...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
      defaultViewport: null
    });

    this.page = await this.browser.newPage();
    console.log('✅ Browser başlatıldı (tam ekran)');
  }

  async navigateToLiveResults() {
    console.log('📖 Canlı Sonuçlar sayfasına gidiliyor...');
    
    await this.page.goto('https://arsiv.mackolik.com/Canli-Sonuclar', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('✅ Sayfa yüklendi');
    await this.wait(5000);
  }

  async setDateFilter(targetDate) {
    console.log(`📅 Tarih filtresi ayarlanıyor: ${targetDate}`);
    
    try {
      await this.page.evaluate((date) => {
        const inputs = document.querySelectorAll('input[type="text"]');
        for (const input of inputs) {
          if (input.value && input.value.includes('/')) {
            input.value = date;
            input.dispatchEvent(new Event('change'));
            break;
          }
        }
      }, targetDate);

      await this.wait(3000);
      console.log(`✅ Tarih ${targetDate} olarak ayarlandı`);
      return true;

    } catch (error) {
      console.error('❌ Tarih ayarlama hatası:', error.message);
      return false;
    }
  }

  async clickIddaaButton() {
    console.log('🎯 İddaa butonuna tıklanıyor...');
    
    try {
      const iddaaClicked = await this.page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const iddaaButtons = [];
        
        for (const el of allElements) {
          if (el.textContent?.trim() === 'İddaa') {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              iddaaButtons.push({
                element: el,
                id: el.id,
                className: el.className
              });
            }
          }
        }
        
        if (iddaaButtons.length > 1) {
          iddaaButtons[1].element.click();
          return {
            success: true,
            id: iddaaButtons[1].id,
            className: iddaaButtons[1].className,
            position: 1,
            totalFound: iddaaButtons.length
          };
        } else if (iddaaButtons.length === 1) {
          iddaaButtons[0].element.click();
          return {
            success: true,
            id: iddaaButtons[0].id,
            className: iddaaButtons[0].className,
            position: 0,
            totalFound: 1
          };
        } else {
          return {
            success: false,
            error: 'İddaa butonu bulunamadı',
            totalFound: 0
          };
        }
      });

      if (iddaaClicked.success) {
        console.log('✅ İddaa butonuna tıklandı!');
        console.log(`   Button Index: ${iddaaClicked.position}, ID: ${iddaaClicked.id}`);
        console.log(`   Total buttons found: ${iddaaClicked.totalFound}`);
        
        await this.wait(5000);
        return true;
      } else {
        console.log('❌ İddaa butonuna tıklanamadı:', iddaaClicked.error);
        return false;
      }

    } catch (error) {
      console.error('❌ İddaa butonu tıklama hatası:', error.message);
      return false;
    }
  }

  /**
   * Premier League'de belirli ev takımlarının "Diğer" butonlarına tıklar - V3
   * Geliştirilmiş "Diğer" buton bulma algoritması
   */
  async clickDigerButtonByHomeTeam(matchesToFind) {
    console.log(`🎯 ${matchesToFind.length} maç için "Diğer" butonları aranıyor (Premier League section)...\n`);
    
    try {
      const results = await this.page.evaluate((matches) => {
        const allRows = document.querySelectorAll('tr');
        const foundMatches = [];
        let isPremierLeagueSection = false;
        let rowIndex = 0;
        
        for (const row of allRows) {
          const text = row.textContent?.trim();
          
          // Premier League başlığını tespit et (sadece ana Premier League)
          if (text && text.includes('Premier Lig') && text.includes('İngiltere') && 
              !text.includes('U18') && !text.includes('U21') && !text.includes('U23')) {
            isPremierLeagueSection = true;
            console.log(`🏈 Premier League section başladı: Satır ${rowIndex}`);
            rowIndex++;
            continue;
          }
          
          // Başka bir lig başlığı geldiğinde Premier League section'ı bitir
          if (isPremierLeagueSection && text && (
              text.includes('U18') ||
              text.includes('U21') ||
              text.includes('Championship') ||
              text.includes('LaLiga') ||
              text.includes('Serie A') ||
              text.includes('Bundesliga') ||
              text.includes('Ligue 1') ||
              text.includes('Kupa') ||
              text.includes('Cup') ||
              text.includes('FA Cup') ||
              text.includes('Carabao') ||
              text.includes('Europa') ||
              text.includes('Champions') ||
              text.includes('UEFA') ||
              (text.includes('Premier Lig') && !text.includes('İngiltere'))
            )) {
            isPremierLeagueSection = false;
            console.log(`🛑 Premier League section bitti: Satır ${rowIndex}`);
          }
          
          // Premier League section'ında olan maçları kontrol et
          if (isPremierLeagueSection && text && text.length > 10 && 
              !text.includes('U18') && !text.includes('U21') && !text.includes('U23') && 
              !text.includes('(K)') && !text.includes('Kupa') && !text.includes('Cup')) {
            
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
              } else if (homeTeamName.includes('Wolverhampton')) {
                teamFound = text.includes('Wolverhampton');
              } else if (homeTeamName.includes('West Ham')) {
                teamFound = text.includes('West Ham');
              } else {
                // Diğer takımlar için tam isim eşleşmesi
                teamFound = text.includes(homeTeamName);
              }
              
              console.log(`   ${homeTeamName} aranıyor: ${teamFound ? '✅ BULUNDU' : '❌'}`);
              
              // Takım bulunduysa "Diğer" butonunu ara
              if (teamFound) {
                
                let digerClicked = false;
                let digerButtonInfo = null;
                
                try {
                  // 1. Önce bu satırda ara
                  let btn = row.querySelector('a[id*="_Others"]');
                  let searchMethod = 'same-row';
                  
                  // 2. Eğer yoksa hemen sonraki satırda ara
                  if (!btn) {
                    const next = row.nextElementSibling;
                    if (next) {
                      btn = next.querySelector('a[id*="_Others"]');
                      searchMethod = 'next-row';
                    }
                  }
                  
                  // 3. Eğer hâlâ yoksa bu maçın ID'si ile ara
                  if (!btn) {
                    const scoreLink = row.querySelector('a[href*="/Mac/"]');
                    if (scoreLink && scoreLink.href) {
                      const matchIdMatch = scoreLink.href.match(/Mac\/(\d+)/);
                      if (matchIdMatch) {
                        const matchId = matchIdMatch[1];
                        btn = document.querySelector(`a[id="${matchId}_Others"]`);
                        searchMethod = 'match-id';
                      }
                    }
                  }
                  
                  // 4. Son çare: Yakındaki birkaç satırda ara
                  if (!btn) {
                    let nextRow = row.nextElementSibling;
                    let checkCount = 0;
                    while (nextRow && checkCount < 5 && !nextRow.textContent?.includes('Championship')) {
                      const foundBtn = nextRow.querySelector('a[id*="_Others"]');
                      if (foundBtn) {
                        btn = foundBtn;
                        searchMethod = `nearby-row-${checkCount + 1}`;
                        break;
                      }
                      nextRow = nextRow.nextElementSibling;
                      checkCount++;
                    }
                  }
                  
                  console.log(`   "Diğer" buton arama: ${btn ? `✅ BULUNDU (${btn.id}) - ${searchMethod}` : '❌ BULUNAMADI'}`);
                  
                  if (btn) {
                    btn.click();
                    digerClicked = true;
                    digerButtonInfo = {
                      tag: btn.tagName,
                      className: btn.className,
                      id: btn.id,
                      href: btn.href || '',
                      onclick: btn.onclick ? btn.onclick.toString().substring(0, 100) : '',
                      searchMethod: searchMethod
                    };
                    console.log(`   ✅ "${btn.id}" butonuna tıklandı!`);
                  }
                } catch (error) {
                  console.log(`   ❌ Diğer buton tıklama hatası: ${error.message}`);
                }
                
                foundMatches.push({
                  homeTeamId: match.homeTeamId,
                  homeTeamName: match.homeTeamName,
                  awayTeamName: match.awayTeamName,
                  pattern: match.pattern,
                  rowIndex: rowIndex,
                  text: text.substring(0, 200),
                  digerClicked: digerClicked,
                  digerButtonInfo: digerButtonInfo
                });
                
                break; // Bu satırda eşleşme bulundu, diğer maçlara geç
              }
            }
          }
          
          rowIndex++;
        }
        
        return {
          totalRows: allRows.length,
          foundMatches: foundMatches,
          clickedCount: foundMatches.filter(m => m.digerClicked).length
        };
      }, matchesToFind);

      console.log(`\n📊 SONUÇLAR:`);
      console.log(`   Toplam satır: ${results.totalRows}`);
      console.log(`   Bulunan maç sayısı: ${results.foundMatches.length}`);
      console.log(`   "Diğer" butonuna tıklanan: ${results.clickedCount}`);
      
      console.log(`\n📋 BULUNAN MAÇLAR:`);
      results.foundMatches.forEach((match, idx) => {
        const status = match.digerClicked ? '✅ Tıklandı' : '❌ Tıklanamadı';
        console.log(`${idx + 1}. ${match.homeTeamName} vs ${match.awayTeamName} (${match.pattern}) - Satır ${match.rowIndex}: ${status}`);
        console.log(`   Text: ${match.text}`);
        if (match.digerButtonInfo) {
          console.log(`   Diğer Button: <${match.digerButtonInfo.tag}> id="${match.digerButtonInfo.id}"`);
          console.log(`   Search Method: ${match.digerButtonInfo.searchMethod}`);
        }
        console.log('');
      });

      // Eğer "Diğer" butonlarına tıklandıysa popup'lardan oranları çek
      if (results.clickedCount > 0) {
        console.log(`\n🎯 ${results.clickedCount} popup'tan oranlar çekiliyor...`);
        for (let i = 0; i < results.foundMatches.length; i++) {
          const match = results.foundMatches[i];
          if (match.digerClicked) {
            console.log(`\n📊 ${match.homeTeamName} vs ${match.awayTeamName} için oranlar çekiliyor...`);
            
            // Popup yüklenme beklemesi - daha uzun
            await this.wait(5000);
            
            try {
              // Önce popup varlığını kontrol et
              const popupExists = await this.page.evaluate(() => {
                const popups = document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"], [id*="popup"], [id*="modal"]');
                console.log(`Found ${popups.length} potential popups`);
                
                // Tüm elementleri kontrol et
                const allElements = document.querySelectorAll('*');
                const textElements = [];
                for (const el of allElements) {
                  const text = el.textContent?.trim();
                  if (text && (text.includes('Maç Sonucu') || text.includes('Alt/Üst') || text.includes('seçenek'))) {
                    textElements.push(text);
                  }
                }
                console.log(`Found ${textElements.length} elements with betting text`);
                return textElements.slice(0, 10); // İlk 10'unu döndür
              });
              
              console.log(`   📋 Popup kontrol sonucu:`, popupExists);
              
              const oddsData = await this.extractOddsFromPopup();
              if (oddsData && oddsData.length > 0) {
                results.foundMatches[i].odds = oddsData;
                console.log(`   ✅ ${oddsData.length} oran kategorisi çekildi`);
                
                // Detaylı özet
                oddsData.forEach(market => {
                  console.log(`      📊 ${market.marketName}: ${market.odds.join(', ')}`);
                });
              } else {
                console.log(`   ❌ Oran çekilemedi`);
              }
              
              // Popup'ı kapat
              await this.closePopup();
              
            } catch (oddsError) {
              console.log(`   ❌ Oran çekme hatası: ${oddsError.message}`);
            }
            
            // Popup'lar arası bekleme
            if (i < results.foundMatches.length - 1) {
              await this.wait(1000);
            }
          }
        }
      }

      return {
        success: results.clickedCount > 0,
        foundMatches: results.foundMatches.length,
        clickedCount: results.clickedCount,
        details: results.foundMatches
      };

    } catch (error) {
      console.error('❌ Ev takım eşleştirme hatası:', error.message);
      return {
        success: false,
        foundMatches: 0,
        clickedCount: 0,
        details: []
      };
    }
  }

  /**
   * Belirli bir tarih için tam işlem yapar
   */
  async processDate(targetDate, matchesToFind) {
    console.log(`\n🗓️ ${targetDate} tarihi işleniyor...`);
    console.log(`🔍 Aranacak maç sayısı: ${matchesToFind.length}`);
    
    try {
      await this.navigateToLiveResults();
      
      const dateSet = await this.setDateFilter(targetDate);
      if (!dateSet) {
        throw new Error('Tarih ayarlanamadı');
      }
      
      const iddaaClicked = await this.clickIddaaButton();
      if (!iddaaClicked) {
        throw new Error('İddaa butonuna tıklanamadı');
      }
      
      const result = await this.clickDigerButtonByHomeTeam(matchesToFind);
      
      console.log(`\n📊 ${targetDate} TARİHİ ÖZET:`);
      console.log(`   Aranacak maç: ${matchesToFind.length}`);
      console.log(`   Bulunan maç: ${result.foundMatches}`);
      console.log(`   Tıklanan buton: ${result.clickedCount}`);
      console.log(`   Başarı oranı: ${matchesToFind.length > 0 ? Math.round((result.clickedCount / matchesToFind.length) * 100) : 0}%`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ ${targetDate} tarihi işlenirken hata:`, error.message);
      return {
        success: false,
        foundMatches: 0,
        clickedCount: 0,
        details: []
      };
    }
  }

  /**
   * Popup'tan oranları çeker ve parse eder
   */
  async extractOddsFromPopup() {
    try {
      const oddsData = await this.page.evaluate(() => {
        const markets = [];
        
        console.log('🔍 Popup içinde oran arama başlıyor...');
        
        // Tüm sayfayı text olarak al
        const fullText = document.body.textContent || document.body.innerText || '';
        console.log('🔍 Popup text uzunluğu:', fullText.length);
        
        // Text'i satırlara böl ve temizle
        const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log('📝 Toplam satır sayısı:', lines.length);
        
        const targetMarkets = [
          '2,5 Alt/Üst',
          'Maç Sonucu',
          '1,5 Alt/Üst', 
          '3,5 Alt/Üst',
          'Çifte Şans',
          'İlk Yarı Sonucu'
        ];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Target market'lerden birini arayalım
          for (const targetMarket of targetMarkets) {
            if (line.includes(targetMarket)) {
              console.log(`✅ Market bulundu: "${targetMarket}" -> "${line.substring(0, 100)}"`);
              
              // Spesifik format: "2,5 Alt/Üst - 01717 AltÜst01022.151.42"
              // Sadece valid range'deki oranları al (1.01 - 20.00 arası)
              const validOdds = [];
              const oddsNumbers = line.match(/\d+[.,]\d+/g);
              
              if (oddsNumbers && oddsNumbers.length >= 2) {
                for (const odd of oddsNumbers) {
                  const cleanOdd = parseFloat(odd.replace(',', '.'));
                  // Valid betting odds range'i kontrol et
                  if (cleanOdd >= 1.01 && cleanOdd <= 20.00) {
                    validOdds.push(cleanOdd.toString());
                  }
                }
                
                // En az 2 geçerli oran olmalı
                if (validOdds.length >= 2) {
                  // İlk 2 oranı al (Alt ve Üst için)
                  const finalOdds = validOdds.slice(0, 2);
                  
                  markets.push({
                    marketName: targetMarket,
                    marketId: i.toString(),
                    odds: finalOdds,
                    originalLine: line.substring(0, 150)
                  });
                  
                  console.log(`💰 Geçerli oranlar: ${finalOdds.join(', ')}`);
                }
              }
              break;
            }
          }
        }
        
        console.log(`📊 Toplam bulunan market sayısı: ${markets.length}`);
        return markets;
      });
      
      return oddsData;
      
    } catch (error) {
      console.error('Oran çekme hatası:', error);
      return [];
    }
  }

  /**
   * Popup'ı kapatır
   */
  async closePopup() {
    try {
      await this.page.evaluate(() => {
        // Çeşitli popup kapatma yöntemleri
        const closeButtons = [
          ...document.querySelectorAll('[onclick*="close"]'),
          ...document.querySelectorAll('.close'),
          ...document.querySelectorAll('.popup-close'),
          ...document.querySelectorAll('[title*="kapat"]'),
          ...document.querySelectorAll('[title*="Close"]')
        ];
        
        for (const btn of closeButtons) {
          if (btn.offsetParent !== null) { // Görünür mü kontrol et
            btn.click();
            return true;
          }
        }
        
        // ESC tuşu alternatifi
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        return false;
      });
      
      await this.wait(1000);
      
    } catch (error) {
      console.log('Popup kapatma hatası:', error.message);
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser kapatıldı');
    }
  }
}

module.exports = { LiveResultsScraperV3 };