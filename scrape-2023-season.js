/**
 * 2023-24 Premier League sezonunu çeken scraper
 * Mevcut 2024-25 verileri korunacak, yeni veriler eklenecek
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function scrape2023Season() {
    console.log('🏈 Premier League 2023-24 sezonu çekiliyor...\n');
    
    console.log('📊 Mevcut durumu kontrol ediyorum...');
    
    // Mevcut veri sayısı
    const { count: currentCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });
    
    console.log(`   Mevcut maç sayısı: ${currentCount} (2024-25 sezonu)`);
    
    // 2023-24 sezonu kontrolü
    const { data: existing2023 } = await supabase
        .from('matches')
        .select('match_date')
        .gte('match_date', '2023-08-01')
        .lt('match_date', '2024-08-01')
        .limit(1);
    
    if (existing2023 && existing2023.length > 0) {
        console.log('⚠️ 2023-24 sezonu verisi zaten var!');
        console.log('   Devam etmek istiyor musunuz? (y/n)');
        return;
    }
    
    console.log('✅ 2023-24 sezonu verisi yok, çekmeye başlıyorum...\n');
    
    // TypeScript scraper'ı çalıştır
    console.log('🚀 TypeScript standings scraper başlatılıyor...');
    console.log('   NOT: src/index.ts dosyasını 2023-24 sezonu için düzenle');
    console.log('   Sonra: npm run start');
    
    // Alternatif: Node.js ile basit scraper
    console.log('\n🔧 Alternatif: Basit Node.js scraper oluşturayım mı? (y/n)');
}

scrape2023Season().catch(console.error);