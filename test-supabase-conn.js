const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('URL:', url);

const supabase = createClient(url, key);
supabase.from('videos').select('count', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('ERROR:', JSON.stringify(error, null, 2));
      process.exit(1);
    } else {
      console.log('SUCCESS! Videos count:', count);
      process.exit(0);
    }
  })
  .catch(e => {
    console.error('CATCH:', e.message);
    process.exit(1);
  });
