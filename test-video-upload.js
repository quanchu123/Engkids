/**
 * Video Upload Test Script
 * Test từng bước của quá trình upload video lên Bunny.net
 * 
 * Cách chạy:
 *   node test-video-upload.js
 * 
 * Hoặc test với file video thật:
 *   node test-video-upload.js "path/to/video.mp4"
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ==================== CONFIG ====================
const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;
const LOCAL_SERVER_URL = 'http://localhost:3000';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.cyan}[Step ${num}]${colors.reset} ${msg}`),
  data: (label, data) => console.log(`  ${colors.dim}${label}:${colors.reset}`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data),
};

// ==================== TESTS ====================

async function testEnvironmentVariables() {
  log.step(1, 'Kiểm tra biến môi trường');
  
  const vars = {
    BUNNY_API_KEY: BUNNY_API_KEY ? '✓ Set (hidden)' : '✗ Missing',
    BUNNY_LIBRARY_ID: BUNNY_LIBRARY_ID || '✗ Missing',
    BUNNY_CDN_HOSTNAME: BUNNY_CDN_HOSTNAME || '✗ Missing',
  };
  
  let allSet = true;
  for (const [key, value] of Object.entries(vars)) {
    if (value.includes('Missing')) {
      log.error(`${key}: ${value}`);
      allSet = false;
    } else {
      log.success(`${key}: ${value}`);
    }
  }
  
  if (!allSet) {
    throw new Error('Missing required environment variables in .env.local');
  }
  
  return true;
}

async function testBunnyApiConnection() {
  log.step(2, 'Test kết nối Bunny.net API');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${BUNNY_LIBRARY_ID}/videos?page=1&itemsPerPage=1`,
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          log.success(`API connected! Found ${json.totalItems || 0} videos in library`);
          log.data('Sample response', { totalItems: json.totalItems, itemCount: json.items?.length });
          resolve(true);
        } else {
          log.error(`API returned status ${res.statusCode}`);
          log.data('Response', data);
          reject(new Error(`Bunny API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => {
      log.error(`Connection failed: ${e.message}`);
      reject(e);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    
    req.end();
  });
}

async function testCreateVideoPlaceholder() {
  log.step(3, 'Test tạo video placeholder trên Bunny.net');
  
  return new Promise((resolve, reject) => {
    const testTitle = `Test Video ${Date.now()}`;
    const postData = JSON.stringify({ title: testTitle, isPublic: true });
    
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${BUNNY_LIBRARY_ID}/videos`,
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const json = JSON.parse(data);
          log.success(`Video placeholder created!`);
          log.data('Video ID (GUID)', json.guid);
          log.data('Title', testTitle);
          resolve(json.guid);
        } else {
          log.error(`Failed to create video: ${res.statusCode}`);
          log.data('Response', data);
          reject(new Error(`Create video failed: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => {
      log.error(`Request failed: ${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

async function testUploadSmallVideo(videoId, filePath = null) {
  log.step(4, 'Test upload video file');
  
  let videoBuffer;
  let fileSize;
  
  if (filePath && fs.existsSync(filePath)) {
    // Use provided video file
    log.info(`Using provided file: ${filePath}`);
    videoBuffer = fs.readFileSync(filePath);
    fileSize = videoBuffer.length;
    log.data('File size', `${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  } else {
    // Create a minimal test MP4 (not a real video, just for API testing)
    log.info('Creating minimal test data (just for API testing)');
    log.warn('This is NOT a valid video file, just testing upload API');
    
    // ftyp box + moov box (minimal valid MP4 structure)
    videoBuffer = Buffer.from([
      // ftyp box
      0x00, 0x00, 0x00, 0x14, // size
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x69, 0x73, 0x6F, 0x6D, // 'isom'
      0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, // 'isom'
      // mdat box (empty)
      0x00, 0x00, 0x00, 0x08, // size
      0x6D, 0x64, 0x61, 0x74, // 'mdat'
    ]);
    fileSize = videoBuffer.length;
    log.data('Test data size', `${fileSize} bytes`);
  }
  
  return new Promise((resolve, reject) => {
    const uploadUrl = `/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`;
    log.data('Upload URL', `https://video.bunnycdn.com${uploadUrl}`);
    
    const options = {
      hostname: 'video.bunnycdn.com',
      path: uploadUrl,
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize,
      },
    };
    
    const startTime = Date.now();
    let uploadedBytes = 0;
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          log.success(`Upload completed in ${elapsed}s`);
          try {
            const json = JSON.parse(data);
            log.data('Response', json);
          } catch {
            log.data('Response', data);
          }
          resolve(true);
        } else {
          log.error(`Upload failed: ${res.statusCode}`);
          log.data('Response', data);
          reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', (e) => {
      log.error(`Upload error: ${e.message}`);
      reject(e);
    });
    
    // Set longer timeout for large files
    req.setTimeout(600000, () => {
      req.destroy();
      reject(new Error('Upload timeout after 10 minutes'));
    });
    
    // Track progress for large files
    if (fileSize > 1024 * 1024) { // > 1MB
      const chunkSize = 64 * 1024; // 64KB chunks
      let offset = 0;
      
      const writeChunk = () => {
        while (offset < fileSize) {
          const chunk = videoBuffer.slice(offset, Math.min(offset + chunkSize, fileSize));
          const canContinue = req.write(chunk);
          offset += chunk.length;
          uploadedBytes += chunk.length;
          
          // Progress
          const pct = ((uploadedBytes / fileSize) * 100).toFixed(1);
          process.stdout.write(`\r  Uploading... ${pct}% (${(uploadedBytes / 1024 / 1024).toFixed(1)}MB)`);
          
          if (!canContinue) {
            req.once('drain', writeChunk);
            return;
          }
        }
        console.log(''); // New line after progress
        req.end();
      };
      
      writeChunk();
    } else {
      req.write(videoBuffer);
      req.end();
    }
  });
}

async function testGetVideoStatus(videoId) {
  log.step(5, 'Test lấy trạng thái video');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_API_KEY,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          
          // Bunny status: 0=Queued, 1=Processing, 2=Encoding, 3=Finished, 4=Resolution Finished, 5=Failed
          const statusMap = {
            0: 'Queued',
            1: 'Processing',
            2: 'Encoding',
            3: 'Finished',
            4: 'Resolution Finished',
            5: 'Failed',
          };
          
          log.success(`Video status retrieved`);
          log.data('Status Code', json.status);
          log.data('Status', statusMap[json.status] || 'Unknown');
          log.data('Duration', `${json.length}s`);
          log.data('Title', json.title);
          log.data('Thumbnail', json.thumbnailFileName);
          
          resolve(json);
        } else {
          log.error(`Failed to get status: ${res.statusCode}`);
          log.data('Response', data);
          reject(new Error(`Get status failed: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function testDeleteVideo(videoId) {
  log.step(6, 'Cleanup - Xóa test video');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      method: 'DELETE',
      headers: {
        'AccessKey': BUNNY_API_KEY,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          log.success(`Test video deleted: ${videoId}`);
          resolve(true);
        } else {
          log.warn(`Could not delete video: ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      log.warn(`Delete error: ${e.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

async function testLocalServerUpload(videoId, filePath = null) {
  log.step('4b', 'Test upload qua local server API (/api/videos/upload)');
  
  let videoBuffer;
  
  if (filePath && fs.existsSync(filePath)) {
    videoBuffer = fs.readFileSync(filePath);
    log.info(`Using file: ${filePath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    // Minimal test data
    videoBuffer = Buffer.from([
      0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70,
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x00, 0x08,
      0x6D, 0x64, 0x61, 0x74,
    ]);
    log.info('Using minimal test data');
  }
  
  log.warn('⚠️  Local server test requires:');
  log.warn('   1. Server running: npm run dev');
  log.warn('   2. Admin login cookie or bypass auth for testing');
  log.info(`Testing URL: ${LOCAL_SERVER_URL}/api/videos/upload?videoId=${videoId}`);
  
  return new Promise((resolve, reject) => {
    const url = new URL(`${LOCAL_SERVER_URL}/api/videos/upload?videoId=${videoId}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': videoBuffer.length,
        // Note: This needs a valid admin auth cookie
        // 'Cookie': 'admin_token=...',
        // 'Authorization': 'Bearer ...',
      },
    };
    
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        log.data('Status', res.statusCode);
        try {
          const json = JSON.parse(data);
          log.data('Response', json);
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            log.success('Local server upload test passed!');
            resolve(true);
          } else if (res.statusCode === 401) {
            log.warn('Auth required - need to login as admin first');
            resolve(false);
          } else {
            log.error(`Server returned error: ${res.statusCode}`);
            resolve(false);
          }
        } catch {
          log.data('Raw response', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        log.error('Cannot connect to local server. Run "npm run dev" first.');
      } else {
        log.error(`Request error: ${e.message}`);
      }
      resolve(false);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      log.error('Local server timeout');
      resolve(false);
    });
    
    req.write(videoBuffer);
    req.end();
  });
}

// ==================== MAIN ====================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🎬 VIDEO UPLOAD TEST SCRIPT');
  console.log('='.repeat(60));
  
  const videoFilePath = process.argv[2];
  if (videoFilePath) {
    log.info(`Video file provided: ${videoFilePath}`);
    if (!fs.existsSync(videoFilePath)) {
      log.error(`File not found: ${videoFilePath}`);
      process.exit(1);
    }
  }
  
  let videoId = null;
  
  try {
    // Test 1: Environment variables
    await testEnvironmentVariables();
    
    // Test 2: Bunny API connection
    await testBunnyApiConnection();
    
    // Test 3: Create video placeholder
    videoId = await testCreateVideoPlaceholder();
    
    // Test 4: Upload directly to Bunny.net
    await testUploadSmallVideo(videoId, videoFilePath);
    
    // Wait a bit for processing
    log.info('Waiting 3s for Bunny to process...');
    await new Promise(r => setTimeout(r, 3000));
    
    // Test 5: Get video status
    await testGetVideoStatus(videoId);
    
    // Test 4b: Try local server upload (optional)
    // Uncomment to test:
    // const videoId2 = await testCreateVideoPlaceholder();
    // await testLocalServerUpload(videoId2, videoFilePath);
    // await testDeleteVideo(videoId2);
    
    console.log('\n' + '='.repeat(60));
    log.success('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    
    // Ask to delete test video
    console.log('\n');
    log.warn(`Test video created: ${videoId}`);
    log.info('Delete it? Run: node test-video-upload.js --delete ' + videoId);
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    log.error('❌ TEST FAILED');
    log.error(error.message);
    console.log('='.repeat(60));
    process.exit(1);
  } finally {
    // Cleanup option
    if (process.argv.includes('--delete') && process.argv[3]) {
      await testDeleteVideo(process.argv[3]);
    } else if (process.argv.includes('--cleanup') && videoId) {
      await testDeleteVideo(videoId);
    }
  }
}

// Handle --delete flag
if (process.argv[2] === '--delete' && process.argv[3]) {
  (async () => {
    await testEnvironmentVariables();
    await testDeleteVideo(process.argv[3]);
  })();
} else {
  main();
}
