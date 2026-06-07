// Phaser scene factory for the English Farming Game — TOP-DOWN CARTOON farm.
//
// IMPORTANT: This module must TYPE-CHECK and load on the server (SSR) WITHOUT
// importing Phaser at runtime. We therefore:
//   - use a TYPE-ONLY import for Phaser (`import type Phaser from 'phaser'`),
//     which is erased at compile time and never emits a runtime `require`;
//   - take the live Phaser namespace as a *parameter* (`PhaserNS`) so the page
//     can `await import('phaser')` and pass it in.
//
// The scene is a THIN renderer + input router. It contains NO game-rule logic:
// every mutation is delegated to the pure systems (farmingSystem) operating on a
// single `FarmState` owned by the React page via the `FarmBridge`. The scene
// reads state through `bridge.getState()`, asks the pure view helpers
// (farmSceneView) for the square-grid geometry + per-plot appearance, and writes
// back through `bridge.setState()`.
//
// VISUAL TARGET: a cute top-down cartoon vegetable garden (Hay Day style). The
// Dreamina art is square/front-view (NOT isometric), so the field is a real
// SQUARE grid of soil plots framed by grass, fence and scenery. Every texture is
// guarded by a `loaderror` fallback so a missing asset degrades to an emoji and
// never breaks rendering. The art lives in `public/games/english-farm/assets/`.

import type Phaser from 'phaser'
import type { FarmState, VocabLevel } from '../types'
import {
  GRID_COLS,
  GRID_ROWS,
  MAX_CONCURRENT_PARTICLES,
  MAX_CONCURRENT_PARTICLES_MOBILE,
} from '../constants'
import { getCropById } from '../data/crops'
import { isoIconSrc, isoFallbackSrc } from '../data/isoIcons'
import {
  till,
  plant,
  water,
  harvest,
  isMature,
} from '../systems/farmingSystem'
import {
  describePlot,
  isInventoryFullReason,
  computeGridLayout,
  resolveParticleKind,
  type GridLayout,
} from './farmSceneView'

/** The currently selected tool (mirrors `FarmTool` in the React HUD). */
export type FarmTool = 'hoe' | 'seed' | 'water' | 'harvest'

/** The vocabulary word emitted to React after a successful harvest. */
export interface HarvestWord {
  en: string
  vi: string
  level: VocabLevel
}

/**
 * Contract between the React page (owns the FarmState + overlay UI) and the
 * Phaser scene (renders + routes input). The page implements every callback;
 * the scene only ever *calls* them — it never owns rule logic or persistence.
 */
export interface FarmBridge {
  /** Page owns the canonical FarmState ref; scene reads it on demand. */
  getState: () => FarmState
  /** Scene asks the page to adopt a new state (page updates React + persists). */
  setState: (next: FarmState) => void
  /** Currently selected tool from the HUD. */
  getSelectedTool: () => FarmTool
  /** cropTypeId the seed tool should plant (e.g. 'carrot'). */
  getSelectedSeed: () => string
  /** Called after a successful harvest with the crop's vocabulary word. */
  onHarvest: (word: HarvestWord | undefined) => void
  /** Called when a harvest is blocked because the inventory is full. */
  onInventoryFull: () => void
  /** Optional hook for sfx / feedback; `kind` describes what happened. */
  onAction?: (kind: string) => void
}

/** Public surface the page can call on the created scene instance. */
export interface FarmSceneInstance extends Phaser.Scene {
  /** Re-read `bridge.getState()` and redraw every plot (e.g. after Next Day). */
  refresh: () => void
  /**
   * Visual feedback for a quiz answer (called by the React page): a green flash
   * + sparkle when `correct`, or a red flash + shake when wrong. `target` can be
   * a plot id, an explicit screen point, or `null` to flash at screen center.
   */
  flashQuizFeedback: (
    target: number | { x: number; y: number } | null,
    correct: boolean,
  ) => void
}

/**
 * Iso/legacy art names to preload as textures (from `iso/manifest.json` or a
 * drop-in override at `assets/<name>.png`). Missing files fall back to an emoji
 * (see `loaderror` tracking) so the scene always renders. Covers characters,
 * scenery and the effect/particle sprites.
 */
const TEXTURE_NAMES = [
  // characters
  'farmer',
  'cow',
  'chicken',
  // scenery
  'barn',
  'tree',
  'fence',
  'well',
  // tools / effects / ui
  'watering-can',
  'coins',
  'star',
  'water',
] as const

const SCENE_KEY = 'FarmScene'

/**
 * Dreamina art loaded directly from `assets/<name>.png` (these names are NOT in
 * the iso manifest): per-crop growth-stage sprites (`<crop>-1/-2/-3`) and the
 * top-down ground tiles. Missing files degrade to an emoji via `loaderror`.
 */
const CROP_IDS = ['carrot', 'tomato', 'corn', 'pumpkin', 'strawberry', 'potato'] as const
const DREAMINA_FARM_COMPANION = 'dreamina-2026-06-08-8213'
const DIRECT_TEXTURES: string[] = [
  'tile-grass', 'tile-soil', 'tile-wet',
  DREAMINA_FARM_COMPANION,
  ...CROP_IDS.flatMap((id) => [`${id}-1`, `${id}-2`, `${id}-3`]),
]

/** Runtime key for the generated white-circle particle texture (no asset). */
const PARTICLE_DOT = 'farm-particle-dot'

/** Static stacking order. Tall objects sort by feet screen-Y above the ground. */
const DEPTH = {
  sky: -10_000,
  light: -9_500,
  fieldPanel: -8_000,
  fieldShadow: -8_500,
  ground: -5_000, // flat plot tiles (soil/grass)
  groundDecal: -4_900, // furrows / wet sheen on a tile
  particles: 1_000_000,
  flash: 900_000,
  flyUp: 1_100_000,
} as const

/** A textured sprite OR its emoji text fallback (both share x/y/scale/flipX). */
type Sprite = Phaser.GameObjects.Image | Phaser.GameObjects.Text

/** A grid cell. */
interface Cell {
  col: number
  row: number
}

