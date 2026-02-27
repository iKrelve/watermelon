/**
 * Post-build / post-wrap script for Electrobun.
 *
 * Injects CFBundleDisplayName into Info.plist so macOS shows "小西瓜"
 * as the app name in Dock, Launchpad, Finder, and menu bar,
 * while keeping the internal bundle name ASCII-safe for Bun.Archive compatibility.
 *
 * Used as both postBuild (patches the inner app bundle) and
 * postWrap (patches the self-extracting wrapper bundle for canary/stable builds).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const DISPLAY_NAME = '小西瓜'

const os = process.env.ELECTROBUN_OS

if (os !== 'macos') {
  process.exit(0)
}

function patchInfoPlist(plistPath: string, label: string): void {
  if (!existsSync(plistPath)) {
    console.warn(`[post-build] ${label} Info.plist not found at ${plistPath}, skipping`)
    return
  }

  let plist = readFileSync(plistPath, 'utf-8')

  if (!plist.includes('CFBundleDisplayName')) {
    plist = plist.replace(
      /<key>CFBundleName<\/key>\s*\n\s*<string>[^<]*<\/string>/,
      (match) =>
        `${match}\n    <key>CFBundleDisplayName</key>\n    <string>${DISPLAY_NAME}</string>`
    )
    writeFileSync(plistPath, plist, 'utf-8')
    console.log(`[post-build] Injected CFBundleDisplayName = ${DISPLAY_NAME} into ${label} Info.plist`)
  } else {
    console.log(`[post-build] CFBundleDisplayName already present in ${label}, skipping`)
  }
}

// Patch inner app bundle (postBuild)
const buildDir = process.env.ELECTROBUN_BUILD_DIR
const appName = process.env.ELECTROBUN_APP_NAME
if (buildDir && appName) {
  const innerPlist = join(buildDir, `${appName}.app`, 'Contents', 'Info.plist')
  patchInfoPlist(innerPlist, 'inner bundle')
}

// Patch self-extracting wrapper bundle (postWrap)
const wrapperPath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH
if (wrapperPath) {
  const wrapperPlist = join(wrapperPath, 'Contents', 'Info.plist')
  patchInfoPlist(wrapperPlist, 'wrapper bundle')
}
