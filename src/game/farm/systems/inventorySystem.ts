// Inventory system for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports. Operates on the
// `inventory` slice of FarmState and returns new inventory objects
// (immutable-ish). These functions never throw; invalid operations are
// reported via `{ ok: false, reason }`.

import type { FarmState, InventoryItem } from '../types'

/** The inventory slice of FarmState: a bounded list of aggregated items. */
export type Inventory = FarmState['inventory']

/** Outcome of an inventory mutation. `inv` is unchanged when `ok` is false. */
export interface InventoryResult {
  ok: boolean
  reason?: string
  inv: Inventory
}

/** Compose the composite item id used to aggregate entries. */
function makeItemId(kind: InventoryItem['kind'], refId: string): string {
  return `${kind}:${refId}`
}

/** Find an inventory entry by its composite itemId. */
export function getItem(inv: Inventory, itemId: string): InventoryItem | undefined {
  return inv.items.find((it) => it.itemId === itemId)
}

/** True when every inventory slot is used (cannot accept a NEW itemId). */
export function isFull(inv: Inventory): boolean {
  return inv.items.length >= inv.slotLimit
}

/**
 * Add `qty` of an item to the inventory.
 *
 * - itemId is `${kind}:${refId}`.
 * - If an entry with the same itemId already exists, its qty is increased
 *   (this does NOT consume a new slot), even when the inventory is full.
 * - If the itemId is new AND all slots are used (items.length >= slotLimit),
 *   the add is rejected with `ok: false` and the inventory is left unchanged.
 * - qty must be a positive integer-ish value; non-positive qty is rejected.
 */
export function addItem(
  inv: Inventory,
  item: { kind: 'seed' | 'crop'; refId: string; qty: number },
): InventoryResult {
  if (!(item.qty > 0)) {
    return { ok: false, reason: 'Số lượng phải lớn hơn 0', inv }
  }

  const itemId = makeItemId(item.kind, item.refId)
  const existing = getItem(inv, itemId)

  if (existing) {
    // Aggregate into the existing slot — no new slot consumed.
    const items = inv.items.map((it) =>
      it.itemId === itemId ? { ...it, qty: it.qty + item.qty } : it,
    )
    return { ok: true, inv: { ...inv, items } }
  }

  // New itemId requires a free slot.
  if (isFull(inv)) {
    return { ok: false, reason: 'Kho đã đầy', inv }
  }

  const newItem: InventoryItem = {
    itemId,
    kind: item.kind,
    refId: item.refId,
    qty: item.qty,
  }
  return { ok: true, inv: { ...inv, items: [...inv.items, newItem] } }
}

/**
 * Remove `qty` of an item from the inventory.
 *
 * - If the item is not present, the operation is rejected (`ok: false`).
 * - The remaining qty never goes negative; if it would reach 0 or below, the
 *   slot is removed entirely (freeing it up).
 * - qty must be positive; non-positive qty is rejected.
 */
export function removeItem(inv: Inventory, itemId: string, qty: number): InventoryResult {
  if (!(qty > 0)) {
    return { ok: false, reason: 'Số lượng phải lớn hơn 0', inv }
  }

  const existing = getItem(inv, itemId)
  if (!existing) {
    return { ok: false, reason: 'Không có vật phẩm này', inv }
  }

  const remaining = existing.qty - qty
  if (remaining <= 0) {
    // Clamp at zero by dropping the slot entirely.
    const items = inv.items.filter((it) => it.itemId !== itemId)
    return { ok: true, inv: { ...inv, items } }
  }

  const items = inv.items.map((it) =>
    it.itemId === itemId ? { ...it, qty: remaining } : it,
  )
  return { ok: true, inv: { ...inv, items } }
}
