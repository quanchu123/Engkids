// APPLY: deactivate junk wordnet rows (active=false). Reversible. No deletes.
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

const VN = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/;
const norm = (s) => (s || '').trim().toLowerCase().replace(/[.,;:!?]+$/g, '').trim();
const hasVN = (s) => VN.test(s || '');
const pureAscii = (s) => /^[\x00-\x7F]*$/.test(s || '');

function isJunk(en, vi) {
  const e = (en || '').trim();
  const v = (vi || '').trim();
  if (/[A-Z]/.test(e)) return true;                          // proper noun / abbrev
  if (!/^[a-z]+(?:[-\s][a-z]+)*$/.test(e) || e.length < 3) return true; // non-word
  if (!v) return true;                                        // empty
  if (norm(v) === norm(e)) return true;                       // untranslated
  if (!hasVN(v) && pureAscii(v)) return true;                 // ascii junk
  return false;
}

async function main() {
  const dryRun = process.argv.includes('--dry');
  let from = 0;
  const size = 1000;
  const junkIds = [];
  while (true) {
    const { data, error } = await sb
      .from('word_bank_items')
      .select('id, en, vi')
      .eq('source', 'wordnet-princeton-lexical')
      .eq('active', true)
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) if (isJunk(r.en, r.vi)) junkIds.push(r.id);
    from += size;
  }
  console.log(`junk rows to deactivate = ${junkIds.length}`);
  if (dryRun) { console.log('(dry run, no writes)'); return; }

  let done = 0;
  for (let i = 0; i < junkIds.length; i += 200) {
    const chunk = junkIds.slice(i, i + 200);
    const { error } = await sb
      .from('word_bank_items')
      .update({ active: false, vi_review_status: 'blocked' })
      .in('id', chunk);
    if (error) throw error;
    done += chunk.length;
    console.log(`  deactivated ${done}/${junkIds.length}`);
  }
  console.log('done.');
}
main().catch((e) => { console.error(e); process.exit(1); });
