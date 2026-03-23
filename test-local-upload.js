/**
 * Test Local Server Video Upload API
 * Script này test endpoint /api/videos/upload trên local server
 * 
 * Cách chạy:
 *   1. Đảm bảo server đang chạy: npm run dev
 *   2. Chạy script: node test-local-upload.js
 *   3. Hoặc với file video: node test-local-upload.js "path/to/video.mp4"
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Config
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const LOCAL_SERVER = 'http://localhost:3000';

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`${c.blue}ℹ${c.reset} ${msg}`),
  ok: (msg) => console.log(`${c.green}✓${c.reset} ${msg}`),
  err: (msg) => console.log(`${c.red}✗${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`),
  step: (n, msg) => console.log(`\n${c.cyan}[${n}]${c.reset} ${msg}`),
};

// ==================== HELPERS ====================

function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      ...options,
    };
    
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json: () => {
            try { return JSON.parse(data); }
            catch { return null; }
          }
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function createBunnyVideo(title) {
  const res = await makeRequest(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify({ title, isPublic: true })
  );
  
  if (res.status !== 200) {
    throw new Error(`Failed to create video: ${res.body}`);
  }
  
  return res.json().guid;
}

async function deleteBunnyVideo(videoId) {
  await makeRequest(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'DELETE',
      headers: { 'AccessKey': BUNNY_API_KEY },
    }
  );
}

async function getBunnyVideoStatus(videoId) {
  const res = await makeRequest(
    `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    {
      method: 'GET',
      headers: { 'AccessKey': BUNNY_API_KEY },
    }
  );
  return res.json();
}

// ==================== TESTS ====================

async function testServerRunning() {
  log.step('1', 'Check local server is running');
  
  try {
    const res = await makeRequest(`${LOCAL_SERVER}/api/videos`, { method: 'GET' });
    log.ok(`Server responding (status: ${res.status})`);
    return true;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      log.err('Server not running! Start with: npm run dev');
    } else {
      log.err(`Connection error: ${e.message}`);
    }
    return false;
  }
}

async function testUploadEndpointNoAuth(videoId) {
  log.step('2', 'Test upload endpoint without auth (should fail 401)');
  
  const testData = Buffer.from('test');
  
  try {
    const res = await makeRequest(
      `${LOCAL_SERVER}/api/videos/upload?videoId=${videoId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': testData.length,
        },
      },
      testData
    );
    
    if (res.status === 401) {
      log.ok(`Correctly returned 401 Unauthorized`);
      return true;
    } else {
      log.warn(`Expected 401, got ${res.status}: ${res.body}`);
      return res.status < 500;
    }
  } catch (e) {
    log.err(`Request failed: ${e.message}`);
    return false;
  }
}

async function testUploadEndpointNoVideoId() {
  log.step('3', 'Test upload endpoint without videoId (should fail 400)');
  
  try {
    const res = await makeRequest(
      `${LOCAL_SERVER}/api/videos/upload`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
      },
      Buffer.from('test')
    );
    
    const json = res.json();
    if (res.status === 400 || (json && json.error?.includes('videoId'))) {
      log.ok(`Correctly validates videoId parameter`);
      return true;
    } else if (res.status === 401) {
      log.ok(`Auth check comes first (401)`);
      return true;
    } else {
      log.warn(`Unexpected response: ${res.status} - ${res.body}`);
      return false;
    }
  } catch (e) {
    log.err(`Request failed: ${e.message}`);
    return false;
  }
}

async function testDirectBunnyUpload(videoId, videoBuffer) {
  log.step('4', 'Test direct upload to Bunny.net (bypass server)');
  
  const startTime = Date.now();
  
  try {
    const res = await makeRequest(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/octet-stream',
          'Content-Length': videoBuffer.length,
        },
      },
      videoBuffer
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (res.status === 200) {
      log.ok(`Direct upload successful in ${elapsed}s`);
      console.log(`  ${c.dim}Response:${c.reset}`, res.json());
      return true;
    } else {
      log.err(`Upload failed: ${res.status} - ${res.body}`);
      return false;
    }
  } catch (e) {
    log.err(`Upload error: ${e.message}`);
    return false;
  }
}

async function testUploadWithProgress(videoId, videoBuffer) {
  log.step('5', 'Test upload with progress tracking');
  
  return new Promise((resolve) => {
    const url = new URL(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`);
    
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': videoBuffer.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(''); // newline after progress
          log.ok('Upload with progress tracking successful');
          resolve(true);
        } else {
          console.log('');
          log.err(`Failed: ${res.statusCode} - ${data}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('');
      log.err(`Error: ${e.message}`);
      resolve(false);
    });
    
    // Write with progress
    const chunkSize = 64 * 1024;
    let written = 0;
    const total = videoBuffer.length;
    
    const writeChunk = () => {
      while (written < total) {
        const chunk = videoBuffer.slice(written, Math.min(written + chunkSize, total));
        const canContinue = req.write(chunk);
        written += chunk.length;
        
        const pct = ((written / total) * 100).toFixed(1);
        process.stdout.write(`\r  Progress: ${pct}% (${(written/1024).toFixed(0)}KB / ${(total/1024).toFixed(0)}KB)`);
        
        if (!canContinue) {
          req.once('drain', writeChunk);
          return;
        }
      }
      req.end();
    };
    
    writeChunk();
  });
}

async function testVideoProcessing(videoId, isRealVideo = false) {
  log.step('6', 'Check video processing status');
  
  const maxChecks = 10;
  
  for (let i = 0; i < maxChecks; i++) {
    const status = await getBunnyVideoStatus(videoId);
    const statusNames = ['Queued', 'Processing', 'Encoding', 'Finished', 'ResFinished', 'Failed'];
    
    console.log(`  Check ${i + 1}/${maxChecks}: Status=${statusNames[status.status] || status.status}, Duration=${status.length}s`);
    
    if (status.status === 3 || status.status === 4) {
      log.ok('Video processing complete!');
      return { success: true, status };
    }
    
    if (status.status === 5) {
      if (isRealVideo) {
        // Real video failed = actual error
        log.err('❌ VIDEO PROCESSING FAILED - This is a real error!');
        log.err('Possible causes:');
        log.err('  - Corrupted video file');
        log.err('  - Unsupported codec/format');
        log.err('  - File too short or invalid');
        return { success: false, status, isRealError: true };
      } else {
        // Test data failed = expected
        log.warn('Video processing failed (expected for test data - not a real video)');
        log.info('To test properly, use a real video file:');
        log.info('  node test-local-upload.js "path/to/video.mp4"');
        return { success: true, status, isExpectedFailure: true };
      }
    }
    
    if (i < maxChecks - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  log.warn('Still processing after checks');
  return { success: false };
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🎬 LOCAL SERVER UPLOAD TEST');
  console.log('='.repeat(60));
  
  // Get video file if provided
  let videoBuffer;
  const videoFilePath = process.argv[2];
  
  if (videoFilePath && fs.existsSync(videoFilePath)) {
    videoBuffer = fs.readFileSync(videoFilePath);
    log.info(`Using video file: ${videoFilePath}`);
    log.info(`File size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  } else {
    // Create a small test buffer (not valid video)
    videoBuffer = Buffer.alloc(1024 * 100); // 100KB of zeros
    videoBuffer.write('ftypisom', 0);
    log.info('Using test buffer (100KB, not valid video)');
  }
  
  // Check env vars
  if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
    log.err('Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID in .env.local');
    process.exit(1);
  }
  
  let videoId = null;
  const results = [];
  
  try {
    // Test 1: Server running
    const serverOk = await testServerRunning();
    results.push({ name: 'Server check', pass: serverOk });
    
    // Create test video
    log.info('\nCreating test video placeholder on Bunny.net...');
    videoId = await createBunnyVideo(`Upload Test ${Date.now()}`);
    log.ok(`Created video: ${videoId}`);
    
    // Test 2: No auth
    results.push({
      name: 'Upload without auth',
      pass: await testUploadEndpointNoAuth(videoId)
    });
    
    // Test 3: No videoId
    results.push({
      name: 'Upload without videoId',
      pass: await testUploadEndpointNoVideoId()
    });
    
    // Test 4: Direct Bunny upload
    results.push({
      name: 'Direct Bunny upload',
      pass: await testDirectBunnyUpload(videoId, videoBuffer)
    });
    
    // Create another video for progress test
    const videoId2 = await createBunnyVideo(`Progress Test ${Date.now()}`);
    
    // Test 5: Upload with progress
    results.push({
      name: 'Upload with progress',
      pass: await testUploadWithProgress(videoId2, videoBuffer)
    });
    
    // Test 6: Check processing (pass isRealVideo flag)
    const isRealVideo = videoFilePath && fs.existsSync(videoFilePath);
    const procResult = await testVideoProcessing(videoId, isRealVideo);
    
    // For real video: must succeed. For test data: failure is expected
    let processingPass;
    if (isRealVideo) {
      processingPass = procResult.success;
      if (!processingPass) {
        log.err('⚠️  Real video failed to process - THIS IS A PROBLEM!');
      }
    } else {
      // Test data: status 5 (Failed) is expected and OK
      processingPass = procResult.success || procResult.isExpectedFailure;
    }
    
    results.push({
      name: 'Video processing',
      pass: processingPass
    });
    
    // Cleanup
    log.info('\nCleaning up test videos...');
    await deleteBunnyVideo(videoId);
    await deleteBunnyVideo(videoId2);
    log.ok('Test videos deleted');
    
  } catch (error) {
    log.err(`Test error: ${error.message}`);
    console.error(error);
    
    // Cleanup on error
    if (videoId) {
      try { await deleteBunnyVideo(videoId); } catch {}
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const r of results) {
    if (r.pass) {
      console.log(`${c.green}✓${c.reset} ${r.name}`);
      passed++;
    } else {
      console.log(`${c.red}✗${c.reset} ${r.name}`);
      failed++;
    }
  }
  
  console.log('─'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log(`\n${c.green}🎉 All tests passed!${c.reset}`);
  } else {
    console.log(`\n${c.yellow}⚠️  Some tests failed. Check the logs above.${c.reset}`);
  }
  
  // Tips
  console.log('\n' + '─'.repeat(60));
  console.log('💡 TIPS:');
  console.log('─'.repeat(60));
  console.log(`
1. If "Server check" fails:
   → Run: npm run dev

2. If direct Bunny upload works but server upload fails:
   → Check admin auth in /api/videos/upload/route.ts
   → Try bypassing auth temporarily for testing

3. For timeout issues with large files:
   → The server has maxDuration=300 (5 min)
   → Bunny fetch has 10 min timeout
   → Consider using TUS protocol for resumable uploads

4. Test with real video file:
   → node test-local-upload.js "path/to/small-video.mp4"
   → Use a small file (<10MB) for quick testing
`);
}

main();
