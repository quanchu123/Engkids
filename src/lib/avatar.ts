// Pure avatar / reward-shop module (no React).
//
// Kids unlock cute avatar items by reaching star thresholds. Unlocking is
// NON-DESTRUCTIVE: it never subtracts stars. Characters/pets/hats use real
// colorful Icons8 art (in /public/avatars); frames are colored rings.
// All art is original Icons8 (animals, dinosaurs, sea life, mythical
// creatures) — no copyrighted/branded characters.

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

const TINTS = [
  '#fb923c', '#f472b6', '#a3a3a3', '#fbbf24', '#c4b5fd', '#86efac', '#818cf8', '#fda4af',
  '#7dd3fc', '#fcd34d', '#5eead4', '#fca5a5', '#d8b4fe', '#bef264', '#67e8f9', '#f9a8d4',
];

// Ordered character list: [id, Vietnamese name]. The first entry (fox) is the
// free default (requiredStars 0); the rest get escalating thresholds.
const CHARACTER_DEFS: Array<[string, string]> = [
  ['char-fox', 'Cáo'],
  ['char-panda', 'Gấu trúc'],
  ['char-unicorn', 'Kỳ lân'],
  ['char-rabbit', 'Thỏ'],
  ['char-owl', 'Cú mèo'],
  ['char-penguin', 'Chim cánh cụt'],
  ['char-bear', 'Gấu'],
  ['char-monkey', 'Khỉ'],
  ['char-lion', 'Sư tử'],
  ['char-tiger', 'Hổ'],
  ['char-elephant', 'Voi'],
  ['char-giraffe', 'Hươu cao cổ'],
  ['char-zebra', 'Ngựa vằn'],
  ['char-deer', 'Hươu'],
  ['char-frog', 'Ếch'],
  ['char-turtle', 'Rùa'],
  ['char-duck', 'Vịt'],
  ['char-chick', 'Gà con'],
  ['char-pig', 'Heo'],
  ['char-cow', 'Bò'],
  ['char-sheep', 'Cừu'],
  ['char-horse', 'Ngựa'],
  ['char-mouse', 'Chuột'],
  ['char-squirrel', 'Sóc'],
  ['char-hedgehog', 'Nhím'],
  ['char-redpanda', 'Gấu trúc đỏ'],
  ['char-butterfly', 'Bướm'],
  ['char-bee', 'Ong'],
  ['char-ladybug', 'Bọ rùa'],
  ['char-snail', 'Ốc sên'],
  ['char-dolphin', 'Cá heo'],
  ['char-clownfish', 'Cá hề'],
  ['char-fish', 'Cá'],
  ['char-koi', 'Cá Koi'],
  ['char-seahorse', 'Cá ngựa'],
  ['char-starfish', 'Sao biển'],
  ['char-crab', 'Cua'],
  ['char-octopus', 'Bạch tuộc'],
  ['char-jellyfish', 'Sứa'],
  ['char-parrot', 'Vẹt'],
  ['char-flamingo', 'Hồng hạc'],
  ['char-peacock', 'Công'],
  ['char-swan', 'Thiên nga'],
  ['char-seagull', 'Mòng biển'],
  ['char-rooster', 'Gà trống'],
  ['char-kangaroo', 'Chuột túi'],
  ['char-hippo', 'Hà mã'],
  ['char-rhino', 'Tê giác'],
  ['char-crocodile', 'Cá sấu'],
  ['char-snake', 'Rắn'],
  ['char-chameleon', 'Tắc kè hoa'],
  ['char-sloth', 'Lười'],
  ['char-coati', 'Lửng'],
  ['char-wolf', 'Sói'],
  ['char-gorilla', 'Khỉ đột'],
  ['char-leopard', 'Báo'],
  ['char-camel', 'Lạc đà'],
  ['char-llama', 'Lạc đà Llama'],
  ['char-goat', 'Dê'],
  ['char-hamster', 'Chuột Hamster'],
  ['char-whale', 'Cá voi'],
  ['char-shark', 'Cá mập'],
  ['char-stingray', 'Cá đuối'],
  ['char-salmon', 'Cá hồi'],
  ['char-seal', 'Hải cẩu'],
  ['char-eagle', 'Đại bàng'],
  ['char-dino', 'Khủng long'],
  ['char-kawaii-dino', 'Khủng long nhí'],
  ['char-stegosaurus', 'Stegosaurus'],
  ['char-diplodocus', 'Khủng long cổ dài'],
  ['char-triceratops', 'Khủng long 3 sừng'],
  ['char-ankylosaurus', 'Khủng long giáp'],
  ['char-velociraptor', 'Raptor'],
  ['char-spinosaurus', 'Spinosaurus'],
  ['char-carnotaurus', 'Carnotaurus'],
  ['char-hadrosaur', 'Khủng long mỏ vịt'],
  ['char-pterodactyl', 'Thằn lằn bay'],
  ['char-dino-egg', 'Trứng khủng long'],
  ['char-tyrannosaur', 'Khủng long bạo chúa'],
  ['char-jackalope', 'Thỏ sừng'],
  ['char-narwhal', 'Kỳ lân biển'],
  ['char-ghost', 'Ma vui'],
  ['char-alien', 'Người ngoài hành tinh'],
  ['char-robot', 'Người máy'],
  ['char-fairy', 'Nàng tiên'],
  ['char-mermaid', 'Tiên cá'],
  ['char-genie', 'Thần đèn'],
  ['char-dragon-eu', 'Rồng châu Âu'],
  ['char-pegasus', 'Ngựa thần'],
  ['char-phoenix', 'Phượng hoàng'],
];

