#!/bin/bash
# build-x64.sh — 在 Apple Silicon Mac 上通过 Rosetta 2 构建 x64 (Intel) 版本
#
# 使用方式:
#   bun run build:x64
#
# 前置条件:
#   Rosetta 2 已安装 (softwareupdate --install-rosetta)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ELECTROBUN_DIR="$PROJECT_DIR/node_modules/electrobun"
CLI_BIN="$ELECTROBUN_DIR/bin/electrobun"
CACHE_DIR="$ELECTROBUN_DIR/.cache-x64"

# 读取 electrobun 版本
ELECTROBUN_VERSION=$(node -e "console.log(require('$ELECTROBUN_DIR/package.json').version)")

echo "🏗️  构建 x64 (Intel) 版本..."
echo "   Electrobun 版本: v$ELECTROBUN_VERSION"

# ── 步骤 1: 确保有 x64 版本的 electrobun CLI ──────────────────
X64_CLI="$CACHE_DIR/electrobun"

if [ ! -f "$X64_CLI" ]; then
  echo "📥 下载 x64 版本的 Electrobun CLI..."
  mkdir -p "$CACHE_DIR"

  TARBALL_URL="https://github.com/blackboardsh/electrobun/releases/download/v${ELECTROBUN_VERSION}/electrobun-cli-darwin-x64.tar.gz"
  TARBALL_PATH="$CACHE_DIR/electrobun-darwin-x64.tar.gz"

  curl -fSL "$TARBALL_URL" -o "$TARBALL_PATH"
  tar -xzf "$TARBALL_PATH" -C "$CACHE_DIR"
  rm -f "$TARBALL_PATH"
  chmod +x "$X64_CLI"

  echo "   ✓ x64 CLI 已缓存到 $CACHE_DIR/"
fi

# ── 步骤 2: Vite 构建（架构无关） ──────────────────────────────
echo "📦 步骤 1/2: Vite 构建前端资源..."
cd "$PROJECT_DIR"
bun vite build

# ── 步骤 3: 临时替换 CLI 为 x64 版本，运行 electrobun build ───
echo "📦 步骤 2/2: Electrobun 构建 (x64)..."

# 备份 arm64 CLI
cp "$CLI_BIN" "$CLI_BIN.arm64.bak"

# 替换为 x64 CLI
cp "$X64_CLI" "$CLI_BIN"

# 确保退出时恢复 arm64 CLI（即使构建失败）
cleanup() {
  if [ -f "$CLI_BIN.arm64.bak" ]; then
    mv "$CLI_BIN.arm64.bak" "$CLI_BIN"
  fi
}
trap cleanup EXIT

# 通过 Rosetta 2 运行 x64 CLI（CLI 内嵌了 x64 bun 运行时）
arch -x86_64 "$CLI_BIN" build --env=stable

echo "✅ x64 构建完成！"
