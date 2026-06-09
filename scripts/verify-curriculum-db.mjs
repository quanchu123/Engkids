import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const REQUIRED_TABLES = [
  'curriculum_stages',
  'curriculum_skills',
  'word_bank_items',
  'assessment_blueprints',
  'assessment_items',
  'learner_curriculum_state',
  'learner_skill_mastery',
  'assessment_attempts',
  'assessment_responses',
  'learner_daily_tasks',
  'curriculum_units',
  'lessons',
  'lesson_steps',
  'lesson_assets',
  'lesson_progress',
  'curriculum_import_sources',
  'curriculum_import_staging',
  'source_sentence_items',
  'source_lexical_items',
  'source_reading_passages',
  'lesson_events',
];

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function tableCount(supabase, table) {
  const probe = await supabase.from(table).select('*').limit(1);
  if (probe.error) return { table, ok: false, count: null, error: `${probe.error.code || 'ERR'} ${probe.error.message || probe.error.details || 'Unknown error'}` };
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return { table, ok: false, count: null, error: `${error.code || 'ERR'} ${error.message}` };
  return { table, ok: true, count: count ?? 0, error: null };
}

async function countWhere(supabase, table, query) {
  const request = query(supabase.from(table).select('id', { count: 'exact', head: true }));
  const { count, error } = await request;
  if (error) return { ok: false, count: null, error: `${error.code || 'ERR'} ${error.message || error.details || 'Unknown error'}` };
  return { ok: true, count: count ?? 0, error: null };
}

async function getWordDuplicates(supabase) {
  const { data, error } = await supabase.from('word_bank_items').select('en').eq('active', true).limit(10000);
  if (error) return { ok: false, duplicates: null, error: `${error.code || 'ERR'} ${error.message}` };

  const seen = new Set();
  const duplicates = [];
  for (const row of data || []) {
    const key = String(row.en || '').trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  return { ok: duplicates.length === 0, duplicates: duplicates.length, sample: duplicates.slice(0, 10) };
}

function printCheck(label, ok, detail) {
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`${mark} ${label}${detail ? `: ${detail}` : ''}`);
}

async function main() {
  const supabase = getSupabaseAdmin();
  const failures = [];

  console.log('Checking curriculum DB...');

  let missingFoundation = false;
  for (const table of REQUIRED_TABLES) {
    const result = await tableCount(supabase, table);
    printCheck(`table ${table}`, result.ok, result.ok ? `${result.count} rows` : result.error);
    if (!result.ok) {
      missingFoundation = true;
      failures.push(`missing/broken table ${table}`);
    }
  }

  if (missingFoundation) {
    console.error(`\nDB verification failed before data checks. Apply migrations first:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }

  const stages = await countWhere(supabase, 'curriculum_stages', (query) => query.eq('active', true));
  printCheck('curriculum_stages active = 4', stages.ok && stages.count === 4, stages.ok ? `${stages.count}` : stages.error);
  if (!stages.ok || stages.count !== 4) failures.push('curriculum_stages active not 4');

  const activeWords = await countWhere(supabase, 'word_bank_items', (query) => query.eq('active', true));
  printCheck('word_bank_items active >= 1000', activeWords.ok && activeWords.count >= 1000, activeWords.ok ? `${activeWords.count}` : activeWords.error);
  if (!activeWords.ok || activeWords.count < 1000) failures.push('word_bank_items active < 1000');

  for (const field of ['level', 'topic', 'example', 'vi']) {
    const missing = await countWhere(supabase, 'word_bank_items', (query) => query.eq('active', true).or(`${field}.is.null,${field}.eq.`));
    printCheck(`word_bank_items missing ${field} = 0`, missing.ok && missing.count === 0, missing.ok ? `${missing.count}` : missing.error);
    if (!missing.ok || missing.count !== 0) failures.push(`word_bank_items missing ${field}`);
  }

  const duplicates = await getWordDuplicates(supabase);
  printCheck('word_bank_items duplicate en_lower = 0', duplicates.ok, duplicates.ok ? '0' : JSON.stringify(duplicates));
  if (!duplicates.ok) failures.push('word_bank_items duplicate en_lower');

  const activeLegacyStages = await countWhere(supabase, 'curriculum_stages', (query) => query.eq('active', true).in('id', ['sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge']));
  printCheck('legacy stages hidden from active catalog', activeLegacyStages.ok && activeLegacyStages.count === 0, activeLegacyStages.ok ? String(activeLegacyStages.count) : activeLegacyStages.error);
  if (!activeLegacyStages.ok || activeLegacyStages.count !== 0) failures.push('legacy stages still active');

  const activeLessons = await countWhere(supabase, 'lessons', (query) => query.eq('active', true));
  printCheck('lessons active >= 4', activeLessons.ok && activeLessons.count >= 4, activeLessons.ok ? String(activeLessons.count) : activeLessons.error);
  if (!activeLessons.ok || activeLessons.count < 4) failures.push('lessons active < 4');

  for (const field of ['cefr_level', 'can_do_statement', 'expected_output', 'cefr_reason']) {
    const missing = await countWhere(supabase, 'lessons', (query) => query.eq('active', true).or(`${field}.is.null,${field}.eq.`));
    printCheck(`lessons missing ${field} = 0`, missing.ok && missing.count === 0, missing.ok ? `${missing.count}` : missing.error);
    if (!missing.ok || missing.count !== 0) failures.push(`lessons missing ${field}`);
  }

  const blockedLessons = await countWhere(supabase, 'lessons', (query) => query.eq('active', true).or('quality_status.eq.blocked,safety_status.eq.blocked'));
  printCheck('learner-facing lessons blocked = 0', blockedLessons.ok && blockedLessons.count === 0, blockedLessons.ok ? `${blockedLessons.count}` : blockedLessons.error);
  if (!blockedLessons.ok || blockedLessons.count !== 0) failures.push('blocked active lessons');

  const storyMissingStage = await countWhere(supabase, 'stories', (query) => query.is('curriculum_stage_id', null));
  printCheck('stories curriculum_stage_id backfilled', storyMissingStage.ok && storyMissingStage.count === 0, storyMissingStage.ok ? `${storyMissingStage.count} missing` : storyMissingStage.error);
  if (!storyMissingStage.ok || storyMissingStage.count !== 0) failures.push('stories missing curriculum_stage_id');

  const videoMissingStage = await countWhere(supabase, 'videos', (query) => query.is('curriculum_stage_id', null));
  printCheck('videos curriculum_stage_id backfilled', videoMissingStage.ok && videoMissingStage.count === 0, videoMissingStage.ok ? `${videoMissingStage.count} missing` : videoMissingStage.error);
  if (!videoMissingStage.ok || videoMissingStage.count !== 0) failures.push('videos missing curriculum_stage_id');

  const learnerColumns = await supabase
    .from('learner_curriculum_state')
    .select('selected_level_at,level_source')
    .limit(1);
  printCheck('learner_curriculum_state selected_level_at + level_source columns', !learnerColumns.error, learnerColumns.error ? `${learnerColumns.error.code || 'ERR'} ${learnerColumns.error.message}` : 'present');
  if (learnerColumns.error) failures.push('learner_curriculum_state missing onboarding columns');

  if (failures.length > 0) {
    console.error(`\nDB verification failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }

  console.log('\nDB verification passed.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});