function buildCharacters(): AvatarItem[] {
  return CHARACTER_DEFS.map(([id, nameVi], index) => ({
    id,
    nameVi,
    emoji: '🐾',
    image: `/avatars/${id}.png`,
    category: 'character' as const,
    requiredStars: index === 0 ? 0 : index * 5,
    tint: TINTS[index % TINTS.length],
  }));
}

const ACCESSORIES: AvatarItem[] = [
  // Pets
  { id: 'pet-cat', nameVi: 'Mèo con', emoji: '🐱', image: '/avatars/pet-cat.png', category: 'pet', requiredStars: 10, tint: '#fcd34d' },
  { id: 'pet-dog', nameVi: 'Cún yêu', emoji: '🐶', image: '/avatars/pet-dog.png', category: 'pet', requiredStars: 30, tint: '#d6a06a' },
  { id: 'pet-dragon', nameVi: 'Rồng nhí', emoji: '🐉', image: '/avatars/pet-dragon.png', category: 'pet', requiredStars: 75, tint: '#86efac' },
  // Hats
  { id: 'hat-party', nameVi: 'Nón sinh nhật', emoji: '🎉', image: '/avatars/hat-party.png', category: 'hat', requiredStars: 5, tint: '#f472b6' },
  { id: 'hat-crown', nameVi: 'Vương miện', emoji: '👑', image: '/avatars/hat-crown.png', category: 'hat', requiredStars: 20, tint: '#fbbf24' },
  { id: 'hat-wizard', nameVi: 'Nón phù thủy', emoji: '🧙', image: '/avatars/hat-wizard.png', category: 'hat', requiredStars: 100, tint: '#818cf8' },
  // Frames (colored rings, no art)
  { id: 'frame-cloud', nameVi: 'Khung mây', emoji: '☁️', category: 'frame', requiredStars: 0, tint: '#bae6fd' },
  { id: 'frame-star', nameVi: 'Khung ngôi sao', emoji: '🌟', category: 'frame', requiredStars: 40, tint: '#fde68a' },
  { id: 'frame-rainbow', nameVi: 'Khung cầu vồng', emoji: '🌈', category: 'frame', requiredStars: 150, tint: '#f9a8d4' },
];

export const AVATAR_ITEMS: AvatarItem[] = [...buildCharacters(), ...ACCESSORIES];

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
