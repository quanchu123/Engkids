'use client';

import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { getItem, getDefaultEquipped, AvatarItem } from '@/lib/avatar';
import { getTodayDate } from '@/lib/progress';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, { box: number; character: number; accessory: number; ring: number }> = {
  sm: { box: 40, character: 26, accessory: 16, ring: 3 },
  md: { box: 110, character: 74, accessory: 40, ring: 5 },
  lg: { box: 180, character: 122, accessory: 64, ring: 8 },
};

/** Render an avatar piece as Icons8 art when available, else its emoji. */
function Art({ item, px }: { item: AvatarItem | undefined; px: number }) {
  if (!item) return null;
  if (item.image) {
    return (
      <Image
        src={item.image}
        alt={item.nameVi}
        width={px}
        height={px}
        style={{ width: px, height: px, objectFit: 'contain' }}
        unoptimized
      />
    );
  }
  return (
    <span style={{ fontSize: px * 0.8, lineHeight: 1 }} aria-hidden="true">
      {item.emoji}
    </span>
  );
}

/**
 * Pure visual avatar: the equipped character art inside a circular frame
 * (frame tint from the equipped frame item), with hat (top) and pet
 * (bottom-right) accessories overlaid when equipped.
 */
export default function AvatarDisplay({ size = 'md', showMood = false }: { size?: AvatarSize; showMood?: boolean }) {
  const equipped = useAppStore((state) => state.equippedAvatar);
  const lastActiveDate = useAppStore((state) => state.progress.lastActiveDate);
  const dims = SIZE_MAP[size];

  const character = getItem(equipped.character) ?? getItem(getDefaultEquipped().character);
  const frame = getItem(equipped.frame) ?? getItem(getDefaultEquipped().frame);
  const hat = equipped.hat ? getItem(equipped.hat) : undefined;
  const pet = equipped.pet ? getItem(equipped.pet) : undefined;

  const frameTint = frame?.tint ?? '#bae6fd';
  const activeToday = lastActiveDate === getTodayDate();

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: dims.box, height: dims.box }}
      aria-label="Hình đại diện"
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 22%, #ffffff 0%, ${frameTint} 78%)`,
          border: `${dims.ring}px solid ${frameTint}`,
          boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
        }}
      >
        <Art item={character} px={dims.character} />
      </div>

      {hat && (
        <span
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -dims.accessory * 0.42, lineHeight: 0 }}
          aria-hidden="true"
        >
          <Art item={hat} px={dims.accessory} />
        </span>
      )}

      {pet && (
        <span
          className="absolute"
          style={{ right: -dims.accessory * 0.18, bottom: -dims.accessory * 0.12, lineHeight: 0 }}
          aria-hidden="true"
        >
          <Art item={pet} px={dims.accessory} />
        </span>
      )}

      {showMood && (
        <span
          className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-xs shadow"
          aria-hidden="true"
          title={activeToday ? 'Đang vui vì học hôm nay!' : 'Học một chút để mình vui nhé!'}
        >
          {activeToday ? '✨' : '💤'}
        </span>
      )}
    </div>
  );
}
