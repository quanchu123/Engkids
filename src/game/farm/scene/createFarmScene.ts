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
// (farmSceneView) how to draw, and writes back through `bridge.setState()`.

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
}

/** Icon manifest names to preload as textures (crops + soil/sprout). */
const TEXTURE_NAMES = [
  'soil',
  'sprout',
  'carrot',
  'tomato',
  'corn',
  'pumpkin',
  'strawberry',
  'potato',
] as const

const SCENE_KEY = 'FarmScene'

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
    /** Per-plot rendered objects, indexed by plot id. */
    private tiles: Phaser.GameObjects.Rectangle[] = []
    private cropObjects: Array<Phaser.GameObjects.GameObject | null> = []
    private labels: Array<Phaser.GameObjects.Text | null> = []
    private layout: GridLayout = {
      tileSize: 8,
      gap: 8,
      originX: 0,
      originY: 0,
    }
    /** Texture keys that actually loaded (missing ones fall back to emoji). */
    private loadedTextures = new Set<string>()

    constructor() {
      super({ key: SCENE_KEY })
    }

    preload(): void {
      // Robust loading: a missing/broken asset must never break the scene. Track
      // successes so `describe`/render can fall back to emoji for the rest.
      this.load.on(
        'loaderror',
        (file: Phaser.Loader.File) => {
          this.loadedTextures.delete(file.key)
        },
      )
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
      this.buildGrid()

      // Redraw on resize so the RESIZE scale mode keeps the grid centered.
      this.scale.on('resize', this.handleResize, this)
      this.events.once(PhaserNS.Scenes.Events.SHUTDOWN, () => {
        this.scale.off('resize', this.handleResize, this)
      })
    }

    /** Public: re-read state and redraw everything (page calls after Next Day). */
    refresh(): void {
      this.renderAllPlots()
    }

    // --- grid construction ---------------------------------------------------

    private handleResize(): void {
      // Rebuild from scratch — cheap for a 24-tile grid and keeps layout exact.
      this.buildGrid()
    }

    private buildGrid(): void {
      // Clear any previous objects (resize / rebuild).
      this.tiles.forEach((t) => t.destroy())
      this.cropObjects.forEach((c) => c?.destroy())
      this.labels.forEach((l) => l?.destroy())
      this.tiles = []
      this.cropObjects = []
      this.labels = []

      const state = this.safeGetState()
      const cols = state.grid.cols || GRID_COLS
      const rows = state.grid.rows || GRID_ROWS

      this.layout = computeGridLayout(
        this.scale.width,
        this.scale.height,
        cols,
        rows,
      )

      const size = this.layout.tileSize
      for (const plot of state.grid.plots) {
        const { x, y } = plotCenter(this.layout, plot.id, cols)

        const tile = this.add
          .rectangle(x, y, size, size, 0x9b6a3b)
          .setStrokeStyle(2, 0x6b4a2b)
          .setInteractive({ useHandCursor: true })

        // Route pointer input to the matching pure system (no rule logic here).
        tile.on('pointerdown', () => this.handlePlotPointer(plot.id))

        this.tiles[plot.id] = tile
        this.cropObjects[plot.id] = null
        this.labels[plot.id] = null
      }

      this.renderAllPlots()
    }

    // --- rendering -----------------------------------------------------------

    private renderAllPlots(): void {
      const state = this.safeGetState()
      for (const plot of state.grid.plots) {
        this.renderPlot(plot.id)
      }
    }

    private renderPlot(plotId: number): void {
      const state = this.safeGetState()
      const plot = state.grid.plots.find((p) => p.id === plotId)
      const tile = this.tiles[plotId]
      if (!plot || !tile) return

      const cropType = plot.crop
        ? getCropById(plot.crop.cropTypeId)
        : undefined
      const visual = describePlot(plot, cropType)

      tile.setFillStyle(visual.bgColor)
      tile.setStrokeStyle(visual.borderWidth, visual.borderColor)

      // Reset previous crop overlay + label.
      this.cropObjects[plotId]?.destroy()
      this.cropObjects[plotId] = null
      this.labels[plotId]?.destroy()
      this.labels[plotId] = null

      if (!visual.crop) return

      const { x, y } = plotCenter(this.layout, plotId, state.grid.cols || GRID_COLS)
      const size = this.layout.tileSize
      const target = size * visual.crop.scale

      const hasTexture =
        this.loadedTextures.has(visual.crop.textureName) &&
        this.textures.exists(visual.crop.textureName)

      if (hasTexture) {
        const img = this.add.image(x, y, visual.crop.textureName)
        const tex = this.textures.get(visual.crop.textureName).getSourceImage()
        const longest = Math.max(tex.width || target, tex.height || target, 1)
        img.setScale(target / longest)
        img.setDepth(5)
        this.cropObjects[plotId] = img
      } else {
        // Texture missing (loaderror or no manifest entry) — draw an emoji.
        const emoji = this.add
          .text(x, y, visual.crop.fallbackEmoji, {
            fontFamily: 'Arial',
            fontSize: `${Math.round(target)}px`,
          })
          .setOrigin(0.5)
          .setDepth(5)
        this.cropObjects[plotId] = emoji
      }

      if (visual.label) {
        const label = this.add
          .text(x, y + size / 2 - 8, visual.label, {
            fontFamily: 'Arial',
            fontSize: `${Math.max(10, Math.round(size * 0.16))}px`,
            color: '#ffffff',
            backgroundColor: '#00000066',
            padding: { x: 3, y: 1 },
          })
          .setOrigin(0.5, 1)
          .setDepth(6)
        this.labels[plotId] = label
      }
    }

    // --- input routing -------------------------------------------------------

    private handlePlotPointer(plotId: number): void {
      const tool = bridge.getSelectedTool()
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

    /** Apply a non-harvest Result: commit + redraw on success, flash on fail. */
    private applyResult(
      result: { ok: boolean; reason?: string; state: FarmState },
      plotId: number,
      kind: string,
    ): void {
      if (result.ok) {
        bridge.setState(result.state)
        this.renderPlot(plotId)
        bridge.onAction?.(kind)
      } else {
        this.flashPlot(plotId)
      }
    }

    private handleHarvest(state: FarmState, plotId: number): void {
      const result = harvest(state, plotId, getCropById)
      if (result.ok) {
        bridge.setState(result.state)
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

    /** Gentle red flash to signal an invalid action; never throws. */
    private flashPlot(plotId: number): void {
      const tile = this.tiles[plotId]
      if (!tile) return
      const originalFill = tile.fillColor
      tile.setFillStyle(0xef4444)
      this.time.delayedCall(220, () => {
        if (tile.active) tile.setFillStyle(originalFill)
      })
    }

    // --- helpers -------------------------------------------------------------

    /** Read state via the bridge defensively; never let a bad read crash render. */
    private safeGetState(): FarmState {
      return bridge.getState()
    }
  }

  return FarmScene as unknown as new () => FarmSceneInstance
}

// Re-export so the page can reuse maturity checks for overlay messaging if needed.
export { isMature }
