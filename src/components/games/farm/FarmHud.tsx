'use client';

import { FarmIcon } from './FarmIcon';

/** The four farm tools the player can select from the HUD. */
export type FarmTool = 'hoe' | 'seed' | 'water' | 'harvest';

interface ToolDef {
  id: FarmTool;
  /** Farm icon name (resolved via the icon manifest). */
  icon: string;
  /** Emoji fallback when no icon asset exists. */
  emoji: string;
  /** Vietnamese label for accessibility / tooltip. */
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: 'hoe', icon: 'hoe', emoji: '🪓', label: 'Cày đất' },
  { id: 'seed', icon: 'seed', emoji: '🌱', label: 'Gieo hạt' },
  { id: 'water', icon: 'watering-can', emoji: '💧', label: 'Tưới nước' },
  { id: 'harvest', icon: 'basket', emoji: '🧺', label: 'Thu hoạch' },
];

const TOOL_HINT: Record<FarmTool, string> = {
  hoe: 'Chạm ô trống để xới đất.',
  seed: 'Chọn hạt rồi chạm ô đã cày.',
  water: 'Chạm cây đã gieo để tưới.',
  harvest: 'Chạm cây chín để thu từ vựng.',
};

interface FarmHudProps {
  coins: number;
  xp: number;
  level: number;
  day: number;
  selectedTool: string;
  onSelectTool: (tool: string) => void;
  onNextDay: () => void;
  onOpenInventory: () => void;
  onOpenVocab: () => void;
}

/**
 * Top HUD bar for the farming game: coins, level/XP, current day, a tool
 * selector, and quick actions (next day, inventory, vocabulary). Styled in the
 * playful Engkids language and laid out to stay usable on mobile.
 *
 * The outer bar is `pointer-events-none` so it never blocks the Phaser canvas;
 * each interactive cluster re-enables pointer events on itself.
 */
export function FarmHud({
  coins,
  xp,
  level,
  day,
  selectedTool,
  onSelectTool,
  onNextDay,
  onOpenInventory,
  onOpenVocab,
}: FarmHudProps) {
  const activeTool = TOOLS.find((tool) => tool.id === selectedTool) ?? TOOLS[0];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-2 sm:p-3">
      {/* ── Stats + actions row ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Stats cluster */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Coins */}
          <div className="flex items-center gap-1.5 rounded-2xl border-2 border-amber-300 bg-white/95 px-3 py-1.5 shadow-md">
            <FarmIcon name="coin" emoji="🪙" className="h-6 w-6" />
            <span className="text-base font-black text-amber-600">{coins}</span>
          </div>

          {/* Level + XP */}
          <div className="flex items-center gap-1.5 rounded-2xl border-2 border-violet-300 bg-white/95 px-3 py-1.5 shadow-md">
            <FarmIcon name="star" emoji="⭐" className="h-6 w-6" />
            <span className="text-base font-black text-violet-600">Lv {level}</span>
            <span className="text-xs font-bold text-slate-400">·</span>
            <span className="text-sm font-bold text-slate-500">{xp} XP</span>
          </div>

          {/* Day */}
          <div className="flex items-center gap-1.5 rounded-2xl border-2 border-sky-300 bg-white/95 px-3 py-1.5 shadow-md">
            <span aria-hidden="true" className="text-lg">📅</span>
            <span className="text-base font-black text-sky-600">Ngày {day}</span>
          </div>
        </div>

        {/* Actions cluster */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenInventory}
            aria-label="Mở kho đồ"
            className="flex items-center gap-1.5 rounded-2xl border-2 border-emerald-300 bg-white/95 px-3 py-1.5 text-sm font-black text-emerald-600 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          >
            <FarmIcon name="basket" emoji="🧺" className="h-5 w-5" />
            <span className="hidden sm:inline">Kho đồ</span>
          </button>

          <button
            type="button"
            onClick={onOpenVocab}
            aria-label="Mở bộ sưu tập từ vựng"
            className="flex items-center gap-1.5 rounded-2xl border-2 border-pink-300 bg-white/95 px-3 py-1.5 text-sm font-black text-pink-600 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          >
            <span aria-hidden="true" className="text-base">📖</span>
            <span className="hidden sm:inline">Từ vựng</span>
          </button>

          <button
            type="button"
            onClick={onNextDay}
            aria-label="Sang ngày mới"
            className="flex items-center gap-1.5 rounded-2xl border-2 border-orange-400 px-4 py-1.5 text-sm font-black text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
          >
            <span aria-hidden="true" className="text-base">🌙</span>
            <span>Ngày mới</span>
          </button>
        </div>
      </div>

      {/* ── Tool selector ── */}
      <div className="pointer-events-auto flex max-w-[calc(100vw-1rem)] flex-wrap items-center gap-2 self-start rounded-3xl border-2 border-white/70 bg-white/90 p-1.5 shadow-md">
        {TOOLS.map((tool) => {
          const active = tool.id === selectedTool;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              aria-label={tool.label}
              aria-pressed={active}
              title={tool.label}
              className={`flex min-h-12 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-2 py-1 transition-all sm:min-w-[86px] ${
                active
                  ? 'scale-105 border-emerald-400 bg-gradient-to-br from-emerald-300 to-teal-400 shadow-lg'
                  : 'border-transparent bg-slate-100 hover:bg-slate-200 active:scale-95'
              }`}
            >
              <FarmIcon name={tool.icon} emoji={tool.emoji} className="h-6 w-6" />
              <span className={`text-[10px] font-black leading-none ${active ? 'text-white' : 'text-slate-600'}`}>
                {tool.label}
              </span>
            </button>
          );
        })}
        <div className="hidden max-w-[240px] rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 shadow-inner md:block">
          <span className="font-black">{activeTool.label}:</span> {TOOL_HINT[activeTool.id]}
        </div>
      </div>
    </div>
  );
}

export default FarmHud;
