const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/vietn/Downloads/EngkidsEXE101/EngkidsEXE101/comic-lingua-kids/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('site_settings').select('*');
  console.log('Result with Anon Key:');
  console.log('Error:', error);
  console.log('Data:', data);
}
test().catch(console.error);
