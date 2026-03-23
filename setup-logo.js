const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const src = 'D:\\Desktop\\engkid.jpg';
const publicDir = path.join(__dirname, 'public');
const dst = path.join(publicDir, 'engkids-logo.png');
const tmpPy = path.join(os.tmpdir(), 'setup_logo_engkids.py');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✅ Created public/ folder');
}

if (!fs.existsSync(src)) {
  console.log('❌ File not found:', src);
  console.log('   Please place your logo at D:\\Desktop\\engkid.jpg');
  process.exit(1);
}

const pyScript = `# -*- coding: utf-8 -*-
import sys
from PIL import Image
import numpy as np
from collections import deque

src = sys.argv[1]
dst = sys.argv[2]

img = Image.open(src).convert('RGBA')
data = np.array(img, dtype=np.uint8)
h, w = data.shape[:2]

# Build mask of pixels that are "near white" (potential background)
r, g, b = data[:,:,0].astype(int), data[:,:,1].astype(int), data[:,:,2].astype(int)
near_white = (r > 200) & (g > 200) & (b > 200)

# Flood-fill from all 4 edges to find only the BACKGROUND (not white inside the logo)
visited = np.zeros((h, w), dtype=bool)
queue = deque()

for x in range(w):
    if near_white[0, x] and not visited[0, x]:
        visited[0, x] = True
        queue.append((0, x))
    if near_white[h-1, x] and not visited[h-1, x]:
        visited[h-1, x] = True
        queue.append((h-1, x))
for y in range(h):
    if near_white[y, 0] and not visited[y, 0]:
        visited[y, 0] = True
        queue.append((y, 0))
    if near_white[y, w-1] and not visited[y, w-1]:
        visited[y, w-1] = True
        queue.append((y, w-1))

while queue:
    y, x = queue.popleft()
    for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and near_white[ny, nx]:
            visited[ny, nx] = True
            queue.append((ny, nx))

# visited = background pixels -> make transparent
# Anti-alias: soft edge for pixels adjacent to background
bg_mask = visited

# Expand one pixel for soft edge
from scipy.ndimage import binary_dilation
border = binary_dilation(bg_mask) & ~bg_mask & near_white

# Hard remove background
data[bg_mask, 3] = 0

# Soft edge
rr = data[:,:,0].astype(int)
gg = data[:,:,1].astype(int)
bb = data[:,:,2].astype(int)
brightness = (rr + gg + bb) // 3
alpha_edge = np.clip((255 - brightness), 0, 255).astype(np.uint8)
data[:,:,3][border] = alpha_edge[border]

result = Image.fromarray(data)
result.save(dst, 'PNG')
print('done')
`;

function runPython() {
  fs.writeFileSync(tmpPy, pyScript, 'utf8');
  execSync(`python "${tmpPy}" "${src}" "${dst}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
}

function cleanup() {
  try { fs.unlinkSync(tmpPy); } catch (_) {}
}

try {
  runPython();
  cleanup();
  console.log('✅ Background removed → public/engkids-logo.png');
} catch (e) {
  try {
    console.log('Installing Pillow + numpy...');
    execSync('pip install Pillow numpy', { stdio: 'inherit' });
    runPython();
    cleanup();
    console.log('✅ Background removed → public/engkids-logo.png');
  } catch (e2) {
    cleanup();
    console.log('⚠️  Python/Pillow not available, copying as-is...');
    fs.copyFileSync(src, dst);
    console.log('✅ Copied → public/engkids-logo.png (no background removal)');
  }
}
