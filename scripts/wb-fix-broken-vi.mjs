// Re-translate the small set of broken-VI rows (echo or "từ <english>" placeholder)
// via Google free endpoint. Rows that still echo after retry are deactivated.
// Reversible. Run with --dry to preview.
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

function isBroken(en, vi) {
  const v = String(vi || '').trim().toLowerCase();
  const e = String(en || '').trim().toLowerCase();
  if (!v) return true;
  if (v === e) return true;                          // echo: "golf => golf"
  if (/^từ\s+[a-z]/.test(v)) return true;            // placeholder: "từ breakfast"
  if (/^(tính|động|danh)\s+từ\s/.test(v)) return true;
  return false;
}

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

async function googleTranslate(word) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(word)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Engkids fix' } });
  if (!res.ok) return '';
  const data = await res.json();
  return Array.isArray(data?.[0]) ? data[0].map((p) => p?.[0] || '').join('').trim() : '';
}

const rows = (await fetchAll()).filter((r) => isBroken(r.en, r.vi));
console.log(`broken rows to fix = ${rows.length}`);
if (DRY) { console.log('(dry run)'); process.exit(0); }

let fixed = 0, deactivated = 0;
for (const r of rows) {
  const vi = await googleTranslate(r.en);
  const good = vi && vi.toLowerCase() !== r.en.toLowerCase() && !/^từ\s/i.test(vi.toLowerCase());
  if (good) {
    const { error } = await sb.from('word_bank_items')
      .update({ vi, vi_review_status: 'needs-review', vi_updated_at: new Date().toISOString() })
      .eq('id', r.id);
    if (error) throw error;
    fixed += 1;
  } else {
    // Still echoes (true loanword with no Vietnamese gloss) → not useful for kids.
    const { error } = await sb.from('word_bank_items')
      .update({ active: false, vi_review_status: 'blocked' }).eq('id', r.id);
    if (error) throw error;
    deactivated += 1;
  }
}
console.log(`done. re-translated=${fixed}, deactivated=${deactivated}`);
