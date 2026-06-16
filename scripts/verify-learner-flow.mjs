#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.UX_VERIFY_BASE_URL || process.env.GAME_VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = path.join('output', 'playwright', 'ux-learner-flow');
const ROUTES = [
  '/',
  '/roadmap',
  '/learn/placement',
  '/learn/checkpoint?stage=a2-key',
  '/parent',
  '/games/english-farm',
  '/games/pet',
  '/games/matching-pairs',
  '/games/word-collector',
  '/games/rpg-battle',
  '/games/fill-blanks',
  '/games/sentence-scramble',
  '/games/word-puzzle',
  '/games/tank-word',
];
const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];
const IGNORE_CONSOLE = [
  /401 \(Unauthorized\)/i,
  /favicon/i,
  /has either width or height modified/i,
  /Largest Contentful Paint \(LCP\)/i,
  /Please add the \"priority\" property/i,
  /Fast Refresh/i,
  /GL Driver Message/i,
  /GPU stall due to ReadPixels/i,
];
function hasMojibake(text) {
  const chars = [...String(text || '')];
  return chars.some((char, index) => {
    const code = char.charCodeAt(0);
    const nextCode = chars[index + 1]?.charCodeAt(0) || 0;
    if (code === 0xfffd) return true;
    if (code === 0x00c3 && nextCode >= 0x00a0 && nextCode <= 0x00bf) return true;
    if (code === 0x00c4 || code === 0x00c5) return true;
    if (code === 0x00c2 && (nextCode === 0x00bb || nextCode === 0x00a9 || nextCode === 0x0020 || nextCode === 0x00a0)) return true;
    return code === 0x00e2 && nextCode > 0x007f;
  });
}
function slug(route) {
  return route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
}
function badConsole(entry) {
  return !IGNORE_CONSOLE.some((re) => re.test(entry.text));
}
async function assertServer() {
  const res = await fetch(BASE_URL, { method: 'GET' });
  if (!res.ok) throw new Error(`${BASE_URL} returned ${res.status}. Start dev server before running ux:verify-learner-flow.`);
}
async function main() {
  await assertServer();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const consoleEntries = [];
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) consoleEntries.push({ type: msg.type(), text: msg.text() });
    });
    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      const started = Date.now();
      let status = 0;
      let text = '';
      let screenshot = '';
      let error = '';
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        status = response?.status() || 0;
        await page.waitForTimeout(route.includes('/games/') ? 2200 : 1000);
        text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
        if (text.trim().length <= 20) {
          await page.waitForTimeout(2500);
          text = await page.locator('body').innerText({ timeout: 10000 }).catch(() => text);
        }
        screenshot = path.join(OUT_DIR, `${viewport.name}-${slug(route)}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      const recentConsole = consoleEntries.splice(0).filter(badConsole);
      const checks = {
        okStatus: status >= 200 && status < 400,
        hasText: text.trim().length > 20,
        noMojibake: !hasMojibake(text),
        noBlockingConsole: recentConsole.length === 0,
      };
      results.push({ route, viewport: viewport.name, status, ms: Date.now() - started, screenshot, error, checks, console: recentConsole.slice(0, 10) });
    }
    await page.close();
  }
  await browser.close();
  const failures = results.filter((result) => result.error || Object.values(result.checks).some((ok) => !ok));
  const report = { baseUrl: BASE_URL, routes: ROUTES, viewports: VIEWPORTS.map((v) => v.name), failures: failures.length, results };
  fs.writeFileSync(path.join(OUT_DIR, 'ux-learner-flow-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ baseUrl: BASE_URL, failures: failures.length, failedRoutes: failures.map((f) => `${f.viewport}:${f.route}`), report: path.join(OUT_DIR, 'ux-learner-flow-report.json') }, null, 2));
  if (failures.length) process.exit(1);
}
main().catch((error) => { console.error(error); process.exit(1); });