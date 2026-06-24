#!/usr/bin/env bash
# ============================================
# Engkids - Deploy script (chạy trên server Droplet)
# Kéo code mới, cài deps, build, khởi động lại app.
# Dùng: bash deploy.sh
# ============================================
set -e

APP_DIR="/root/Engkids"
PM2_NAME="engkids"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_DIR/public/uploads}"
export UPLOADS_DIR

echo "==> Đi tới thư mục dự án"
cd "$APP_DIR"

echo "==> Đảm bảo thư mục upload tồn tại trên SSD droplet"
mkdir -p "$UPLOADS_DIR"

echo "==> Kéo code mới nhất từ GitHub"
git pull origin master

echo "==> Cài dependencies (nếu có thay đổi)"
npm install

echo "==> Build production"
npm run build

echo "==> Khởi động lại app qua PM2"
pm2 restart "$PM2_NAME" --update-env || pm2 start npm --name "$PM2_NAME" -- start
pm2 save

echo "==> Xong! App đã cập nhật."

# Auto-deploy via GitHub Actions enabled.
