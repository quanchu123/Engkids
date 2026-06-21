// Deactivate synthetic adjective+noun seed phrases with broken machine VI.
// The game already refuses these (SYNTHETIC_PHRASE_PREFIX_RE), but they leaked
// into rebuilt lessons. Reversible (active=false), never deleted. Keeps good
// CEFR compounds like "fast food".
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=')).map((l) => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const DRY = process.argv.includes('--dry');
const SYNTHETIC = /^(red|blue|green|yellow|black|white|pink|brown|big|small|hot|cold|open|closed|clean|dirty|quiet|fast|slow|brave|careful|creative|crowded|helpful|healthy|important|possible|responsible|successful|useful)\s+/i;

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('word_bank_items')
      .select('id,en,vi,source').eq('active', true).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

const rows = await fetchAll();
// Synthetic phrase from the seed source only (keep CEFR compounds like "fast food").
const junk = rows.filter((r) =>
  SYNTHETIC.test(r.en) && r.en.includes(' ') && r.source === 'engkids-original-seed-2026');
const ids = junk.map((r) => r.id);
console.log(`synthetic seed phrases to deactivate = ${ids.length}`);
if (DRY) { console.log('(dry run, no writes)'); process.exit(0); }

let done = 0;
for (let i = 0; i < ids.length; i += 200) {
  const chunk = ids.slice(i, i + 200);
  const { error } = await sb.from('word_bank_items')
    .update({ active: false, vi_review_status: 'blocked' }).in('id', chunk);
  if (error) throw error;
  done += chunk.length;
  console.log(`  deactivated ${done}/${ids.length}`);
}
console.log('done.');
