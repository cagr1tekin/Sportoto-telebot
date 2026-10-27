const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkCurrentData() {
    console.log('🔍 Mevcut database verilerini kontrol ediyorum...\n');
    
    // Son maçlar
    const { data: latestMatches } = await supabase
        .from('matches')
        .select('match_date, week_number')
        .order('match_date', { ascending: false })
        .limit(5);
    
    console.log('📅 Son 5 maç tarihi:');
    if (latestMatches) {
        latestMatches.forEach((m, i) => {
            console.log(`   ${i+1}. ${m.match_date} (Hafta ${m.week_number})`);
        });
    }
    
    // İlk maçlar
    const { data: earliestMatches } = await supabase
        .from('matches')
        .select('match_date, week_number')
        .order('match_date', { ascending: true })
        .limit(5);
    
    console.log('\n📅 İlk 5 maç tarihi:');
    if (earliestMatches) {
        earliestMatches.forEach((m, i) => {
            console.log(`   ${i+1}. ${m.match_date} (Hafta ${m.week_number})`);
        });
    }
    
    // Toplam maç sayısı
    const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Toplam maç sayısı: ${count}`);
    
    // Hangi sezon olduğunu anlayalım
    if (earliestMatches && earliestMatches.length > 0) {
        const firstDate = earliestMatches[0].match_date;
        if (firstDate.startsWith('2024-08')) {
            console.log('\n🏈 Mevcut veriler: 2024-25 sezonu');
            console.log('   ➡️ 2023-24 sezonunu da çekebiliriz!');
        } else if (firstDate.startsWith('2023-08')) {
            console.log('\n🏈 Mevcut veriler: 2023-24 sezonu');
        }
    }
}

checkCurrentData().catch(console.error);