// Database Utility: Premier League Seasons Setup
import { createClient } from '@supabase/supabase-js';
import { PREMIER_LEAGUE_SEASONS } from './season-mapping';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function setupPremierLeagueSeasons() {
  console.log('🏆 Setting up Premier League seasons in database...');

  try {
    // 1. Premier League competition'ını kontrol et/oluştur
    let { data: competition } = await supabase
      .from('competitions')
      .select('id')
      .eq('country', 'İngiltere')
      .eq('name', 'Premier League')
      .single();

    if (!competition) {
      const { data: newCompetition, error } = await supabase
        .from('competitions')
        .insert({ country: 'İngiltere', name: 'Premier League' })
        .select('id')
        .single();
      
      if (error) throw error;
      competition = newCompetition;
      console.log('✅ Premier League competition created');
    } else {
      console.log('✅ Premier League competition found');
    }

    const competitionId = competition.id;

    // 2. Mevcut sezonları kontrol et
    const { data: existingSeasons } = await supabase
      .from('seasons')
      .select('label')
      .eq('competition_id', competitionId);

    const existingLabels = new Set(existingSeasons?.map(s => s.label) || []);

    // 3. Eksik sezonları ekle
    const seasonsToInsert = [];
    for (const seasonLabel of Object.keys(PREMIER_LEAGUE_SEASONS)) {
      if (!existingLabels.has(seasonLabel)) {
        seasonsToInsert.push({
          competition_id: competitionId,
          label: seasonLabel
        });
      }
    }

    if (seasonsToInsert.length > 0) {
      const { error } = await supabase
        .from('seasons')
        .insert(seasonsToInsert);

      if (error) throw error;
      console.log(`✅ Added ${seasonsToInsert.length} new seasons:`, seasonsToInsert.map(s => s.label));
    } else {
      console.log('✅ All seasons already exist');
    }

    // 4. Tüm sezonları listele
    const { data: allSeasons } = await supabase
      .from('seasons')
      .select('id, label')
      .eq('competition_id', competitionId)
      .order('label', { ascending: false });

    console.log('🎯 Premier League seasons in database:');
    allSeasons?.forEach(season => {
      const seasonInfo = PREMIER_LEAGUE_SEASONS[season.label];
      console.log(`  ${season.label}: DB ID=${season.id}, Mackolik ID=${seasonInfo?.id || 'N/A'}`);
    });

    return { competitionId, seasons: allSeasons };

  } catch (error) {
    console.error('❌ Error setting up seasons:', error);
    throw error;
  }
}

/**
 * Match tarihinden database season ID'sini döndürür
 */
export async function getSeasonIdFromDate(matchDate: string): Promise<number | null> {
  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, label')
    .eq('competition_id', 1); // Premier League

  if (!seasons) return null;

  // Tarihe göre season bul
  const date = new Date(matchDate);
  
  for (const season of seasons) {
    const seasonInfo = PREMIER_LEAGUE_SEASONS[season.label];
    if (seasonInfo) {
      const startDate = new Date(seasonInfo.startDate);
      const endDate = new Date(seasonInfo.endDate);
      
      if (date >= startDate && date <= endDate) {
        return season.id;
      }
    }
  }

  return null;
}

/**
 * Mevcut matches tablosundaki verilerin season_id'lerini güncelle
 */
export async function updateExistingMatchesSeason() {
  console.log('🔄 Updating season IDs for existing matches...');

  try {
    // Tüm maçları al
    const { data: matches } = await supabase
      .from('matches')
      .select('id, match_date, season_id')
      .order('match_date');

    if (!matches) return;

    let updatedCount = 0;
    
    for (const match of matches) {
      const correctSeasonId = await getSeasonIdFromDate(match.match_date);
      
      if (correctSeasonId && correctSeasonId !== match.season_id) {
        const { error } = await supabase
          .from('matches')
          .update({ season_id: correctSeasonId })
          .eq('id', match.id);

        if (error) {
          console.error(`❌ Error updating match ${match.id}:`, error);
        } else {
          updatedCount++;
          if (updatedCount % 50 === 0) {
            console.log(`🔄 Updated ${updatedCount} matches...`);
          }
        }
      }
    }

    console.log(`✅ Updated ${updatedCount} matches with correct season IDs`);
    return updatedCount;

  } catch (error) {
    console.error('❌ Error updating matches:', error);
    throw error;
  }
}

// Eğer doğrudan çalıştırılırsa
if (require.main === module) {
  setupPremierLeagueSeasons()
    .then(() => updateExistingMatchesSeason())
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}