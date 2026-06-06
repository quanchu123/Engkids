// Phaser scene factory for the English Farming Game (MVP) — Task 11.
//
// IMPORTANT: This module must TYPE-CHECK and load on the server (SSR) WITHOUT
// importing Phaser at runtime. We therefore:
//   - use a TYPE-ONLY import for Phaser (`import type Phaser from 'phaser'`),
//     which is erased at compile time and never emits a runtime `require`;
//   - take the live Phaser namespace as a *parameter* (`PhaserNS`) so the page
//     can `await import('phaser')` and pass it in (see Task 12 + rpg-world).
//
// The scene is a THIN renderer + input router. It contains NO game-rule logic:
// every mutation is delegated to the pure systems (farmingSystem) operating on a
// single `FarmState` owned by the React page via the `FarmBridge`. The scene
// reads state through `bridge.getState()`, asks the pure view helpers
// (farmSceneView) how to draw + lay out scenery, and writes back through
// `bridge.setState()`. All geometry/visual MATH lives in farmSceneView — this
// file only turns those descriptors into Phaser game objects, tweens + particles
// (the "polish") and routes input. Every texture is guarded by a loaderror
// fallback so a missing asset degrades to an emoji and never breaks rendering.

import type Phaser from 'phaser'
import type { FarmState, VocabLevel } from '../types'
import { GRID_COLS, GRID_ROWS } from '../constants'
import { getCropById } from '../data/crops'
import { farmIconSrc } from '../data/farmIcons'
import {
  till,
  plant,
  water,
  harvest,
  isMature,
} from '../systems/farmingSystem'
import {
  computeGridLayout,
  plotCenter,
  describePlot,
  isInventoryFullReason,
  computeBackgroundLayout,
  computeDecorLayout,
  gridTopInset,
  farmerHome,
  wrapValue,
  shadeColor,
  type GridLayout,
  type BackgroundLayout,
  type DecorLayout,
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
 * Icon manifest names to preload as textures. Missing/broken files fall back to
 * an emoji (see `loaderror` tracking) so the scene always renders. Covers the
 * crops, growth stages, the farmer, scenery + every particle/effect sprite.
 */
const TEXTURE_NAMES = [
  // soil + growth
  'soil',
  'sprout',
  'bush',
  // crops
  'carrot',
  'tomato',
  'corn',
  'pumpkin',
  'strawberry',
  'potato',
  // character
  'farmer',
  // scenery
  'sun',
  'cloud',
  'fence',
  'barn',
  'tree',
  'scarecrow',
  'grass',
  // effects / ui
  'water',
  'water-drop',
  'sparkle',
  'star',
  'coin',
] as const

const SCENE_KEY = 'FarmScene'

/** Runtime key for the generated white-circle particle texture (no asset). */
const PARTICLE_DOT = 'farm-particle-dot'

/** Stacking order so background/decor sit behind plots, which sit behind the farmer. */
const DEPTH = {
  sky: -100,
  sun: -85,
  cloud: -80,
  scenery: -70,
  fence: -60,
  bedShadow: 0,
  bed: 1,
  wetIcon: 3,
  hit: 4,
  crop: 6,
  label: 7,
  farmer: 10,
  flash: 14,
  particles: 22,
} as const

/** A textured sprite OR its emoji text fallback (both share x/y/scale/flipX). */
type Sprite = Phaser.GameObjects.Image | Phaser.GameObjects.Text

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
    /** Invisible interactive hit boxes that route pointer input per plot. */
    private hits: Phaser.GameObjects.Rectangle[] = []
    /** Re-drawn soil bed graphics (shadow + bed + highlight + furrows + border). */
    private beds: Phaser.GameObjects.Graphics[] = []
    private cropObjects: Array<Sprite | null> = []
    private labels: Array<Phaser.GameObjects.Text | null> = []
    private wetIcons: Array<Sprite | null> = []
    private cropTweens: Array<Phaser.Tweens.Tween | null> = []
    private sparkleTimers: Array<Phaser.Time.TimerEvent | null> = []

    // --- background + scenery -------------------------------------------------
    private backgroundGfx: Phaser.GameObjects.Graphics | null = null
    private decorObjects: Sprite[] = []
    private cloudTweens: Phaser.Tweens.Tween[] = []

    // --- character ------------------------------------------------------------
    private farmer: Sprite | null = null
    private farmerPos = { x: 0, y: 0, size: 40 }
    private farmerIdleTween: Phaser.Tweens.Tween | null = null
    private farmerReturnTimer: Phaser.Time.TimerEvent | null = null

    // --- effects --------------------------------------------------------------
    private activeEmitters = new Set<Phaser.GameObjects.Particles.ParticleEmitter>()
    private flashOverlays = new Set<Phaser.GameObjects.Graphics>()

    private layout: GridLayout = { tileSize: 8, gap: 8, originX: 0, originY: 0 }
    /** Texture keys that actually loaded (missing ones fall back to emoji). */
    private loadedTextures = new Set<string>()

    constructor() {
      super({ key: SCENE_KEY })
    }

    preload(): void {
      // Robust loading: a missing/broken asset must never break the scene. Track
      // successes so render can fall back to emoji for the rest.
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        this.loadedTextures.delete(file.key)
      })
      this.load.on('filecomplete', (key: string) => {
        this.loadedTextures.add(key)
      })

      for (const name of TEXTURE_NAMES) {
        const src = farmIconSrc(name)
        if (src) {
          // Load PNG icons by URL from public/games/english-farm/icons/.
          this.load.image(name, src)
        }
      }
    }

    create(): void {
      this.cameras.main.setBackgroundColor('#8fbc5a')
      this.ensureParticleTexture()
      this.buildScene()

      // Redraw on resize so the RESIZE scale mode keeps everything centered.
      this.scale.on('resize', this.handleResize, this)

      // Tear everything down on shutdown/destroy to avoid tween/emitter leaks.
      const teardown = (): void => this.teardown()
      this.events.once(PhaserNS.Scenes.Events.SHUTDOWN, () => {
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
      this.cancelFarmerAction()

      this.farmer?.destroy()
      this.farmer = null

      this.cloudTweens.forEach((t) => t.remove())
      this.cloudTweens = []
      this.decorObjects.forEach((o) => o.destroy())
      this.decorObjects = []

      this.backgroundGfx?.destroy()
      this.backgroundGfx = null

      this.clearGrid()

      this.activeEmitters.forEach((e) => e.destroy())
      this.activeEmitters.clear()
      this.flashOverlays.forEach((o) => o.destroy())
      this.flashOverlays.clear()
    }

    /** Destroy every per-plot object + kill its tweens/timers. */
    private clearGrid(): void {
      for (let i = 0; i < this.beds.length; i += 1) this.clearTile(i)
      this.hits.forEach((h) => h.destroy())
      this.beds.forEach((b) => b.destroy())
      this.hits = []
      this.beds = []
      this.cropObjects = []
      this.labels = []
      this.wetIcons = []
      this.cropTweens = []
      this.sparkleTimers = []
    }

    /** Build background, scenery, grid + farmer from the current screen size. */
    private buildScene(): void {
      this.teardown()

      const width = this.scale.width
      const height = this.scale.height
      const bg = computeBackgroundLayout(width, height)
      const decor = computeDecorLayout(bg)

      this.drawBackground(bg)
      this.drawDecor(bg, decor)
      this.buildGrid(bg)
      this.buildFarmer(bg)
    }

    // --- background + scenery ------------------------------------------------

    private drawBackground(bg: BackgroundLayout): void {
      const g = this.add.graphics().setDepth(DEPTH.sky)
      // Sky band: a soft blue gradient fading toward the horizon.
      g.fillGradientStyle(0x5fb8ef, 0x5fb8ef, 0xc6ecfb, 0xc6ecfb, 1)
      g.fillRect(0, 0, bg.width, bg.skyHeight)
      // Grass field: bright green up top easing into the camera background green.
      g.fillGradientStyle(0xa7d96c, 0xa7d96c, 0x7fae4f, 0x7fae4f, 1)
      g.fillRect(0, bg.skyHeight, bg.width, bg.grassHeight)
      this.backgroundGfx = g
    }

    private drawDecor(bg: BackgroundLayout, decor: DecorLayout): void {
      // Sun in the corner of the sky.
      this.decorObjects.push(
        this.makeSprite('sun', decor.sun.x, decor.sun.y, decor.sun.size, '☀️')
          .setDepth(DEPTH.sun),
      )

      // Drifting clouds: a looping tween advances a counter; wrapValue re-enters
      // the cloud from the far edge so the loop has no visible jump.
      decor.clouds.forEach((c, i) => {
        const cloud = this.makeSprite('cloud', c.x, c.y, c.size, '☁️').setDepth(
          DEPTH.cloud,
        )
        this.decorObjects.push(cloud)

        const half = c.size
        const min = -half
        const max = bg.width + half
        const span = max - min
        const speed = 12 + i * 5 // px/sec — gentle, slightly varied drift
        const proxy = { v: c.x }
        const tween = this.tweens.add({
          targets: proxy,
          v: c.x + span,
          duration: (span / speed) * 1000,
          repeat: -1,
          onUpdate: () => {
            if (cloud.active) cloud.x = wrapValue(proxy.v, min, max)
          },
        })
        this.cloudTweens.push(tween)
      })

      // Static framing scenery — anchored at their base so they sit on the grass.
      this.decorObjects.push(
        this.makeSprite('barn', decor.barn.x, decor.barn.y, decor.barn.size, '🏠', 0.5, 1)
          .setDepth(DEPTH.scenery),
      )
      this.decorObjects.push(
        this.makeSprite('tree', decor.tree.x, decor.tree.y, decor.tree.size, '🌳', 0.5, 1)
          .setDepth(DEPTH.scenery),
      )
      this.decorObjects.push(
        this.makeSprite(
          'scarecrow',
          decor.scarecrow.x,
          decor.scarecrow.y,
          decor.scarecrow.size,
          '🎃',
          0.5,
          1,
        ).setDepth(DEPTH.scenery),
      )

      // A row of fence posts along the sky/grass seam.
      for (const x of decor.fence.xs) {
        this.decorObjects.push(
          this.makeSprite('fence', x, decor.fence.y, decor.fence.size, '🪵', 0.5, 0.5)
            .setDepth(DEPTH.fence),
        )
      }
    }

    // --- grid ----------------------------------------------------------------

    private buildGrid(bg: BackgroundLayout): void {
      const state = this.safeGetState()
      const cols = state.grid.cols || GRID_COLS
      const rows = state.grid.rows || GRID_ROWS

      // Drop the grid below the fence line so it sits on the grass.
      this.layout = computeGridLayout(this.scale.width, this.scale.height, cols, rows, {
        topInset: gridTopInset(this.scale.height, bg.skyHeight),
      })

      const size = this.layout.tileSize
      for (const plot of state.grid.plots) {
        const { x, y } = plotCenter(this.layout, plot.id, cols)

        // The soil bed is pure graphics (re-drawn per render); a transparent
        // rectangle on top carries the interactivity (routes pointer input).
        const bed = this.add.graphics().setDepth(DEPTH.bed)
        const hit = this.add
          .rectangle(x, y, size, size, 0x000000, 0)
          .setDepth(DEPTH.hit)
          .setInteractive({ useHandCursor: true })
        hit.on('pointerdown', () => this.handlePlotPointer(plot.id))

        this.beds[plot.id] = bed
        this.hits[plot.id] = hit
        this.cropObjects[plot.id] = null
        this.labels[plot.id] = null
        this.wetIcons[plot.id] = null
        this.cropTweens[plot.id] = null
        this.sparkleTimers[plot.id] = null
      }

      this.renderAllPlots()
    }

    // --- character -----------------------------------------------------------

    private buildFarmer(bg: BackgroundLayout): void {
      const home = farmerHome(bg)
      this.farmerPos = { x: home.x, y: home.y, size: home.size }
      this.farmer = this.makeSprite('farmer', home.x, home.y, home.size, '🧑‍🌾', 0.5, 1)
        .setDepth(DEPTH.farmer)
      this.startFarmerIdle()
    }

    /** Gentle vertical bob around the farmer's current resting position. */
    private startFarmerIdle(): void {
      if (!this.farmer) return
      const baseY = this.farmer.y
      this.farmerIdleTween = this.tweens.add({
        targets: this.farmer,
        y: baseY - Math.max(3, this.farmerPos.size * 0.05),
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    /** Stop any walk/return/idle motion (latest tap wins, no overlap). */
    private cancelFarmerAction(): void {
      if (this.farmer) this.tweens.killTweensOf(this.farmer)
      this.farmerIdleTween = null
      if (this.farmerReturnTimer) {
        this.farmerReturnTimer.remove(false)
        this.farmerReturnTimer = null
      }
    }

    /**
     * Walk the farmer beside the plot with a little hop, run `onArrive` (the
     * action), then ease back toward home after a beat. Purely visual — the
     * action result still comes from the pure systems via the bridge.
     */
    private moveFarmerToPlot(plotId: number, onArrive: () => void): void {
      if (!this.farmer) {
        onArrive()
        return
      }
      this.cancelFarmerAction()

      const cols = this.safeGetState().grid.cols || GRID_COLS
      const c = plotCenter(this.layout, plotId, cols)
      const offset = this.layout.tileSize * 0.5 + this.farmerPos.size * 0.35
      const fromLeft = this.farmer.x <= c.x
      const besideX = fromLeft ? c.x - offset : c.x + offset
      const targetY = c.y

      this.farmer.setFlipX(besideX < this.farmer.x)

      const dist = Math.hypot(besideX - this.farmer.x, targetY - this.farmer.y)
      const dur = Math.min(560, Math.max(220, dist * 1.1))
      const apexY = Math.min(this.farmer.y, targetY) - this.layout.tileSize * 0.35
      const midX = (this.farmer.x + besideX) / 2

      // Two-leg hop arc: up to the apex, then down beside the plot.
      this.tweens.add({
        targets: this.farmer,
        x: midX,
        y: apexY,
        duration: dur / 2,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (!this.farmer) return
          this.tweens.add({
            targets: this.farmer,
            x: besideX,
            y: targetY,
            duration: dur / 2,
            ease: 'Sine.easeIn',
            onComplete: () => {
              onArrive()
              this.farmerReturnTimer = this.time.delayedCall(650, () =>
                this.returnFarmerHome(),
              )
            },
          })
        },
      })
    }

    /** Ease the farmer back to its home spot and resume the idle bob. */
    private returnFarmerHome(): void {
      if (!this.farmer) return
      this.farmer.setFlipX(this.farmerPos.x < this.farmer.x)
      this.tweens.add({
        targets: this.farmer,
        x: this.farmerPos.x,
        y: this.farmerPos.y,
        duration: 320,
        ease: 'Sine.easeInOut',
        onComplete: () => this.startFarmerIdle(),
      })
    }

    // --- rendering -----------------------------------------------------------

    private renderAllPlots(): void {
      const state = this.safeGetState()
      for (const plot of state.grid.plots) {
        this.renderPlot(plot.id)
      }
    }

    /** Destroy a tile's crop/label/wet overlay + kill its tweens/timers. */
    private clearTile(plotId: number): void {
      this.cropTweens[plotId]?.remove()
      this.cropTweens[plotId] = null
      this.sparkleTimers[plotId]?.remove(false)
      this.sparkleTimers[plotId] = null
      this.cropObjects[plotId]?.destroy()
      this.cropObjects[plotId] = null
      this.labels[plotId]?.destroy()
      this.labels[plotId] = null
      this.wetIcons[plotId]?.destroy()
      this.wetIcons[plotId] = null
    }

    private renderPlot(plotId: number, opts: { pop?: boolean } = {}): void {
      const state = this.safeGetState()
      const plot = state.grid.plots.find((p) => p.id === plotId)
      const bed = this.beds[plotId]
      if (!plot || !bed) return

      const cropType = plot.crop ? getCropById(plot.crop.cropTypeId) : undefined
      const visual = describePlot(plot, cropType)

      const cols = state.grid.cols || GRID_COLS
      const { x, y } = plotCenter(this.layout, plotId, cols)
      const size = this.layout.tileSize

      this.drawBed(bed, x, y, size, visual)

      // Reset previous crop overlay / label / wet indicator before redrawing.
      this.clearTile(plotId)

      // Wet soil gets a tiny droplet indicator in the top-right corner.
      if (visual.wet) {
        const dropSize = Math.max(10, size * 0.18)
        const drop = this.makeSprite(
          this.firstTexture('water-drop', 'water') ?? 'water-drop',
          x + size * 0.32,
          y - size * 0.32,
          dropSize,
          '💧',
        ).setDepth(DEPTH.wetIcon)
        this.wetIcons[plotId] = drop
      }

      if (!visual.crop) return

      const target = size * visual.crop.scale
      const crop = this.makeSprite(
        visual.crop.textureName,
        x,
        y - size * 0.06,
        target,
        visual.crop.fallbackEmoji,
      ).setDepth(DEPTH.crop)
      this.cropObjects[plotId] = crop

      const baseScale = crop.scaleX

      if (opts.pop) {
        // Plant pop-in: spring the sprout up from nothing, then settle to idle.
        crop.setScale(0)
        this.cropTweens[plotId] = this.tweens.add({
          targets: crop,
          scaleX: baseScale,
          scaleY: baseScale,
          duration: 320,
          ease: 'Back.easeOut',
          onComplete: () => this.startCropIdle(plotId, baseScale, visual.crop?.mature ?? false),
        })
      } else {
        this.startCropIdle(plotId, baseScale, visual.crop.mature)
      }

      if (visual.label) {
        const label = this.add
          .text(x, y + size / 2 - 6, visual.label, {
            fontFamily: 'Arial',
            fontSize: `${Math.max(10, Math.round(size * 0.16))}px`,
            color: '#ffffff',
            backgroundColor: '#00000066',
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.label)
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
        // Occasional sparkle near a harvest-ready crop.
        this.sparkleTimers[plotId]?.remove(false)
        this.sparkleTimers[plotId] = this.time.addEvent({
          delay: 2200,
          loop: true,
          callback: () => {
            const c = this.cropObjects[plotId]
            if (c && c.active) this.emitSparkle(c.x, c.y, 4)
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

    /** Paint a raised garden bed: shadow, soil, top highlight, furrows, border. */
    private drawBed(
      bed: Phaser.GameObjects.Graphics,
      cx: number,
      cy: number,
      size: number,
      visual: ReturnType<typeof describePlot>,
    ): void {
      bed.clear()
      const left = cx - size / 2
      const top = cy - size / 2
      const radius = Math.max(4, Math.round(size * 0.12))

      // Soft drop shadow underneath the bed.
      bed.fillStyle(shadeColor(visual.bgColor, -0.5), 0.3)
      bed.fillRoundedRect(left, top + Math.max(3, size * 0.06), size, size, radius)

      // The soil bed itself.
      bed.fillStyle(visual.bgColor, 1)
      bed.fillRoundedRect(left, top, size, size, radius)

      // Lighter highlight band across the upper third (rounded top, flat bottom).
      bed.fillStyle(shadeColor(visual.bgColor, 0.35), 1)
      bed.fillRoundedRect(left, top, size, size * 0.34, {
        tl: radius,
        tr: radius,
        bl: 0,
        br: 0,
      })

      // Furrow lines across the lower soil for tilled/planted beds.
      if (visual.furrows) {
        const furrowColor = shadeColor(visual.bgColor, -0.25)
        bed.lineStyle(Math.max(1, Math.round(size * 0.03)), furrowColor, 0.9)
        const startY = top + size * 0.5
        const stepY = size * 0.16
        const inset = size * 0.16
        for (let i = 0; i < 3; i += 1) {
          const ly = startY + stepY * i
          bed.lineBetween(left + inset, ly, left + size - inset, ly)
        }
      }

      // Border (gold + thicker when the crop is mature).
      bed.lineStyle(visual.borderWidth, visual.borderColor, 1)
      bed.strokeRoundedRect(left, top, size, size, radius)
    }

    // --- input routing -------------------------------------------------------

    private handlePlotPointer(plotId: number): void {
      // Walk the farmer over first; the action runs on arrival (routing below is
      // identical to operating directly on the pure systems).
      const tool = bridge.getSelectedTool()
      this.moveFarmerToPlot(plotId, () => this.performToolAction(tool, plotId))
    }

    /** Route the selected tool to its pure system (no rule logic here). */
    private performToolAction(tool: FarmTool, plotId: number): void {
      const state = this.safeGetState()
      switch (tool) {
        case 'hoe': {
          this.applyResult(till(state, plotId), plotId, 'till')
          break
        }
        case 'seed': {
          const seedId = bridge.getSelectedSeed()
          this.applyResult(plant(state, plotId, seedId), plotId, 'plant')
          break
        }
        case 'water': {
          this.applyResult(water(state, plotId), plotId, 'water')
          break
        }
        case 'harvest': {
          this.handleHarvest(state, plotId)
          break
        }
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
        // Fly the harvested crop up toward the HUD before redrawing empty soil.
        this.popHarvestCrop(plotId)
        this.renderPlot(plotId)
        bridge.onHarvest(result.word)
        bridge.onAction?.('harvest')
        return
      }

      if (isInventoryFullReason(result.reason)) {
        bridge.onInventoryFull()
      }
      this.flashPlot(plotId)
    }

    // --- juice (particles + tweens) ------------------------------------------

    private playActionEffect(kind: string, plotId: number): void {
      const cols = this.safeGetState().grid.cols || GRID_COLS
      const { x, y } = plotCenter(this.layout, plotId, cols)
      const size = this.layout.tileSize

      switch (kind) {
        case 'till':
          this.emitDust(x, y, 14)
          break
        case 'plant':
          this.emitDust(x, y + size * 0.2, 6)
          break
        case 'water':
          this.emitWater(x, y, size)
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
      const tex = this.firstTexture('water-drop', 'water')
      const fromY = y - size * 0.55
      if (tex) {
        this.burst(tex, x, fromY, 10, 650, {
          x: { min: -size * 0.32, max: size * 0.32 },
          speedY: { min: 30, max: 80 },
          gravityY: 320,
          lifespan: 650,
          scale: { start: size / 900, end: size / 1800 },
          alpha: { start: 0.95, end: 0 },
        })
      } else {
        this.burst(PARTICLE_DOT, x, fromY, 10, 650, {
          x: { min: -size * 0.32, max: size * 0.32 },
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
      const tex = this.firstTexture('sparkle', 'star')
      if (tex) {
        this.burst(tex, x, y, count, 750, {
          speed: { min: 60, max: 200 },
          angle: { min: 0, max: 360 },
          lifespan: 750,
          scale: { start: 0.6, end: 0 },
          alpha: { start: 1, end: 0 },
          rotate: { min: 0, max: 360 },
          blendMode: 'ADD',
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

    /**
     * Detach the current crop sprite (without destroying it) and tween it up
     * toward the HUD basket while fading, then destroy it. Also bursts sparkles.
     */
    private popHarvestCrop(plotId: number): void {
      const crop = this.cropObjects[plotId]
      // Stop the tile's idle tween/sparkle timer + release ownership so the
      // upcoming renderPlot (empty soil) won't destroy the flying sprite.
      this.cropTweens[plotId]?.remove()
      this.cropTweens[plotId] = null
      this.sparkleTimers[plotId]?.remove(false)
      this.sparkleTimers[plotId] = null
      this.cropObjects[plotId] = null

      this.emitSparkle(crop?.x ?? 0, crop?.y ?? 0, 16)

      if (!crop) return
      this.tweens.killTweensOf(crop)
      const baseScale = crop.scaleX
      this.tweens.add({
        targets: crop,
        y: crop.y - this.scale.height * 0.18,
        x: this.scale.width * 0.5,
        scaleX: baseScale * 1.25,
        scaleY: baseScale * 1.25,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => crop.destroy(),
      })
    }

    /** Gentle red flash to signal an invalid action; never throws. */
    private flashPlot(plotId: number): void {
      const cols = this.safeGetState().grid.cols || GRID_COLS
      const { x, y } = plotCenter(this.layout, plotId, cols)
      const size = this.layout.tileSize
      const radius = Math.max(4, Math.round(size * 0.12))

      const overlay = this.add.graphics().setDepth(DEPTH.flash)
      overlay.fillStyle(0xef4444, 0.5)
      overlay.fillRoundedRect(x - size / 2, y - size / 2, size, size, radius)
      this.flashOverlays.add(overlay)

      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.flashOverlays.delete(overlay)
          overlay.destroy()
        },
      })
    }

    // --- helpers -------------------------------------------------------------

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
