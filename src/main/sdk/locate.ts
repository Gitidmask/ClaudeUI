/**
 * Resolve the rebundled Bun standalone binary path in both dev and production.
 *
 *   dev        → <projectRoot>/vendor/claude-cli/bun-claude[.exe]
 *   production → <Resources>/claude-cli/bun-claude[.exe]  (primary, extraResources)
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const BIN_NAME = process.platform === 'win32' ? 'bun-claude.exe' : 'bun-claude'

/** Resolve the path to the rebundled Bun standalone binary. */
export function locateBunClaude(): string {
  const appPath = process.cwd()

  if (!appPath.includes('app.asar')) {
    return path.join(appPath, 'vendor', 'claude-cli', BIN_NAME)
  }

  const candidates = [
    path.join(path.dirname(appPath), 'claude-cli', BIN_NAME),
    path.join(appPath, '..', 'vendor', 'claude-cli', BIN_NAME),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return path.join(appPath, 'vendor', 'claude-cli', BIN_NAME)
}

export function locateCliJs(): string {
  const appPath = process.cwd()
  return path.join(appPath, 'vendor', 'claude-cli', 'cli.js')
}

export function getCliVersion(): string {
  return '1.0.0'
}

export function getResourcesPath(): string {
  return process.cwd()
}

export function getAppPath(): string {
  return process.cwd()
}
