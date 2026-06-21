import { spawnSync } from 'node:child_process';
import dns from 'node:dns/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.map((arg) => (arg === dbUrl ? '<SUPABASE_DB_URL>' : arg)).join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function requireDbUrl() {
  if (!dbUrl) {
    throw new Error([
      'Missing SUPABASE_DB_URL or DATABASE_URL in .env.local.',
      'Open Supabase Dashboard > Project Settings > Database > Connection string,',
      'copy the Postgres URI, then add:',
      'SUPABASE_DB_URL="postgresql://postgres:YOUR_PASSWORD@.../postgres"',
      'Do not commit this value.',
    ].join('\n'));
  }
}

async function validateDbUrl() {
  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch (error) {
    throw new Error([
      'SUPABASE_DB_URL is not a valid URL.',
      'If your password contains special characters, URL-encode them, or copy the URI from Supabase Connect again.',
      error.message,
    ].join('\n'));
  }

  if (parsed.password.startsWith('[') || parsed.password.endsWith(']')) {
    throw new Error('SUPABASE_DB_URL password still contains square brackets. Remove [ and ] around the database password.');
  }

  const hostname = parsed.hostname;
  if (hostname.startsWith('db.') && hostname.endsWith('.supabase.co')) {
    const [aRecords, aaaaRecords] = await Promise.all([
      dns.resolve4(hostname).catch(() => []),
      dns.resolve6(hostname).catch(() => []),
    ]);
    if (aRecords.length === 0 && aaaaRecords.length > 0) {
      throw new Error([
        `Direct database host ${hostname} only resolves to IPv6 from this machine.`,
        'Use the Supabase Connect modal > Connection string > Session pooler instead.',
        'It usually looks like:',
        'postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres',
      ].join('\n'));
    }
  }
}

async function main() {
  requireDbUrl();
  await validateDbUrl();
  run('npx', ['supabase', 'db', 'push', '--db-url', dbUrl]);
  if (process.argv.includes('--push-only')) {
    console.log('\nSupabase migrations pushed.');
    return;
  }
  run('node', ['scripts/import-curriculum-word-bank.mjs']);
  run('node', ['scripts/verify-curriculum-db.mjs']);
  console.log('\nCurriculum DB setup completed.');
}

main().catch((error) => {
  console.error(`\n${error.message || error}`);
  process.exit(1);
});
