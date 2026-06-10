#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.GAME_VERIFY_BASE_URL || 'http://127.0.0.1:3000';
const OUT_DIR = path.join('output', 'audits');
const SAMPLE_COUNT = Number(process.env.GAME_VERIFY_SAMPLE_COUNT || 100);
function hasMojibake(text) {
  const value = String(text || '');
  const markerCodes = new Set([0x00c3, 0x00c4, 0x00c2, 0xfffd]);
  const chars = [...value];
  return chars.some((char, index) => {
    const code = char.charCodeAt(0);
    const next = chars[index + 1]?.charCodeAt(0) || 0;
    return markerCodes.has(code) || (code === 0x00e2 && next > 0x007f);
  });
}const SYNTHETIC_PREFIX_RE = /^(red|blue|green|yellow|black|white|pink|brown|big|small|hot|cold|open|closed|clean|dirty|quiet|fast|slow|brave|careful|creative|crowded|helpful|healthy|important|possible|responsible|successful|useful)\s+/i;

function rngFactory(seed = 20260610) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0x100000000);
}
const rng = rngFactory();
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function norm(value) { return String(value || '').trim().toLowerCase(); }
function uniqueOptions(options) { return new Set(options.map(norm)).size === options.length; }
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function distractors(bank, answer, side, count) {
  const seen = new Set([norm(answer)]);
  const out = [];
  for (const word of shuffle(bank)) {
    const value = word[side];
    const key = norm(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= count) break;
  }
  return out;
}
function validate(q) {
  const issues = [];
  const text = [q.prompt, q.answer, ...(q.options || []), q.hint || ''].join(' ');
  if (!q.prompt || !String(q.prompt).trim()) issues.push('empty_prompt');
  if (!q.answer || !String(q.answer).trim()) issues.push('empty_answer');
  if (/translation_pending/i.test(text)) issues.push('translation_pending_visible');
  if (hasMojibake(text)) issues.push('mojibake_visible');
  if (SYNTHETIC_PREFIX_RE.test(String(q.answer || '')) && String(q.answer || '').includes(' ')) issues.push('synthetic_answer_phrase');
  if (q.options) {
    if (q.options.length !== q.expectedOptions) issues.push(`option_count_${q.options.length}`);
    if (!q.options.some((opt) => norm(opt) === norm(q.answer))) issues.push('answer_not_in_options');
    if (!uniqueOptions(q.options)) issues.push('duplicate_options');
  }
  if (q.kind === 'fill-blanks') {
    if (!String(q.prompt).includes('___')) issues.push('missing_blank');
    const visible = String(q.prompt).replace('___', '');
    if (new RegExp(`\\b${escapeRegExp(q.answer)}\\b`, 'i').test(visible)) issues.push('answer_still_visible');
  }
  return issues;
}
async function getJson(pathname) {
  const res = await fetch(`${BASE_URL}${pathname}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${pathname} returned ${res.status}`);
  return res.json();
}
function buildQuestions(bank) {
  const shuffledBank = shuffle(bank);
  const sample = Array.from({ length: SAMPLE_COUNT }, (_, index) => shuffledBank[index % shuffledBank.length]);
  const kinds = ['word-collector', 'rpg-battle', 'rpg-world', 'fill-blanks', 'sentence-scramble', 'matching-pairs', 'english-farm', 'pet'];
  return sample.map((word, index) => {
    const kind = kinds[index % kinds.length];
    if (kind === 'word-collector' || kind === 'rpg-world' || kind === 'english-farm') {
      return { kind, prompt: word.vi, answer: word.en, options: shuffle([word.en, ...distractors(bank, word.en, 'en', 3)]), expectedOptions: 4 };
    }
    if (kind === 'rpg-battle') {
      return { kind, prompt: `"${word.en}" means?`, answer: word.vi, options: shuffle([word.vi, ...distractors(bank, word.vi, 'vi', 3)]), expectedOptions: 4 };
    }
    if (kind === 'fill-blanks') {
      const answer = word.en.toLowerCase();
      const source = word.example || `I can use ${answer}.`;
      const sentence = source.replace(new RegExp(`\\b${escapeRegExp(word.en)}\\b`, 'i'), '___');
      return { kind, prompt: sentence.includes('___') ? sentence : 'I can use ___.', answer, options: shuffle([answer, ...distractors(bank, word.en, 'en', 3).map((opt) => opt.toLowerCase())]), expectedOptions: 4, hint: word.vi };
    }
    if (kind === 'sentence-scramble') return { kind, prompt: word.example || `I can use ${word.en}.`, answer: word.example || `I can use ${word.en}.`, hint: word.vi };
    if (kind === 'matching-pairs') return { kind, prompt: word.vi, answer: word.en };
    const viToEn = rng() > 0.5;
    return { kind, prompt: viToEn ? word.vi : word.en, answer: viToEn ? word.en : word.vi, options: shuffle([viToEn ? word.en : word.vi, ...distractors(bank, viToEn ? word.en : word.vi, viToEn ? 'en' : 'vi', 3)]), expectedOptions: 4 };
  }).map((q, index) => ({ id: index + 1, ...q, issues: validate(q) }));
}
async function main() {
  const wordBank = await getJson('/api/games/word-bank?stage=c1-advanced');
  const bank = Array.isArray(wordBank.data) ? wordBank.data : [];
  if (bank.length < 20) throw new Error(`Playable word bank too small from API: ${bank.length}`);
  const questions = buildQuestions(bank);
  const mc = await getJson('/api/games/multiple-choice');
  const tf = await getJson('/api/games/true-false');
  const contentIssues = [];
  for (const [type, payload] of [['multiple-choice', mc.data], ['true-false', tf.data]]) {
    for (const [level, list] of Object.entries(payload || {})) {
      for (const item of Array.isArray(list) ? list : []) {
        const text = JSON.stringify(item);
        if (hasMojibake(text)) contentIssues.push(`${type}:${level}:${item.id || '?'} mojibake`);
        if (type === 'multiple-choice' && (!Array.isArray(item.options) || !item.options.includes(item.answer))) contentIssues.push(`${type}:${level}:${item.id || '?'} answer not in options`);
      }
    }
  }
  const issueQuestions = questions.filter((q) => q.issues.length);
  const report = { baseUrl: BASE_URL, playableWords: bank.length, generatedQuestions: questions.length, questionIssues: issueQuestions.length, contentIssues, issueExamples: issueQuestions.slice(0, 25), sample: questions.slice(0, 25) };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'game-question-samples-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (issueQuestions.length || contentIssues.length) process.exit(1);
}
main().catch((error) => { console.error(error); process.exit(1); });