const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/vietn/Downloads/EngkidsEXE101/EngkidsEXE101/comic-lingua-kids/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: currentData, error: currentErr } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'background_music')
    .single();
  
  console.log('Current error:', currentErr);
  console.log('Current data:', currentData);

  const { data: upsertData, error: upsertErr } = await supabase.from('site_settings').upsert({
    key: 'background_music',
    value: { enabled: true, objectKey: 'test.mp3', volume: 0.5 },
    updated_at: new Date().toISOString(),
  });
  
  console.log('Upsert error:', upsertErr);
  console.log('Upsert data:', upsertData);

  const { data: newData, error: newErr } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'background_music')
    .single();

  console.log('New error:', newErr);
  console.log('New data:', newData);
}
test().catch(console.error);
