const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');
  
  const tables = [
    'videos',
    'video_subtitles', 
    'stories',
    'user_profiles',
    'user_progress',
    'user_video_progress',
    'vocabulary_items',
    'learning_sessions',
    'user_achievements',
    'daily_goals',
    'admin_users',
    'admin_sessions',
    'topics',
    'languages',
    'subtitle_tracks',
    'subtitle_cues'
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false })
      .limit(1);
    
    if (error) {
      console.log(`❌ ${table}: NOT EXISTS or ERROR (${error.message})`);
    } else {
      const columns = data && data[0] ? Object.keys(data[0]) : [];
      console.log(`✅ ${table}: ${count || 0} rows`);
      if (columns.length > 0) {
        console.log(`   Columns: ${columns.join(', ')}`);
      }
    }
    console.log('');
  }

  // Check sample data
  console.log('\n📊 Sample Data:\n');
  
  const { data: videos } = await supabase.from('videos').select('id, title, status, level, topics').limit(3);
  console.log('Videos:', JSON.stringify(videos, null, 2));

  const { data: subs } = await supabase.from('video_subtitles').select('*').limit(2);
  console.log('\nSubtitles:', JSON.stringify(subs, null, 2));
}

checkSchema().catch(console.error);
