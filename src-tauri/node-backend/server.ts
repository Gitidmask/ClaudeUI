import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { spawn, IPty } from 'node-pty'
import { v4 as uuid } from 'uuid'

// Import core services
import { SessionManager } from '../../src/main/services/session-manager'
import { getSdkExecutableOpts, ClaudeSession } from '../../src/main/services/claude-session'
import { logger } from '../../src/main/services/logger'
import { loadSettings, saveSettings, loadSessionConfig, saveSessionConfig, loadSlashCommands, saveSlashCommands } from '../../src/main/services/ui-config'
import { loadClaudePermissions, saveClaudePermissions } from '../../src/main/services/claude-settings'
import { loadMcpServers, saveMcpServers, removeMcpServer } from '../../src/main/services/claude-mcp'
import { scanSkills } from '../../src/main/services/skill-scanner'
import { scanCustomCommands } from '../../src/main/services/custom-command-scanner'
import { gitServiceManager } from '../../src/main/services/git-service'
import { createWorktree, getWorktreeStatus, removeWorktree, listWorktrees } from '../../src/main/services/worktree'
import { usageFetcher } from '../../src/main/services/usage-fetcher'
import { blockUsageService } from '../../src/main/services/block-usage'
import { deleteSessionFiles, deleteProjectFiles } from '../../src/main/services/delete-session-files'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(express.json())

let sessionManager: SessionManager | null = null

// Remote access management
interface RemoteServerState {
  running: boolean
  port: number | null
  token: string | null
  lanUrl: string | null
  tunnelUrl: string | null
  tunnelState: string | null
  tunnelError: string | null
  connectedClients: number
  clientIps: string[]
}

const remoteServerState: RemoteServerState = {
  running: false,
  port: null,
  token: null,
  lanUrl: null,
  tunnelUrl: null,
  tunnelState: null,
  tunnelError: null,
  connectedClients: 0,
  clientIps: []
}

