'use client';

import { useAppStore } from '@/store/useAppStore';
import { getItem } from '@/lib/avatar';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<AvatarSize, { box: number; character: number; accessory: number; ring: number }> = {
  sm: { box: 40, character: 20, accessory: 14, ring: 3 },
  md: { box: 96, character: 48, accessory: 28, ring: 5 },
  lg: { box: 160, character: 84, accessory: 44, ring: 7 },
};

/**
 * Pure visual avatar: renders the equipped character emoji inside a circular
 * frame (frame tint from the equipped frame item), with hat (top) and pet
 * (bottom-right) accessory emoji overlaid when equipped.
 */
export default function AvatarDisplay({ size = 'md' }: { size?: AvatarSize }) {
  const equipped = useAppStore((state) => state.equippedAvatar);
  const dims = SIZE_MAP[size];

  const character = getItem(equipped.character);
  const frame = getItem(equipped.frame);
  const hat = equipped.hat ? getItem(equipped.hat) : undefined;
  const pet = equipped.pet ? getItem(equipped.pet) : undefined;

  const frameTint = frame?.tint ?? '#bae6fd';

  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center"
      style={{ width: dims.box, height: dims.box }}
      aria-label="Hình đại diện"
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 25%, #ffffff 0%, ${frameTint} 75%)`,
          border: `${dims.ring}px solid ${frameTint}`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        }}
      >
        <span style={{ fontSize: dims.character, lineHeight: 1 }} aria-hidden="true">
          {character?.emoji ?? '🦊'}
        </span>
      </div>

      {hat && (
        <span
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: -dims.accessory * 0.35, fontSize: dims.accessory, lineHeight: 1 }}
          aria-hidden="true"
        >
          {hat.emoji}
        </span>
      )}

      {pet && (
        <span
          className="absolute"
          style={{ right: -dims.accessory * 0.2, bottom: -dims.accessory * 0.15, fontSize: dims.accessory, lineHeight: 1 }}
          aria-hidden="true"
        >
          {pet.emoji}
        </span>
      )}
    </div>
  );
}
