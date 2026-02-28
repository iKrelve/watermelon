#!/bin/bash
# build-x64.sh — 在 Apple Silicon Mac 上通过 Rosetta 2 构建 x64 版本
#
# 使用方式:
#   bun run build:x64
#
# 前置条件:
#   1. Rosetta 2 已安装 (softwareupdate --install-rosetta)
#   2. x64 版本的 Bun 已安装到 ~/.bun/bin-x64/bun
#      安装命令:
#        curl -fsSL "https://github.com/oven-sh/bun/releases/download/bun-v$(bun --version)/bun-darwin-x64-baseline.zip" -o /tmp/bun-x64.zip
#        mkdir -p ~/.bun/bin-x64 && unzip -o /tmp/bun-x64.zip -d /tmp/bun-x64
#        cp /tmp/bun-x64/bun-darwin-x64-baseline/bun ~/.bun/bin-x64/bun && chmod +x ~/.bun/bin-x64/bun
#        rm -rf /tmp/bun-x64 /tmp/bun-x64.zip

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

echo "🏗️  构建 x64 (Intel) 版本..."
echo "   使用 Bun: $BUN_X64"

# 步骤 1: Vite 构建（架构无关，用当前 bun 即可）
echo "📦 步骤 1/2: Vite 构建前端资源..."
bun vite build

# 步骤 2: 通过 Rosetta 2 以 x64 模式运行 electrobun build
echo "📦 步骤 2/2: Electrobun 构建 (x64)..."
arch -x86_64 "$BUN_X64" node_modules/.bin/electrobun build --env=canary

echo "✅ x64 构建完成！"