// Remote access APIs
app.post('/api/remote/start', async (req, res) => {
  try {
    const { port, host, tunnel } = req.body || {}
    const actualPort = port || 8080
    
    // Generate token
    remoteServerState.token = crypto.randomBytes(32).toString('hex')
    remoteServerState.port = actualPort
    remoteServerState.running = true
    remoteServerState.lanUrl = host 
      ? `http://${host}:${actualPort}/remote?t=${remoteServerState.token}`
      : `http://localhost:${actualPort}/remote?t=${remoteServerState.token}`
    
    // Notify status change
    io.emit('remote:status', remoteServerState)
    
    res.json({ ok: true, data: { port: actualPort, token: remoteServerState.token, lanUrl: remoteServerState.lanUrl } })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/remote/stop', (req, res) => {
  try {
    remoteServerState.running = false
    remoteServerState.port = null
    remoteServerState.token = null
    remoteServerState.lanUrl = null
    remoteServerState.tunnelUrl = null
    remoteServerState.tunnelState = null
    remoteServerState.tunnelError = null
    remoteServerState.connectedClients = 0
    remoteServerState.clientIps = []
    
    // Notify status change
    io.emit('remote:status', remoteServerState)
    
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.get('/api/remote/status', (req, res) => {
  res.json({ ok: true, data: remoteServerState })
})

app.get('/api/network/interfaces', (req, res) => {
  const interfaces = Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && !iface.internal)
    .map((iface) => ({
      name: iface?.name || 'unknown',
      address: iface?.address || '',
      priority: 0
    }))
  res.json({ ok: true, data: interfaces })
})

// Plugin APIs
interface PluginInfo {
  id: string
  name: string
  version: string
  enabled: boolean
}

interface PluginViewWithOwner {
  id: string
  pluginId: string
  pluginName: string
  title: string
  route: string
}

app.get('/api/plugins/list', (req, res) => {
  // Return empty plugin list for now (can be extended later)
  res.json({ ok: true, data: [] as PluginInfo[] })
})

app.post('/api/plugins/reload', (req, res) => {
  try {
    const { id } = req.body
    // Plugin reload not implemented yet
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.get('/api/plugins/views', (req, res) => {
  // Return empty plugin views for now
  res.json({ ok: true, data: [] as PluginViewWithOwner[] })
})

app.get('/api/plugins/preload-path', (req, res) => {
  res.json({ ok: true, data: '' })
})

// Mockup APIs
app.post('/api/mockup/read', async (req, res) => {
  try {
    const { cwd, directory } = req.body
    // Return empty HTML for now
    res.json({ ok: true, data: '' })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/mockup/watch', (req, res) => {
  try {
    const { cwd, directory } = req.body
    // Watch not implemented yet
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/mockup/unwatch', (req, res) => {
  try {
    const { cwd, directory } = req.body
    // Unwatch not implemented yet
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Terminal management
interface PtyEntry {
  id: string
  pty: IPty
  cwd: string
}

const ptyManager = {
  ptys: new Map<string, PtyEntry>(),

  create(cwd: string): string {
    const id = uuid()
    const shell = os.platform() === 'win32'
      ? process.env.PWSH || process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash'

    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: { ...process.env }
    })

    pty.onData((data: string) => {
      io.emit('terminal:data', { terminalId: id, data })
    })

    pty.onExit(({ exitCode }) => {
      this.ptys.delete(id)
      io.emit('terminal:exit', { terminalId: id, code: exitCode })
    })

    this.ptys.set(id, { id, pty, cwd })
    return id
  },

  write(id: string, data: string): void {
    this.ptys.get(id)?.pty.write(data)
  },

  resize(id: string, cols: number, rows: number): void {
    this.ptys.get(id)?.pty.resize(cols, rows)
  },

  kill(id: string): void {
    const entry = this.ptys.get(id)
    if (!entry) return
    try {
      entry.pty.kill()
    } catch (err) {
      logger.warn('PtyManager', 'PTY may already be dead', { id, err })
    }
    this.ptys.delete(id)
  },

  killByCwd(cwd: string): string[] {
    const killed: string[] = []
    for (const [id, entry] of this.ptys) {
      if (entry.cwd === cwd) {
        this.kill(id)
        killed.push(id)
      }
    }
    return killed
  },

  killAll(): void {
    for (const id of [...this.ptys.keys()]) {
      this.kill(id)
    }
  }
}

// Initialize services
function initServices() {
  sessionManager = new SessionManager()
  // Emit events to frontend via Socket.IO
  sessionManager.on('message', (routingId, msg) => {
    io.emit('session:message', routingId, msg)
  })
  sessionManager.on('status', (routingId, status) => {
    io.emit('session:status', routingId, status)
  })
  sessionManager.on('error', (routingId, error) => {
    io.emit('session:error', routingId, error)
  })
}

// Session APIs
app.post('/api/session/create', async (req, res) => {
  try {
    const { routingId, cwd, effort, resumeSessionId, permissionMode, model, thinkingMode } = req.body
    if (!sessionManager) {
      initServices()
    }
    await sessionManager!.createSession(routingId, cwd, effort, resumeSessionId, permissionMode, model, thinkingMode)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/session/send', async (req, res) => {
  try {
    const { routingId, prompt, attachments } = req.body
    await sessionManager?.sendPrompt(routingId, prompt, attachments)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/session/cancel', async (req, res) => {
  try {
    const { routingId } = req.body
    await sessionManager?.cancelSession(routingId)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Settings APIs
app.get('/api/config/load-settings', async (req, res) => {
  try {
    const settings = await loadSettings()
    res.json({ ok: true, data: settings })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/config/save-settings', async (req, res) => {
  try {
    const { settings } = req.body
    await saveSettings(settings)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.get('/api/config/load-sessions', async (req, res) => {
  try {
    const config = await loadSessionConfig()
    res.json({ ok: true, data: config })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/config/save-sessions', async (req, res) => {
  try {
    const { config } = req.body
    await saveSessionConfig(config)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Git APIs
app.post('/api/git/check-repo', async (req, res) => {
  try {
    const { cwd } = req.body
    const isRepo = await gitServiceManager.isGitRepository(cwd)
    res.json({ ok: true, data: isRepo })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/git/status', async (req, res) => {
  try {
    const { cwd } = req.body
    const status = await gitServiceManager.getStatus(cwd)
    res.json({ ok: true, data: status })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/git/branches', async (req, res) => {
  try {
    const { cwd } = req.body
    const branches = await gitServiceManager.getBranches(cwd)
    res.json({ ok: true, data: branches })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Worktree APIs
app.post('/api/worktree/create', async (req, res) => {
  try {
    const { cwd, name } = req.body
    const result = await createWorktree(cwd, name)
    res.json({ ok: true, data: result })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/worktree/list', async (req, res) => {
  try {
    const { cwd } = req.body
    const worktrees = await listWorktrees(cwd)
    res.json({ ok: true, data: worktrees })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// MCP APIs
app.post('/api/mcp/load-servers', async (req, res) => {
  try {
    const { scope, cwd } = req.body
    const servers = await loadMcpServers(scope, cwd)
    res.json({ ok: true, data: servers })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/mcp/save-servers', async (req, res) => {
  try {
    const { scope, servers, cwd } = req.body
    await saveMcpServers(scope, servers, cwd)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Usage APIs
app.get('/api/usage/fetch', async (req, res) => {
  try {
    const data = await usageFetcher.fetch()
    res.json({ ok: true, data })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.get('/api/usage/fetch-block', async (req, res) => {
  try {
    const data = await blockUsageService.fetch()
    res.json({ ok: true, data })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Session deletion APIs
app.post('/api/session/delete-session', async (req, res) => {
  try {
    const { sessionId, projectKey } = req.body
    await deleteSessionFiles(sessionId, projectKey)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/session/delete-project', async (req, res) => {
  try {
    const { projectKey } = req.body
    await deleteProjectFiles(projectKey)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Version info
app.get('/api/app/version-info', (req, res) => {
  res.json({ ok: true, data: { appVersion: '1.0.0', sdkVersion: 'unknown', cliVersion: 'unknown' } })
})

// File system APIs
app.post('/api/file/list-dir', async (req, res) => {
  try {
    const { dirPath } = req.body
    const result = await listDirectory(dirPath)
    res.json({ ok: true, data: result })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

// Terminal APIs
app.post('/api/terminal/create', (req, res) => {
  try {
    const { cwd } = req.body
    const id = ptyManager.create(cwd)
    res.json({ ok: true, data: id })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/terminal/write', (req, res) => {
  try {
    const { id, data } = req.body
    ptyManager.write(id, data)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/terminal/resize', (req, res) => {
  try {
    const { id, cols, rows } = req.body
    ptyManager.resize(id, cols, rows)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/terminal/kill', (req, res) => {
  try {
    const { id } = req.body
    ptyManager.kill(id)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/terminal/kill-by-cwd', (req, res) => {
  try {
    const { cwd } = req.body
    const killed = ptyManager.killByCwd(cwd)
    res.json({ ok: true, data: killed })
  } catch (err) {
    res.json({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
})

async function listDirectory(dirPath: string) {
  const fs = await import('fs')
  const pathModule = await import('path')
  
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  const result = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = pathModule.join(dirPath, entry.name)
      const stats = await fs.promises.stat(fullPath)
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size: stats.size,
        mtime: stats.mtime.getTime()
      }
    })
  )
  
  return { entries: result, isRoot: dirPath === os.homedir(), resolvedPath: dirPath }
}

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info('Server', 'Client connected')
  
  socket.on('disconnect', () => {
    logger.info('Server', 'Client disconnected')
  })
})

const PORT = process.env.PORT || 3456

export function startServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      logger.info('Server', `Backend server running on port ${PORT}`)
      resolve(server)
    })
  })
}

export function stopServer(): void {
  server.close((err) => {
    if (err) {
      logger.error('Server', `Error closing server: ${err}`)
    } else {
      logger.info('Server', 'Backend server stopped')
    }
  })
}

// Start server if run directly
if (require.main === module) {
  startServer()
}
