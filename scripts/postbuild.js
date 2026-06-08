const { spawnSync } = require('child_process');

if (process.env.BACKFILL_THUMBNAILS_ON_BUILD !== '1') {
  console.log('[postbuild] skipped thumbnail backfill. Run `npm run thumbnails:backfill` when needed.');
  process.exit(0);
}

const result = spawnSync(process.execPath, ['scripts/backfill-video-thumbnails.js'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status || 0);
