'use client';

import type { InventoryItem } from '@/game/farm/types';
import { getCropById } from '@/game/farm/data/crops';
import { FarmIcon } from './FarmIcon';

interface InventoryPanelProps {
  open: boolean;
  items: InventoryItem[];
  slotLimit: number;
  onClose: () => void;
}

/** English display name for an inventory item, derived from its crop type. */
function itemName(item: InventoryItem): string {
  const crop = getCropById(item.refId);
  const base = crop?.en ?? item.refId;
  return item.kind === 'seed' ? `${base} seed` : base;
}

/** Icon name + emoji fallback for an inventory item (crops use their own icon,
 *  seeds use the generic seed icon). */
function itemIcon(item: InventoryItem): { icon: string; emoji: string } {
  if (item.kind === 'seed') {
    return { icon: 'seed', emoji: '🌱' };
  }
  return { icon: item.refId, emoji: '🥕' };
}

/**
 * Modal panel showing the player's inventory as a grid of slots. Each slot
 * displays the farm icon (with emoji fallback), the English item name, and a
 * quantity badge. The header shows the used/limit slot count, and a friendly
 * empty state encourages the player to plant and harvest.
 */
export function InventoryPanel({ open, items, slotLimit, onClose }: InventoryPanelProps) {
  if (!open) return null;

  const used = items.length;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Kho đồ"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-emerald-50 to-amber-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-emerald-100 bg-white/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <FarmIcon name="basket" emoji="🧺" className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-black text-emerald-700">Kho đồ</h2>
              <p className="text-xs font-bold text-slate-500">
                Đã dùng {used}/{slotLimit} ô
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng kho đồ"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-lg font-black text-slate-600 transition-colors hover:bg-rose-200 hover:text-rose-600 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {used === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span aria-hidden="true" className="text-5xl">🧺</span>
              <p className="text-base font-black text-slate-600">Kho còn trống</p>
              <p className="text-sm font-semibold text-slate-400">
                Hãy gieo hạt và thu hoạch để có vật phẩm nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((item) => {
                const { icon, emoji } = itemIcon(item);
                return (
                  <div
                    key={item.itemId}
                    className="relative flex flex-col items-center gap-1 rounded-2xl border-2 border-emerald-200 bg-white p-2 shadow-sm"
                  >
                    <span className="absolute -right-1.5 -top-1.5 min-w-[22px] rounded-full bg-emerald-500 px-1.5 text-center text-xs font-black text-white shadow">
                      {item.qty}
                    </span>
                    <FarmIcon name={icon} emoji={emoji} className="h-10 w-10" />
                    <span className="line-clamp-2 text-center text-xs font-bold text-slate-600">
                      {itemName(item)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryPanel;
