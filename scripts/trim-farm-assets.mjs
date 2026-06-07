// Trim transparent padding from farm sprite PNGs so their visible content fills
// the image. This fixes "floating crops": sprites are scaled by longest side and
// bottom-anchored, but the Dreamina exports have huge asymmetric transparent
// padding (content sits in the top-left quadrant), so the plant floated above
// the soil. After trimming, origin (0.5,1) places the plant base on the soil.
//
// Solid full-bleed ground tiles are intentionally NOT trimmed (they must stay
// square so they tile the plot grid edge-to-edge).
import { PNG } from 'pngjs'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve('public/games/english-farm/assets')
// Ground tiles must remain full squares.
const SKIP = new Set(['tile-soil.png', 'tile-wet.png', 'tile-grass.png'])

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.png') && !SKIP.has(f))

function trim(file) {
  const full = path.join(dir, file)
  const png = PNG.sync.read(fs.readFileSync(full))
  const { width, height, data } = png
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return { file, skipped: 'empty' }
  // Small safety margin so anti-aliased edges aren't clipped.
  const pad = Math.round(Math.max(width, height) * 0.01)
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad)
  maxY = Math.min(height - 1, maxY + pad)
  const bw = maxX - minX + 1
  const bh = maxY - minY + 1
  if (bw === width && bh === height) return { file, skipped: 'already-tight' }

  const out = new PNG({ width: bw, height: bh })
  for (let y = 0; y < bh; y += 1) {
    for (let x = 0; x < bw; x += 1) {
      const si = ((minY + y) * width + (minX + x)) * 4
      const di = (y * bw + x) * 4
      out.data[di] = data[si]
      out.data[di + 1] = data[si + 1]
      out.data[di + 2] = data[si + 2]
      out.data[di + 3] = data[si + 3]
    }
  }
  fs.writeFileSync(full, PNG.sync.write(out))
  return { file, from: `${width}x${height}`, to: `${bw}x${bh}` }
}

for (const f of files) {
  const r = trim(f)
  if (r.skipped) console.log(`${f.padEnd(18)} skip (${r.skipped})`)
  else console.log(`${f.padEnd(18)} ${r.from} -> ${r.to}`)
}
console.log('done')
