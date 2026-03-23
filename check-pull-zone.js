#!/usr/bin/env node
/**
 * Check Bunny Pull Zone Configuration
 * Kiểm tra Token Authentication settings
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, label, message) {
  console.log(`${color}${label}${colors.reset} ${message}`);
}

function header(text) {
  console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${text}${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(70)}${colors.reset}\n`);
}

async function checkPullZone() {
  header('KIỂM TRA BUNNY PULL ZONE CONFIGURATION');

  const apiKey = process.env.BUNNY_API_KEY;
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

  if (!apiKey) {
    log(colors.red, '❌', 'BUNNY_API_KEY không được set');
    return;
  }

  if (!cdnHostname) {
    log(colors.red, '❌', 'BUNNY_CDN_HOSTNAME không được set');
    return;
  }

  log(colors.cyan, '🔍', `Searching for Pull Zone: ${cdnHostname}`);

  try {
    // Get all pull zones
    const response = await fetch('https://api.bunny.net/pullzone', {
      headers: { AccessKey: apiKey },
    });

    if (!response.ok) {
      log(colors.red, '❌', `API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const pullZones = await response.json();
    const pullZone = pullZones.find((pz) =>
      pz.Hostnames.some((h) => h.Value === cdnHostname)
    );

    if (!pullZone) {
      log(colors.red, '❌', 'Pull Zone không tìm thấy');
      log(colors.yellow, 'ℹ️', `Available hostnames:`);
      pullZones.forEach((pz) => {
        console.log(`   - ${pz.Name}: ${pz.Hostnames.map((h) => h.Value).join(', ')}`);
      });
      return;
    }

    log(colors.green, '✅', `Found Pull Zone: ${pullZone.Name}`);
    console.log(`   ID: ${pullZone.Id}`);
    console.log(`   Hostnames: ${pullZone.Hostnames.map((h) => h.Value).join(', ')}\n`);

    // Check Token Authentication
    const tokenAuthEnabled = pullZone.EnableTokenAuthentication;
    const hasSecurityKey = pullZone.TokenAuthenticationKey && pullZone.TokenAuthenticationKey.length > 0;

    console.log(`${colors.bright}🔐 TOKEN AUTHENTICATION SETTINGS:${colors.reset}\n`);

    log(
      tokenAuthEnabled ? colors.green : colors.yellow,
      tokenAuthEnabled ? '✅' : '⚠️',
      `Token Authentication: ${tokenAuthEnabled ? 'ENABLED' : 'DISABLED'}`
    );

    if (tokenAuthEnabled) {
      log(
        hasSecurityKey ? colors.green : colors.red,
        hasSecurityKey ? '✅' : '❌',
        `Security Key: ${hasSecurityKey ? 'SET (không hiển thị)' : 'NOT SET'}`
      );

      if (hasSecurityKey) {
        console.log(`\n${colors.yellow}💡 ACTION REQUIRED:${colors.reset}`);
        console.log(`   Pull Zone có bật Token Authentication với security key.`);
        console.log(`   Bạn cần thêm security key vào .env.local:\n`);
        console.log(`   ${colors.cyan}BUNNY_CDN_SECURITY_KEY=<copy_from_bunny_dashboard>${colors.reset}\n`);
        console.log(`   Cách lấy security key:`);
        console.log(`   1. Vào https://dash.bunny.net`);
        console.log(`   2. CDN → Pull Zones → ${pullZone.Name}`);
        console.log(`   3. Security → Token Authentication`);
        console.log(`   4. Copy "Security Key"`);
        console.log(`   5. Paste vào .env.local`);
        console.log(`   6. Restart dev server\n`);
      }
    } else {
      console.log(`\n${colors.green}✅ GOOD NEWS:${colors.reset}`);
      console.log(`   Pull Zone KHÔNG bật Token Authentication.`);
      console.log(`   Thumbnails nên hoạt động với public URLs.\n`);
      console.log(`${colors.yellow}⚠️ Nhưng vẫn bị 403?${colors.reset}`);
      console.log(`   Có thể do:`);
      console.log(`   1. Geo-blocking enabled`);
      console.log(`   2. IP blocking`);
      console.log(`   3. Hotlink protection`);
      console.log(`   4. Video chưa được process xong\n`);
    }

    // Other security settings
    console.log(`${colors.bright}🛡️ OTHER SECURITY SETTINGS:${colors.reset}\n`);

    const securitySettings = [
      { name: 'Geo-blocking', value: pullZone.EnableGeoZoneUS || pullZone.EnableGeoZoneEU || pullZone.EnableGeoZoneASIA },
      { name: 'Origin Shield', value: pullZone.OriginShieldZoneCode },
      { name: 'WAF Enabled', value: pullZone.EnableWebApplicationFirewall },
      { name: 'Query String Sort', value: pullZone.QueryStringVaryParameters },
    ];

    securitySettings.forEach((setting) => {
      const enabled = setting.value !== undefined && setting.value !== null && setting.value !== '';
      log(
        enabled ? colors.blue : colors.cyan,
        enabled ? '🔵' : '⚪',
        `${setting.name}: ${enabled ? 'Enabled' : 'Disabled'}`
      );
    });

  } catch (error) {
    log(colors.red, '❌', `Error: ${error.message}`);
  }

  header('CHECK HOÀN THÀNH');
}

checkPullZone().catch(console.error);
