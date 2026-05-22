import type { ApprovalDecision, PermissionSuggestion, ProxySettings, UISessionConfig, ClaudePermissions, RemoteStatus, GitStatusData, GitBranchData, AccountUsage, BlockUsageData, McpServerConfig, DirEntry, ChatMessage, AutomationRun, Automation, WorktreeInfo, WorktreeStatus, WorktreeEntry, SlashCommandInfo, SkillInfo, PluginInfo, PluginViewWithOwner, StatusLineData, TeamInfoSnapshot } from '../../../shared/types'
import { io, Socket } from 'socket.io-client'

const API_BASE = 'http://localhost:3456/api'
const WS_BASE = 'http://localhost:3456'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_BASE, {
      transports: ['websocket'],
      reconnection: true,
    })
  }
  return socket
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  
  const result = await response.json()
  if (result && typeof result === 'object' && 'ok' in result) {
    if (!result.ok) throw new Error(result.error ?? `API ${path} failed`)
    return result.data as T
  }
  return result as T
}

function onEvent(channel: string): (cb: any) => () => void {
  return (cb: any) => {
    const socketInstance = getSocket()
    socketInstance.on(channel, cb)
    return () => {
      socketInstance.off(channel, cb)
    }
  }
}

export const api = {
  platform: process.platform as NodeJS.Platform | 'web',
  
  pickFolder: () => Promise.resolve(''),
  createSession: (routingId: string, cwd: string, effort?: string, resumeSessionId?: string, permissionMode?: string, model?: string, thinkingMode?: string) =>
    apiRequest('POST', '/session/create', { routingId, cwd, effort, resumeSessionId, permissionMode, model, thinkingMode }),
  rekeySession: (_oldId: string, _newId: string) =>
    Promise.resolve(),
  sendPrompt: (routingId: string, prompt: string, attachments?: Array<{ mediaType: string; base64Data: string; fileName?: string }>) =>
    apiRequest('POST', '/session/send', { routingId, prompt, attachments }),
  cancelSession: (routingId: string) =>
    apiRequest('POST', '/session/cancel', { routingId }),
  interruptSession: (_routingId: string) =>
    Promise.resolve(),
  respondApproval: (_routingId: string, _requestId: string, _decision: ApprovalDecision, _answers?: Record<string, string>, _updatedPermissions?: PermissionSuggestion[]) =>
    Promise.resolve(),
  minimizeWindow: () => Promise.resolve(),
  maximizeWindow: () => Promise.resolve(),
  closeWindow: () => Promise.resolve(),
  listDirectories: () => Promise.resolve([]),
  loadSessionHistory: (_sessionId: string, _projectKey: string) =>
    Promise.resolve({ 
      messages: [], 
      taskNotifications: [], 
      customTitle: null, 
      agentIdToToolUseId: {},
      statusLine: null,
      teamName: null,
      pendingTeammates: {},
      taskPrompts: {}
    }),
  loadSubagentHistory: (_sessionId: string, _projectKey: string, _agentId: string) =>
    Promise.resolve<ChatMessage[]>([]),
  buildSubagentFileMap: (_sessionId: string, _projectKey: string, _taskPrompts: Record<string, string>) =>
    Promise.resolve({}),
  loadBackgroundOutput: (_projectKey: string, _taskId: string, _outputFile?: string) =>
    Promise.resolve({ content: '', eof: false }),

  onSessionCreated: onEvent('session:created'),
  onUserMessage: onEvent('session:user-message'),
  onMessage: onEvent('session:message'),
  onStreamEvent: onEvent('session:stream'),
  onApprovalRequest: onEvent('session:approval-request'),
  onStatus: onEvent('session:status'),
  onResult: onEvent('session:result'),
  onError: onEvent('session:error'),
  onToolResult: onEvent('session:tool-result'),
  onTaskProgress: onEvent('session:task-progress'),
  onTaskNotification: onEvent('session:task-notification'),
  onSubagentStream: onEvent('session:subagent-stream'),
  onSubagentMessage: onEvent('session:subagent-message'),
  onSubagentMessageBatch: onEvent('session:subagent-message-batch'),
  onSubagentToolResult: onEvent('session:subagent-tool-result'),
  onSlashCommands: onEvent('session:slash-commands'),
  onPermissionMode: onEvent('session:permission-mode'),
  onBashOutput: onEvent('session:bash-output'),
  onBackgroundOutput: onEvent('session:background-output'),
  onSandboxViolation: onEvent('session:sandbox-violation'),
  onSteerConsumed: onEvent('session:steer-consumed'),
  onTeammateDetected: onEvent('session:teammate-detected'),
  onTeamCreated: onEvent('session:team-created'),
  onTeamDeleted: onEvent('session:team-deleted'),
  onSkills: onEvent('session:skills'),
  onStatusLine: onEvent('session:status-line'),
  onMcpServers: onEvent('session:mcp-servers'),

  onMaximizeChange: onEvent('window:maximized-change'),
  onWatchUpdate: onEvent('session:watch-update'),
  onDirectoriesChanged: onEvent('session:directories-changed'),
  onGitStatusUpdate: onEvent('git:status-update'),
  onSettingsChanged: onEvent('config:settings-changed'),
  onSessionConfigChanged: onEvent('config:sessions-changed'),
  onAccountUsage: onEvent('usage:data'),
  onBlockUsage: onEvent('usage:block-data'),
  onTerminalData: onEvent('terminal:data'),
  onTerminalExit: onEvent('terminal:exit'),
  onAutomationRunUpdate: onEvent('automation:run-update'),
  onAutomationsChanged: onEvent('automation:changed'),
  onAutomationRunMessage: onEvent('automation:run-message'),
  onAutomationStreamEvent: onEvent('automation:stream-event'),
  onAutomationProcessing: onEvent('automation:processing'),
  onBeforeQuit: onEvent('app:before-quit'),

  watchBackground: (_routingId: string, _toolUseId: string) => Promise.resolve(),
  unwatchBackground: (_routingId: string, _toolUseId: string) => Promise.resolve(),
  readBackgroundRange: (_routingId: string, _toolUseId: string, _offset: number, _length: number) =>
    Promise.resolve(''),
  stopTask: (_routingId: string, _toolUseId: string) => Promise.resolve<{ success: boolean; error?: string }>({ success: false }),
  backgroundTask: (_routingId: string, _toolUseId: string) => Promise.resolve<{ success: boolean; error?: string }>({ success: false }),
  dequeueMessage: (_routingId: string, _value: string) => Promise.resolve({ removed: 0 }),
  askSideQuestion: (_routingId: string, _question: string) => Promise.resolve(''),
  setPermissionMode: (_routingId: string, _mode: string) => Promise.resolve(),
  setModel: (_routingId: string, _model: string) => Promise.resolve(),
  setEffort: (_routingId: string, _effort: string) => Promise.resolve(),
  setThinkingMode: (_routingId: string, _mode: string) => Promise.resolve(),
  getModels: () => Promise.resolve([]),
  generateTitle: (_conversationText: string) => Promise.resolve(''),
  generateCommitMessage: (_diff: string) => Promise.resolve(''),
  writeCustomTitle: (_sessionId: string, _projectKey: string, _title: string) => Promise.resolve(),
  getPlanContent: (_routingId: string) => Promise.resolve(''),
  getSessionLogPath: (_routingId: string) => Promise.resolve(''),
  watchSession: (_routingId: string, _sessionId: string, _projectKey: string) => Promise.resolve(),
  unwatchSession: (_routingId: string) => Promise.resolve(),
  sendToTeammate: (_routingId: string, _sanitizedTeamName: string, _sanitizedAgentName: string, _message: string) =>
    Promise.resolve(),
  broadcastToTeam: (_routingId: string, _sanitizedTeamName: string, _sanitizedAgentNames: string[], _message: string) =>
    Promise.resolve(),
  getTeamInfo: (_routingId: string) => Promise.resolve<TeamInfoSnapshot | null>(null),
  openTeamsViewWindow: (_routingId: string) => Promise.resolve(),

  createTerminal: (cwd: string) => apiRequest<string>('POST', '/terminal/create', { cwd }),
  writeTerminal: (id: string, data: string) => apiRequest('POST', '/terminal/write', { id, data }),
  resizeTerminal: (id: string, cols: number, rows: number) => apiRequest('POST', '/terminal/resize', { id, cols, rows }),
  killTerminal: (id: string) => apiRequest('POST', '/terminal/kill', { id }),
  killTerminalsByCwd: (cwd: string) => apiRequest('POST', '/terminal/kill-by-cwd', { cwd }),

  createWorktree: (cwd: string, name: string) => apiRequest<WorktreeInfo>('POST', '/worktree/create', { cwd, name }),
  getWorktreeStatus: (worktreePath: string, originalHead: string) =>
    apiRequest<WorktreeStatus>('POST', '/worktree/status', { worktreePath, originalHead }),
  removeWorktree: (worktreePath: string, branch: string, gitRoot: string) =>
    apiRequest('POST', '/worktree/remove', { worktreePath, branch, gitRoot }),
  listWorktrees: (cwd: string) => apiRequest<WorktreeEntry[]>('POST', '/worktree/list', { cwd }),

  confirmQuit: () => Promise.resolve(),

  gitCheckRepo: (cwd: string) => apiRequest<boolean>('POST', '/git/check-repo', { cwd }),
  gitGetStatus: (cwd: string) => apiRequest<GitStatusData>('POST', '/git/status', { cwd }),
  gitGetBranches: (cwd: string) => apiRequest<GitBranchData>('POST', '/git/branches', { cwd }),
  gitCheckout: (cwd: string, branch: string) => apiRequest('POST', '/git/checkout', { cwd, branch }),
  gitCreateBranch: (cwd: string, name: string) => apiRequest('POST', '/git/create-branch', { cwd, name }),
  gitGetFilePatch: (cwd: string, filePath: string, staged: boolean, ignoreWhitespace: boolean) =>
    apiRequest<{ patch: string; isBinary?: boolean }>('POST', '/git/file-patch', { cwd, filePath, staged, ignoreWhitespace }),
  gitGetFileContents: (cwd: string, filePath: string, staged: boolean) =>
    apiRequest<{ oldContent: string; newContent: string }>('POST', '/git/file-contents', { cwd, filePath, staged }),
  gitStageFile: (cwd: string, filePath: string) => apiRequest('POST', '/git/stage-file', { cwd, filePath }),
  gitUnstageFile: (cwd: string, filePath: string) => apiRequest('POST', '/git/unstage-file', { cwd, filePath }),
  gitDiscardFile: (cwd: string, filePath: string) => apiRequest('POST', '/git/discard-file', { cwd, filePath }),
  gitStageAll: (cwd: string) => apiRequest('POST', '/git/stage-all', { cwd }),
  gitUnstageAll: (cwd: string) => apiRequest('POST', '/git/unstage-all', { cwd }),
  gitCommit: (cwd: string, message: string) => apiRequest<string>('POST', '/git/commit', { cwd, message }),
  gitPush: (cwd: string) => apiRequest('POST', '/git/push', { cwd }),
  gitPushWithUpstream: (cwd: string, branch: string) => apiRequest('POST', '/git/push-with-upstream', { cwd, branch }),
  gitPull: (cwd: string) => apiRequest<{ summary: string }>('POST', '/git/pull', { cwd }),
  gitFetch: (cwd: string) => apiRequest('POST', '/git/fetch', { cwd }),
  gitStartWatching: (cwd: string) => apiRequest('POST', '/git/start-watching', { cwd }),
  gitStopWatching: (cwd: string) => apiRequest('POST', '/git/stop-watching', { cwd }),

  listDir: (dirPath: string) => apiRequest<{ entries: DirEntry[]; isRoot: boolean; resolvedPath: string }>('POST', '/file/list-dir', { dirPath }),
  openInVSCode: (_cwd: string) => Promise.resolve(),
  loadSettings: () => apiRequest<Record<string, unknown>>('GET', '/config/load-settings'),
  saveSettings: (settings: Record<string, unknown>) => apiRequest('POST', '/config/save-settings', { settings }),
  loadSessionConfig: () => apiRequest<UISessionConfig>('GET', '/config/load-sessions'),
  saveSessionConfig: (config: UISessionConfig) => apiRequest('POST', '/config/save-sessions', { config }),
  deleteSession: (sessionId: string, projectKey: string) =>
    apiRequest('POST', '/session/delete-session', { sessionId, projectKey }),
  deleteProject: (projectKey: string) =>
    apiRequest('POST', '/session/delete-project', { projectKey }),
  loadSlashCommands: () => Promise.resolve<SlashCommandInfo[]>([]),
  saveSlashCommands: (_commands: SlashCommandInfo[]) => Promise.resolve(),
  scanCustomCommands: (_cwd: string) => Promise.resolve<string[]>([]),
  loadSkillDetails: (_cwd: string) => Promise.resolve<SkillInfo[]>([]),

  fetchAccountUsage: () => apiRequest<AccountUsage>('GET', '/usage/fetch'),
  fetchBlockUsage: () => apiRequest<BlockUsageData>('GET', '/usage/fetch-block'),

  loadClaudePermissions: (_scope: string, _cwd?: string) =>
    Promise.resolve<ClaudePermissions>({ allow: [], deny: [], ask: [], additionalDirectories: [], defaultMode: undefined }),
  saveClaudePermissions: (_scope: string, _permissions: ClaudePermissions, _cwd?: string) => Promise.resolve(),

  mcpServerStatus: (_routingId: string) => Promise.resolve<Array<{ name: string; status: string }>>([]),
  mcpToggleServer: (_routingId: string, _serverName: string, _enabled: boolean) =>
    Promise.resolve(true),
  mcpReconnectServer: (_routingId: string, _serverName: string) => Promise.resolve(true),
  mcpSetServers: (_routingId: string, _servers: Record<string, McpServerConfig>) => Promise.resolve({ added: [], removed: [], errors: {} }),
  loadMcpServers: (scope: string, cwd?: string) => apiRequest<Record<string, McpServerConfig>>('POST', '/mcp/load-servers', { scope, cwd }),
  saveMcpServers: (scope: string, servers: Record<string, McpServerConfig>, cwd?: string) =>
    apiRequest('POST', '/mcp/save-servers', { scope, servers, cwd }),
  removeMcpServer: (_scope: string, _serverName: string, _cwd?: string) => Promise.resolve(),
  mcpReadDisabled: (_cwd: string) => Promise.resolve([]),
  mcpToggleDisabled: (_cwd: string, _serverName: string, _enabled: boolean) => Promise.resolve(),

  listAutomations: () => Promise.resolve<Automation[]>([]),
  saveAutomation: (_automation: Automation) => Promise.resolve(),
  deleteAutomation: (_id: string) => Promise.resolve(),
  runAutomationNow: (_id: string) => Promise.resolve(),
  toggleAutomation: (_id: string, _enabled: boolean) => Promise.resolve(),
  listAutomationRuns: (_automationId: string) => Promise.resolve<AutomationRun[]>([]),
  loadAutomationRunHistory: (_automationId: string, _runId: string) =>
    Promise.resolve<ChatMessage[]>([]),
  cancelAutomationRun: (_id: string) => Promise.resolve(),
  dismissAutomationRun: (_automationId: string, _runId: string) => Promise.resolve(),
  sendAutomationMessage: (_id: string, _prompt: string) => Promise.resolve(),

  testProxyConnection: (_proxy: ProxySettings) => Promise.resolve<{ ok: boolean; latencyMs: number; error?: string }>({ ok: true, latencyMs: 0 }),

  logError: (source: string, message: string) => {
    console.error(`[${source}]`, message)
  },

  getNetworkInterfaces: () => apiRequest<Array<{ name: string; address: string; priority: number }>>('GET', '/network/interfaces'),
  startRemoteServer: (opts?: { port?: number; host?: string; tunnel?: boolean }) => apiRequest<{ port: number; token: string; lanUrl: string }>('POST', '/remote/start', opts),
  stopRemoteServer: () => apiRequest('POST', '/remote/stop'),
  getRemoteStatus: () => apiRequest<RemoteStatus>('GET', '/remote/status'),
  onRemoteStatus: onEvent('remote:status'),

  voiceStartServer: (_routingId: string) => Promise.resolve({ port: 0 }),
  voiceStopServer: (_routingId: string) => Promise.resolve(true),
  voiceStartRecording: (_routingId: string, _language: string) => Promise.resolve(),
  voiceStopRecording: (_routingId: string) => Promise.resolve(),
  onVoiceTranscript: onEvent('voice:transcript'),
  onVoiceState: onEvent('voice:state'),
  onVoiceError: onEvent('voice:error'),

  logRelay: (level: string, source: string, message: string) => {
    const logFn = console[level as keyof typeof console] as ((...args: unknown[]) => void) | undefined
    if (typeof logFn === 'function') {
      logFn(`[${source}]`, message)
    }
  },

  getVersionInfo: () => apiRequest<{ appVersion: string; sdkVersion: string; cliVersion: string }>('GET', '/app/version-info'),

  openLogViewer: () => Promise.resolve(),

  listPlugins: () => apiRequest<PluginInfo[]>('GET', '/plugins/list'),
  reloadPlugin: (_id: string) => apiRequest('POST', '/plugins/reload', { id: _id }),
  getPluginViews: () => apiRequest<PluginViewWithOwner[]>('GET', '/plugins/views'),
  getPluginPreloadPath: () => apiRequest<string>('GET', '/plugins/preload-path'),
  onPluginViewsChanged: onEvent('plugin:views-changed'),

  readMockupHtml: (cwd: string, directory: string) => apiRequest<string>('POST', '/mockup/read', { cwd, directory }),
  watchMockup: (cwd: string, directory: string) => apiRequest('POST', '/mockup/watch', { cwd, directory }),
  unwatchMockup: (cwd: string, directory: string) => apiRequest('POST', '/mockup/unwatch', { cwd, directory }),
  onMockupFileChanged: onEvent('mockup:file-changed')
}

declare global {
  interface Window {
    api: typeof api
  }
}

if (typeof window !== 'undefined') {
  window.api = api
}

export default api
