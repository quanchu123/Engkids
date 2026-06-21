import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url),'utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')];}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});
const { data: stages } = await sb.from('curriculum_stages').select('*').order('sort_order',{ascending:true});
console.log('=== curriculum_stages ===');
for (const s of stages||[]) console.log(`${s.id} | ${s.cefr||s.cefr_level||''} | ${s.title_vi||s.titleVi||''} | sort=${s.sort_order} | active=${s.active}`);
// active word count per stage (active rows only)
const levels=['a2-key','b1-preliminary','b2-first','c1-advanced'];
console.log('\n=== active words per level (post-clean) ===');
for (const lv of levels){ const {count}=await sb.from('word_bank_items').select('*',{count:'exact',head:true}).eq('level',lv).eq('active',true); console.log(`${lv} = ${count}`);}