/**
 * Build a `FarmScene` class bound to the provided Phaser namespace + bridge.
 * Returns a constructor so the page can do `new Scene()` and pass it to the
 * Phaser game config. The returned scene exposes `refresh()`.
 */
export function createFarmScene(
  PhaserNS: typeof Phaser,
  bridge: FarmBridge,
): new () => FarmSceneInstance {
  class FarmScene extends PhaserNS.Scene implements FarmSceneInstance {
    // --- per-plot rendered objects, indexed by plot id -----------------------
    /** Ground tile graphic/border (re-drawn). */
    private beds: Array<Phaser.GameObjects.Graphics | null> = []
    /** Soft contact shadow ellipse under each crop. */
    private cropShadows: Array<Phaser.GameObjects.Graphics | null> = []
    private cropObjects: Array<Sprite | null> = []
    private soilImages: Array<Sprite | null> = []
    private labels: Array<Phaser.GameObjects.Text | null> = []
    private wetIcons: Array<Sprite | null> = []
    private cropTweens: Array<Phaser.Tweens.Tween | null> = []
    private sparkleTimers: Array<Phaser.Time.TimerEvent | null> = []
    /** Last rendered growth stage per plot, so a stage increase can grow smoothly. */
    private prevStage: Array<number | null> = []

    // --- background + scenery -------------------------------------------------
    private backgroundGfx: Phaser.GameObjects.Graphics | null = null
    private fieldPanelGfx: Phaser.GameObjects.Graphics | null = null
    private decorObjects: Sprite[] = []
    private decorTweens: Phaser.Tweens.Tween[] = []

    // --- character ------------------------------------------------------------
    private farmer: Sprite | null = null
    private farmerCell: Cell = { col: 0, row: GRID_ROWS - 1 }
    private farmerSize = 48
    private farmerIdleTween: Phaser.Tweens.Tween | null = null
    private farmerBusy = false

    // --- effects --------------------------------------------------------------
    private activeEmitters = new Set<Phaser.GameObjects.Particles.ParticleEmitter>()
    private flashOverlays = new Set<Phaser.GameObjects.Graphics>()
    /** Live count of particles in flight, capped to keep mobile/desktop smooth. */
    private activeParticleCount = 0

    private layout: GridLayout = { tileSize: 64, gap: 8, originX: 0, originY: 0 }
    /** Texture keys that actually loaded (missing ones fall back to emoji). */
    private loadedTextures = new Set<string>()

    constructor() {
      super({ key: SCENE_KEY })
    }

    preload(): void {
      // Robust loading: a missing/broken asset must never break the scene. Each
      // texture is loaded from its PREFERRED source first — a user drop-in
      // override at `assets/<name>.png` — and on `loaderror` we transparently
      // retry the bundled iso art under the same key. If that also fails the
      // texture stays absent and render falls back to an emoji.
      const pendingFallback = new Map<string, string>()

      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        this.loadedTextures.delete(file.key)
        const fallback = pendingFallback.get(file.key)
        if (fallback) {
          pendingFallback.delete(file.key)
          this.load.image(file.key, fallback)
        }
      })
      this.load.on('filecomplete', (key: string) => {
        this.loadedTextures.add(key)
        pendingFallback.delete(key)
      })

      for (const name of TEXTURE_NAMES) {
        const primary = isoIconSrc(name) // user override at assets/<name>.png
        const fallback = isoFallbackSrc(name) // bundled iso art
        if (primary) {
          if (fallback && fallback !== primary) pendingFallback.set(name, fallback)
          this.load.image(name, primary)
        } else if (fallback) {
          this.load.image(name, fallback)
        } else {
          // No manifest entry: still try the direct assets/ path.
          this.load.image(name, `/games/english-farm/assets/${name}.png`)
        }
      }

      // Dreamina staged crops + ground tiles (direct from assets/; emoji on miss).
      for (const name of DIRECT_TEXTURES) {
        this.load.image(name, `/games/english-farm/assets/${name}.png`)
      }
    }

    create(): void {
      this.cameras.main.setBackgroundColor('#bfe9ff')
      this.ensureParticleTexture()
      this.buildScene()

      // A single scene-level pointer handler routes taps to the tapped tile.
      this.input.on('pointerdown', this.handlePointer, this)

      // Redraw on resize so the RESIZE scale mode keeps everything centered.
      this.scale.on('resize', this.handleResize, this)

      // Tear everything down on shutdown/destroy to avoid tween/emitter leaks.
      const teardown = (): void => this.teardown()
      this.events.once(PhaserNS.Scenes.Events.SHUTDOWN, () => {
        this.input.off('pointerdown', this.handlePointer, this)
        this.scale.off('resize', this.handleResize, this)
        teardown()
      })
      this.events.once(PhaserNS.Scenes.Events.DESTROY, teardown)
    }

    /** Public: re-read state and redraw everything (page calls after Next Day). */
    refresh(): void {
      this.renderAllPlots()
    }

    /**
     * Public: visual feedback for a quiz answer. Green flash + sparkle on a
     * correct answer; red flash + shake on a wrong one. `target` may be a plot
     * id, an explicit screen point, or null (flash at screen center). Never
     * throws — bad targets degrade to a center-screen flash.
     */
    flashQuizFeedback(
      target: number | { x: number; y: number } | null,
      correct: boolean,
    ): void {
      const center = this.feedbackCenter(target)
      if (correct) {
        this.flashAt(center.x, center.y, 0x22c55e, 0.45)
        this.emitSparkle(center.x, center.y, this.particleCount(12))
      } else {
        this.flashAt(center.x, center.y, 0xef4444, 0.5)
        if (typeof target === 'number') this.shakeCrop(target)
        else this.cameras.main.shake(180, 0.008)
      }
    }

    /** Resolve a quiz-feedback `target` to a screen point. Never throws. */
    private feedbackCenter(
      target: number | { x: number; y: number } | null,
    ): { x: number; y: number } {
      if (typeof target === 'number') {
        const cols = this.safeGetState().grid.cols || GRID_COLS
        const { col, row } = this.cellOf(target, cols)
        return this.cellCenter(col, row)
      }
      if (target && typeof target === 'object') {
        return { x: target.x, y: target.y }
      }
      return { x: this.scale.width / 2, y: this.scale.height / 2 }
    }

    // --- generated particle texture -----------------------------------------

    /** Make a tiny white circle texture at runtime so emitters need no asset. */
    private ensureParticleTexture(): void {
      if (this.textures.exists(PARTICLE_DOT)) return
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillCircle(8, 8, 8)
      g.generateTexture(PARTICLE_DOT, 16, 16)
      g.destroy()
    }

    // --- scene construction --------------------------------------------------

    private handleResize(): void {
      // Rebuild from scratch — cheap for a 24-tile farm and keeps layout exact.
      this.buildScene()
    }

    /** Destroy all transient objects/tweens/timers/emitters (rebuild + shutdown). */
    private teardown(): void {
      this.cancelFarmerMotion()
      this.farmer?.destroy()
      this.farmer = null

      this.decorTweens.forEach((t) => t.remove())
      this.decorTweens = []
      this.decorObjects.forEach((o) => o.destroy())
      this.decorObjects = []

      this.backgroundGfx?.destroy()
      this.backgroundGfx = null
      this.fieldPanelGfx?.destroy()
      this.fieldPanelGfx = null

      this.clearGrid()

      this.activeEmitters.forEach((e) => e.destroy())
      this.activeEmitters.clear()
      this.activeParticleCount = 0
      this.flashOverlays.forEach((o) => o.destroy())
      this.flashOverlays.clear()
    }

    /** Destroy every per-plot object + kill its tweens/timers. */
    private clearGrid(): void {
      for (let i = 0; i < this.beds.length; i += 1) this.clearTile(i)
      this.beds.forEach((b) => b?.destroy())
      this.cropShadows.forEach((s) => s?.destroy())
      this.beds = []
      this.cropShadows = []
      this.cropObjects = []
      this.soilImages = []
      this.labels = []
      this.wetIcons = []
      this.cropTweens = []
      this.sparkleTimers = []
      this.prevStage = []
    }

    /** Build background, field, decor + farmer from the current screen size. */
    private buildScene(): void {
      this.teardown()

      const width = this.scale.width
      const height = this.scale.height
      const state = this.safeGetState()
      const cols = state.grid.cols || GRID_COLS
      const rows = state.grid.rows || GRID_ROWS

      this.layout = computeGridLayout(width, height, cols, rows, {
        topInset: 150,
        padding: Math.max(28, Math.round(Math.min(width, height) * 0.06)),
        gap: Math.max(6, Math.round(Math.min(width, height) * 0.012)),
      })

      this.drawBackground(width, height)
      this.drawFieldPanel(cols, rows)
      this.drawDecorBack(cols, rows)
      this.buildGrid(cols, rows)
      this.drawDecorFront(cols, rows)
      this.buildFarmer(cols, rows)
    }

    // --- geometry helpers ----------------------------------------------------

    /** Distance between adjacent tile centers. */
    private step(): number {
      return this.layout.tileSize + this.layout.gap
    }

    /** Screen-space center of a (possibly fractional) square cell. */
    private cellCenter(col: number, row: number): { x: number; y: number } {
      const s = this.step()
      return {
        x: this.layout.originX + col * s + this.layout.tileSize / 2,
        y: this.layout.originY + row * s + this.layout.tileSize / 2,
      }
    }

    // --- background ----------------------------------------------------------

    private drawBackground(width: number, height: number): void {
      const g = this.add.graphics().setDepth(DEPTH.sky)
      // Soft sky -> meadow vertical gradient across the whole screen.
      const horizon = Math.round(height * 0.4)
      g.fillGradientStyle(0xbfe9ff, 0xbfe9ff, 0xe6f7d2, 0xe6f7d2, 1)
      g.fillRect(0, 0, width, horizon)
      g.fillGradientStyle(0xa9e07a, 0xa9e07a, 0x7cc24f, 0x7cc24f, 1)
      g.fillRect(0, horizon, width, height - horizon)
      this.backgroundGfx = g

      // Big soft radial light from the upper area (gentle sunny glow).
      const light = this.add.graphics().setDepth(DEPTH.light)
      const cx = width * 0.5
      const cy = height * 0.3
      const maxR = Math.max(width, height) * 0.6
      for (let i = 6; i >= 1; i -= 1) {
        const r = (maxR / 6) * i
        light.fillStyle(0xffffff, 0.045)
        light.fillCircle(cx, cy, r)
      }
      this.decorObjects.push(light as unknown as Sprite)
    }

    /**
     * A raised, rounded "garden bed" panel behind the whole plot grid: a soft
     * drop shadow, a brown soil border (the bed's wooden frame look) and an
     * inner lighter face, so the square plots read as one cohesive raised field.
     */
    private drawFieldPanel(cols: number, rows: number): void {
      const s = this.step()
      const pad = Math.round(this.layout.tileSize * 0.34)
      const x = this.layout.originX - pad
      const y = this.layout.originY - pad
      const w = cols * s - this.layout.gap + pad * 2
      const h = rows * s - this.layout.gap + pad * 2
      const radius = Math.round(this.layout.tileSize * 0.4)

      // Drop shadow under the raised bed.
      const shadow = this.add.graphics().setDepth(DEPTH.fieldShadow)
      shadow.fillStyle(0x2f5320, 0.28)
      shadow.fillRoundedRect(x - 4, y + 10, w + 8, h + 10, radius)
      this.decorObjects.push(shadow as unknown as Sprite)

      const g = this.add.graphics().setDepth(DEPTH.fieldPanel)
      // Wooden/earth frame.
      g.fillStyle(0x7a4a25, 1)
      g.fillRoundedRect(x, y, w, h, radius)
      // Inner soil face.
      g.fillStyle(0x9b6238, 1)
      g.fillRoundedRect(
        x + 6,
        y + 6,
        w - 12,
        h - 12,
        Math.max(4, radius - 4),
      )
      this.fieldPanelGfx = g
    }

    // --- grid ----------------------------------------------------------------

    private buildGrid(cols: number, rows: number): void {
      const state = this.safeGetState()
      for (const plot of state.grid.plots) {
        const bed = this.add.graphics().setDepth(DEPTH.ground)
        const shadow = this.add.graphics()
        this.beds[plot.id] = bed
        this.cropShadows[plot.id] = shadow
        this.cropObjects[plot.id] = null
        this.soilImages[plot.id] = null
        this.labels[plot.id] = null
        this.wetIcons[plot.id] = null
        this.cropTweens[plot.id] = null
        this.sparkleTimers[plot.id] = null
        this.prevStage[plot.id] = null
      }
      void cols
      void rows
      this.renderAllPlots()
    }

    // --- character -----------------------------------------------------------

    private buildFarmer(cols: number, rows: number): void {
      // Keep the farmer's cell across rebuilds; clamp into the (possibly new) grid.
      this.farmerCell = {
        col: Math.max(0, Math.min(this.farmerCell.col, cols - 1)),
        row: Math.max(0, Math.min(this.farmerCell.row, rows - 1)),
      }
      this.farmerSize = Math.max(40, Math.round(this.layout.tileSize * 1.35))
      const c = this.cellCenter(this.farmerCell.col, this.farmerCell.row)
      const feetY = c.y + this.layout.tileSize * 0.34
      this.farmer = this.makeSprite('farmer', c.x, feetY, this.farmerSize, '🧑‍🌾', 0.5, 1)
      this.farmer.setDepth(feetY + 5)
      this.startFarmerIdle()
    }

    /** Gentle vertical bob around the farmer's current resting position. */
    private startFarmerIdle(): void {
      if (!this.farmer || this.farmerBusy) return
      const baseY = this.farmer.y
      this.farmerIdleTween = this.tweens.add({
        targets: this.farmer,
        y: baseY - Math.max(2, this.farmerSize * 0.04),
        duration: 950,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    /** Stop any walk/idle motion (latest tap wins, no overlap). */
    private cancelFarmerMotion(): void {
      if (this.farmer) this.tweens.killTweensOf(this.farmer)
      this.farmerIdleTween?.remove()
      this.farmerIdleTween = null
    }

    /**
     * Walk the farmer tile-by-tile to `target` (tween through tile centers,
     * flipX by direction), then run `onArrive`. Purely visual — the action
     * result still comes from the pure systems via the bridge.
     */
    private moveFarmerToCell(target: Cell, onArrive: () => void): void {
      if (!this.farmer) {
        onArrive()
        return
      }
      this.cancelFarmerMotion()
      this.farmerBusy = true

      const path = this.buildPath(this.farmerCell, target)
      const stepDur = 150
      const footOffset = this.layout.tileSize * 0.34

      const stepTo = (index: number): void => {
        if (!this.farmer) return
        if (index >= path.length) {
          this.farmerBusy = false
          onArrive()
          this.startFarmerIdle()
          return
        }
        const cell = path[index]
        const c = this.cellCenter(cell.col, cell.row)
        const fx = c.x
        const fy = c.y + footOffset
        if (fx < this.farmer.x - 0.5) this.farmer.setFlipX(true)
        else if (fx > this.farmer.x + 0.5) this.farmer.setFlipX(false)

        this.tweens.add({
          targets: this.farmer,
          x: fx,
          y: fy,
          duration: stepDur,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (this.farmer) this.farmer.setDepth(this.farmer.y + 5)
          },
          onComplete: () => {
            this.farmerCell = cell
            stepTo(index + 1)
          },
        })
      }

      stepTo(0)
    }

    /** Manhattan path of cells from `from` (exclusive) to `to` (inclusive). */
    private buildPath(from: Cell, to: Cell): Cell[] {
      const path: Cell[] = []
      let col = from.col
      let row = from.row
      while (col !== to.col) {
        col += Math.sign(to.col - col)
        path.push({ col, row })
      }
      while (row !== to.row) {
        row += Math.sign(to.row - row)
        path.push({ col, row })
      }
      return path
    }

    // --- rendering -----------------------------------------------------------

    private renderAllPlots(): void {
      const state = this.safeGetState()
      for (const plot of state.grid.plots) this.renderPlot(plot.id)
    }

    /** Destroy a tile's crop/label/wet overlay + kill its tweens/timers. */
    private clearTile(plotId: number): void {
      this.cropTweens[plotId]?.remove()
      this.cropTweens[plotId] = null
      this.sparkleTimers[plotId]?.remove(false)
      this.sparkleTimers[plotId] = null
      this.cropObjects[plotId]?.destroy()
      this.cropObjects[plotId] = null
      this.soilImages[plotId]?.destroy()
      this.soilImages[plotId] = null
      this.labels[plotId]?.destroy()
      this.labels[plotId] = null
      this.wetIcons[plotId]?.destroy()
      this.wetIcons[plotId] = null
      this.cropShadows[plotId]?.clear()
    }

    private renderPlot(plotId: number, opts: { pop?: boolean } = {}): void {
      const state = this.safeGetState()
      const plot = state.grid.plots.find((p) => p.id === plotId)
      const bed = this.beds[plotId]
      if (!plot || !bed) return

      const cols = state.grid.cols || GRID_COLS
      const { col, row } = this.cellOf(plotId, cols)
      const c = this.cellCenter(col, row)

      const cropType = plot.crop ? getCropById(plot.crop.cropTypeId) : undefined
      const visual = describePlot(plot, cropType)

      // Procedural fallback border drawn under the tile image.
      this.drawTile(bed, c.x, c.y, visual)

      // Reset previous crop overlay / label / wet indicator before redrawing.
      this.clearTile(plotId)

      // Square ground tile image: grass (empty), soil (tilled/planted) or wet.
      const tileTex = !visual.furrows && !visual.crop
        ? 'tile-grass'
        : visual.wet
          ? 'tile-wet'
          : 'tile-soil'
      const tile = this.makeTile(tileTex, c.x, c.y, this.layout.tileSize, '🟫')
      if (tile) {
        tile.setDepth(DEPTH.ground + 1)
        this.soilImages[plotId] = tile
      }

      // Wet soil gets a little water sheen sprite near the tile.
      if (visual.wet) {
        const dropSize = Math.max(12, this.layout.tileSize * 0.26)
        const drop = this.makeSprite(
          'water',
          c.x + this.layout.tileSize * 0.3,
          c.y - this.layout.tileSize * 0.28,
          dropSize,
          '💧',
        )
        drop.setDepth(c.y)
        this.wetIcons[plotId] = drop
      }

      if (!visual.crop) return

      // Crop sits on the soil: bottom-anchored just below tile center, scaled to
      // the tile. Trimmed art means the plant base lands on the soil (no float).
      const target = this.layout.tileSize * (0.66 + visual.crop.scale * 0.55)
      const feetY = c.y + this.layout.tileSize * 0.34
      const stage = plot.crop?.stage ?? 3
      const prevStage = this.prevStage[plotId]
      this.prevStage[plotId] = stage
      const bucket = stage <= 1 ? 1 : stage === 2 ? 2 : 3
      const cropTex = cropType ? `${cropType.id}-${bucket}` : visual.crop.textureName
      const crop = this.makeSprite(
        cropTex,
        c.x,
        feetY,
        target,
        visual.crop.fallbackEmoji,
        0.5,
        1,
      )
      crop.setDepth(feetY)
      this.cropObjects[plotId] = crop

      // Soft contact shadow under the crop.
      const shadow = this.cropShadows[plotId]
      if (shadow) {
        shadow.clear()
        shadow.setDepth(feetY - 1)
        shadow.fillStyle(0x2f5320, 0.26)
        shadow.fillEllipse(c.x, feetY, this.layout.tileSize * 0.6, this.layout.tileSize * 0.2)
      }

      const baseScale = crop.scaleX

      if (opts.pop) {
        crop.setScale(0)
        this.cropTweens[plotId] = this.tweens.add({
          targets: crop,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: 320,
          ease: 'Back.easeOut',
          onComplete: () =>
            this.startCropIdle(plotId, baseScale, visual.crop?.mature ?? false),
        })
      } else if (prevStage != null && stage > prevStage) {
        // Stage advanced (e.g. after watering + Next Day): grow smoothly from a
        // smaller scale to the new target with a springy ease instead of a
        // sudden size jump.
        crop.setScale(baseScale * 0.62)
        this.cropTweens[plotId] = this.tweens.add({
          targets: crop,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: 380,
          ease: 'Back.easeOut',
          onComplete: () =>
            this.startCropIdle(plotId, baseScale, visual.crop?.mature ?? false),
        })
      } else {
        this.startCropIdle(plotId, baseScale, visual.crop.mature)
      }

      if (visual.label) {
        const label = this.add
          .text(c.x, c.y + this.layout.tileSize * 0.46, visual.label, {
            fontFamily: 'Arial',
            fontSize: `${Math.max(10, Math.round(this.layout.tileSize * 0.18))}px`,
            color: '#ffffff',
            backgroundColor: '#00000055',
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5, 0.5)
          .setDepth(feetY + 1)
        this.labels[plotId] = label
      }
    }

    /**
     * Idle motion for a crop: mature crops bob/sway and sparkle occasionally;
     * younger crops get a subtle "breathing" scale pulse. Replaces any prior
     * crop tween/timer for the tile.
     */
    private startCropIdle(plotId: number, baseScale: number, mature: boolean): void {
      const crop = this.cropObjects[plotId]
      if (!crop) return
      this.cropTweens[plotId]?.remove()

      if (mature) {
        const baseY = crop.y
        this.cropTweens[plotId] = this.tweens.add({
          targets: crop,
          y: baseY - Math.max(3, this.layout.tileSize * 0.06),
          angle: { from: -3, to: 3 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
        this.sparkleTimers[plotId]?.remove(false)
        this.sparkleTimers[plotId] = this.time.addEvent({
          delay: 2200,
          loop: true,
          callback: () => {
            const cr = this.cropObjects[plotId]
            if (cr && cr.active) this.emitSparkle(cr.x, cr.y - this.layout.tileSize * 0.5, 4)
          },
        })
      } else {
        // Younger crops: a subtle "breathing" scale pulse PLUS a gentle wind
        // sway (small angle yoyo) so every planted crop drifts in the breeze.
        this.cropTweens[plotId] = this.tweens.add({
          targets: crop,
          scaleX: baseScale * 1.05,
          scaleY: baseScale * 1.05,
          angle: { from: -2, to: 2 },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    }

    /**
     * Paint one square plot's procedural border into `bed` — a subtle inset
     * outline so the tile reads as a discrete plot even before the soil image
     * loads (and as a fallback if it never does). The soil/grass texture is
     * drawn as an image sprite on top in renderPlot.
     */
    private drawTile(
      bed: Phaser.GameObjects.Graphics,
      cx: number,
      cy: number,
      visual: ReturnType<typeof describePlot>,
    ): void {
      bed.clear()
      const t = this.layout.tileSize
      const half = t / 2
      const radius = Math.max(4, Math.round(t * 0.16))

      // Base fallback fill (in case the tile image is missing): brown soil or
      // green grass depending on whether the plot has been worked.
      const worked = visual.furrows || !!visual.crop
      bed.fillStyle(worked ? 0x8a5a30 : 0x7cb85c, 1)
      bed.fillRoundedRect(cx - half, cy - half, t, t, radius)

      // Thin inset rim for definition.
      bed.lineStyle(Math.max(1, Math.round(t * 0.04)), worked ? 0x5c3d22 : 0x5f9437, 0.6)
      bed.strokeRoundedRect(cx - half + 1, cy - half + 1, t - 2, t - 2, radius)
    }

    // --- decor (depth-sorted by feet-Y so it occludes correctly) -------------

    /** Field rectangle in screen space (origin + grid extent). */
    private fieldRect(cols: number, rows: number): {
      left: number; right: number; top: number; bottom: number; cx: number; cy: number
    } {
      const s = this.step()
      const left = this.layout.originX
      const top = this.layout.originY
      const right = left + cols * s - this.layout.gap
      const bottom = top + rows * s - this.layout.gap
      return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 }
    }

    /** Scenery that sits BEHIND the field (barn + back fence row): low feet-Y. */
    private drawDecorBack(cols: number, rows: number): void {
      const r = this.fieldRect(cols, rows)
      const t = this.layout.tileSize

      // Barn behind the top-left of the field.
      const barnY = r.top - t * 0.2
      this.decorObjects.push(
        this.makeSprite('barn', r.left + t * 0.4, barnY, t * 2.2, '🏠', 0.5, 1).setDepth(barnY),
      )

      // Well behind the top-right.
      const wellY = r.top - t * 0.1
      this.decorObjects.push(
        this.makeSprite('well', r.right - t * 0.4, wellY, t * 1.2, '⛲', 0.5, 1).setDepth(wellY),
      )

      // Back fence row across the top edge of the field.
      const s = this.step()
      const fenceSize = Math.max(22, t * 0.62)
      const fenceY = r.top - t * 0.06
      for (let col = 0; col <= cols; col += 1) {
        const x = r.left + col * s - this.layout.gap / 2
        this.decorObjects.push(
          this.makeSprite('fence', x, fenceY, fenceSize, '🪵', 0.5, 1).setDepth(fenceY),
        )
      }
    }

    /** Scenery + animals around/in front of the field: feet-Y depth-sorted. */
    private drawDecorFront(cols: number, rows: number): void {
      const r = this.fieldRect(cols, rows)
      const t = this.layout.tileSize

      // Trees flanking the field on the grass.
      const treeLY = r.bottom + t * 0.1
      this.decorObjects.push(
        this.makeSprite('tree', r.left - t * 1.1, treeLY, t * 2.0, '🌳', 0.5, 1).setDepth(treeLY),
      )
      const treeRY = r.top + t * 0.4
      this.decorObjects.push(
        this.makeSprite('tree', r.right + t * 1.1, treeRY, t * 1.8, '🌳', 0.5, 1).setDepth(treeRY),
      )

      // A cow + a chicken wandering on the grass outside the plots.
      const cowY = r.bottom + t * 0.9
      const cow = this.makeSprite('cow', r.left + t * 0.6, cowY, t * 1.4, '🐄', 0.5, 1)
        .setDepth(cowY)
      this.decorObjects.push(cow)
      this.addWander(cow, t * 0.7)

      const chickY = r.bottom + t * 0.7
      const chicken = this.makeSprite('chicken', r.right - t * 0.5, chickY, t * 0.8, '🐔', 0.5, 1)
        .setDepth(chickY)
      this.decorObjects.push(chicken)
      this.addWander(chicken, t * 0.9)

      // Optional Dreamina companion dropped into assets/dreamina-2026-06-08-8213.png.
      // Missing art falls back to a small pet emoji so the farm still renders.
      const companionY = r.bottom + t * 1.05
      const companion = this.makeSprite(
        DREAMINA_FARM_COMPANION,
        r.cx,
        companionY,
        t * 1.25,
        '🐾',
        0.5,
        1,
      ).setDepth(companionY + 2)
      this.decorObjects.push(companion)
      this.addWander(companion, t * 0.55)
    }

    /** Gentle back-and-forth wander for an animal sprite (flips with direction). */
    private addWander(sprite: Sprite, range: number): void {
      const baseX = sprite.x
      const proxy = { v: 0 }
      const tween = this.tweens.add({
        targets: proxy,
        v: 1,
        duration: 2600 + Math.random() * 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          if (!sprite.active) return
          sprite.x = baseX + (proxy.v - 0.5) * range
          sprite.setFlipX(proxy.v > 0.5)
        },
      })
      this.decorTweens.push(tween)
    }

    // --- input routing -------------------------------------------------------

    private handlePointer(pointer: Phaser.Input.Pointer): void {
      const state = this.safeGetState()
      const cols = state.grid.cols || GRID_COLS
      const rows = state.grid.rows || GRID_ROWS
      const cell = this.screenToCell(pointer.x, pointer.y)
      if (!cell) return
      const { col, row } = cell
      if (col < 0 || col >= cols || row < 0 || row >= rows) return
      if (this.farmerBusy) return

      const plotId = row * cols + col
      const tool = bridge.getSelectedTool()
      this.moveFarmerToCell({ col, row }, () => this.performToolAction(tool, plotId))
    }

    /** Map a screen point to the square grid cell it lands in (null if outside). */
    private screenToCell(px: number, py: number): Cell | null {
      const s = this.step()
      const lx = px - this.layout.originX
      const ly = py - this.layout.originY
      if (lx < 0 || ly < 0) return null
      const col = Math.floor(lx / s)
      const row = Math.floor(ly / s)
      return { col, row }
    }

    /** Route the selected tool to its pure system (no rule logic here). */
    private performToolAction(tool: FarmTool, plotId: number): void {
      const state = this.safeGetState()
      switch (tool) {
        case 'hoe':
          this.applyResult(till(state, plotId), plotId, 'till')
          break
        case 'seed':
          this.applyResult(plant(state, plotId, bridge.getSelectedSeed()), plotId, 'plant')
          break
        case 'water':
          this.applyResult(water(state, plotId), plotId, 'water')
          break
        case 'harvest':
          this.handleHarvest(state, plotId)
          break
        default:
          break
      }
    }

    /** Apply a non-harvest Result: commit + redraw + juice on success, flash on fail. */
    private applyResult(
      result: { ok: boolean; reason?: string; state: FarmState },
      plotId: number,
      kind: string,
    ): void {
      if (result.ok) {
        bridge.setState(result.state)
        this.renderPlot(plotId, { pop: kind === 'plant' })
        this.playActionEffect(kind, plotId)
        bridge.onAction?.(kind)
      } else {
        this.flashPlot(plotId)
      }
    }

    private handleHarvest(state: FarmState, plotId: number): void {
      const result = harvest(state, plotId, getCropById)
      if (result.ok) {
        bridge.setState(result.state)
        this.popHarvestCrop(plotId)
        this.renderPlot(plotId)
        bridge.onHarvest(result.word)
        bridge.onAction?.('harvest')
        return
      }
      if (isInventoryFullReason(result.reason)) bridge.onInventoryFull()
      this.flashPlot(plotId)
    }

    // --- juice (particles + tweens) ------------------------------------------

    private playActionEffect(kind: string, plotId: number): void {
      const cols = this.safeGetState().grid.cols || GRID_COLS
      const { col, row } = this.cellOf(plotId, cols)
      const c = this.cellCenter(col, row)

      if (kind === 'plant') {
        this.emitDust(c.x, c.y + this.layout.tileSize * 0.2, this.particleCount(6))
        return
      }

      // Soil vs water burst. resolveParticleKind centralizes the precedence
      // rule (soil wins when both tilling AND watering happen at once).
      const particle = resolveParticleKind(kind === 'till', kind === 'water')
      if (particle === 'soil') {
        this.emitDust(c.x, c.y, this.particleCount(14))
      } else if (particle === 'water') {
        this.emitWater(c.x, c.y, this.layout.tileSize)
        // Care reaction: the watered crop perks up (happy bounce + sparkle).
        this.reactCrop(plotId)
      }
    }

    /**
     * A short, tween-safe "happy" reaction for a cared-for crop: a green sparkle
     * above it plus a quick squash-and-stretch hop. Runs on top of the idle
     * tween by briefly overriding scale, then restoring the idle motion.
     */
    private reactCrop(plotId: number): void {
      const crop = this.cropObjects[plotId]
      if (!crop || !crop.active) return
      this.emitSparkle(crop.x, crop.y - this.layout.tileSize * 0.45, this.particleCount(6))
      const baseScale = crop.scaleX
      this.cropTweens[plotId]?.remove()
      this.cropTweens[plotId] = this.tweens.add({
        targets: crop,
        scaleX: baseScale * 1.18,
        scaleY: baseScale * 1.18,
        duration: 160,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          crop.setScale(baseScale)
          // Resume the gentle idle motion after the reaction.
          const state = this.safeGetState()
          const plot = state.grid.plots.find((p) => p.id === plotId)
          const mature = (plot?.crop?.stage ?? 0) >= 3
          this.startCropIdle(plotId, baseScale, mature)
        },
      })
    }

    /** Brown dust puff (tilling / planting). */
    private emitDust(x: number, y: number, count: number): void {
      this.burst(PARTICLE_DOT, x, y, count, 520, {
        speed: { min: 30, max: 95 },
        angle: { min: 200, max: 340 },
        gravityY: 240,
        lifespan: 520,
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: 0x8a5f37,
      })
    }

    /** Blue droplets falling onto the tile (watering). */
    private emitWater(x: number, y: number, size: number): void {
      const tex = this.firstTexture('water')
      const fromY = y - size * 0.5
      if (tex) {
        this.burst(tex, x, fromY, 10, 650, {
          x: { min: -size * 0.3, max: size * 0.3 },
          speedY: { min: 30, max: 80 },
          gravityY: 320,
          lifespan: 650,
          scale: { start: size / 1400, end: size / 2800 },
          alpha: { start: 0.95, end: 0 },
        })
      } else {
        this.burst(PARTICLE_DOT, x, fromY, 10, 650, {
          x: { min: -size * 0.3, max: size * 0.3 },
          speedY: { min: 30, max: 90 },
          gravityY: 320,
          lifespan: 650,
          scale: { start: 0.5, end: 0.15 },
          alpha: { start: 0.95, end: 0 },
          tint: 0x4aa3ff,
        })
      }
    }

    /** Sparkle/star burst (harvest + occasional mature shimmer). */
    private emitSparkle(x: number, y: number, count: number): void {
      const tex = this.firstTexture('star')
      if (tex) {
        this.burst(tex, x, y, count, 750, {
          speed: { min: 60, max: 200 },
          angle: { min: 0, max: 360 },
          lifespan: 750,
          scale: { start: 0.18, end: 0 },
          alpha: { start: 1, end: 0 },
          rotate: { min: 0, max: 360 },
        })
      } else {
        this.burst(PARTICLE_DOT, x, y, count, 750, {
          speed: { min: 60, max: 200 },
          angle: { min: 0, max: 360 },
          lifespan: 750,
          scale: { start: 0.6, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: 0xffe066,
          blendMode: 'ADD',
        })
      }
    }

    /** Coins burst (harvest reward pop). */
    private emitCoins(x: number, y: number, count: number): void {
      const tex = this.firstTexture('coins')
      if (tex) {
        this.burst(tex, x, y, count, 800, {
          speed: { min: 80, max: 220 },
          angle: { min: 250, max: 290 },
          gravityY: 360,
          lifespan: 800,
          scale: { start: 0.16, end: 0.05 },
          alpha: { start: 1, end: 0 },
          rotate: { min: -30, max: 30 },
        })
      } else {
        this.emitSparkle(x, y, count)
      }
    }

    /**
     * Detach the current crop sprite (without destroying it via clearTile) and
     * tween it up toward the HUD basket while fading, then destroy it. Also
     * bursts coins + sparkles for a juicy harvest.
     */
    private popHarvestCrop(plotId: number): void {
      const crop = this.cropObjects[plotId]
      this.cropTweens[plotId]?.remove()
      this.cropTweens[plotId] = null
      this.sparkleTimers[plotId]?.remove(false)
      this.sparkleTimers[plotId] = null
      this.cropObjects[plotId] = null

      const x = crop?.x ?? 0
      const y = crop?.y ?? 0
      this.emitCoins(x, y, this.particleCount(12))
      this.emitSparkle(x, y, this.particleCount(14))

      if (!crop) return
      this.tweens.killTweensOf(crop)
      crop.setDepth(DEPTH.flyUp)
      const baseScale = crop.scaleX
      this.tweens.add({
        targets: crop,
        y: crop.y - this.scale.height * 0.2,
        x: this.scale.width * 0.5,
        scaleX: baseScale * 1.25,
        scaleY: baseScale * 1.25,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => crop.destroy(),
      })
    }

    /** Gentle red flash on the tapped plot to signal an invalid action. */
    private flashPlot(plotId: number): void {
      const cols = this.safeGetState().grid.cols || GRID_COLS
      const { col, row } = this.cellOf(plotId, cols)
      const c = this.cellCenter(col, row)
      const t = this.layout.tileSize
      const half = t / 2
      const radius = Math.max(4, Math.round(t * 0.16))

      const overlay = this.add.graphics().setDepth(DEPTH.flash)
      overlay.fillStyle(0xef4444, 0.5)
      overlay.fillRoundedRect(c.x - half, c.y - half, t, t, radius)
      this.flashOverlays.add(overlay)

      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 280,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.flashOverlays.delete(overlay)
          overlay.destroy()
        },
      })
    }

    // --- helpers -------------------------------------------------------------

    /** Grid cell for a plot id given the column count. */
    private cellOf(plotId: number, cols: number): Cell {
      const safeCols = Math.max(1, cols)
      return { col: plotId % safeCols, row: Math.floor(plotId / safeCols) }
    }

    /**
     * Fire a one-shot particle burst from a generated/loaded texture, then clean
     * the emitter up after its particles expire (no leaks). Never throws.
     */
    private burst(
      texture: string,
      x: number,
      y: number,
      count: number,
      ttl: number,
      config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    ): void {
      if (!this.textures.exists(texture)) return
      // Enforce the concurrent-particle budget (lower on mobile) so the scene
      // never spawns more particles at once than the device should handle.
      const budget = this.maxParticles() - this.activeParticleCount
      if (budget <= 0) return
      const n = Math.max(0, Math.min(count, budget))
      if (n <= 0) return

      const emitter = this.add.particles(x, y, texture, { ...config, emitting: false })
      emitter.setDepth(DEPTH.particles)
      this.activeEmitters.add(emitter)
      this.activeParticleCount += n
      emitter.explode(n, x, y)
      this.time.delayedCall(ttl + 250, () => {
        this.activeParticleCount = Math.max(0, this.activeParticleCount - n)
        this.activeEmitters.delete(emitter)
        emitter.destroy()
      })
    }

    /** True on small/touch screens — used to scale down particle work. */
    private isMobile(): boolean {
      return (
        this.scale.width < 768 ||
        (typeof window !== 'undefined' && 'ontouchstart' in window)
      )
    }

    /** Concurrent-particle cap for the current device. */
    private maxParticles(): number {
      return this.isMobile()
        ? MAX_CONCURRENT_PARTICLES_MOBILE
        : MAX_CONCURRENT_PARTICLES
    }

    /** Reduce a requested particle count on mobile (cheaper bursts). */
    private particleCount(n: number): number {
      return this.isMobile() ? Math.max(1, Math.round(n * 0.5)) : n
    }

    /**
     * Generic colored flash square centered on (x, y). Used for quiz feedback
     * (green correct / red wrong). `size` defaults to one tile. Self-cleans.
     */
    private flashAt(
      x: number,
      y: number,
      color: number,
      alpha: number,
      size = this.layout.tileSize,
    ): void {
      const half = size / 2
      const radius = Math.max(4, Math.round(size * 0.16))
      const overlay = this.add.graphics().setDepth(DEPTH.flash)
      overlay.fillStyle(color, alpha)
      overlay.fillRoundedRect(x - half, y - half, size, size, radius)
      this.flashOverlays.add(overlay)
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.flashOverlays.delete(overlay)
          overlay.destroy()
        },
      })
    }

    /** Quick horizontal shake of a plot's crop sprite (wrong-answer feedback). */
    private shakeCrop(plotId: number): void {
      const crop = this.cropObjects[plotId]
      if (!crop || !crop.active) {
        this.cameras.main.shake(180, 0.008)
        return
      }
      const baseX = crop.x
      this.tweens.add({
        targets: crop,
        x: baseX - Math.max(4, this.layout.tileSize * 0.1),
        duration: 55,
        yoyo: true,
        repeat: 3,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (crop.active) crop.x = baseX
        },
      })
    }

    /** First of the given texture names that actually loaded, or null. */
    private firstTexture(...names: string[]): string | null {
      for (const name of names) {
        if (this.loadedTextures.has(name) && this.textures.exists(name)) return name
      }
      return null
    }

    /**
     * Create a square ground TILE image stretched to exactly `size x size`, or
     * null when the texture is missing (the procedural border in drawTile then
     * stands in). Ground tiles are full-bleed squares so they tile edge-to-edge.
     */
    private makeTile(
      textureName: string,
      x: number,
      y: number,
      size: number,
      _fallbackEmoji: string,
    ): Phaser.GameObjects.Image | null {
      if (this.loadedTextures.has(textureName) && this.textures.exists(textureName)) {
        const img = this.add.image(x, y, textureName).setOrigin(0.5, 0.5)
        img.setDisplaySize(size, size)
        return img
      }
      return null
    }

    /**
     * Create a sprite for `textureName` scaled so its longest side ≈ `size`, or
     * an emoji text fallback when the texture is missing (loaderror / no asset).
     */
    private makeSprite(
      textureName: string,
      x: number,
      y: number,
      size: number,
      fallbackEmoji: string,
      originX = 0.5,
      originY = 0.5,
    ): Sprite {
      if (this.loadedTextures.has(textureName) && this.textures.exists(textureName)) {
        const img = this.add.image(x, y, textureName).setOrigin(originX, originY)
        const src = this.textures.get(textureName).getSourceImage()
        const longest = Math.max(src.width || size, src.height || size, 1)
        img.setScale(size / longest)
        return img
      }
      return this.add
        .text(x, y, fallbackEmoji, {
          fontFamily: 'Arial',
          fontSize: `${Math.max(10, Math.round(size))}px`,
        })
        .setOrigin(originX, originY)
    }

    /** Read state via the bridge defensively; never let a bad read crash render. */
    private safeGetState(): FarmState {
      return bridge.getState()
    }
  }

  return FarmScene as unknown as new () => FarmSceneInstance
}

// Re-export so the page can reuse maturity checks for overlay messaging if needed.
export { isMature }
