<div align="center">

<img src="build/icon.png" width="120" height="120" alt="Choyeon To Do Logo" />

# Choyeon To Do

**简洁高效的任务管理工具，帮你把每天安排得明明白白**

<p align="center">
  <a href="#功能介绍">功能介绍</a> ·
  <a href="#下载安装">下载安装</a> ·
  <a href="#在线体验">在线体验</a> ·
  <a href="#界面预览">界面预览</a> ·
  <a href="#使用指南">使用指南</a> ·
  <a href="#开发指南">开发指南</a>
</p>

[![Release](https://img.shields.io/github/v/release/Choyeon/choyeon-todo?style=flat-square&logo=github&label=Release)](https://github.com/Choyeon/choyeon-todo/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Web-0078D4?style=flat-square&logo=windows-terminal&logoColor=white)](#下载安装)
[![Web Demo](https://img.shields.io/badge/demo-online-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://chuyuchoyeon.github.io/choyeon-todo/)
[![License](https://img.shields.io/github/license/Choyeon/choyeon-todo?style=flat-square)](./LICENSE)

[English](README.md) · [日本語](README.ja-JP.md)

</div>

---

## 功能介绍

- **快速添加** — 输入完直接回车，日期、时间、优先级自动识别
- **日历视图** — 月视图和时间线，一眼看清安排，拖拽就能改时间
- **番茄钟** — 专注 + 休息循环，给任意任务开个计时
- **数据统计** — 完成了多少事、专注了多久、连续打卡几天，一目了然
- **亮色/暗色主题** — 跟随系统或者自己选
- **跨平台** — Windows、macOS、网页版用起来都一样
- **键盘快捷键** — 加任务、搜东西、切页面，不用摸鼠标
- **PWA 支持** — 网页版能装到桌面，没网也能用
- **多语言** — 简体中文 · English · 日本語

---

## 界面预览

| 主界面 | 日历视图 |
| :---: | :---: |
| <img src="img/main.png" width="100%" alt="主界面" /> | <img src="img/🗓.png" width="100%" alt="日历视图" /> |
| **数据统计** | **番茄钟** |
| <img src="img/data.png" width="100%" alt="数据统计" /> | <img src="img/potato.png" width="100%" alt="番茄钟" /> |

---

## 在线体验

网页版直接打开就能用：

**🌐 https://chuyuchoyeon.github.io/choyeon-todo/**

> 网页版没有系统通知、托盘菜单和全局快捷键这些桌面端功能。

---

## 下载安装

### 最新版本：v1.0.1

| 平台 | 下载方式 |
|------|----------|
| **Windows** | [安装版](https://github.com/Choyeon/choyeon-todo/releases/latest) · [便携版](https://github.com/Choyeon/choyeon-todo/releases/latest) |
| **macOS** | [DMG / ZIP](https://github.com/Choyeon/choyeon-todo/releases/latest)（支持 Intel 和 Apple Silicon） |
| **Linux** | [tar.gz](https://github.com/Choyeon/choyeon-todo/releases/latest) |

所有版本都在 [Releases 页面](https://github.com/Choyeon/choyeon-todo/releases)。

### 安装说明

**Windows**
- 安装版：运行 Setup 程序，跟着提示走就行
- 便携版：解压后直接运行 `Choyeon To Do.exe`

**macOS**
- 打开 DMG，把应用拖到 Applications 文件夹
- 如果提示安全风险，去「系统设置 → 隐私与安全性」点「仍要打开」

---

## 使用指南

### 快速上手

1. **加任务** — 在顶部输入框里打字，按回车添加
2. **自动识别** — 输入时自动识别日期、时间、优先级、分类
   - 比如：`明天下午3点 开会 #工作 重要`
3. **管理任务** — 点复选框标记完成，点文字编辑详情
4. **切换视图** — 左边侧边栏换不同的页面

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + N` | 新建任务 |
| `Ctrl/Cmd + F` | 搜索任务 |
| `Ctrl/Cmd + ,` | 打开设置 |
| `Esc` | 关闭弹窗 / 取消编辑 |

---

## 开发指南

### 环境要求

- Node.js >= 18
- npm >= 9

### 开始开发

```bash
# 克隆仓库
git clone https://github.com/Choyeon/choyeon-todo.git
cd choyeon-todo

# 安装依赖
npm install

# 网页版开发
npm run dev

# 桌面端开发
npm run electron:dev
```

### 打包

```bash
# 打包网页版
npm run build

# 打包 Windows（得在 Windows 上跑）
npm run electron:build:win

# 打包 macOS（得在 macOS 上跑）
npm run electron:build:mac

# 打包 Linux
npm run electron:build:linux
```

打包产物在 `app-build/` 目录。

### 测试

```bash
# 运行单元测试
npm run test:run

# 覆盖率
npm run test:coverage
```

### 技术栈

Vue 3 · Vite · Pinia · Vue Router · Electron · electron-builder · Vitest · Lucide Icons · vue-i18n · vite-plugin-pwa

---

## 更新日志

### v1.0.1 — 2026-07-18

- README 结构调整，更侧重软件本身
- About 页面文案优化
- 修复：Windows 打包路径过长问题
- 修复：已完成任务样式在不同视图不一致

### v1.0.0 — 2026-07-18

首次发布。

核心功能：
- 智能任务输入（自然语言识别）
- 日历（月视图 + 时间线）
- 番茄钟（三模式 + 全屏专注）
- 数据统计（折线图、饼图、热力图、柱状图）
- 系统通知和提醒
- 亮色/暗色主题
- PWA 离线支持
- 三语言：简体中文 / English / 日本語

---

## 许可证

[MIT](./LICENSE) © Choyeon
