/**
 * 2023-24 Premier League sezonu scraper
 * Sezon ID: 63837
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

class PremierLeague2023Scraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.seasonId = 63837; // 2023-24 sezonu
  }

  async init() {
    console.log('🚀 2023-24 Premier League scraper başlatılıyor...');
    this.browser = await puppeteer.launch({
      headless: false,
      args: ['--start-maximized'],
      defaultViewport: null
    });
    
    this.page = await this.browser.newPage();
    console.log('✅ Browser başlatıldı');
  }

  async scrapeAllWeeks() {
    console.log(`🏈 Sezon ID ${this.seasonId} için 38 hafta çekiliyor...\n`);
    
    let totalMatches = 0;
    const allMatches = [];

    for (let week = 1; week <= 38; week++) {
      console.log(`\n📅 HAFTA ${week}/38`);
      console.log('═'.repeat(40));
      
      try {
        const weekMatches = await this.scrapeWeek(week);
        console.log(`✅ Hafta ${week}: ${weekMatches.length} maç çekildi`);
        
        allMatches.push(...weekMatches);
        totalMatches += weekMatches.length;
        
        // Progress
        const progress = Math.round((week / 38) * 100);
        console.log(`📊 İlerleme: ${progress}% (${totalMatches} toplam maç)`);
        
        // Kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Hafta ${week} hatası: ${error.message}`);
      }
    }

    console.log(`\n🎯 SEZON ÖZET:`);
    console.log(`   Toplam hafta: 38`);
    console.log(`   Toplam maç: ${totalMatches}`);
    console.log(`   Beklenen: 380 maç`);
    
    if (totalMatches === 380) {
      console.log('✅ Tüm maçlar başarıyla çekildi!');
    } else {
      console.log(`⚠️ ${380 - totalMatches} maç eksik`);
    }

    return allMatches;
  }

  async scrapeWeek(weekNumber) {
    const url = `https://arsiv.mackolik.com/Standings/Default.aspx?sId=${this.seasonId}`;
    
    try {
      await this.page.goto(url, { waitUntil: 'networkidle0' });
      console.log(`   🌐 Sayfa yüklendi: ${url}`);
      
      // Hafta seçici (eski arayüz için)
      await this.page.waitForTimeout(3000);
      
      // Hafta dropdown'ını bul ve seç
      try {
        await this.page.waitForSelector('select', { timeout: 10000 });
        const weekSelectors = await this.page.$$('select');
        
        for (const selector of weekSelectors) {
          const options = await selector.$$('option');
          if (options.length > 30) { // Hafta seçici muhtemelen 38 option'a sahip
            await selector.selectOption({ value: weekNumber.toString() });
            console.log(`   📅 Hafta ${weekNumber} seçildi`);
            await this.page.waitForTimeout(3000);
            break;
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Hafta seçici bulunamadı: ${error.message}`);
      }
      
      // Fikstür tabına geç (eski arayüz)
      try {
        const fixtureLink = await this.page.$('a[href*="Fixture"]');
        if (fixtureLink) {
          await fixtureLink.click();
          await this.page.waitForTimeout(2000);
          console.log(`   🎯 Fikstür tabına geçildi`);
        }
      } catch (error) {
        console.log(`   ⚠️ Fikstür tab bulunamadı: ${error.message}`);
      }
      
      // Maçları çek (eski arayüz için)
      const matches = await this.page.evaluate((week) => {
        const matchRows = Array.from(document.querySelectorAll('table tr, .fixture-row, .match-row'));
        const weekMatches = [];
        
        // Eski mackolik arayüzü için farklı selectors dene
        const possibleSelectors = [
          'table tr',
          '.fixture-table tr',
          '.standings-table tr',
          'tbody tr'
        ];
        
        for (const selector of possibleSelectors) {
          const rows = Array.from(document.querySelectorAll(selector));
          if (rows.length > 5) { // En az birkaç maç satırı var
            console.log(`Trying selector: ${selector}, found ${rows.length} rows`);
            
            rows.forEach((row, index) => {
              const cells = Array.from(row.querySelectorAll('td, th'));
              const text = row.textContent.trim();
              
              // Maç skoru pattern'ı ara: "Team1 X-Y Team2" veya benzeri
              const scorePattern = /(\d+)\s*-\s*(\d+)/;
              const scoreMatch = text.match(scorePattern);
              
              if (scoreMatch && cells.length >= 3) {
                const [fullMatch, homeScore, awayScore] = scoreMatch;
                
                // Takım isimlerini çıkarmaya çalış
                const parts = text.split(fullMatch);
                if (parts.length >= 2) {
                  const homeTeam = parts[0].trim();
                  const awayTeam = parts[1].trim();
                  
                  if (homeTeam && awayTeam && homeTeam.length > 1 && awayTeam.length > 1) {
                    weekMatches.push({
                      week_number: week,
                      home_team: homeTeam,
                      away_team: awayTeam,
                      home_score: parseInt(homeScore),
                      away_score: parseInt(awayScore),
                      match_date: '2023-08-01', // Placeholder, gerçek tarihi sonra düzelteceğiz
                      season: '2023-24',
                      raw_text: text.substring(0, 100)
                    });
                  }
                }
              }
            });
            
            if (weekMatches.length > 0) break; // İlk başarılı selector'da dur
          }
        }
        
        return weekMatches;
      }, weekNumber);
      
      console.log(`   📋 ${matches.length} maç bulundu`);
      
      // Database'e kaydet
      if (matches.length > 0) {
        await this.saveMatches(matches);
        console.log(`   💾 Database'e kaydedildi`);
      }
      
      return matches;
      
    } catch (error) {
      console.log(`   ❌ Hafta ${weekNumber} scraping hatası: ${error.message}`);
      return [];
    }
  }

  async saveMatches(matches) {
    try {
      const { data, error } = await supabase
        .from('matches_2023')
        .insert(matches);
      
      if (error) {
        console.log(`   ⚠️ Database hatası: ${error.message}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Save hatası: ${error.message}`);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser kapatıldı');
    }
  }
}

async function main() {
  const scraper = new PremierLeague2023Scraper();
  
  try {
    await scraper.init();
    await scraper.scrapeAllWeeks();
  } catch (error) {
    console.error('❌ Ana hata:', error);
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);