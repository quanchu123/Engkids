const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/vietn/Downloads/EngkidsEXE101/EngkidsEXE101/comic-lingua-kids/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('Testing site_settings table...');
  const { data, error } = await supabase.from('site_settings').select('*').limit(1);
  if (error) {
    console.error('Error selecting:', error.message);
  } else {
    console.log('Select success, rows:', data.length);
  }
}
test().catch(console.error);
