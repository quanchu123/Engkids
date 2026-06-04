const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const APP_DIR = '/root/Engkids';
const DOMAIN = 'engkidstienganhchobe.tech';
const WWW_DOMAIN = `www.${DOMAIN}`;

function run(command, args, options = {}) {
  console.log(`[ssl] ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function shouldRun() {
  if (process.env.SKIP_DROPLET_SSL === '1') return false;
  if (os.platform() !== 'linux') return false;
  if (process.cwd() !== APP_DIR) return false;
  if (typeof process.getuid === 'function' && process.getuid() !== 0) return false;
  return true;
}

function writeNginxConfig() {
  const config = `server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    client_max_body_size 2048M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
`;

  fs.mkdirSync('/etc/nginx/sites-available', { recursive: true });
  fs.mkdirSync('/etc/nginx/sites-enabled', { recursive: true });
  fs.writeFileSync('/etc/nginx/sites-available/engkids', config);

  const enabledPath = '/etc/nginx/sites-enabled/engkids';
  try {
    fs.rmSync(enabledPath, { force: true });
  } catch {
    // ignore
  }
  fs.symlinkSync('/etc/nginx/sites-available/engkids', enabledPath);

  try {
    fs.rmSync('/etc/nginx/sites-enabled/default', { force: true });
  } catch {
    // ignore
  }
}

function main() {
  if (!shouldRun()) {
    console.log('[ssl] Skipping droplet SSL setup outside /root/Engkids on Linux root.');
    return;
  }

  const marker = path.join('/var/tmp', 'engkids-ssl-setup-attempted');
  const recentlyAttempted = fs.existsSync(marker)
    && Date.now() - fs.statSync(marker).mtimeMs < 6 * 60 * 60 * 1000;
  if (recentlyAttempted) {
    console.log('[ssl] SSL setup was attempted recently; skipping.');
    return;
  }
  fs.writeFileSync(marker, new Date().toISOString());

  run('apt-get', ['update']);
  run('apt-get', ['install', '-y', 'nginx', 'certbot', 'python3-certbot-nginx'], {
    env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
  });

  writeNginxConfig();
  run('nginx', ['-t']);
  run('systemctl', ['reload', 'nginx']);

  try {
    run('ufw', ['allow', '80/tcp']);
    run('ufw', ['allow', '443/tcp']);
  } catch {
    console.warn('[ssl] ufw not active or not available; continuing.');
  }

  run('certbot', [
    '--nginx',
    '-d',
    DOMAIN,
    '-d',
    WWW_DOMAIN,
    '--redirect',
    '--non-interactive',
    '--agree-tos',
    '--register-unsafely-without-email',
  ]);
  run('systemctl', ['reload', 'nginx']);
}

main();
