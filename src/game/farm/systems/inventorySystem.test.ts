import { describe, it, expect } from 'vitest'
import { addItem, removeItem, getItem, isFull, type Inventory } from './inventorySystem'
import type { InventoryItem } from '../types'

// Property 4: Inventory invariants & slot limit
// Validates: Requirements 3.1, 3.5
//
// - Total qty never negative; removing more than present clamps/removes the slot.
// - Same itemId always aggregates (no duplicate slots) and does not consume
//   extra slots.
// - When items.length === slotLimit, adding a NEW itemId is rejected and state
//   is unchanged; adding qty to an EXISTING itemId still succeeds when full.

/** Build a fresh inventory with the given slot limit and items. */
function makeInv(slotLimit: number, items: InventoryItem[] = []): Inventory {
  return { slotLimit, items }
}

/** Deterministic pseudo-random generator (mulberry32) for property loops. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Total quantity across all slots. */
function totalQty(inv: Inventory): number {
  return inv.items.reduce((sum, it) => sum + it.qty, 0)
}

describe('inventorySystem — getItem & isFull', () => {
  it('getItem returns the matching entry or undefined', () => {
    const inv = makeInv(20, [
      { itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: 3 },
    ])
    expect(getItem(inv, 'seed:carrot')?.qty).toBe(3)
    expect(getItem(inv, 'crop:tomato')).toBeUndefined()
  })

  it('isFull is true exactly when used slots reach the limit', () => {
    expect(isFull(makeInv(2, []))).toBe(false)
    expect(
      isFull(
        makeInv(2, [{ itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: 1 }]),
      ),
    ).toBe(false)
    expect(
      isFull(
        makeInv(2, [
          { itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: 1 },
          { itemId: 'crop:tomato', kind: 'crop', refId: 'tomato', qty: 1 },
        ]),
      ),
    ).toBe(true)
  })
})

describe('inventorySystem — addItem', () => {
  it('adds a new item into a free slot', () => {
    const inv = makeInv(20)
    const res = addItem(inv, { kind: 'seed', refId: 'carrot', qty: 2 })
    expect(res.ok).toBe(true)
    expect(res.inv.items).toHaveLength(1)
    expect(res.inv.items[0]).toEqual({
      itemId: 'seed:carrot',
      kind: 'seed',
      refId: 'carrot',
      qty: 2,
    })
  })

  it('computes itemId as `${kind}:${refId}`', () => {
    const res = addItem(makeInv(20), { kind: 'crop', refId: 'pumpkin', qty: 1 })
    expect(res.inv.items[0].itemId).toBe('crop:pumpkin')
  })

  it('aggregates qty for an existing itemId without consuming a new slot', () => {
    let inv = makeInv(20)
    inv = addItem(inv, { kind: 'seed', refId: 'carrot', qty: 2 }).inv
    inv = addItem(inv, { kind: 'seed', refId: 'carrot', qty: 3 }).inv
    expect(inv.items).toHaveLength(1)
    expect(getItem(inv, 'seed:carrot')?.qty).toBe(5)
  })

  it('treats same refId but different kind as distinct slots', () => {
    let inv = makeInv(20)
    inv = addItem(inv, { kind: 'seed', refId: 'carrot', qty: 1 }).inv
    inv = addItem(inv, { kind: 'crop', refId: 'carrot', qty: 1 }).inv
    expect(inv.items).toHaveLength(2)
    expect(getItem(inv, 'seed:carrot')?.qty).toBe(1)
    expect(getItem(inv, 'crop:carrot')?.qty).toBe(1)
  })

  it('rejects a NEW itemId when slots are full, leaving state unchanged', () => {
    const full = makeInv(2, [
      { itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: 1 },
      { itemId: 'crop:tomato', kind: 'crop', refId: 'tomato', qty: 1 },
    ])
    const res = addItem(full, { kind: 'crop', refId: 'corn', qty: 1 })
    expect(res.ok).toBe(false)
    expect(res.reason).toBeTruthy()
    expect(res.inv).toBe(full) // unchanged reference
    expect(res.inv.items).toHaveLength(2)
  })

  it('still aggregates an EXISTING itemId even when full', () => {
    const full = makeInv(2, [
      { itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: 1 },
      { itemId: 'crop:tomato', kind: 'crop', refId: 'tomato', qty: 1 },
    ])
    const res = addItem(full, { kind: 'seed', refId: 'carrot', qty: 4 })
    expect(res.ok).toBe(true)
    expect(res.inv.items).toHaveLength(2)
    expect(getItem(res.inv, 'seed:carrot')?.qty).toBe(5)
  })

  it('rejects non-positive qty', () => {
    const inv = makeInv(20)
    expect(addItem(inv, { kind: 'seed', refId: 'carrot', qty: 0 }).ok).toBe(false)
    expect(addItem(inv, { kind: 'seed', refId: 'carrot', qty: -3 }).ok).toBe(false)
  })

  it('does not mutate the input inventory', () => {
    const inv = makeInv(20)
    addItem(inv, { kind: 'seed', refId: 'carrot', qty: 2 })
    expect(inv.items).toHaveLength(0)
  })
})

