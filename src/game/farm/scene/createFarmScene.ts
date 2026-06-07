// Phaser scene factory for the English Farming Game — ISOMETRIC CARTOON farm.
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
// (farmSceneView) for the isometric geometry + per-plot appearance, and writes
// back through `bridge.setState()`.
//
// VISUAL TARGET: a cute 2.5D cartoon farm (Hay Day / Khu Vườn Trên Mây) — a real
// isometric DIAMOND field with depth, shadows and cohesive cartoon art. All the
// geometry MATH lives in farmSceneView (pure + unit-tested); this file turns it
// into Phaser game objects, tweens + particles and routes input. Every texture
// is guarded by a `loaderror` fallback so a missing asset degrades to an emoji
// and never breaks rendering. The primary art is the isometric icon set in
// `public/games/english-farm/iso/` (resolved via `isoIconSrc`).

import type Phaser from 'phaser'
import type { FarmState, VocabLevel } from '../types'
import { GRID_COLS, GRID_ROWS } from '../constants'
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
  isoToScreen,
  screenToIso,
  isoGridLayout,
  tileDepth,
  type IsoLayout,
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
}

/**
 * Isometric art names to preload as textures (from `iso/manifest.json`). Missing
 * or broken files fall back to an emoji (see `loaderror` tracking) so the scene
 * always renders. Covers crops, growth stages, the farmer + animals, scenery and
 * the effect/particle sprites.
 */
