# 🍉 小西瓜

macOS 极简 Todo 管理桌面应用，UI 风格参考 Things 3。

## 安装依赖

```bash
bun install
```

首次开发前还需要安装 Rust universal target（构建 Universal Binary 用）：

```bash
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

## 常用命令

```bash
# 开发模式（Vite dev server + Rust backend，支持 HMR）
bun run dev

# 生产打包（macOS Universal Binary，同时支持 Apple Silicon + Intel）
bun run build

# 仅启动前端 Vite dev server（端口 6689）
bun run vite:dev

# 仅构建前端（输出到 dist/）
bun run vite:build

# 测试
bun run test
bun run test:watch

# 代码质量
bun run lint
bun run format

# 添加 shadcn/ui 组件
bunx --bun shadcn@latest add <component-name>
```

## 构建产物

运行 `bun run build` 后，构建产物位于：

```
src-tauri/target/universal-apple-darwin/release/bundle/
├── dmg/          # .dmg 安装镜像
└── macos/        # .app 应用包
```

## 发版流程

推送到 `master` 分支后，GitHub Actions 会全自动完成发版，无需手动操作。

### 日常开发发版

```bash
# 正常开发，写好代码后提交（使用 conventional commit 格式）
git add -A
git commit -m "feat: 新增XX功能"     # feat → minor 版本升级 (+0.1.0)
# 或
git commit -m "fix: 修复XX问题"      # fix → patch 版本升级 (+0.0.1)

# 推送到 GitHub（自动触发构建发布）
git push github master

# 同步到内部仓库（可选）
git push origin master
```

### 自动化流程

推送到 `master` 后，CI 自动完成以下步骤：

1. **版本号自动升级** — 根据 commit message 决定 semver bump
   - `fix:` → patch（1.0.0 → 1.0.1）
   - `feat:` → minor（1.0.1 → 1.1.0）
   - `BREAKING CHANGE` → major（1.1.0 → 2.0.0）
2. **更新版本号文件** — 自动同步 `package.json`、`Cargo.toml`、`tauri.conf.json`
3. **打 Tag** — 创建 `vX.Y.Z` git tag
4. **构建** — macOS Universal Binary（同时支持 Apple Silicon + Intel）
5. **发布 GitHub Release** — 包含 `.dmg` 安装包、更新包、签名文件、`latest.json`

### 用户自动更新

已安装的用户启动应用后会自动检测新版本，弹窗提示更新，点击即可下载安装并重启。

### 首次配置（仅需一次）

1. 生成签名密钥：`bunx tauri signer generate -w ~/.tauri/watermelon.key`
2. 在 [GitHub Secrets](https://github.com/iKrelve/watermelon/settings/secrets/actions) 配置：
   - `TAURI_SIGNING_PRIVATE_KEY` — `~/.tauri/watermelon.key` 的内容
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — 密钥密码（无密码则留空）
