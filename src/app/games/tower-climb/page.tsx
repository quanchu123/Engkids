'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { DEFAULT_WORD_BANK, loadWordBank, toWrongQuestions } from '@/lib/word-bank';

/* ═══════ TYPES ═══════ */
interface Player { x: number; y: number; vx: number; vy: number; facing: 1 | -1; frame: number; squash: number }
interface Plat {
  x: number; y: number; w: number;
  kind: 'norm' | 'word' | 'spring' | 'move' | 'cloud';
  word?: string; correct?: boolean;
  dir?: number; range?: number; ox?: number;
  broken?: boolean; breakT?: number; bounce?: number;
}
interface Pt { x: number; y: number; vx: number; vy: number; life: number; ml: number; c: string; s: number }
interface Pop { x: number; y: number; t: string; c: string; l: number }
interface WQ { vi: string; en: string; wrong: string[] }
interface GS {
  p: Player; plats: Plat[]; pts: Pt[]; pops: Pop[];
  cam: number; sc: number; combo: number; maxH: number;
  curW: WQ | null; nxtIn: number;
  keys: { l: boolean; r: boolean };
  shake: number; dead: boolean; fr: number;
}

/* ═══════ CONSTANTS ═══════ */
const W = 400, H = 700, PH = 14, GR = 0.48, JV = 12.5, SV = 18.5, SPD = 5.2, CW = 22;

/* ═══════ VOCABULARY (defaults; replaced by the shared word bank on mount) ═══════ */
let VOC: WQ[] = toWrongQuestions(DEFAULT_WORD_BANK);

/* ═══════ HELPERS ═══════ */
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
}
const lr = (a: number, b: number, t: number) => a + (b - a) * t;
const rn = (a: number, b: number) => Math.random() * (b - a) + a;
const ri = (a: number, b: number) => Math.floor(rn(a, b + 1));
function shuf<T>(a: T[]): T[] {
  const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = ri(0, i); [r[i], r[j]] = [r[j], r[i]]; } return r;
}
function toSY(wy: number, cam: number) { return H - (wy - cam); }
function lc(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number) {
  return `rgb(${Math.round(lr(r1, r2, t))},${Math.round(lr(g1, g2, t))},${Math.round(lr(b1, b2, t))})`;
}
function mkPts(x: number, y: number, c: string, n: number, sprd: number, spd: number): Pt[] {
  const r: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rn(0, Math.PI * 2), v = rn(spd * 0.3, spd);
    r.push({ x, y, vx: Math.cos(a) * v * sprd, vy: Math.sin(a) * v - 2, life: rn(20, 40), ml: 40, c, s: rn(2, 5) });
  }
  return r;
}

/* ═══════ SOUND ═══════ */
let _ac: AudioContext | null = null;
function snd(t: 'j' | 's' | 'ok' | 'no' | 'ov') {
  try {
    if (!_ac) _ac = new AudioContext();
    const o = _ac.createOscillator(), g = _ac.createGain();
    o.connect(g); g.connect(_ac.destination);
    const n = _ac.currentTime;
    switch (t) {
      case 'j':
        o.frequency.setValueAtTime(400, n); o.frequency.linearRampToValueAtTime(700, n + 0.07);
        g.gain.setValueAtTime(0.05, n); g.gain.linearRampToValueAtTime(0, n + 0.07);
        o.start(n); o.stop(n + 0.07); break;
      case 's':
        o.frequency.setValueAtTime(300, n); o.frequency.linearRampToValueAtTime(1200, n + 0.12);
        g.gain.setValueAtTime(0.07, n); g.gain.linearRampToValueAtTime(0, n + 0.12);
        o.start(n); o.stop(n + 0.12); break;
      case 'ok':
        o.type = 'triangle';
        o.frequency.setValueAtTime(523, n); o.frequency.setValueAtTime(659, n + 0.07); o.frequency.setValueAtTime(784, n + 0.14);
        g.gain.setValueAtTime(0.08, n); g.gain.linearRampToValueAtTime(0, n + 0.22);
        o.start(n); o.stop(n + 0.22); break;
      case 'no':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, n); o.frequency.linearRampToValueAtTime(100, n + 0.18);
        g.gain.setValueAtTime(0.05, n); g.gain.linearRampToValueAtTime(0, n + 0.18);
        o.start(n); o.stop(n + 0.18); break;
      case 'ov':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(400, n); o.frequency.linearRampToValueAtTime(80, n + 0.4);
        g.gain.setValueAtTime(0.08, n); g.gain.linearRampToValueAtTime(0, n + 0.4);
        o.start(n); o.stop(n + 0.4); break;
    }
  } catch { /* silent */ }
}