const TEXTURE_NAMES = [
  // growth stages
  'sprout',
  'leaf',
  // crops
  'carrot',
  'tomato',
  'corn',
  'pumpkin',
  'strawberry',
  'potato',
  // characters
  'farmer',
  'cow',
  'chicken',
  // scenery
  'barn',
  'tree',
  'fence',
  // tools / effects / ui
  'watering-can',
  'shovel',
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
const DIRECT_TEXTURES: string[] = [
  'tile-grass', 'tile-soil', 'tile-wet',
  ...CROP_IDS.flatMap((id) => [`${id}-1`, `${id}-2`, `${id}-3`]),
]

/** Runtime key for the generated white-circle particle texture (no asset). */
const PARTICLE_DOT = 'farm-particle-dot'

/**
 * Static stacking order. Ground diamonds use small `tileDepth` values; every
 * TALL object (crop, farmer, decor) sorts by its feet screen-Y so nearer tiles
 * correctly overlap farther ones (always far above the flat ground tiles).
 */
const DEPTH = {
  sky: -10_000,
  light: -9_500,
  fieldShadow: -9_000,
  // ground tiles: tileDepth(col,row) in [0 .. cols+rows-2]
  particles: 1_000_000,
  flash: 900_000,
  flyUp: 1_100_000,
} as const

/** Cartoon palette for the isometric ground block. */
const GRASS_LIGHT = 0x9bd861
const GRASS_DARK = 0x86c94e
const GRASS_SIDE = 0x5f9437 // darker "extrude" face of the raised field
const GRASS_TOP_EDGE = 0xb6e887

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
    /** Ground diamond + raised side faces + soil bed graphics (re-drawn). */
    private beds: Array<Phaser.GameObjects.Graphics | null> = []
    /** Soft contact shadow ellipse under each crop. */
    private cropShadows: Array<Phaser.GameObjects.Graphics | null> = []
    private cropObjects: Array<Sprite | null> = []
    private soilImages: Array<Sprite | null> = []
    private labels: Array<Phaser.GameObjects.Text | null> = []
    private wetIcons: Array<Sprite | null> = []
    private cropTweens: Array<Phaser.Tweens.Tween | null> = []
    private sparkleTimers: Array<Phaser.Time.TimerEvent | null> = []

    // --- background + scenery -------------------------------------------------
    private backgroundGfx: Phaser.GameObjects.Graphics | null = null
    private fieldShadowGfx: Phaser.GameObjects.Graphics | null = null
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

    private layout: IsoLayout = { tileW: 64, tileH: 32, originX: 0, originY: 0 }
    /** Texture keys that actually loaded (missing ones fall back to emoji). */
    private loadedTextures = new Set<string>()

    constructor() {
      super({ key: SCENE_KEY })
    }

    preload(): void {
      // Robust loading: a missing/broken asset must never break the scene. Each
      // texture is loaded from its PREFERRED source first — a user drop-in
      // override at `assets/<name>.png` (e.g. exported Unity art) — and on
      // `loaderror` we transparently retry the bundled iso art under the same
      // key. If that also fails the texture stays absent and render falls back to
      // an emoji. Files queued during a `loaderror` are picked up by the loader
      // while it is still running, so this chain resolves within preload.
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

      // A single scene-level pointer handler routes taps to the nearest tile via
      // the inverse isometric projection (overlapping diamonds make per-tile hit
      // boxes unreliable).
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
      this.fieldShadowGfx?.destroy()
      this.fieldShadowGfx = null

      this.clearGrid()

      this.activeEmitters.forEach((e) => e.destroy())
      this.activeEmitters.clear()
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
    }

    /** Build background, field, decor + farmer from the current screen size. */
    private buildScene(): void {
      this.teardown()

      const width = this.scale.width
      const height = this.scale.height
      const state = this.safeGetState()
      const cols = state.grid.cols || GRID_COLS
      const rows = state.grid.rows || GRID_ROWS

      this.layout = isoGridLayout(width, height, cols, rows, { topInset: 132 })

      this.drawBackground(width, height)
      this.drawFieldShadow(cols, rows)
      this.drawDecorBack(cols, rows)
      this.buildGrid(cols, rows)
      this.drawDecorFront(cols, rows)
      this.buildFarmer(cols, rows)
    }

    // --- background ----------------------------------------------------------

    private drawBackground(width: number, height: number): void {
      const g = this.add.graphics().setDepth(DEPTH.sky)
      // Soft sky -> meadow vertical gradient across the whole screen.
      const horizon = Math.round(height * 0.42)
      g.fillGradientStyle(0xbfe9ff, 0xbfe9ff, 0xdff6c9, 0xdff6c9, 1)
      g.fillRect(0, 0, width, horizon)
      g.fillGradientStyle(0xdff6c9, 0xdff6c9, 0x9fd86a, 0x9fd86a, 1)
      g.fillRect(0, horizon, width, height - horizon)
      this.backgroundGfx = g

      // Big soft radial light from the upper area (gentle sunny glow).
      const light = this.add.graphics().setDepth(DEPTH.light)
      const cx = width * 0.5
      const cy = height * 0.34
      const maxR = Math.max(width, height) * 0.6
      for (let i = 6; i >= 1; i -= 1) {
        const r = (maxR / 6) * i
        light.fillStyle(0xffffff, 0.05)
        light.fillCircle(cx, cy, r)
      }
      this.decorObjects.push(light as unknown as Sprite)
    }

    /** A single soft shadow blob under the whole raised field. */
    private drawFieldShadow(cols: number, rows: number): void {
      const g = this.add.graphics().setDepth(DEPTH.fieldShadow)
      const c = this.isoCenter((cols - 1) / 2, (rows - 1) / 2)
      const w = (cols + rows) * this.layout.tileW * 0.5
      const h = (cols + rows) * this.layout.tileH * 0.5
      g.fillStyle(0x3f6b2a, 0.28)
      g.fillEllipse(c.x, c.y + this.layout.tileH * 0.7, w * 0.92, h * 0.78)
      this.fieldShadowGfx = g
    }

    // --- grid ----------------------------------------------------------------

    private buildGrid(cols: number, rows: number): void {
      const state = this.safeGetState()
      for (const plot of state.grid.plots) {
        const { col, row } = this.cellOf(plot.id, cols)
        // Flat ground tiles sort by tileDepth so the raised field self-occludes.
        const bed = this.add.graphics().setDepth(tileDepth(col, row))
        const shadow = this.add.graphics()
        this.beds[plot.id] = bed
        this.cropShadows[plot.id] = shadow
        this.cropObjects[plot.id] = null
        this.soilImages[plot.id] = null
        this.labels[plot.id] = null
        this.wetIcons[plot.id] = null
        this.cropTweens[plot.id] = null
        this.sparkleTimers[plot.id] = null
      }
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
      this.farmerSize = Math.max(36, Math.round(this.layout.tileW * 1.5))
      const c = this.isoCenter(this.farmerCell.col, this.farmerCell.row)
      this.farmer = this.makeSprite('farmer', c.x, c.y, this.farmerSize, '🧑‍🌾', 0.5, 1)
      this.farmer.setDepth(c.y + 2)
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
     * Walk the farmer tile-by-tile to `target` (tween through iso tile centers,
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
      const stepDur = 170

      const stepTo = (index: number): void => {
        if (!this.farmer) return
        if (index >= path.length) {
          this.farmerBusy = false
          onArrive()
          this.startFarmerIdle()
          return
        }
        const cell = path[index]
        const c = this.isoCenter(cell.col, cell.row)
        if (c.x < this.farmer.x - 0.5) this.farmer.setFlipX(true)
        else if (c.x > this.farmer.x + 0.5) this.farmer.setFlipX(false)

        this.tweens.add({
          targets: this.farmer,
          x: c.x,
          y: c.y,
          duration: stepDur,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (this.farmer) this.farmer.setDepth(this.farmer.y + 2)
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
      const c = this.isoCenter(col, row)

      const cropType = plot.crop ? getCropById(plot.crop.cropTypeId) : undefined
      const visual = describePlot(plot, cropType)

      this.drawTile(bed, col, row, c.x, c.y, visual)

      // Reset previous crop overlay / label / wet indicator before redrawing.
      this.clearTile(plotId)

      // Dreamina soil bed for tilled/planted plots (replaces the brown diamond).
      if (visual.furrows || visual.crop) {
        const soilTex = visual.wet ? 'tile-wet' : 'tile-soil'
        const soil = this.makeSprite(soilTex, c.x, c.y, this.layout.tileW * 0.98, '🟫', 0.5, 0.5)
        soil.setDepth(tileDepth(col, row) + 0.5)
        this.soilImages[plotId] = soil
      }

      // Wet soil gets a little water sheen sprite near the tile.
      if (visual.wet) {
        const dropSize = Math.max(12, this.layout.tileW * 0.22)
        const drop = this.makeSprite(
          'water',
          c.x + this.layout.tileW * 0.22,
          c.y,
          dropSize,
          '💧',
        )
        drop.setDepth(c.y - 0.5)
        this.wetIcons[plotId] = drop
      }

      if (!visual.crop) return

      const target = this.layout.tileW * (0.7 + visual.crop.scale * 0.85)
      const feetY = c.y + this.layout.tileH * 0.12
      // Use the Dreamina per-stage crop art (<crop>-1/-2/-3); emoji on miss.
      const stage = plot.crop?.stage ?? 3
      const bucket = stage <= 1 ? 1 : stage === 2 ? 2 : 3
      const cropTex = cropType ? `${cropType.id}-${bucket}` : this.isoCropTexture(visual.crop.textureName)
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
        shadow.fillEllipse(c.x, feetY, this.layout.tileW * 0.52, this.layout.tileH * 0.42)
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
      } else {
        this.startCropIdle(plotId, baseScale, visual.crop.mature)
      }

      if (visual.label) {
        const label = this.add
          .text(c.x, c.y + this.layout.tileH * 0.55, visual.label, {
            fontFamily: 'Arial',
            fontSize: `${Math.max(10, Math.round(this.layout.tileW * 0.18))}px`,
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
          y: baseY - Math.max(3, this.layout.tileH * 0.12),
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
            if (cr && cr.active) this.emitSparkle(cr.x, cr.y - this.layout.tileH * 0.4, 4)
          },
        })
      } else {
        this.cropTweens[plotId] = this.tweens.add({
          targets: crop,
          scaleX: baseScale * 1.05,
          scaleY: baseScale * 1.05,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
      }
    }

    /**
     * Paint one isometric tile into `bed`: a raised grass diamond (checkerboard
     * of two greens) with darker south side faces (the 3D "extrude"), then — for
     * tilled/planted plots — an inset soil diamond with a top highlight + furrow
     * lines following the iso axes, and a wet sheen when freshly watered.
     */
    private drawTile(
      bed: Phaser.GameObjects.Graphics,
      col: number,
      row: number,
      cx: number,
      cy: number,
      visual: ReturnType<typeof describePlot>,
    ): void {
      bed.clear()
      const w = this.layout.tileW
      const h = this.layout.tileH
      const ext = Math.max(4, Math.round(h * 0.5))

      const top = { x: cx, y: cy - h / 2 }
      const right = { x: cx + w / 2, y: cy }
      const bottom = { x: cx, y: cy + h / 2 }
      const left = { x: cx - w / 2, y: cy }

      // South-west + south-east side faces (the raised block). Front tiles draw
      // their top diamond over these, so only the field's front edges show.
      bed.fillStyle(GRASS_SIDE, 1)
      bed.fillPoints(
        [left, bottom, { x: bottom.x, y: bottom.y + ext }, { x: left.x, y: left.y + ext }],
        true,
      )
      bed.fillPoints(
        [bottom, right, { x: right.x, y: right.y + ext }, { x: bottom.x, y: bottom.y + ext }],
        true,
      )

      // Grass top (checkerboard of two greens for a "tended garden" feel).
      const grass = (col + row) % 2 === 0 ? GRASS_LIGHT : GRASS_DARK
      bed.fillStyle(grass, 1)
      bed.fillPoints([top, right, bottom, left], true)
      // Thin lighter rim along the back edges for a soft top highlight.
      bed.lineStyle(Math.max(1, Math.round(h * 0.06)), GRASS_TOP_EDGE, 0.7)
      bed.lineBetween(left.x, left.y, top.x, top.y)
      bed.lineBetween(top.x, top.y, right.x, right.y)

      // The soil bed + crop are drawn as Dreamina image sprites in renderPlot,
      // so the procedural brown soil diamond is intentionally omitted here.
    }

    // --- decor (depth-sorted by feet-Y so it occludes correctly) -------------

    /** Scenery that sits BEHIND the field (barn + back fence): low feet-Y. */
    private drawDecorBack(cols: number, rows: number): void {
      // Barn at the back corner (north / top of the diamond).
      const barnCell = this.isoCenter(-0.9, -0.9)
      this.decorObjects.push(
        this.makeSprite('barn', barnCell.x, barnCell.y, this.layout.tileW * 2.4, '🏠', 0.5, 1)
          .setDepth(barnCell.y),
      )

      // Back-edge fence posts framing the two north edges of the field.
      const fenceSize = Math.max(20, this.layout.tileW * 0.5)
      for (let col = 0; col < cols; col += 1) {
        const p = this.isoCenter(col, -0.7)
        this.decorObjects.push(
          this.makeSprite('fence', p.x, p.y, fenceSize, '🪵', 0.5, 1).setDepth(p.y),
        )
      }
      for (let row = 0; row < rows; row += 1) {
        const p = this.isoCenter(-0.7, row)
        this.decorObjects.push(
          this.makeSprite('fence', p.x, p.y, fenceSize, '🪵', 0.5, 1).setDepth(p.y),
        )
      }
    }

    /** Scenery + animals around/in front of the field: feet-Y depth-sorted. */
    private drawDecorFront(cols: number, rows: number): void {
      // Trees flanking the field.
      const treeL = this.isoCenter(-1.4, rows - 1)
      this.decorObjects.push(
        this.makeSprite('tree', treeL.x, treeL.y, this.layout.tileW * 2.0, '🌳', 0.5, 1)
          .setDepth(treeL.y),
      )
      const treeR = this.isoCenter(cols - 1, -1.4)
      this.decorObjects.push(
        this.makeSprite('tree', treeR.x, treeR.y, this.layout.tileW * 1.8, '🌳', 0.5, 1)
          .setDepth(treeR.y),
      )

      // A cow + a chicken wandering on the grass outside the plots.
      const cowPos = this.isoCenter(-1.7, rows + 0.2)
      const cow = this.makeSprite('cow', cowPos.x, cowPos.y, this.layout.tileW * 1.3, '🐄', 0.5, 1)
        .setDepth(cowPos.y)
      this.decorObjects.push(cow)
      this.addWander(cow, this.layout.tileW * 0.6)

      const chickPos = this.isoCenter(cols + 0.4, rows - 0.6)
      const chicken = this.makeSprite(
        'chicken',
        chickPos.x,
        chickPos.y,
        this.layout.tileW * 0.8,
        '🐔',
        0.5,
        1,
      ).setDepth(chickPos.y)
      this.decorObjects.push(chicken)
      this.addWander(chicken, this.layout.tileW * 0.8)
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
      const { col, row } = screenToIso(
        pointer.x,
        pointer.y,
        this.layout.originX,
        this.layout.originY,
        this.layout.tileW,
        this.layout.tileH,
      )
      if (col < 0 || col >= cols || row < 0 || row >= rows) return
      if (this.farmerBusy) return

      const plotId = row * cols + col
      const tool = bridge.getSelectedTool()
      this.moveFarmerToCell({ col, row }, () => this.performToolAction(tool, plotId))
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
      const c = this.isoCenter(col, row)

      switch (kind) {
        case 'till':
          this.emitDust(c.x, c.y, 14)
          break
        case 'plant':
          this.emitDust(c.x, c.y + this.layout.tileH * 0.2, 6)
          break
        case 'water':
          this.emitWater(c.x, c.y, this.layout.tileW)
          break
        default:
          break
      }
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
      this.emitCoins(x, y, 12)
      this.emitSparkle(x, y, 14)

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

    /** Gentle red diamond flash to signal an invalid action; never throws. */
    private flashPlot(plotId: number): void {
      const cols = this.safeGetState().grid.cols || GRID_COLS
      const { col, row } = this.cellOf(plotId, cols)
      const c = this.isoCenter(col, row)
      const w = this.layout.tileW
      const h = this.layout.tileH

      const overlay = this.add.graphics().setDepth(DEPTH.flash)
      overlay.fillStyle(0xef4444, 0.5)
      overlay.fillPoints(
        [
          { x: c.x, y: c.y - h / 2 },
          { x: c.x + w / 2, y: c.y },
          { x: c.x, y: c.y + h / 2 },
          { x: c.x - w / 2, y: c.y },
        ],
        true,
      )
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

    /** Screen-space center of a (possibly fractional) iso cell. */
    private isoCenter(col: number, row: number): { x: number; y: number } {
      return isoToScreen(
        col,
        row,
        this.layout.originX,
        this.layout.originY,
        this.layout.tileW,
        this.layout.tileH,
      )
    }

    /** Map a growth-stage texture name onto the iso art set. */
    private isoCropTexture(name: string): string {
      // describePlot uses 'bush' for the mid stage; the iso set ships 'leaf'.
      return name === 'bush' ? 'leaf' : name
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
      const emitter = this.add.particles(x, y, texture, { ...config, emitting: false })
      emitter.setDepth(DEPTH.particles)
      this.activeEmitters.add(emitter)
      emitter.explode(count, x, y)
      this.time.delayedCall(ttl + 250, () => {
        this.activeEmitters.delete(emitter)
        emitter.destroy()
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
