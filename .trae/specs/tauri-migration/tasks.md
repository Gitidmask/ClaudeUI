# ClaudeUI - Tauri 迁移实现计划

## [x] Task 1: 安装 Tauri 依赖并初始化项目
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 安装 Tauri CLI 和 API 依赖
  - 创建 Rust 后端目录结构
  - 配置 Tauri 构建系统
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-1.1: `npm run tauri build` 成功完成
  - `programmatic` TR-1.2: 生成的安装包存在且可执行

## [x] Task 2: 迁移 package.json 依赖配置
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 移除 Electron 相关依赖（electron, electron-vite, @electron-toolkit/*）
  - 添加 Tauri 依赖（@tauri-apps/api, @tauri-apps/cli）
  - 更新 scripts 命令
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-2.1: `npm install` 成功完成无错误
  - `programmatic` TR-2.2: package.json 中无 Electron 依赖

## [x] Task 3: 迁移主进程 IPC 到 Tauri Commands
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 将 Electron IPC handlers 转换为 Tauri commands
  - 创建 Rust 后端命令处理逻辑
  - 保持 API 接口兼容性
- **Acceptance Criteria Addressed**: [AC-3, AC-5, AC-6, AC-7]
- **Test Requirements**:
  - `human-judgment` TR-3.1: 会话创建功能正常
  - `human-judgment` TR-3.2: 消息发送功能正常

## [x] Task 4: 迁移 preload 脚本
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 将 Electron contextBridge API 迁移到 Tauri API
  - 更新 renderer 代码中的 ipcRenderer 调用
  - 使用 @tauri-apps/api 替代 Electron IPC
- **Acceptance Criteria Addressed**: [AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8]
- **Test Requirements**:
  - `human-judgment` TR-4.1: 所有 UI 功能正常工作
  - `human-judgment` TR-4.2: 无控制台错误

## [/] Task 5: 迁移终端功能 (node-pty)
- **Priority**: P0
- **Depends On**: Task 3
- **Description**: 
  - 研究 Tauri 中终端实现方案（如使用 rust-pty 或命令执行 API）
  - 实现终端创建、写入、调整大小和销毁功能
  - 处理终端数据流式传输
- **Acceptance Criteria Addressed**: [AC-4]
- **Test Requirements**:
  - `human-judgment` TR-5.1: 终端面板可正常打开
  - `human-judgment` TR-5.2: 命令执行和输出显示正常
  - `human-judgment` TR-5.3: 终端可调整大小

## [ ] Task 6: 迁移远程访问功能 (WebSocket)
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 在 Rust 后端实现 WebSocket 服务器
  - 处理客户端连接和消息转发
  - 支持 Cloudflare Tunnel 集成
- **Acceptance Criteria Addressed**: [AC-8]
- **Test Requirements**:
  - `human-judgment` TR-6.1: 远程服务器可启动
  - `human-judgment` TR-6.2: 浏览器可连接并显示界面

## [ ] Task 7: 迁移插件系统
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 将 Electron 插件系统迁移到 Tauri
  - 处理插件生命周期管理
  - 支持插件 WebView 视图
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-7.1: 插件可正常加载
  - `human-judgment` TR-7.2: 插件视图可正常显示

## [ ] Task 8: 迁移自定义协议和资源处理
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 实现 mockup-asset:// 自定义协议
  - 处理资源文件的读取和服务
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-8.1: Mockup 预览功能正常
  - `human-judgment` TR-8.2: 资源文件可正确加载

## [ ] Task 9: 迁移日志查看器功能
- **Priority**: P2
- **Depends On**: Task 3
- **Description**: 
  - 将 Electron 窗口管理迁移到 Tauri
  - 实现独立的日志查看器窗口
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgment` TR-9.1: 日志查看器可正常打开
  - `human-judgment` TR-9.2: 日志内容正确显示

## [ ] Task 10: 更新构建配置
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 更新 vite 配置以支持 Tauri
  - 创建 tauri.config.json
  - 更新 tsconfig 路径配置
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-10.1: 开发服务器正常启动
  - `programmatic` TR-10.2: 生产构建成功完成

## [ ] Task 11: 更新打包配置
- **Priority**: P0
- **Depends On**: Task 10
- **Description**: 
  - 配置 Tauri 打包选项
  - 设置应用图标和元数据
  - 配置 macOS/Windows/Linux 特定设置
- **Acceptance Criteria Addressed**: [AC-1, AC-9]
- **Test Requirements**:
  - `programmatic` TR-11.1: 各平台打包成功
  - `programmatic` TR-11.2: 包体积 <= 50MB

## [ ] Task 12: 更新测试配置
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 更新 vitest 配置以支持 Tauri 环境
  - 更新测试工具和模拟
  - 运行现有测试确保兼容性
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-12.1: 单元测试通过
  - `programmatic` TR-12.2: 组件测试通过

## [ ] Task 13: 清理 Electron 遗留代码
- **Priority**: P2
- **Depends On**: 所有其他任务
- **Description**: 
  - 删除 electron.vite.config.ts
  - 删除 src/main/index.ts（Electron 入口）
  - 删除 src/preload 目录（如不再需要）
  - 删除 electron-builder.yml
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-13.1: 无 Electron 相关文件残留
  - `programmatic` TR-13.2: 构建无错误

## [ ] Task 14: 性能测试和优化
- **Priority**: P2
- **Depends On**: Task 11
- **Description**: 
  - 测试应用启动时间
  - 测试内存占用
  - 识别并修复性能瓶颈
- **Acceptance Criteria Addressed**: [AC-9]
- **Test Requirements**:
  - `programmatic` TR-14.1: 启动时间 <= 2 秒
  - `programmatic` TR-14.2: 内存占用 <= 200MB