describe('inventorySystem — removeItem', () => {
  it('decrements qty when more than requested remains', () => {
    const inv = makeInv(20, [
      { itemId: 'crop:carrot', kind: 'crop', refId: 'carrot', qty: 5 },
    ])
    const res = removeItem(inv, 'crop:carrot', 2)
    expect(res.ok).toBe(true)
    expect(getItem(res.inv, 'crop:carrot')?.qty).toBe(3)
  })

  it('removes the slot entirely when qty reaches zero', () => {
    const inv = makeInv(20, [
      { itemId: 'crop:carrot', kind: 'crop', refId: 'carrot', qty: 2 },
    ])
    const res = removeItem(inv, 'crop:carrot', 2)
    expect(res.ok).toBe(true)
    expect(getItem(res.inv, 'crop:carrot')).toBeUndefined()
    expect(res.inv.items).toHaveLength(0)
  })

  it('clamps: removing more than present removes the slot, never goes negative', () => {
    const inv = makeInv(20, [
      { itemId: 'crop:carrot', kind: 'crop', refId: 'carrot', qty: 2 },
    ])
    const res = removeItem(inv, 'crop:carrot', 99)
    expect(res.ok).toBe(true)
    expect(getItem(res.inv, 'crop:carrot')).toBeUndefined()
    expect(totalQty(res.inv)).toBe(0)
  })

  it('rejects removing an item that is not present', () => {
    const inv = makeInv(20)
    const res = removeItem(inv, 'crop:carrot', 1)
    expect(res.ok).toBe(false)
    expect(res.reason).toBeTruthy()
    expect(res.inv).toBe(inv)
  })

  it('rejects non-positive qty', () => {
    const inv = makeInv(20, [
      { itemId: 'crop:carrot', kind: 'crop', refId: 'carrot', qty: 2 },
    ])
    expect(removeItem(inv, 'crop:carrot', 0).ok).toBe(false)
    expect(removeItem(inv, 'crop:carrot', -1).ok).toBe(false)
  })
})

describe('inventorySystem — Property 4 (invariants over many inputs)', () => {
  const kinds = ['seed', 'crop'] as const
  const refs = ['carrot', 'tomato', 'corn', 'pumpkin', 'strawberry', 'potato']

  it('qty never negative and no duplicate slots across random add/remove sequences', () => {
    const rng = makeRng(0xc0ffee)
    for (let trial = 0; trial < 300; trial++) {
      const slotLimit = 1 + Math.floor(rng() * 6)
      let inv = makeInv(slotLimit)
      const ops = 5 + Math.floor(rng() * 25)

      for (let i = 0; i < ops; i++) {
        const kind = kinds[Math.floor(rng() * kinds.length)]
        const refId = refs[Math.floor(rng() * refs.length)]
        const qty = 1 + Math.floor(rng() * 5)

        if (rng() < 0.6) {
          inv = addItem(inv, { kind, refId, qty }).inv
        } else {
          inv = removeItem(inv, `${kind}:${refId}`, qty).inv
        }

        // Invariant: every qty is strictly positive (no zero/negative slots).
        for (const it of inv.items) {
          expect(it.qty).toBeGreaterThan(0)
        }
        // Invariant: total qty is never negative.
        expect(totalQty(inv)).toBeGreaterThanOrEqual(0)
        // Invariant: no duplicate itemId slots.
        const ids = inv.items.map((it) => it.itemId)
        expect(new Set(ids).size).toBe(ids.length)
        // Invariant: used slots never exceed the limit.
        expect(inv.items.length).toBeLessThanOrEqual(slotLimit)
      }
    }
  })

  it('adding a NEW itemId when full is always rejected and leaves state unchanged', () => {
    const rng = makeRng(0x1234abcd)
    for (let trial = 0; trial < 200; trial++) {
      const slotLimit = 1 + Math.floor(rng() * 4)
      // Fill the inventory to exactly slotLimit distinct itemIds.
      let inv = makeInv(slotLimit)
      let made = 0
      let idx = 0
      while (made < slotLimit && idx < kinds.length * refs.length) {
        const kind = kinds[idx % kinds.length]
        const refId = refs[Math.floor(idx / kinds.length) % refs.length]
        const before = inv.items.length
        inv = addItem(inv, { kind, refId, qty: 1 + Math.floor(rng() * 4) }).inv
        if (inv.items.length > before) made++
        idx++
      }
      expect(isFull(inv)).toBe(true)

      // A brand-new itemId must be rejected; reference and contents unchanged.
      const res = addItem(inv, { kind: 'crop', refId: 'NEW_UNIQUE_REF', qty: 2 })
      expect(res.ok).toBe(false)
      expect(res.inv).toBe(inv)
      expect(res.inv.items.length).toBe(slotLimit)
    }
  })

  it('aggregating an EXISTING itemId succeeds even when full and conserves total', () => {
    const rng = makeRng(0x55aa55aa)
    for (let trial = 0; trial < 200; trial++) {
      const slotLimit = 1 + Math.floor(rng() * 4)
      let inv = makeInv(slotLimit)
      let made = 0
      let idx = 0
      while (made < slotLimit && idx < kinds.length * refs.length) {
        const kind = kinds[idx % kinds.length]
        const refId = refs[Math.floor(idx / kinds.length) % refs.length]
        const before = inv.items.length
        inv = addItem(inv, { kind, refId, qty: 1 + Math.floor(rng() * 4) }).inv
        if (inv.items.length > before) made++
        idx++
      }
      expect(isFull(inv)).toBe(true)

      const target = inv.items[Math.floor(rng() * inv.items.length)]
      const addQty = 1 + Math.floor(rng() * 9)
      const totalBefore = totalQty(inv)
      const res = addItem(inv, {
        kind: target.kind,
        refId: target.refId,
        qty: addQty,
      })
      expect(res.ok).toBe(true)
      expect(res.inv.items.length).toBe(slotLimit) // no new slot
      expect(getItem(res.inv, target.itemId)?.qty).toBe(target.qty + addQty)
      expect(totalQty(res.inv)).toBe(totalBefore + addQty)
    }
  })
})
