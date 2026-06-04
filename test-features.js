const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;

const checks = [
  { label: 'Home page exists', file: 'src/app/page.tsx' },
  { label: 'Stories API route exists', file: 'src/app/api/stories/route.ts' },
  { label: 'Story detail API route exists', file: 'src/app/api/stories/[id]/route.ts' },
  { label: 'Videos API route exists', file: 'src/app/api/videos/route.ts' },
  { label: 'Health API route exists', file: 'src/app/api/health/route.ts' },
  { label: 'Ready API route exists', file: 'src/app/api/ready/route.ts' },
  { label: 'Admin guard exists', file: 'src/components/AdminGuard.tsx' },
  { label: 'Story API client exists', file: 'src/services/api.ts', includes: 'export const storyApi =' },
  { label: 'Video API client exists', file: 'src/services/api.ts', includes: 'export const videoApi =' },
  { label: 'API safe result exists', file: 'src/services/api.ts', includes: 'export type ApiResult<' },
  { label: 'Daily quest card exists', file: 'src/components/common/DailyQuestCard.tsx' },
  { label: 'Progression map exists', file: 'src/components/common/ProgressionMap.tsx' },
];

let failed = 0;

for (const check of checks) {
  const fullPath = path.join(root, check.file);
  if (!fs.existsSync(fullPath)) {
    failed += 1;
    console.error(`FAIL ${check.label}: missing ${check.file}`);
    continue;
  }

  if (check.includes) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (!content.includes(check.includes)) {
      failed += 1;
      console.error(`FAIL ${check.label}: expected content not found in ${check.file}`);
      continue;
    }
  }

  console.log(`PASS ${check.label}`);
}

if (failed > 0) {
  console.error(`\n${failed} feature check(s) failed.`);
  process.exit(1);
}

console.log('\nAll feature smoke checks passed.');
