const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/vietn/Downloads/EngkidsEXE101/EngkidsEXE101/comic-lingua-kids/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase.from('site_settings').upsert({
    key: 'test_key',
    value: { test: true },
    updated_at: new Date().toISOString(),
  });
  
  if (error) {
    console.error('Upsert error:', error);
  } else {
    console.log('Upsert success:', data);
  }
}
test().catch(console.error);
