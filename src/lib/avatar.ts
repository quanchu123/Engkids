// Pure avatar / reward-shop module (no React).
//
// Kids unlock cute avatar items and accessories by reaching star thresholds.
// Unlocking is NON-DESTRUCTIVE: it never subtracts stars. Reaching the
// threshold simply makes an item available to own & equip, similar to how
// achievements work elsewhere in the app.

export type AvatarCategory = 'character' | 'hat' | 'pet' | 'frame';

export interface AvatarItem {
  id: string;
  nameVi: string;
  emoji: string;
  /** Optional colorful Icons8 PNG art (in /public/avatars). Falls back to emoji. */
  image?: string;
  category: AvatarCategory;
  requiredStars: number;
  tint: string;
}

export const AVATAR_CATEGORIES: AvatarCategory[] = ['character', 'hat', 'pet', 'frame'];

// At least 12 items spread across categories, with increasing requiredStars:
// 0, 0, 5, 10, 15, 20, 30, 40, 50, 75, 100, 150.
// The two requiredStars:0 items are the default character + default frame.
// Characters / pets / hats use real colorful Icons8 art; frames are colored rings.
export const AVATAR_ITEMS: AvatarItem[] = [
  // Defaults (free, requiredStars: 0)
  { id: 'char-fox', nameVi: 'Cáo nhỏ', emoji: '🦊', image: '/avatars/char-fox.png', category: 'character', requiredStars: 0, tint: '#fb923c' },
  { id: 'frame-cloud', nameVi: 'Khung mây', emoji: '☁️', category: 'frame', requiredStars: 0, tint: '#bae6fd' },

  // Unlockable items (increasing thresholds)
  { id: 'hat-party', nameVi: 'Nón sinh nhật', emoji: '🎉', image: '/avatars/hat-party.png', category: 'hat', requiredStars: 5, tint: '#f472b6' },
  { id: 'pet-cat', nameVi: 'Mèo con', emoji: '🐱', image: '/avatars/pet-cat.png', category: 'pet', requiredStars: 10, tint: '#fcd34d' },
  { id: 'char-panda', nameVi: 'Gấu trúc', emoji: '🐼', image: '/avatars/char-panda.png', category: 'character', requiredStars: 15, tint: '#a3a3a3' },
  { id: 'hat-crown', nameVi: 'Vương miện', emoji: '👑', image: '/avatars/hat-crown.png', category: 'hat', requiredStars: 20, tint: '#fbbf24' },
  { id: 'pet-dog', nameVi: 'Cún yêu', emoji: '🐶', image: '/avatars/pet-dog.png', category: 'pet', requiredStars: 30, tint: '#d6a06a' },
  { id: 'frame-star', nameVi: 'Khung ngôi sao', emoji: '🌟', category: 'frame', requiredStars: 40, tint: '#fde68a' },
  { id: 'char-unicorn', nameVi: 'Kỳ lân', emoji: '🦄', image: '/avatars/char-unicorn.png', category: 'character', requiredStars: 50, tint: '#c4b5fd' },
  { id: 'pet-dragon', nameVi: 'Rồng nhí', emoji: '🐉', image: '/avatars/pet-dragon.png', category: 'pet', requiredStars: 75, tint: '#86efac' },
  { id: 'hat-wizard', nameVi: 'Nón phù thủy', emoji: '🧙', image: '/avatars/hat-wizard.png', category: 'hat', requiredStars: 100, tint: '#818cf8' },
  { id: 'frame-rainbow', nameVi: 'Khung cầu vồng', emoji: '🌈', category: 'frame', requiredStars: 150, tint: '#f9a8d4' },
];

/** Find an item by id. */
export function getItem(id: string): AvatarItem | undefined {
  return AVATAR_ITEMS.find((item) => item.id === id);
}

/** All items in a category, ordered by requiredStars ascending. */
export function getItemsByCategory(cat: AvatarCategory): AvatarItem[] {
  return AVATAR_ITEMS.filter((item) => item.category === cat).sort(
    (a, b) => a.requiredStars - b.requiredStars,
  );
}

/** Threshold-based unlock check (non-destructive). */
export function isUnlocked(item: AvatarItem, totalStars: number): boolean {
  return totalStars >= item.requiredStars;
}

export interface EquippedAvatar {
  character: string;
  hat?: string;
  pet?: string;
  frame: string;
}

/**
 * The default equipped loadout: the requiredStars:0 character & frame.
 * Hat and pet start empty (no accessory equipped).
 */
export function getDefaultEquipped(): EquippedAvatar {
  const defaultCharacter = AVATAR_ITEMS.find(
    (item) => item.category === 'character' && item.requiredStars === 0,
  );
  const defaultFrame = AVATAR_ITEMS.find(
    (item) => item.category === 'frame' && item.requiredStars === 0,
  );

  return {
    character: defaultCharacter?.id ?? 'char-fox',
    frame: defaultFrame?.id ?? 'frame-cloud',
  };
}
