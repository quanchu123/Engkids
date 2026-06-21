import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' }); dotenv.config();
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const APPLY = process.argv.includes('--apply');
async function all(table, sel, cfg=(q)=>q){ const r=[]; for(let f=0;;f+=1000){ let q=sb.from(table).select(sel).range(f,f+999); q=cfg(q); const {data,error}=await q; if(error)throw error; r.push(...(data||[])); if(!data||data.length<1000)break;} return r; }

const activeLessons = await all('lessons','id,unit_id',(q)=>q.eq('active',true));
const activeLessonIds = new Set(activeLessons.map(l=>l.id));
const activeUnitIds = new Set(activeLessons.map(l=>l.unit_id).filter(Boolean));

// Orphan steps: active but their lesson is NOT active.
const steps = await all('lesson_steps','id,lesson_id',(q)=>q.eq('active',true));
const orphanStepIds = steps.filter(s=>!activeLessonIds.has(s.lesson_id)).map(s=>s.id);

// Orphan units: active but no active lesson references them.
const units = await all('curriculum_units','id',(q)=>q.eq('active',true));
const orphanUnitIds = units.filter(u=>!activeUnitIds.has(u.id)).map(u=>u.id);

console.log('orphan active steps:', orphanStepIds.length);
console.log('orphan active units:', orphanUnitIds.length);
if(!APPLY){ console.log('DRY — pass --apply to deactivate.'); process.exit(0); }

const now=new Date().toISOString();
for(let i=0;i<orphanStepIds.length;i+=200){
  const ids=orphanStepIds.slice(i,i+200);
  const {error}=await sb.from('lesson_steps').update({active:false,updated_at:now}).in('id',ids);
  if(error)throw error;
}
for(let i=0;i<orphanUnitIds.length;i+=200){
  const ids=orphanUnitIds.slice(i,i+200);
  const {error}=await sb.from('curriculum_units').update({active:false,updated_at:now}).in('id',ids);
  if(error)throw error;
}
console.log('deactivated. steps=%d units=%d', orphanStepIds.length, orphanUnitIds.length);
