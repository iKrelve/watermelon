#!/bin/bash
# build-all.sh — 在 Apple Silicon Mac 上同时构建 arm64 和 x64 版本
#
# 使用方式:
#   bun run build:all
#
# 产物在 artifacts/ 目录下，包含两个架构的文件
# 构建目录在 build/ 下，分别为 canary-macos-arm64/ 和 canary-macos-x64/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ELECTROBUN_DIR="$PROJECT_DIR/node_modules/electrobun"
CLI_BIN="$ELECTROBUN_DIR/bin/electrobun"
CACHE_DIR="$ELECTROBUN_DIR/.cache-x64"

# 读取 electrobun 版本
ELECTROBUN_VERSION=$(node -e "console.log(require('$ELECTROBUN_DIR/package.json').version)")

echo "🏗️  同时构建 arm64 + x64 版本..."
echo "   Electrobun 版本: v$ELECTROBUN_VERSION"

# ── 确保有 x64 版本的 electrobun CLI ──────────────────────────
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

  echo "   ✓ x64 CLI 已缓存"
fi

cd "$PROJECT_DIR"

# ── 步骤 1: Vite 构建（只需一次，架构无关）─────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步骤 1/3: Vite 构建前端资源..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun vite build

# ── 步骤 2: 构建 arm64 版本（当前架构，直接用原生 CLI）────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步骤 2/3: Electrobun 构建 (arm64)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun electrobun build --env=canary

# 保存 arm64 的 artifacts
echo "   保存 arm64 产物..."
mkdir -p "$PROJECT_DIR/artifacts-arm64"
cp "$PROJECT_DIR/artifacts/"* "$PROJECT_DIR/artifacts-arm64/" 2>/dev/null || true

# ── 步骤 3: 构建 x64 版本（替换 CLI，通过 Rosetta 2）─────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步骤 3/3: Electrobun 构建 (x64)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 备份 arm64 CLI
cp "$CLI_BIN" "$CLI_BIN.arm64.bak"

# 确保退出时恢复 arm64 CLI
cleanup() {
  if [ -f "$CLI_BIN.arm64.bak" ]; then
    mv "$CLI_BIN.arm64.bak" "$CLI_BIN"
  fi
}
trap cleanup EXIT

# 替换为 x64 CLI
cp "$X64_CLI" "$CLI_BIN"

# 通过 Rosetta 2 运行 x64 CLI
arch -x86_64 "$CLI_BIN" build --env=canary

# 保存 x64 的 artifacts
echo "   保存 x64 产物..."
mkdir -p "$PROJECT_DIR/artifacts-x64"
cp "$PROJECT_DIR/artifacts/"* "$PROJECT_DIR/artifacts-x64/" 2>/dev/null || true

# 合并所有 artifacts 到 artifacts/ 目录
echo ""
echo "   合并产物到 artifacts/..."
rm -rf "$PROJECT_DIR/artifacts"
mkdir -p "$PROJECT_DIR/artifacts"
cp "$PROJECT_DIR/artifacts-arm64/"* "$PROJECT_DIR/artifacts/" 2>/dev/null || true
cp "$PROJECT_DIR/artifacts-x64/"* "$PROJECT_DIR/artifacts/" 2>/dev/null || true
rm -rf "$PROJECT_DIR/artifacts-arm64" "$PROJECT_DIR/artifacts-x64"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 双架构构建完成！"
echo ""
echo "📁 构建目录:"
echo "   arm64: build/canary-macos-arm64/"
echo "   x64:   build/canary-macos-x64/"
echo ""
echo "📁 产物目录: artifacts/"
ls -1 "$PROJECT_DIR/artifacts/" 2>/dev/null | sed 's/^/   /'
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
