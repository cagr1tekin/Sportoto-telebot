
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function filterMatches() {
  const patternInput = process.argv[2];
  if (!patternInput) {
    console.error('Please provide a pattern (e.g., 1x1, 1x0, 0x2)');
    console.log('Usage: npx ts-node src/utils/filter-matches.ts <pattern>');
    process.exit(1);
  }

  // Convert 1x1 to IY1MS1
  // 0 -> X
  const mapResult = (char: string) => char === '0' ? 'X' : char;

  const parts = patternInput.toLowerCase().split('x');
  if (parts.length !== 2) {
    console.error('Invalid pattern format. Use Hx F (e.g. 1x1, 1x0, 0x2)');
    process.exit(1);
  }

  const ht = parts[0]!;
  const ft = parts[1]!;
  const iy = mapResult(ht);
  const ms = mapResult(ft);
  const dbPattern = `IY${iy}MS${ms}`;

  console.log(`Searching for pattern: ${dbPattern} (Input: ${patternInput})`);

  // Query matches with team names
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      match_date,
      ht_home,
      ht_away,
      ft_home,
      ft_away,
      pattern,
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `)
    .eq('pattern', dbPattern)
    .order('match_date', { ascending: false });

  if (error) {
    console.error('Error fetching matches:', error);
    return;
  }

  if (!matches || matches.length === 0) {
    console.log('No matches found.');
    return;
  }

  console.log(`Found ${matches.length} matches.`);

  let mdContent = `# Matches for Pattern ${patternInput} (${dbPattern})\n\n`;
  mdContent += `| Date | Home Team | Score (HT) | Away Team | Pattern |\n`;
  mdContent += `|------|-----------|------------|-----------|---------|\n`;

  matches.forEach((m: any) => {
    const date = new Date(m.match_date).toLocaleDateString('tr-TR');
    const score = `${m.ft_home}-${m.ft_away} (${m.ht_home}-${m.ht_away})`;
    const home = m.home_team?.name || 'Unknown';
    const away = m.away_team?.name || 'Unknown';
    mdContent += `| ${date} | ${home} | ${score} | ${away} | ${m.pattern} |\n`;
  });

  const outputPath = path.join(process.cwd(), 'filtered_matches.md');
  fs.writeFileSync(outputPath, mdContent);
  console.log(`Results written to ${outputPath}`);
}

filterMatches().catch(console.error);
