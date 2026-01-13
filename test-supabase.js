// Test Supabase connection
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NOT SET');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    console.log('\n📡 Fetching stories from Supabase...\n');
    const { data, error } = await supabase
      .from('stories')
      .select('id, title_en, title_vi')
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.error('Code:', error.code);
      process.exit(1);
    }
    
    console.log('✅ Connection successful!');
    console.log(`📖 Found ${data?.length || 0} stories:\n`);
    data?.forEach(story => {
      console.log(`  - ${story.title_en} (${story.title_vi})`);
    });
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
