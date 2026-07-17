<div align="center">

<img src="build/icon.png" width="120" height="120" alt="Choyeon To Do Logo" />

# Choyeon To Do

**一款现代化的跨平台桌面待办事项应用**

_智能解析 · 日历排程 · 番茄专注 · 数据洞察_

[![Release](https://img.shields.io/github/v/release/Choyeon/choyeon-todo?style=flat-square&label=Release)](https://github.com/Choyeon/choyeon-todo/releases)
[![License](https://img.shields.io/github/license/Choyeon/choyeon-todo?style=flat-square)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](https://github.com/Choyeon/choyeon-todo/releases)
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)

</div>

---

## 📸 应用截图

<div align="center">

### 主界面 · 智能任务管理

<img src="img/main.png" width="800" alt="主界面 - 任务列表与智能解析" />

<sub>自然语言智能解析 · 快速添加任务 · 侧边栏导航 · 分类管理</sub>

---

### 日历视图 · 可视化排程

<img src="img/🗓.png" width="800" alt="日历视图 - 月视图与时间线" />

<sub>月视图总览 · 时间线精细排程 · 拖拽修改时间 · 彩色分类标识</sub>

---

### 数据统计 · 深度洞察

<img src="img/data.png" width="800" alt="数据统计 - 多维度可视化分析" />

<sub>完成趋势折线图 · 分类分布饼图 · 热力图 · 柱状图 · 环形进度</sub>

---

### 番茄钟 · 专注计时

<img src="img/potato.png" width="800" alt="番茄钟 - 专注工作计时" />

<sub>三模式切换 · 环形辉光进度 · 任务绑定 · 全屏专注模式</sub>

---

### 系统通知 · 任务提醒

<img src="img/push.png" width="800" alt="系统通知 - 任务提醒推送" />

<sub>原生系统通知 · 逾期提醒 · 到期推送 · 点击跳转</sub>

</div>

---

## ✨ 功能特性

### 📝 智能任务管理
- **自然语言解析** — 输入「明天下午3点 开会 重要」，自动识别日期、时间、优先级
- **快速添加** — 一行输入，自动提取分类、标签、截止日期
- **批量操作** — 全部完成、批量编辑、撤销删除
- **优先级与分类** — 星标重要任务，自定义彩色分类和标签
- **全局搜索** — 跨所有视图的即时搜索

### 📅 日历与排程
- **月视图** — 整月任务总览，日期点标记任务密度
- **时间线视图** — 24 小时时间轴，精细排程当日任务
- **拖拽调度** — 拖拽任务卡片修改时间
- **智能视图** — 我的一天、明天、下周、已计划、重要、全部

### 🍅 番茄钟
- **三模式计时** — 专注 / 短休息 / 长休息，自动循环
- **自定义时长** — 1~180 分钟自由设定
- **任务绑定** — 将番茄钟绑定到具体任务
- **全屏专注** — 沉浸式全屏专注模式（桌面端独有）
- **番茄计数** — 可视化番茄完成进度

### 📊 数据统计
- **多维统计** — 完成率、连续天数、专注时长、番茄次数、逾期任务
- **趋势可视化** — 创建 vs 完成折线图，7/14/30 天切换
- **分类分布** — 环形饼图，待完成/已完成对比
- **热力图** — 本周完成强度可视化
- **柱状图** — 星期完成分布，发现高效日

### 🔔 任务提醒
- **原生通知** — Windows / macOS / Linux 系统级推送
- **逾期提醒** — 自动检测并提醒逾期任务
- **定时提醒** — 自定义提前提醒时间
- **免打扰模式** — 可关闭通知

### 🎨 设计与体验
- **毛玻璃质感** — 现代半透明 + 模糊效果
- **亮色/暗色主题** — 跟随系统或手动切换
- **响应式布局** — 适配不同窗口大小
- **流畅动画** — 计数动画、过渡效果、悬停反馈
- **跨平台一致** — Windows / macOS / Linux 统一体验

---

## 🚀 下载安装

### 从 Release 下载（推荐）

前往 [Releases 页面](https://github.com/Choyeon/choyeon-todo/releases/latest) 下载对应平台的安装包：

| 平台 | 文件 | 说明 |
|------|------|------|
| **Windows** | `Choyeon-To-Do-Setup-1.0.0.exe` | NSIS 安装程序（推荐） |
| **Windows** | `Choyeon-To-Do-Portable-1.0.0.exe` | 便携版，免安装 |
| **Linux** | `Choyeon-To-Do-1.0.0-linux-x64.tar.gz` | 解压后直接运行 |
| **macOS** | 需自行构建 | 见下方[构建指南](#-从源码构建) |

### 从源码构建

<details>
<summary>📖 点击展开构建步骤</summary>

#### 环境要求
- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

#### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Choyeon/choyeon-todo.git
cd choyeon-todo

# 2. 安装依赖
npm install

# 3. 开发模式运行
npm run electron:dev

# 4. 构建生产版本
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS（需在 macOS 上运行）
npm run electron:build:linux  # Linux
```

构建产物位于 `app-build/` 目录。

</details>

---

## 🛠️ 技术栈

<div align="center">

| 技术 | 版本 | 用途 |
|------|------|------|
| [Electron](https://www.electronjs.org/) | 43 | 跨平台桌面应用框架 |
| [Vue 3](https://vuejs.org/) | 3.5 | 渐进式前端框架 |
| [Pinia](https://pinia.vuejs.org/) | 3.0 | 状态管理 |
| [Vue Router](https://router.vuejs.org/) | 4 | 路由管理 |
| [Vite](https://vitejs.dev/) | 8 | 构建工具 |
| [Vitest](https://vitest.dev/) | 1.6 | 单元测试 |
| [electron-builder](https://www.electron.build/) | 26 | 打包分发 |

</div>

---

## 🏗️ 项目结构

```
todolist-app/
├── electron/              # Electron 主进程
│   ├── main.cjs           # 主进程入口
│   └── preload.cjs        # 预加载脚本
├── src/                   # Vue 渲染进程
│   ├── components/        # 通用组件
│   ├── views/             # 页面视图
│   ├── stores/            # Pinia 状态管理
│   ├── composables/       # 组合式函数
│   ├── router/            # 路由配置
│   ├── styles/            # 全局样式
│   └── utils/             # 工具函数
├── build/                 # 打包资源（图标、证书）
├── tests/                 # 单元测试
└── package.json
```

---

## 🔒 安全特性

本项目遵循 Electron 安全最佳实践：

- **上下文隔离** — `contextIsolation: true`，主进程与渲染进程隔离
- **沙箱模式** — `sandbox: true`，限制 Node.js API 访问
- **禁用 Node 集成** — `nodeIntegration: false`
- **CSP 策略** — 内容安全策略防止 XSS 注入
- **IPC 发送方校验** — 验证 IPC 消息来源
- **字段白名单** — stateSync 字段过滤，防止原型链污染
- **输入校验** — 颜色格式、任务数据校验
- **内存安全** — IPC 监听器、AudioContext、定时器生命周期管理

---

## 🧪 测试

```bash
# 运行单元测试
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage
```

---

## 📦 打包配置

支持三平台打包：

| 平台 | 格式 | 输出 |
|------|------|------|
| Windows | NSIS + Portable | `.exe` 安装包 + 便携版 |
| macOS | DMG + ZIP | `.dmg` 磁盘映像 |
| Linux | tar.gz | `.tar.gz` 压缩包 |

启用 `asar` 打包，代码压缩（terser + drop_console），vendor 分包优化加载速度。

---

## 📝 更新日志

### v1.0.0

**安全加固**
- IPC 发送方校验：`pomodoro:closeFullscreen`、`pomodoro:closeFab`、`pomodoro:action`
- `stateSync` 字段白名单（`POMODORO_SYNC_FIELDS`），拒绝未知字段
- 分类/标签颜色格式校验（`isValidHexColor`）

**内存泄漏修复**
- pomodoroStore: 清理 IPC 监听器、AudioContext 关闭
- settingsStore: matchMedia 主题监听器清理
- TaskList.vue: setTimeout 清理、AudioContext 关闭、expandedTaskIds 孤儿 ID 清理

**UI 优化**
- 已完成任务删除线样式重构（`text-decoration` 替代渐变）
- 三视图容器宽度和标题样式统一（760px / 32px / 300 weight）
- CalendarView timeline 已完成任务样式对齐

**性能优化**
- Vite `manualChunks` 分离 vendor（vue / pinia / router）
- terser 压缩（`drop_console` / `drop_debugger`）
- `JSON.parse(JSON.stringify())` → `structuredClone()`
- taskStore 新增 `markAllComplete` / `restoreTask` 批量 action

---

## 📄 许可证

本项目采用 [MIT License](./LICENSE) 开源协议。

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**

Made with ❤️ by [Choyeon](https://github.com/Choyeon)

</div>
