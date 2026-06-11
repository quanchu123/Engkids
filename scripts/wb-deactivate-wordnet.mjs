// Deactivate all remaining active wordnet-princeton-lexical rows.
// Reversible (active=false, no delete). The CEFR-J/Octanove import replaced this
// base with correctly-levelled vocabulary, so the length-heuristic WordNet rows
// are no longer needed.
//   node scripts/wb-deactivate-wordnet.mjs --dry
//   node scripts/wb-deactivate-wordnet.mjs --apply
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const APPLY = process.argv.includes('--apply');

async function main() {
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('word_bank_items')
      .select('id')
      .eq('source', 'wordnet-princeton-lexical')
      .eq('active', true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const r of data) ids.push(r.id);
    if (data.length < 1000) break;
  }
  console.log(`active wordnet rows to deactivate = ${ids.length}`);
  if (!APPLY) { console.log('(dry run, no writes)'); return; }

  let done = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await sb
      .from('word_bank_items')
      .update({ active: false, vi_review_status: 'blocked' })
      .in('id', chunk);
    if (error) throw error;
    done += chunk.length;
    console.log(`  deactivated ${done}/${ids.length}`);
  }
  console.log('done.');
}
main().catch((e) => { console.error(e); process.exit(1); });
