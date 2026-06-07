'use client';

import { CROPS, getCropById, isCropUnlocked } from '@/game/farm/data/crops';
import type { FarmState } from '@/game/farm/types';
import { FarmIcon } from './FarmIcon';

interface FarmShopPanelProps {
  open: boolean;
  state: FarmState;
  onBuy: (cropId: string) => void;
  onSell: (cropId: string) => void;
  onClose: () => void;
}

/**
 * Cửa hàng nông trại: mua hạt (theo cấp/xu mở khóa) và bán nông sản trong kho.
 * Mua/bán đều đi qua economySystem ở page (giữ coins >= 0). Cây chưa mở khóa
 * hiển thị mờ kèm điều kiện.
 */
export function FarmShopPanel({ open, state, onBuy, onSell, onClose }: FarmShopPanelProps) {
  if (!open) return null;

  const crops = state.inventory.items.filter((i) => i.kind === 'crop' && i.qty > 0);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.7)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Cửa hàng"
    >
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-amber-50 to-emerald-50 shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3">
          <h2 className="text-lg font-black text-white drop-shadow">🛒 Cửa hàng</h2>
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-sm font-black text-amber-600">
            <FarmIcon name="coins" emoji="🪙" className="h-4 w-4" /> {state.coins}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Mua hạt */}
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-emerald-700">Mua hạt</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CROPS.map((crop) => {
              const unlocked = isCropUnlocked(crop, state.level, state.coins);
              const cost = crop.seedCost ?? 5;
              const canAfford = state.coins >= cost;
              return (
                <button
                  key={crop.id}
                  type="button"
                  disabled={!unlocked || !canAfford}
                  onClick={() => onBuy(crop.id)}
                  className={`flex items-center justify-between rounded-2xl border-2 px-3 py-2 text-left text-sm font-black transition-all ${
                    unlocked && canAfford
                      ? 'border-emerald-300 bg-white text-emerald-700 hover:-translate-y-0.5 hover:shadow-md active:scale-95'
                      : 'border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                  aria-label={`Mua hạt ${crop.en} giá ${cost} xu`}
                >
                  <span className="flex items-center gap-1.5">
                    <FarmIcon name={crop.id} emoji="🌱" className="h-5 w-5" />
                    <span className="flex flex-col leading-tight">
                      <span>{crop.en}</span>
                      <span className="text-[10px] font-bold text-slate-400">{crop.vi}</span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap">
                    {unlocked ? `🪙${cost}` : `🔒 Lv.${crop.unlock?.minLevel ?? ''}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bán nông sản */}
          <h3 className="mb-2 mt-5 text-sm font-black uppercase tracking-wide text-orange-700">Bán nông sản</h3>
          {crops.length === 0 ? (
            <p className="rounded-2xl bg-white/70 px-3 py-3 text-center text-sm font-semibold text-slate-400">
              Kho chưa có nông sản. Hãy thu hoạch trước nhé!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {crops.map((item) => {
                const crop = getCropById(item.refId);
                return (
                  <button
                    key={item.itemId}
                    type="button"
                    onClick={() => onSell(item.refId)}
                    className="flex items-center justify-between rounded-2xl border-2 border-orange-300 bg-white px-3 py-2 text-left text-sm font-black text-orange-700 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                    aria-label={`Bán ${crop?.en ?? item.refId} được ${crop?.sellValue ?? 0} xu`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FarmIcon name={item.refId} emoji="🥕" className="h-5 w-5" />
                      <span>{crop?.en ?? item.refId}</span>
                      <span className="text-xs font-bold opacity-70">×{item.qty}</span>
                    </span>
                    <span className="whitespace-nowrap">+🪙{crop?.sellValue ?? 0}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="m-4 rounded-2xl border-2 border-slate-300 bg-white py-3 text-base font-black text-slate-600 shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

export default FarmShopPanel;
