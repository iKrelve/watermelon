#!/bin/bash
# build-all.sh — 在 Apple Silicon Mac 上同时构建 arm64 和 x64 版本
#
# 使用方式:
#   bun run build:all
#
# 产物在 .build/ 目录下，分别在 canary-macos-arm64/ 和 canary-macos-x64/ 子目录中

set -euo pipefail

BUN_X64="$HOME/.bun/bin-x64/bun"

# 检查 x64 Bun 是否存在
if [ ! -f "$BUN_X64" ]; then
  echo "❌ 未找到 x64 版本的 Bun ($BUN_X64)"
  echo ""
  echo "请先安装 x64 版本的 Bun:"
  echo "  BUN_VERSION=\$(bun --version)"
  echo "  curl -fsSL \"https://github.com/oven-sh/bun/releases/download/bun-v\$BUN_VERSION/bun-darwin-x64-baseline.zip\" -o /tmp/bun-x64.zip"
  echo "  mkdir -p ~/.bun/bin-x64 && unzip -o /tmp/bun-x64.zip -d /tmp/bun-x64"
  echo "  cp /tmp/bun-x64/bun-darwin-x64-baseline/bun ~/.bun/bin-x64/bun && chmod +x ~/.bun/bin-x64/bun"
  echo "  rm -rf /tmp/bun-x64 /tmp/bun-x64.zip"
  exit 1
fi

echo "🏗️  同时构建 arm64 + x64 版本..."

# 步骤 1: Vite 构建（只需一次，架构无关）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步骤 1/3: Vite 构建前端资源..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun vite build

# 步骤 2: 构建 arm64 版本（当前架构）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步骤 2/3: Electrobun 构建 (arm64)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun electrobun build --env=canary

# 步骤 3: 构建 x64 版本（通过 Rosetta 2）
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步骤 3/3: Electrobun 构建 (x64)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
arch -x86_64 "$BUN_X64" node_modules/.bin/electrobun build --env=canary

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 双架构构建完成！"
echo ""
echo "产物目录:"
echo "  arm64: .build/canary-macos-arm64/"
echo "  x64:   .build/canary-macos-x64/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
