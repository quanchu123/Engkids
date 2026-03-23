/**
 * Debug Video Upload Flow
 * Script này giúp debug toàn bộ flow upload video từ frontend
 * 
 * Chạy với file video thật để test:
 *   node debug-upload.js "path/to/video.mp4"
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const https = require('https');
const http = require('http');

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const SERVER = 'http://localhost:3000';

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

console.log(`
${c.cyan}╔════════════════════════════════════════════════════════════╗
║                   DEBUG VIDEO UPLOAD                        ║
╚════════════════════════════════════════════════════════════╝${c.reset}
`);

async function main() {
  const videoPath = process.argv[2];
  
  if (!videoPath) {
    console.log(`${c.yellow}Usage: node debug-upload.js "path/to/video.mp4"${c.reset}`);
    console.log(`
${c.dim}This script will:
1. Check environment variables
2. Test Bunny.net API connection
3. Create video placeholder
4. Upload video file with detailed progress
5. Monitor encoding status
6. Show full debug info${c.reset}
`);
    
    // Run basic diagnostics without file
    await runDiagnostics();
    return;
  }
  
  if (!fs.existsSync(videoPath)) {
    console.log(`${c.red}File not found: ${videoPath}${c.reset}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(videoPath);
  const fileSizeMB = stats.size / (1024 * 1024);
  
  console.log(`${c.blue}File:${c.reset} ${videoPath}`);
  console.log(`${c.blue}Size:${c.reset} ${fileSizeMB.toFixed(2)} MB`);
  console.log('');
  
  if (fileSizeMB > 500) {
    console.log(`${c.red}⚠️  File exceeds 500MB limit!${c.reset}`);
    process.exit(1);
  }
  
  if (fileSizeMB > 100) {
    console.log(`${c.yellow}⚠️  Large file - upload may take a while${c.reset}`);
    console.log(`${c.yellow}   Estimated time: ${Math.ceil(fileSizeMB / 5)} - ${Math.ceil(fileSizeMB / 2)} minutes${c.reset}`);
  }
  
  let videoId = null;
  
  try {
    // Step 1: Create video
    console.log(`\n${c.cyan}[1/4] Creating video placeholder...${c.reset}`);
    videoId = await createVideo(`Debug Upload ${Date.now()}`);
    console.log(`${c.green}✓${c.reset} Video ID: ${videoId}`);
    
    // Step 2: Upload with detailed progress
    console.log(`\n${c.cyan}[2/4] Uploading to Bunny.net...${c.reset}`);
    await uploadWithProgress(videoId, videoPath, stats.size);
    
    // Step 3: Monitor status
    console.log(`\n${c.cyan}[3/4] Monitoring encoding status...${c.reset}`);
    await monitorStatus(videoId);
    
    // Step 4: Get final info
    console.log(`\n${c.cyan}[4/4] Final video info...${c.reset}`);
    await getVideoInfo(videoId);
    
  } catch (error) {
    console.log(`\n${c.red}ERROR: ${error.message}${c.reset}`);
    console.error(error);
  }
  
  // Ask about cleanup
  if (videoId) {
    console.log(`\n${c.yellow}─────────────────────────────────────────${c.reset}`);
    console.log(`Video ID: ${videoId}`);
    console.log(`To delete: node debug-upload.js --delete ${videoId}`);
  }
}

async function runDiagnostics() {
  console.log(`${c.cyan}Running diagnostics...${c.reset}\n`);
  
  // Check env
  console.log(`${c.bold}Environment Variables:${c.reset}`);
  console.log(`  BUNNY_API_KEY: ${BUNNY_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  BUNNY_LIBRARY_ID: ${BUNNY_LIBRARY_ID || '✗ Missing'}`);
  console.log(`  BUNNY_CDN_HOSTNAME: ${process.env.BUNNY_CDN_HOSTNAME || '✗ Missing'}`);
  
  // Check server
  console.log(`\n${c.bold}Local Server:${c.reset}`);
  try {
    const res = await httpRequest(`${SERVER}/api/videos`, 'GET');
    console.log(`  Status: ${res.status === 200 ? '✓ Running' : `⚠ ${res.status}`}`);
  } catch (e) {
    console.log(`  Status: ✗ Not running (${e.code || e.message})`);
  }
  
  // Check Bunny API
  console.log(`\n${c.bold}Bunny.net API:${c.reset}`);
  try {
    const videos = await listVideos();
    console.log(`  Connection: ✓ OK`);
    console.log(`  Videos in library: ${videos.totalItems}`);
  } catch (e) {
    console.log(`  Connection: ✗ Failed (${e.message})`);
  }
  
  console.log(`\n${c.dim}Provide a video file path to run full upload test.${c.reset}`);
}

function httpRequest(url, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, json: () => JSON.parse(data) }));
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    
    if (body) req.write(body);
    req.end();
  });
}

async function listVideos() {
  const res = await httpRequest(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
    'GET',
    { 'AccessKey': BUNNY_API_KEY }
  );
  return res.json();
}

async function createVideo(title) {
  const res = await httpRequest(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
    'POST',
    { 'AccessKey': BUNNY_API_KEY, 'Content-Type': 'application/json' },
    JSON.stringify({ title, isPublic: true })
  );
  
  if (res.status !== 200) throw new Error(`Create failed: ${res.body}`);
  return res.json().guid;
}

function uploadWithProgress(videoId, filePath, totalSize) {
  return new Promise((resolve, reject) => {
    const url = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`;
    const urlObj = new URL(url);
    
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': totalSize,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(''); // newline after progress
        if (res.statusCode === 200) {
          console.log(`${c.green}✓${c.reset} Upload complete!`);
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('');
      reject(e);
    });
    
    // Timeout: 30 minutes for large files
    req.setTimeout(30 * 60 * 1000, () => {
      req.destroy();
      reject(new Error('Upload timeout (30 minutes)'));
    });
    
    // Stream file with progress
    const stream = fs.createReadStream(filePath, { highWaterMark: 256 * 1024 }); // 256KB chunks
    let uploaded = 0;
    const startTime = Date.now();
    
    stream.on('data', (chunk) => {
      uploaded += chunk.length;
      const pct = ((uploaded / totalSize) * 100).toFixed(1);
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = uploaded / elapsed / 1024 / 1024; // MB/s
      const eta = speed > 0 ? (totalSize - uploaded) / speed / 1024 / 1024 : 0;
      
      process.stdout.write(
        `\r  ${pct}% | ${(uploaded/1024/1024).toFixed(1)}/${(totalSize/1024/1024).toFixed(1)} MB | ${speed.toFixed(2)} MB/s | ETA: ${Math.ceil(eta)}s    `
      );
    });
    
    stream.on('error', reject);
    stream.pipe(req);
  });
}

async function monitorStatus(videoId, maxWait = 300) {
  const startTime = Date.now();
  const statusNames = ['Queued', 'Processing', 'Encoding', 'Finished', 'ResFinished', 'Failed'];
  
  while ((Date.now() - startTime) / 1000 < maxWait) {
    const res = await httpRequest(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      'GET',
      { 'AccessKey': BUNNY_API_KEY }
    );
    
    const video = res.json();
    const statusName = statusNames[video.status] || video.status;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    process.stdout.write(`\r  Status: ${statusName} | Duration: ${video.length}s | Time: ${elapsed}s    `);
    
    if (video.status === 3 || video.status === 4) {
      console.log('');
      console.log(`${c.green}✓${c.reset} Encoding complete!`);
      return video;
    }
    
    if (video.status === 5) {
      console.log('');
      console.log(`${c.red}✗${c.reset} Encoding failed`);
      return video;
    }
    
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log('');
  console.log(`${c.yellow}⚠${c.reset} Still encoding after ${maxWait}s - check Bunny dashboard`);
}

async function getVideoInfo(videoId) {
  const res = await httpRequest(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    'GET',
    { 'AccessKey': BUNNY_API_KEY }
  );
  
  const video = res.json();
  const cdnHost = process.env.BUNNY_CDN_HOSTNAME;
  
  console.log(`
${c.bold}Video Details:${c.reset}
  ID: ${video.guid}
  Title: ${video.title}
  Duration: ${video.length}s
  Resolution: ${video.width}x${video.height}
  Status: ${['Queued', 'Processing', 'Encoding', 'Finished', 'ResFinished', 'Failed'][video.status]}

${c.bold}URLs:${c.reset}
  Thumbnail: https://${cdnHost}/${video.guid}/thumbnail.jpg
  HLS: https://${cdnHost}/${video.guid}/playlist.m3u8
  Embed: https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.guid}
`);
}

// Handle --delete flag
if (process.argv[2] === '--delete' && process.argv[3]) {
  (async () => {
    const videoId = process.argv[3];
    console.log(`Deleting video: ${videoId}`);
    
    try {
      await httpRequest(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
        'DELETE',
        { 'AccessKey': BUNNY_API_KEY }
      );
      console.log(`${c.green}✓${c.reset} Deleted`);
    } catch (e) {
      console.log(`${c.red}✗${c.reset} ${e.message}`);
    }
  })();
} else {
  main();
}
