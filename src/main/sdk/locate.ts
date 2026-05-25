/**
 * Resolve the rebundled Bun standalone binary path in both dev and production.
 *
 *   dev        → <projectRoot>/vendor/claude-cli/bun-claude[.exe]
 *   production (Tauri) → <appDir>/resources/claude-cli/bun-claude[.exe]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const BIN_NAME = process.platform === 'win32' ? 'bun-claude.exe' : 'bun-claude'

function getTauriResourcesPath(): string | null {
  try {
    const tauri = require('@tauri-apps/api')
    return tauri.path.resolveResource('')
  } catch {
    return null
  }
}

/** Resolve the path to the rebundled Bun standalone binary. */
export function locateBunClaude(): string {
  const appPath = process.cwd()

  const candidates = [
    path.join(appPath, 'vendor', 'claude-cli', BIN_NAME),
  ]

  const tauriResourcesPath = getTauriResourcesPath()
  if (tauriResourcesPath) {
    candidates.push(path.join(tauriResourcesPath, 'claude-cli', BIN_NAME))
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

export function locateCliJs(): string {
  const appPath = process.cwd()
  const candidates = [
    path.join(appPath, 'vendor', 'claude-cli', 'cli.js'),
  ]

  const tauriResourcesPath = getTauriResourcesPath()
  if (tauriResourcesPath) {
    candidates.push(path.join(tauriResourcesPath, 'claude-cli', 'cli.js'))
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return candidates[0]
}

export function getCliVersion(): string {
  return '1.0.0'
}

export function getResourcesPath(): string {
  const tauriResourcesPath = getTauriResourcesPath()
  if (tauriResourcesPath) {
    return tauriResourcesPath
  }
  return process.cwd()
}

export function getAppPath(): string {
  return process.cwd()
}
