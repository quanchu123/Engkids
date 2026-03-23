const https = require('https');

const API_KEY = '6ed3bc38-ff0a-45f0-9ecad6ffea30-f02f-4402';
const LIBRARY_ID = '581761';

const options = {
  hostname: 'api.bunny.net',
  path: `/videolibrary/${LIBRARY_ID}`,
  method: 'GET',
  headers: {
    'AccessKey': API_KEY,
    'accept': 'application/json'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    if (res.statusCode === 200) {
      const j = JSON.parse(data);
      console.log('✅ API KEY HỢP LỆ');
      console.log('Library Name:', j.Name);
      console.log('Library ID:', j.Id);
    } else if (res.statusCode === 401) {
      console.log('❌ API KEY KHÔNG HỢP LỆ (401 Unauthorized)');
    } else {
      console.log('⚠️ Response:', data.substring(0, 300));
    }
  });
});
req.on('error', e => console.error('Network Error:', e.message));
req.end();
