/**
 * 2023-24 Premier League sezonu için TypeScript scraper çalıştırıcı
 */

import { execSync } from 'child_process';

async function runScraper2023() {
    console.log('🏈 2023-24 Premier League sezonu çekiliyor...\n');
    
    console.log('📋 ADIMLAR:');
    console.log('1. 2023-24 sezon ID bulunacak');
    console.log('2. Standings scraper çalıştırılacak'); 
    console.log('3. 380 maç verisi eklenecek');
    console.log('4. Toplam 760 maç olacak (380+380)\n');
    
    try {
        // TypeScript build
        console.log('🔧 TypeScript build ediliyor...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // Scraper çalıştır
        console.log('🚀 Standings scraper çalıştırılıyor...');
        execSync('npm run start', { stdio: 'inherit' });
        
    } catch (error) {
        console.error('❌ Hata oluştu:', error);
    }
}

runScraper2023();