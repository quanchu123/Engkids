#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const apply = process.argv.includes('--apply');
const dailyRetentionDays = Number(process.argv.find((arg) => arg.startsWith('--daily-retention-days='))?.split('=')[1] || '45');
const generatedRetentionDays = Number(process.argv.find((arg) => arg.startsWith('--generated-retention-days='))?.split('=')[1] || '30');
const logRetentionDays = Number(process.argv.find((arg) => arg.startsWith('--log-retention-days='))?.split('=')[1] || '30');

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function daysAgo(days) {
  return new Date(Date.now() - Math.max(0, days) * 24 * 60 * 60 * 1000).toISOString();
}

async function countQuery(query) {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function deleteQuery(query) {
  const { error, count } = await query;
  if (error) throw error;
  return count || 0;
}

const supabase = getSupabaseAdmin();
const now = new Date().toISOString();
const dailyCutoff = daysAgo(dailyRetentionDays).slice(0, 10);
const generatedCutoff = daysAgo(generatedRetentionDays);
const logCutoff = daysAgo(logRetentionDays);

const expiredSessions = await countQuery(
  supabase.from('admin_sessions').select('id', { count: 'exact', head: true }).lt('expires_at', now),
);

const oldDailyTasks = await countQuery(
  supabase
    .from('learner_daily_tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', ['done', 'skipped'])
    .lt('task_date', dailyCutoff),
);

const staleLogEvents = await countQuery(
  supabase
    .from('storage_cleanup_events')
    .select('id', { count: 'exact', head: true })
    .eq('dry_run', true)
    .lt('created_at', logCutoff),
);

const { data: inactiveItems, error: inactiveError } = await supabase
  .from('assessment_items')
  .select('id')
  .eq('active', false)
  .lt('created_at', generatedCutoff)
  .limit(5000);
if (inactiveError) throw inactiveError;

let orphanAssessmentItems = 0;
let orphanIds = [];
const candidateIds = (inactiveItems || []).map((row) => row.id).filter(Boolean);
for (let i = 0; i < candidateIds.length; i += 500) {
  const chunk = candidateIds.slice(i, i + 500);
  const { data: responses, error } = await supabase.from('assessment_responses').select('item_id').in('item_id', chunk);
  if (error) throw error;
  const used = new Set((responses || []).map((row) => row.item_id));
  const unused = chunk.filter((id) => !used.has(id));
  orphanIds = orphanIds.concat(unused);
  orphanAssessmentItems += unused.length;
}

const deleted = { expiredSessions: 0, oldDailyTasks: 0, orphanAssessmentItems: 0, staleLogEvents: 0 };

if (apply) {
  deleted.expiredSessions = await deleteQuery(
    supabase.from('admin_sessions').delete({ count: 'exact' }).lt('expires_at', now),
  );
  deleted.oldDailyTasks = await deleteQuery(
    supabase.from('learner_daily_tasks').delete({ count: 'exact' }).in('status', ['done', 'skipped']).lt('task_date', dailyCutoff),
  );
  deleted.staleLogEvents = await deleteQuery(
    supabase.from('storage_cleanup_events').delete({ count: 'exact' }).eq('dry_run', true).lt('created_at', logCutoff),
  );
  for (let i = 0; i < orphanIds.length; i += 500) {
    deleted.orphanAssessmentItems += await deleteQuery(
      supabase.from('assessment_items').delete({ count: 'exact' }).in('id', orphanIds.slice(i, i + 500)),
    );
  }
}

console.log(JSON.stringify({
  dryRun: !apply,
  cutoffs: { dailyCutoff, generatedCutoff, logCutoff },
  candidates: { expiredSessions, oldDailyTasks, orphanAssessmentItems, staleLogEvents },
  deleted,
}, null, 2));