/* ═══════════════════ COMPONENT ═══════════════════ */
export default function TowerClimbPage() {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'menu' | 'play' | 'over'>('menu');
  const [fScore, setFS] = useState(0);
  const [hi, setHi] = useState(0);
  const raf = useRef(0);
  const gRef = useRef<GS | null>(null);
  const phRef = useRef<'menu' | 'play' | 'over'>('menu');
  const hiRef = useRef(0);

  useEffect(() => {
    try { const s = localStorage.getItem('tc-hi'); if (s) { const v = parseInt(s); setHi(v); hiRef.current = v; } } catch { /* ok */ }
  }, []);

  const startGame = useCallback(() => {
    const plats: Plat[] = [];
    for (let i = 0; i < 12; i++) {
      const w = rn(70, 105);
      const pk: Plat['kind'] = i < 3 ? 'norm' : rn(0, 1) < 0.08 ? 'spring' : rn(0, 1) < 0.1 ? 'move' : 'norm';
      const pl: Plat = { x: i === 0 ? W / 2 - w / 2 : rn(10, W - w - 10), y: 80 + i * rn(45, 68), w, kind: pk };
      if (pk === 'move') { pl.dir = 1; pl.range = rn(30, 60); pl.ox = pl.x; }
      plats.push(pl);
    }
    gRef.current = {
      p: { x: plats[0].x + plats[0].w / 2, y: plats[0].y + PH + 1, vx: 0, vy: 0, facing: 1, frame: 0, squash: 1 },
      plats, pts: [], pops: [], cam: 0, sc: 0, combo: 0, maxH: 0,
      curW: VOC[ri(0, VOC.length - 1)], nxtIn: 4,
      keys: { l: false, r: false }, shake: 0, dead: false, fr: 0,
    };
    phRef.current = 'play';
    setPhase('play');
  }, []);

  /* ══ Load the shared word bank for the climbing word rows ══ */
  useEffect(() => {
    let active = true;
    loadWordBank().then((bank) => {
      if (active) VOC = toWrongQuestions(bank);
    });
    return () => { active = false; };
  }, []);

  /* ══ MAIN EFFECT: canvas loop + input ══ */
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext('2d')!;

    /* ── KEY / TOUCH ── */
    const kd = (e: KeyboardEvent) => {
      const g = gRef.current; if (!g) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { g.keys.l = true; e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'd') { g.keys.r = true; e.preventDefault(); }
    };
    const ku = (e: KeyboardEvent) => {
      const g = gRef.current; if (!g) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') g.keys.l = false;
      if (e.key === 'ArrowRight' || e.key === 'd') g.keys.r = false;
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const g = gRef.current; if (!g) return;
      const r = c.getBoundingClientRect();
      g.keys.l = false; g.keys.r = false;
      for (let i = 0; i < e.touches.length; i++) {
        const tx = (e.touches[i].clientX - r.left) / r.width;
        if (tx < 0.4) g.keys.l = true;
        else if (tx > 0.6) g.keys.r = true;
      }
    };
    const touchEnd = () => {
      const g = gRef.current; if (!g) return;
      g.keys.l = false; g.keys.r = false;
    };
    document.addEventListener('keydown', kd);
    document.addEventListener('keyup', ku);
    c.addEventListener('touchstart', handleTouch, { passive: false });
    c.addEventListener('touchmove', handleTouch, { passive: false });
    c.addEventListener('touchend', touchEnd);

    /* ── DRAW: background ── */
    function drawBg(maxH: number) {
      const t = Math.min(maxH / 8000, 1);
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      if (t < 0.3) {
        gr.addColorStop(0, lc(135, 206, 235, 255, 126, 95, t / 0.3));
        gr.addColorStop(1, lc(200, 240, 250, 255, 200, 100, t / 0.3));
      } else if (t < 0.6) {
        const p = (t - 0.3) / 0.3;
        gr.addColorStop(0, lc(255, 126, 95, 25, 15, 60, p));
        gr.addColorStop(1, lc(255, 200, 100, 80, 40, 100, p));
      } else {
        const p = (t - 0.6) / 0.4;
        gr.addColorStop(0, lc(25, 15, 60, 8, 5, 22, p));
        gr.addColorStop(1, lc(80, 40, 100, 18, 12, 50, p));
      }
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      // Stars
      if (t > 0.35) {
        const sa = Math.min((t - 0.35) / 0.15, 1);
        for (let i = 0; i < 50; i++) {
          const sx = (i * 97 + 31) % W, ssy = (i * 131 + 17) % H;
          ctx.globalAlpha = sa * (Math.sin(Date.now() * 0.002 + i * 1.7) * 0.3 + 0.6);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, ssy, 0.8 + (i % 3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // Clouds
      if (t < 0.55) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - t / 0.55) * 0.18})`;
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 139 + 50) % (W + 80)) - 40;
          const cy = ((maxH * 0.06 + i * 200) % (H + 60)) - 30;
          ctx.beginPath();
          ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.arc(cx + 16, cy - 5, 16, 0, Math.PI * 2);
          ctx.arc(cx + 32, cy, 18, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    /* ── DRAW: character ── */
    function drawChar(p: Player, cam: number) {
      const px = p.x, py = toSY(p.y, cam);
      ctx.save();
      ctx.translate(px, py);
      const scX = 1 + (1 - p.squash) * 0.5;
      ctx.scale(scX * p.facing, p.squash);

      const f = p.frame;
      const run = Math.abs(p.vx) > 1;
      const la = run ? Math.sin(f * 0.35) * 5 : 0;
      const goUp = p.vy > 3;
      const bw = Math.sin(f * 0.1) * 4;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(0, 3, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

      // Cape
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(-4, -10);
      ctx.quadraticCurveTo(-13 + bw, -2, -11 + bw * 0.6, 10);
      ctx.quadraticCurveTo(-7, 6, -3, -8);
      ctx.closePath(); ctx.fill();

      // Legs
      ctx.fillStyle = '#2c3e50';
      rrect(ctx, -7, -16 + la * 0.4, 6, 13, 2); ctx.fill();
      ctx.fillStyle = '#e74c3c';
      rrect(ctx, -8, -4 + la * 0.4, 8, 4, 2); ctx.fill();
      ctx.fillStyle = '#34495e';
      rrect(ctx, 1, -16 - la * 0.4, 6, 13, 2); ctx.fill();
      ctx.fillStyle = '#c0392b';
      rrect(ctx, 0, -4 - la * 0.4, 8, 4, 2); ctx.fill();

      // Body
      ctx.fillStyle = '#3498db';
      rrect(ctx, -9, -28, 18, 16, 3); ctx.fill();
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(-1, -28, 2, 16);
      ctx.fillStyle = '#f39c12'; ctx.fillRect(-9, -14, 18, 3);
      ctx.fillStyle = '#f1c40f'; rrect(ctx, -3, -15, 6, 5, 1); ctx.fill();

      // Arms
      const armOff = goUp ? -4 : 0;
      ctx.save(); ctx.translate(-9, -25); ctx.rotate(-0.3 + Math.sin(f * 0.18) * 0.15);
      ctx.fillStyle = '#3498db'; rrect(ctx, -4, 0, 5, 11 + armOff, 2); ctx.fill();
      ctx.fillStyle = '#ffd5ba'; ctx.beginPath(); ctx.arc(-1.5, 12 + armOff, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.translate(9, -25); ctx.rotate(0.3 - Math.sin(f * 0.18) * 0.15);
      ctx.fillStyle = '#2980b9'; rrect(ctx, -1, 0, 5, 11 + armOff, 2); ctx.fill();
      ctx.fillStyle = '#ffd5ba'; ctx.beginPath(); ctx.arc(1.5, 12 + armOff, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Head
      ctx.fillStyle = '#ffd5ba'; ctx.beginPath(); ctx.arc(0, -36, 11, 0, Math.PI * 2); ctx.fill();
      // Hair
      ctx.fillStyle = '#4a6fa5';
      ctx.beginPath(); ctx.arc(0, -40, 11, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const hx = -6 + i * 4, hw = Math.sin(f * 0.08 + i) * 1.5;
        ctx.beginPath(); ctx.moveTo(hx - 2.5, -40); ctx.lineTo(hx + hw, -48 - i * 1.2); ctx.lineTo(hx + 2.5, -40); ctx.fill();
      }
      // Headband
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(-12, -40, 24, 3);
      const bnd = Math.sin(f * 0.12) * 3;
      ctx.beginPath(); ctx.moveTo(-12, -40);
      ctx.quadraticCurveTo(-16 + bnd, -36, -14 + bnd, -32);
      ctx.quadraticCurveTo(-15, -36, -12, -37); ctx.fill();

      // Face
      const blink = f % 200 > 195 ? 0.15 : 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(-4, -37, 3.5, 4 * blink, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -37, 3.5, 4 * blink, 0, 0, Math.PI * 2); ctx.fill();
      if (blink > 0.5) {
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath(); ctx.arc(-3.5, -36.5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4.5, -36.5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(-3.5, -36.5, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4.5, -36.5, 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-2.5, -38, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(5.5, -38, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      // Mouth
      ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.2; ctx.beginPath();
      if (goUp) { ctx.arc(0, -31, 2.5, 0, Math.PI); ctx.stroke(); ctx.fillStyle = '#e74c3c'; ctx.fill(); }
      else if (p.vy < -3) { ctx.arc(0, -31, 2, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.arc(0, -33, 3, 0.2, Math.PI - 0.2); ctx.stroke(); }
      // Blush
      ctx.fillStyle = 'rgba(255,150,150,0.25)';
      ctx.beginPath(); ctx.ellipse(-8, -34, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -34, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    /* ── DRAW: platform ── */
    function drawPlat(pl: Plat, cam: number) {
      if (pl.broken) return;
      const psy = toSY(pl.y + PH, cam);
      if (psy < -30 || psy > H + 30) return;
      const bAn = pl.bounce ? Math.sin(pl.bounce * Math.PI) * 3 : 0;

      ctx.save();
      if (pl.breakT !== undefined && pl.breakT < 1) {
        ctx.globalAlpha = Math.max(0, pl.breakT);
        ctx.translate(rn(-2, 2), rn(-1, 1));
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath(); ctx.ellipse(pl.x + pl.w / 2, psy + PH + 3, pl.w * 0.35, 2.5, 0, 0, Math.PI * 2); ctx.fill();

      // Colors
      let c1 = '#4ade80', c2 = '#22c55e';
      if (pl.kind === 'word') { c1 = '#a78bfa'; c2 = '#7c3aed'; }
      else if (pl.kind === 'spring') { c1 = '#fbbf24'; c2 = '#f59e0b'; }
      else if (pl.kind === 'move') { c1 = '#60a5fa'; c2 = '#3b82f6'; }
      else if (pl.kind === 'cloud') { c1 = 'rgba(255,255,255,0.7)'; c2 = 'rgba(220,235,255,0.5)'; }

      const gr = ctx.createLinearGradient(0, psy - bAn, 0, psy + PH);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      ctx.fillStyle = gr;
      rrect(ctx, pl.x, psy - bAn, pl.w, PH + bAn, 6); ctx.fill();

      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      rrect(ctx, pl.x + 3, psy - bAn + 2, pl.w - 6, 4, 3); ctx.fill();

      // Spring coil
      if (pl.kind === 'spring') {
        const sh = bAn > 1 ? -14 : -8;
        ctx.strokeStyle = '#92400e'; ctx.lineWidth = 2; ctx.beginPath();
        const cx = pl.x + pl.w / 2;
        for (let i = 0; i <= 5; i++) {
          const sx = cx - 8 + i * 3.2, ssy = psy - bAn + (i % 2 === 0 ? sh : sh * 0.4);
          if (i === 0) ctx.moveTo(sx, ssy); else ctx.lineTo(sx, ssy);
        }
        ctx.stroke();
      }

      // Word text
      if (pl.kind === 'word' && pl.word) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pl.word, pl.x + pl.w / 2, psy + PH / 2 - bAn * 0.5);
      }

      // Move arrows
      if (pl.kind === 'move') {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('◄►', pl.x + pl.w / 2, psy + PH / 2 - bAn * 0.5);
      }

      ctx.restore();
    }

    /* ── UPDATE ── */
    function update(g: GS) {
      if (g.dead) return;
      g.fr++;
      const p = g.p;
      p.frame++;

      // Input
      if (g.keys.l) { p.vx = -SPD; p.facing = -1; }
      else if (g.keys.r) { p.vx = SPD; p.facing = 1; }
      else p.vx *= 0.82;

      // Physics
      p.vy -= GR;
      p.y += p.vy;
      p.x += p.vx;

      // Wrap
      if (p.x < -CW) p.x = W + CW;
      if (p.x > W + CW) p.x = -CW;

      // Squash recovery
      p.squash = lr(p.squash, 1, 0.12);

      // Collision (falling only)
      if (p.vy < 0) {
        for (const pl of g.plats) {
          if (pl.broken) continue;
          const pt = pl.y + PH;
          if (p.y <= pt && p.y >= pl.y - 3 && p.x >= pl.x - 6 && p.x <= pl.x + pl.w + 6) {
            p.y = pt;
            if (pl.kind === 'spring') {
              p.vy = SV; p.squash = 0.55; pl.bounce = 1; snd('s');
            } else if (pl.kind === 'cloud') {
              p.vy = JV; p.squash = 0.7; pl.breakT = 1; snd('j');
            } else {
              p.vy = JV; p.squash = 0.7; pl.bounce = 1; snd('j');
            }

            // Dust particles
            g.pts.push(...mkPts(p.x, toSY(p.y, g.cam), 'rgba(200,200,200,0.6)', 4, 1.5, 1.5));

            // Word check
            if (pl.kind === 'word' && g.curW) {
              if (pl.correct) {
                g.combo++;
                const bonus = 100 * Math.min(g.combo, 5);
                g.sc += bonus;
                g.pops.push({ x: p.x, y: p.y + 25, t: `+${bonus} ✓`, c: '#fbbf24', l: 50 });
                g.pts.push(...mkPts(p.x, toSY(p.y, g.cam), '#fbbf24', 15, 1.5, 3));
                g.pts.push(...mkPts(p.x, toSY(p.y, g.cam), '#fff', 8, 1, 2));
                g.shake = 4;
                snd('ok');
                g.curW = VOC[ri(0, VOC.length - 1)];
                g.nxtIn = ri(3, 5);
              } else {
                g.combo = 0;
                g.sc = Math.max(0, g.sc - 15);
                g.pops.push({ x: p.x, y: p.y + 25, t: '✗ Sai!', c: '#ef4444', l: 40 });
                g.pts.push(...mkPts(p.x, toSY(p.y, g.cam), '#ef4444', 8, 1, 2));
                pl.breakT = 0.8;
                snd('no');
              }
            }
            g.sc += 5;
            break;
          }
        }
      }

      // Moving platforms
      for (const pl of g.plats) {
        if (pl.kind === 'move' && pl.ox !== undefined && pl.dir !== undefined && pl.range !== undefined) {
          pl.x += pl.dir * 1.2;
          if (pl.x > pl.ox + pl.range || pl.x < pl.ox - pl.range) pl.dir! *= -1;
        }
        if (pl.bounce && pl.bounce > 0) pl.bounce = Math.max(0, pl.bounce - 0.06);
        if (pl.breakT !== undefined && pl.breakT > 0) pl.breakT -= 0.025;
        if (pl.breakT !== undefined && pl.breakT <= 0) pl.broken = true;
      }

      // Camera
      const tCam = p.y - H * 0.4;
      if (tCam > g.cam) g.cam = lr(g.cam, tCam, 0.08);

      // Track max height
      if (p.y > g.maxH) g.maxH = p.y;

      // Generate platforms above
      let topPlatY = 0;
      for (const pl of g.plats) if (pl.y > topPlatY) topPlatY = pl.y;

      while (topPlatY < g.cam + H + 300) {
        g.nxtIn--;
        if (g.nxtIn <= 0 && g.curW) {
          // Word row
          const words = shuf([g.curW.en, ...g.curW.wrong.slice(0, 2)]);
          const pw = 82, gap = (W - 3 * pw) / 4;
          const baseY = topPlatY + rn(55, 78);
          for (let i = 0; i < 3; i++) {
            g.plats.push({
              x: gap + i * (pw + gap), y: baseY + rn(-5, 5), w: pw,
              kind: 'word', word: words[i], correct: words[i] === g.curW!.en,
            });
          }
          topPlatY = baseY + 10;
          g.nxtIn = ri(4, 6);
        } else {
          const diff = Math.min(g.maxH / 6000, 1);
          const w = rn(60 - diff * 15, 105 - diff * 20);
          const gapY = rn(45 + diff * 12, 72 + diff * 18);
          const r = Math.random();
          const pk: Plat['kind'] = r < 0.06 + diff * 0.03 ? 'spring'
            : r < 0.12 + diff * 0.06 ? 'move'
            : r < 0.16 + diff * 0.04 ? 'cloud' : 'norm';
          const newY = topPlatY + gapY;
          const pl: Plat = { x: rn(10, W - w - 10), y: newY, w, kind: pk };
          if (pk === 'move') { pl.dir = 1; pl.range = rn(25, 60); pl.ox = pl.x; }
          g.plats.push(pl);
          topPlatY = newY;
        }
      }

      // Remove old
      g.plats = g.plats.filter(pl => pl.y > g.cam - 80);

      // Particles
      g.pts = g.pts.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.08; pt.life--; return pt.life > 0; });
      // Popups
      g.pops = g.pops.filter(pp => { pp.y += 0.5; pp.l--; return pp.l > 0; });
      // Shake
      if (g.shake > 0) g.shake *= 0.85;

      // Game over
      if (toSY(p.y, g.cam) > H + 60) {
        g.dead = true;
        snd('ov');
        setFS(g.sc);
        const currentHi = hiRef.current;
        if (g.sc > currentHi) {
          setHi(g.sc);
          hiRef.current = g.sc;
          try { localStorage.setItem('tc-hi', String(g.sc)); } catch { /* ok */ }
        }
        phRef.current = 'over';
        setPhase('over');
      }
    }

    /* ── RENDER LOOP ── */
    function render() {
      const g = gRef.current;

      if (phRef.current === 'menu' || !g) {
        const gr = ctx.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#87CEEB'); gr.addColorStop(1, '#B0E0E6');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        // Decorative platforms
        ctx.fillStyle = '#4ade80';
        rrect(ctx, 50, 500, 90, PH, 6); ctx.fill();
        rrect(ctx, 200, 420, 80, PH, 6); ctx.fill();
        rrect(ctx, 130, 340, 100, PH, 6); ctx.fill();
        rrect(ctx, 260, 260, 85, PH, 6); ctx.fill();
        // Menu character preview
        const menuP: Player = { x: 180, y: 0, vx: 0, vy: 0, facing: 1, frame: Math.floor(Date.now() / 30), squash: 1 };
        ctx.save(); ctx.translate(0, 0);
        const tmpCam = -325;
        drawChar(menuP, tmpCam);
        ctx.restore();
      } else {
        ctx.save();
        if (g.shake > 0.5) ctx.translate(rn(-g.shake, g.shake), rn(-g.shake, g.shake));

        drawBg(g.maxH);

        // Platforms
        for (const pl of g.plats) drawPlat(pl, g.cam);

        // Character trail
        if (Math.abs(g.p.vx) > 2 || Math.abs(g.p.vy) > 5) {
          const ta = Math.min((Math.abs(g.p.vx) + Math.abs(g.p.vy)) * 0.02, 0.25);
          ctx.fillStyle = `rgba(168,85,247,${ta})`;
          ctx.beginPath(); ctx.arc(g.p.x - g.p.vx * 2, toSY(g.p.y - g.p.vy * 1.5, g.cam), 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(g.p.x - g.p.vx * 4, toSY(g.p.y - g.p.vy * 3, g.cam), 2.5, 0, Math.PI * 2); ctx.fill();
        }

        // Character
        drawChar(g.p, g.cam);

        // Particles
        for (const pt of g.pts) {
          ctx.globalAlpha = pt.life / pt.ml;
          ctx.fillStyle = pt.c;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s * (pt.life / pt.ml), 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Popups
        for (const pp of g.pops) {
          ctx.globalAlpha = Math.min(pp.l / 12, 1);
          ctx.fillStyle = pp.c; ctx.font = 'bold 16px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(pp.t, pp.x, toSY(pp.y, g.cam));
        }
        ctx.globalAlpha = 1;

        // ── HUD ──
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        rrect(ctx, 10, 10, 100, 30, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(`SC ${g.sc}`, 20, 29);

        const hm = Math.floor(g.maxH / 10);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        rrect(ctx, W - 90, 10, 80, 30, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
        ctx.fillText(`HT ${hm}m`, W - 18, 29);

        if (g.combo > 1) {
          ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
          const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.05;
          ctx.save(); ctx.translate(W / 2, 28); ctx.scale(pulse, pulse);
          ctx.fillText(`x${g.combo}`, 0, 0);
          ctx.restore();
        }

        if (g.curW) {
          const ww = 210;
          ctx.fillStyle = 'rgba(124,58,237,0.85)';
          rrect(ctx, W / 2 - ww / 2, 48, ww, 30, 10); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          rrect(ctx, W / 2 - ww / 2 + 3, 50, ww - 6, 10, 5); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(`"${g.curW.vi}" = ?`, W / 2, 67);
        }

        // Touch zone hints
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, H - 70, W * 0.38, 70);
        ctx.fillRect(W * 0.62, H - 70, W * 0.38, 70);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.font = '16px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('◄', W * 0.19, H - 30);
        ctx.fillText('►', W * 0.81, H - 30);

        ctx.restore();

        // Update
        if (!g.dead) update(g);
      }

      raf.current = requestAnimationFrame(render);
    }

    raf.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf.current);
      document.removeEventListener('keydown', kd);
      document.removeEventListener('keyup', ku);
      c.removeEventListener('touchstart', handleTouch);
      c.removeEventListener('touchmove', handleTouch);
      c.removeEventListener('touchend', touchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 40%, #111827 100%)' }}>

      <Link href="/games"
        className="absolute top-4 left-4 z-30 flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
        ← Games
      </Link>

      <div className="relative" style={{ maxWidth: 400, width: '100%' }}>
        <canvas ref={cvs} width={W} height={H}
          className="w-full rounded-2xl border border-white/10"
          style={{ aspectRatio: `${W}/${H}`, boxShadow: '0 0 60px rgba(168,85,247,0.15)' }}
        />

        {/* MENU */}
        {phase === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-2xl backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3 font-black text-violet-300">TC</div>
              <h1 className="text-3xl font-black text-white mb-1"
                style={{ textShadow: '0 0 20px rgba(168,85,247,0.6), 0 2px 10px rgba(0,0,0,0.5)' }}>
                TOWER CLIMB
              </h1>
              <p className="text-white/50 text-sm">Leo tháp học từ vựng Anh ngữ!</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 mb-5 text-white/70 text-xs space-y-1.5 border border-white/10 max-w-[280px]">
              <p>Di chuyển: <b className="text-white/90">← →</b> hoặc <b className="text-white/90">chạm trái/phải</b></p>
              <p>Nhân vật <b className="text-white/90">tự nhảy</b> khi chạm bậc</p>
              <p>Nhảy vào bậc có <b className="text-white/90">từ đúng</b> để ghi điểm</p>
              <p>Bậc vàng = <b className="text-white/90">siêu nhảy</b></p>
            </div>
            {hi > 0 && <p className="text-yellow-400/80 text-xs font-bold mb-3">Kỷ lục: {hi}</p>}
            <button onClick={startGame}
              className="px-8 py-3 rounded-full font-black text-white text-lg transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}>
              BẮT ĐẦU
            </button>
          </div>
        )}

        {/* GAME OVER */}
        {phase === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl backdrop-blur-sm">
            <div className="text-4xl mb-3 font-black text-red-400">LOSE</div>
            <h2 className="text-3xl font-black text-white mb-1"
              style={{ textShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
              GAME OVER
            </h2>
            <p className="text-white/40 text-sm mb-5">Đừng bỏ cuộc! Thử lại nào!</p>
            <div className="bg-white/10 rounded-xl p-4 mb-5 border border-white/10 text-center min-w-[200px]">
              <p className="text-white/50 text-xs mb-1">Điểm số</p>
              <p className="text-3xl font-black text-white mb-2">{fScore}</p>
              <p className="text-white/40 text-xs">Độ cao: {gRef.current ? Math.floor(gRef.current.maxH / 10) : 0}m</p>
              {fScore >= hi && fScore > 0 && <p className="text-yellow-400 text-xs font-bold mt-2">KY LUC MOI!</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={startGame}
                className="px-6 py-2.5 rounded-full font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', boxShadow: '0 4px 15px rgba(168,85,247,0.3)' }}>
                Chơi lại
              </button>
              <Link href="/games"
                className="px-6 py-2.5 rounded-full font-bold text-white/70 bg-white/10 border border-white/20 hover:bg-white/15 transition-all">
                Hub
              </Link>
            </div>
          </div>
        )}
      </div>
      <p className="text-white/20 text-[10px] mt-3">← → Arrow keys · A/D · Touch left/right</p>
    </div>
  );
}
