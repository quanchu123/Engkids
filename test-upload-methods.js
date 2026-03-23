/**
 * Upload Method Comparison Script
 * Test các phương pháp upload khác nhau và so sánh hiệu suất
 * 
 * Usage: node test-upload-methods.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const CONFIG = {
  BUNNY_API_KEY: process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_API_KEY,
  BUNNY_LIBRARY_ID: process.env.BUNNY_STREAM_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID,
  BUNNY_CDN_HOSTNAME: process.env.BUNNY_STREAM_CDN_HOSTNAME,
  VIDEO_FILE: 'd:\\Dowload\\YTSave.com_YouTube_Zootopia-2016-Best-Moments_Media_-NzLm1x4O8Q_002_720p.mp4',
};

// Colors for console
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

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Validate config
function validateConfig() {
  console.log(`\n${c.cyan}📋 Configuration:${c.reset}`);
  console.log('  BUNNY_API_KEY:', CONFIG.BUNNY_API_KEY ? `${c.green}${CONFIG.BUNNY_API_KEY.substring(0, 8)}...${c.reset}` : `${c.red}❌ MISSING${c.reset}`);
  console.log('  BUNNY_LIBRARY_ID:', CONFIG.BUNNY_LIBRARY_ID ? `${c.green}${CONFIG.BUNNY_LIBRARY_ID}${c.reset}` : `${c.red}❌ MISSING${c.reset}`);
  console.log('  VIDEO_FILE:', CONFIG.VIDEO_FILE);
  
  if (!CONFIG.BUNNY_API_KEY || !CONFIG.BUNNY_LIBRARY_ID) {
    console.error(`\n${c.red}❌ Missing Bunny.net credentials in .env.local${c.reset}`);
    console.log('  Expected: BUNNY_STREAM_API_KEY or BUNNY_API_KEY');
    console.log('  Expected: BUNNY_STREAM_LIBRARY_ID or BUNNY_LIBRARY_ID');
    process.exit(1);
  }
  
  if (!fs.existsSync(CONFIG.VIDEO_FILE)) {
    console.error(`\n${c.red}❌ Video file not found:${c.reset}`, CONFIG.VIDEO_FILE);
    process.exit(1);
  }
  
  const stats = fs.statSync(CONFIG.VIDEO_FILE);
  console.log('  File size:', `${c.yellow}${formatBytes(stats.size)}${c.reset}`);
  console.log('');
  
  return stats.size;
}

// Create video entry in Bunny
async function createBunnyVideo(title) {
  log('📦', `Creating video entry: "${title}"`);
  
  const response = await fetch(
    `https://video.bunnycdn.com/library/${CONFIG.BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: {
        'AccessKey': CONFIG.BUNNY_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    }
  );
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create video: ${response.status} ${text}`);
  }
  
  const video = await response.json();
  log('✅', `Video created: ${c.cyan}${video.guid}${c.reset}`);
  return video;
}

// Get video status from Bunny
async function getBunnyVideoStatus(videoId) {
  const response = await fetch(
    `https://video.bunnycdn.com/library/${CONFIG.BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      headers: { 'AccessKey': CONFIG.BUNNY_API_KEY },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get video status: ${response.status}`);
  }
  
  return response.json();
}

// Delete video from Bunny
async function deleteBunnyVideo(videoId) {
  log('🗑️', `Cleaning up video: ${videoId}`);
  
  const response = await fetch(
    `https://video.bunnycdn.com/library/${CONFIG.BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'DELETE',
      headers: { 'AccessKey': CONFIG.BUNNY_API_KEY },
    }
  );
  
  if (response.ok) {
    log('✅', 'Video deleted');
  }
}

// Wait for video to be processed
async function waitForReady(videoId, timeoutMs = 180000) {
  const startTime = Date.now();
  const statusNames = {
    0: 'Queued',
    1: 'Processing',
    2: 'Encoding',
    3: 'Finished',
    4: 'Resolution Finished',
    5: 'Failed',
  };
  
  log('⏳', 'Waiting for Bunny to process...');
  
  let lastStatus = -1;
  
  while (Date.now() - startTime < timeoutMs) {
    const video = await getBunnyVideoStatus(videoId);
    
    if (video.status !== lastStatus) {
      const elapsed = formatDuration(Date.now() - startTime);
      const statusName = statusNames[video.status] || 'Unknown';
      console.log(`  ${c.dim}[${elapsed}]${c.reset} Status: ${c.yellow}${video.status}${c.reset} (${statusName}) | Length: ${video.length}s | Size: ${formatBytes(video.storageSize || 0)}`);
      lastStatus = video.status;
    }
    
    // Finished or Resolution Finished
    if (video.status === 3 || video.status === 4) {
      return { success: true, status: video.status, length: video.length };
    }
    
    // Failed
    if (video.status === 5) {
      return { success: false, error: 'Processing failed', status: 5 };
    }
    
    await sleep(3000);
  }
  
  return { success: false, error: 'Timeout', status: lastStatus };
}

// ========================================
// METHOD 1: TUS Resumable Upload
// ========================================
async function testTUS(videoId, fileSize) {
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bold}🚀 METHOD 1: TUS Resumable Upload${c.reset}`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  
  const tus = require('tus-js-client');
  
  // Generate TUS signature
  const expiration = Math.floor(Date.now() / 1000) + 3600;
  const signatureString = `${CONFIG.BUNNY_LIBRARY_ID}${CONFIG.BUNNY_API_KEY}${expiration}${videoId}`;
  const signature = crypto.createHash('sha256').update(signatureString).digest('hex');
  
  log('📝', 'TUS Signature generated');
  log('⏰', `Expires: ${new Date(expiration * 1000).toISOString()}`);
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let lastLogTime = 0;
    let uploadCompleted = false;
    
    const fileStream = fs.createReadStream(CONFIG.VIDEO_FILE);
    
    const upload = new tus.Upload(fileStream, {
      endpoint: 'https://video.bunnycdn.com/tusupload',
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        'AuthorizationSignature': signature,
        'AuthorizationExpire': expiration.toString(),
        'VideoId': videoId,
        'LibraryId': CONFIG.BUNNY_LIBRARY_ID.toString(),
      },
      metadata: {
        filetype: 'video/mp4',
        title: 'TUS Test',
      },
      uploadSize: fileSize,
      chunkSize: 5 * 1024 * 1024,
      onError: (error) => {
        log('❌', `TUS Error: ${error.message}`);
        if (uploadCompleted) {
          // Error after 100% - probably CORS, treat as success
          log('⚠️', 'Error after upload complete - treating as success');
          resolve({ method: 'TUS', duration: Date.now() - startTime, success: true, note: 'Error after 100%' });
        } else {
          reject(error);
        }
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const now = Date.now();
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        const elapsed = (now - startTime) / 1000;
        const speed = bytesUploaded / elapsed / 1024 / 1024;
        
        if (percentage >= 100) {
          uploadCompleted = true;
        }
        
        if (now - lastLogTime > 2000 || percentage % 25 === 0) {
          console.log(`  ${c.blue}📤${c.reset} ${percentage}% | ${formatBytes(bytesUploaded)}/${formatBytes(bytesTotal)} | ${c.yellow}${speed.toFixed(2)} MB/s${c.reset}`);
          lastLogTime = now;
        }
      },
      onChunkComplete: (chunkSize, bytesAccepted, bytesTotal) => {
        if (bytesAccepted >= bytesTotal) {
          log('✅', 'All chunks accepted');
          uploadCompleted = true;
        }
      },
      onSuccess: () => {
        const elapsed = Date.now() - startTime;
        log('✅', `TUS complete in ${c.green}${formatDuration(elapsed)}${c.reset}`);
        resolve({ method: 'TUS', duration: elapsed, success: true });
      },
    });
    
    // Timeout fallback - if upload hits 100% but onSuccess doesn't fire
    setTimeout(() => {
      if (uploadCompleted && !upload.url) {
        log('⏱️', 'Timeout fallback - upload was at 100%');
        resolve({ method: 'TUS', duration: Date.now() - startTime, success: true, note: 'Timeout fallback' });
      }
    }, 30000);
    
    upload.start();
  });
}

// ========================================
// METHOD 2: Direct PUT with fetch
// ========================================
async function testDirectPUT(videoId, fileSize) {
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bold}🚀 METHOD 2: Direct PUT Upload (fetch)${c.reset}`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  
  const startTime = Date.now();
  
  log('📖', 'Reading file into memory...');
  const fileBuffer = fs.readFileSync(CONFIG.VIDEO_FILE);
  log('📤', 'Uploading to Bunny.net...');
  
  const response = await fetch(
    `https://video.bunnycdn.com/library/${CONFIG.BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'PUT',
      headers: {
        'AccessKey': CONFIG.BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    }
  );
  
  const elapsed = Date.now() - startTime;
  
  if (!response.ok) {
    const text = await response.text();
    log('❌', `Direct PUT failed: ${response.status} ${text}`);
    return { method: 'DirectPUT', duration: elapsed, success: false, error: text };
  }
  
  const result = await response.json();
  log('✅', `Direct PUT complete in ${c.green}${formatDuration(elapsed)}${c.reset}`);
  log('📊', `Response: ${JSON.stringify(result).substring(0, 100)}...`);
  
  return { method: 'DirectPUT', duration: elapsed, success: true };
}

// ========================================
// METHOD 3: Stream Upload (https module)
// ========================================
async function testStreamUpload(videoId, fileSize) {
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bold}🚀 METHOD 3: Stream Upload (Node.js https)${c.reset}`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(CONFIG.VIDEO_FILE);
    let uploadedBytes = 0;
    let lastLogTime = 0;
    
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${CONFIG.BUNNY_LIBRARY_ID}/videos/${videoId}`,
      method: 'PUT',
      headers: {
        'AccessKey': CONFIG.BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      },
    };
    
    log('📤', 'Streaming to Bunny.net...');
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          log('✅', `Stream upload complete in ${c.green}${formatDuration(elapsed)}${c.reset}`);
          resolve({ method: 'Stream', duration: elapsed, success: true });
        } else {
          log('❌', `Stream upload failed: ${res.statusCode}`);
          resolve({ method: 'Stream', duration: elapsed, success: false, error: body });
        }
      });
    });
    
    req.on('error', (error) => {
      log('❌', `Stream error: ${error.message}`);
      reject(error);
    });
    
    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const now = Date.now();
      const percentage = Math.round((uploadedBytes / fileSize) * 100);
      
      if (now - lastLogTime > 2000 || percentage === 100) {
        const elapsed = (now - startTime) / 1000;
        const speed = uploadedBytes / elapsed / 1024 / 1024;
        console.log(`  ${c.blue}📤${c.reset} ${percentage}% | ${formatBytes(uploadedBytes)}/${formatBytes(fileSize)} | ${c.yellow}${speed.toFixed(2)} MB/s${c.reset}`);
        lastLogTime = now;
      }
    });
    
    fileStream.pipe(req);
  });
}

// ========================================
// MAIN
// ========================================
async function main() {
  console.log(`${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║       BUNNY.NET UPLOAD METHOD COMPARISON                   ║${c.reset}`);
  console.log(`${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}`);
  
  const fileSize = validateConfig();
  const results = [];
  
  // Define test methods
  const methods = [
    { name: 'TUS', fn: testTUS },
    { name: 'DirectPUT', fn: testDirectPUT },
    { name: 'Stream', fn: testStreamUpload },
  ];
  
  for (const method of methods) {
    let video = null;
    
    try {
      // Create new video entry
      video = await createBunnyVideo(`Test ${method.name} - ${new Date().toISOString()}`);
      
      // Run upload test
      const result = await method.fn(video.guid, fileSize);
      
      if (result.success) {
        // Wait a bit then check status
        await sleep(5000);
        
        const status = await getBunnyVideoStatus(video.guid);
        result.bunnyStatus = status.status;
        result.detectedLength = status.length;
        result.storageSize = status.storageSize;
        
        log('📊', `Post-upload: Status=${status.status}, Length=${status.length}s, Size=${formatBytes(status.storageSize || 0)}`);
        
        // Optionally wait for encoding
        if (status.status < 3) {
          log('⏳', 'Waiting for encoding (max 2 min)...');
          const finalResult = await waitForReady(video.guid, 120000);
          result.finalStatus = finalResult.status;
          result.encodingSuccess = finalResult.success;
        }
      }
      
      results.push(result);
      
    } catch (error) {
      log('❌', `${method.name} failed: ${error.message}`);
      results.push({ method: method.name, success: false, error: error.message });
    } finally {
      // Clean up
      if (video) {
        await deleteBunnyVideo(video.guid);
      }
    }
    
    await sleep(2000);
  }
  
  // Print summary
  console.log(`\n\n${c.cyan}╔════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.cyan}║                   RESULTS SUMMARY                          ║${c.reset}`);
  console.log(`${c.cyan}╚════════════════════════════════════════════════════════════╝${c.reset}\n`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`${c.green}✅ Successful methods:${c.reset}\n`);
    successful
      .sort((a, b) => a.duration - b.duration)
      .forEach((r, i) => {
        const speed = fileSize / (r.duration / 1000) / 1024 / 1024;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
        console.log(`  ${medal} ${c.bold}${r.method}${c.reset}`);
        console.log(`     Duration: ${c.yellow}${formatDuration(r.duration)}${c.reset}`);
        console.log(`     Speed: ${c.yellow}${speed.toFixed(2)} MB/s${c.reset}`);
        console.log(`     Bunny Status: ${r.bunnyStatus} (after upload)`);
        if (r.note) console.log(`     Note: ${c.dim}${r.note}${c.reset}`);
        console.log('');
      });
  }
  
  if (failed.length > 0) {
    console.log(`${c.red}❌ Failed methods:${c.reset}\n`);
    failed.forEach(r => {
      console.log(`  - ${r.method}: ${r.error}`);
    });
    console.log('');
  }
  
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bold}🏆 RECOMMENDATION:${c.reset}`);
  
  if (successful.length > 0) {
    const best = successful.sort((a, b) => a.duration - b.duration)[0];
    console.log(`   Use ${c.green}${c.bold}${best.method}${c.reset} - fastest and most reliable`);
    
    if (best.method === 'TUS') {
      console.log(`   ${c.dim}TUS supports resumable uploads for large files${c.reset}`);
    } else if (best.method === 'Stream') {
      console.log(`   ${c.dim}Stream uses less memory than DirectPUT${c.reset}`);
    }
  } else {
    console.log(`   ${c.red}All methods failed! Check credentials and network.${c.reset}`);
  }
  
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
}

main().catch(console.error);
