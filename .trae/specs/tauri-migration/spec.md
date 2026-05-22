# ClaudeUI - Tauri 迁移项目需求文档

## Overview
- **Summary**: 将 ClaudeUI 项目从 Electron 框架迁移到 Tauri 框架，以获得更好的性能、更小的包体积和原生应用体验。
- **Purpose**: Electron 应用存在包体积大、内存占用高的问题。Tauri 提供了更轻量级的替代方案，使用 Rust 作为后端，WebView 作为前端渲染，同时保持与系统的深度集成能力。
- **Target Users**: 所有 ClaudeUI 用户，特别是需要更快启动速度和更小安装包的用户。

## Goals
- 将 Electron 主进程代码迁移到 Tauri Rust 后端
- 保持所有现有功能完整可用
- 提供更小的安装包（目标：减少 50%+）
- 保持或提升应用性能

## Non-Goals (Out of Scope)
- 不修改核心业务逻辑（会话管理、SDK 集成等）
- 不新增功能特性
- 不改变 UI 设计和用户体验
- 不迁移 Web 版本（src/web/）

## Background & Context
当前 ClaudeUI 使用 Electron 41 + React 19 + TypeScript 技术栈。主要依赖包括：
- electron-vite 构建工具
- node-pty 用于终端功能
- ws 用于 WebSocket 远程访问
- 多个自定义 IPC 通道用于主进程与渲染进程通信

Tauri 是一个现代化的桌面应用框架，具有以下优势：
- 更小的包体积（通常 < 10MB vs Electron 的 > 100MB）
- 更低的内存占用
- 原生系统集成能力
- Rust 后端提供更好的性能和安全性

## Functional Requirements
- **FR-1**: 应用启动并显示主窗口
- **FR-2**: 所有现有 UI 组件正常渲染
- **FR-3**: 会话创建和消息发送功能正常
- **FR-4**: 终端功能正常工作
- **FR-5**: Git 集成功能正常
- **FR-6**: 自动化管理功能正常
- **FR-7**: MCP 服务器管理功能正常
- **FR-8**: 远程访问功能正常

## Non-Functional Requirements
- **NFR-1**: 包体积 <= 50MB（从 Electron 的 ~150MB 减少）
- **NFR-2**: 启动时间 <= 2 秒
- **NFR-3**: 内存占用 <= 200MB（空闲状态）
- **NFR-4**: 保持原有的 TypeScript 类型安全
- **NFR-5**: 保持现有的测试覆盖率

## Constraints
- **Technical**: 
  - 需要学习 Tauri 框架和 Rust 基础知识
  - 需要替换 Electron 特定 API（如 ipcMain/ipcRenderer）
  - 需要处理 node-pty 在 Tauri 中的替代方案
- **Business**: 保持与现有版本功能等价
- **Dependencies**: 
  - @tauri-apps/api
  - @tauri-apps/cli
  - Rust 工具链

## Assumptions
- Tauri 提供足够的系统 API 替代 Electron
- node-pty 可以通过 Tauri 的命令执行能力替代
- WebSocket 功能可以通过 Rust 实现或继续使用 JavaScript 库

## Acceptance Criteria

### AC-1: 项目构建成功
- **Given**: 开发环境已配置好 Tauri 和 Rust
- **When**: 执行构建命令
- **Then**: 应用成功构建，无编译错误
- **Verification**: `programmatic`

### AC-2: 主窗口正常显示
- **Given**: 应用已启动
- **When**: 用户打开应用
- **Then**: 主窗口正常显示，包含侧边栏和聊天区域
- **Verification**: `human-judgment`

### AC-3: 会话创建和消息发送
- **Given**: 用户已打开应用
- **When**: 用户创建新会话并发送消息
- **Then**: 消息成功发送，收到 Claude 的响应
- **Verification**: `human-judgment`

### AC-4: 终端功能正常
- **Given**: 用户已打开应用
- **When**: 用户打开终端面板并执行命令
- **Then**: 终端显示命令输出
- **Verification**: `human-judgment`

### AC-5: Git 功能正常
- **Given**: 用户在 Git 仓库中
- **When**: 用户打开 Git 面板
- **Then**: 正确显示分支、暂存状态和 diff
- **Verification**: `human-judgment`

### AC-6: 自动化管理功能正常
- **Given**: 用户已打开应用
- **When**: 用户创建并运行自动化
- **Then**: 自动化正常执行并显示运行历史
- **Verification**: `human-judgment`

### AC-7: MCP 服务器管理功能正常
- **Given**: 用户已打开应用
- **When**: 用户管理 MCP 服务器
- **Then**: 服务器状态正确显示，可正常启用/禁用
- **Verification**: `human-judgment`

### AC-8: 远程访问功能正常
- **Given**: 用户已打开应用
- **When**: 用户启动远程服务器
- **Then**: 可通过浏览器访问远程界面
- **Verification**: `human-judgment`

### AC-9: 包体积优化
- **Given**: 应用已构建完成
- **When**: 检查安装包大小
- **Then**: 包体积 <= 50MB
- **Verification**: `programmatic`

## Open Questions
- [ ] Tauri 中如何替代 node-pty 实现终端功能？
- [ ] WebSocket 远程访问在 Tauri 中如何实现？
- [ ] 如何处理 Electron 的 preload 脚本迁移？
- [ ] Tauri 是否支持自定义协议（mockup-asset://）？
