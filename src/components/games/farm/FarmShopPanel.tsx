'use client';

import { useState } from 'react';
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
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');

  if (!open) return null;

  const crops = state.inventory.items.filter((i) => i.kind === 'crop' && i.qty > 0);
  const availableSeeds = CROPS.filter((crop) => isCropUnlocked(crop, state.level, state.coins));
  const lockedSeeds = CROPS.filter((crop) => !isCropUnlocked(crop, state.level, state.coins));

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.7)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Cửa hàng"
    >
      <div className="flex max-h-[84vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-amber-50 to-emerald-50 shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3">
          <div>
            <h2 className="text-lg font-black text-white drop-shadow">Cửa hàng nông trại</h2>
            <p className="text-xs font-bold text-white/85">Mua hạt để trồng, bán nông sản để lấy xu.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-sm font-black text-amber-600">
            {state.coins} xu
          </div>
        </div>

        <div className="border-b border-white/80 bg-white/65 p-2">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab('buy')}
              className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                tab === 'buy' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Mua hạt
            </button>
            <button
              type="button"
              onClick={() => setTab('sell')}
              className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                tab === 'sell' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              Bán nông sản
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'buy' ? (
            <>
              <div className="mb-3 rounded-2xl bg-white/75 px-3 py-2 text-xs font-bold text-slate-500">
                Gợi ý: mua 2-3 hạt, gieo vào ô đã cày, rồi tưới trước khi sang ngày mới.
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableSeeds.map((crop) => {
              const cost = crop.seedCost ?? 5;
              const canAfford = state.coins >= cost;
              return (
                <button
                  key={crop.id}
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuy(crop.id)}
                  className={`flex items-center justify-between rounded-2xl border-2 px-3 py-2 text-left text-sm font-black transition-all ${
                    canAfford
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
                    {cost} xu
                  </span>
                </button>
              );
            })}
              </div>
              {lockedSeeds.length > 0 && (
                <div className="mt-3 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                  Chưa mở: {lockedSeeds.map((crop) => `${crop.en} Lv.${crop.unlock?.minLevel ?? 1}`).join(', ')}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 rounded-2xl bg-white/75 px-3 py-2 text-xs font-bold text-slate-500">
                Bán cây đã thu hoạch để lấy xu mua thêm hạt. Từ vựng đã học vẫn nằm trong bộ sưu tập.
              </div>
              {crops.length === 0 ? (
                <p className="rounded-2xl bg-white/70 px-3 py-5 text-center text-sm font-semibold text-slate-400">
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
                        <span className="whitespace-nowrap">+{crop?.sellValue ?? 0} xu</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
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
