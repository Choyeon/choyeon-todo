# 项目迭代优化路线图

> **项目**: Choyeon To Do — 现代化任务管理应用
> **技术栈**: Vue 3 + Pinia + Vue Router + Vite + Electron
> **文档目的**: 系统性梳理可优化项，按优先级和模块分类，为后续迭代提供清晰方向

---

## 一、项目现状概览

### 已完成的工作
- ✅ 核心功能完整：任务管理、分类、标签、日历视图、统计、番茄钟
- ✅ Electron 桌面端 + Web 端双端支持
- ✅ GitHub Pages 已部署（https://chuyuchoyeon.github.io/choyeon-todo/）
- ✅ 响应式布局（桌面端 + 移动端底部导航）
- ✅ 深色/浅色主题 + 毛玻璃效果
- ✅ 单元测试基础（5 个测试文件，vitest）
- ✅ ARIA 无障碍标签覆盖较完善
- ✅ localStorage 本地数据持久化

### 技术债务扫描
- 无 TypeScript 类型支持
- 无 ESLint / Prettier 代码规范
- 无 CI/CD 工作流
- 大文件问题（SettingsView.vue 估计 2000+ 行）
- localStorage 存储容量限制（约 5MB）
- 无 E2E 测试
- 无 PWA 支持
- 无错误边界 / 全局错误上报
- 无国际化（i18n）框架

---

## 二、优化方向总览

| 优先级 | 类别 | 条目 | 预估工作量 |
|--------|------|------|-----------|
| 🔴 高 | 代码质量 | 引入 ESLint + Prettier | 小 |
| 🔴 高 | 代码质量 | SettingsView 组件拆分 | 中 |
| 🔴 高 | 工程化 | GitHub Actions CI（测试 + 构建） | 小 |
| 🟡 中 | 性能 | 虚拟滚动（大量任务时） | 中 |
| 🟡 中 | 数据持久化 | 升级到 IndexedDB | 中 |
| 🟡 中 | 测试 | 增加测试覆盖率到 60%+ | 中 |
| 🟡 中 | 用户体验 | 键盘快捷键完善 | 中 |
| 🟡 中 | 工程化 | 引入 TypeScript | 大 |
| 🟢 低 | 功能 | 子任务拖拽排序 | 中 |
| 🟢 低 | 功能 | 任务模板 / 重复任务 | 大 |
| 🟢 低 | 用户体验 | PWA 支持（安装到桌面/手机） | 中 |
| 🟢 低 | 用户体验 | 国际化（中英双语） | 中 |
| 🟢 低 | 性能 | 路由懒加载 + 组件懒加载 | 小 |

---

## 三、高优先级优化（建议近期迭代）

### 3.1 代码规范：ESLint + Prettier

**现状**：项目无代码规范工具，代码风格一致性依赖人工。

**收益**：
- 统一代码风格，降低 PR 审查成本
- 提前发现潜在 bug（未使用变量、空函数等）
- 配合 Git hooks 实现提交前自动格式化

**涉及文件**：
- 新增：`.eslintrc.cjs` 或 `eslint.config.js`
- 新增：`.prettierrc`
- 新增：`.eslintignore`
- 修改：`package.json`（添加 lint 脚本）
- 修改：`src/` 下所有源文件（自动格式化）

**实施步骤**：
1. 安装依赖：`eslint`、`eslint-plugin-vue`、`prettier`、`eslint-config-prettier`、`eslint-plugin-prettier`
2. 配置 ESLint（使用 Vue 3 推荐规则）
3. 配置 Prettier（2 空格缩进、单引号等）
4. 添加 `npm run lint` 和 `npm run format` 脚本
5. 全量格式化现有代码
6. 可选：添加 lint-staged + husky 实现 pre-commit 钩子

**风险**：低。首次格式化可能产生大量 diff，但都是风格变化。

---

### 3.2 SettingsView 组件拆分

**现状**：`SettingsView.vue` 估计 2000+ 行，包含主题、字体、分类管理、标签管理、番茄钟设置、通知设置、系统设置、数据管理等全部设置功能，职责过重。

**收益**：
- 每个子组件职责单一，易维护
- 提升开发效率，减少冲突
- 可独立测试

**涉及文件**：
- 拆分自：`src/views/SettingsView.vue`
- 新增：`src/components/settings/SettingsTheme.vue`
- 新增：`src/components/settings/SettingsAppearance.vue`
- 新增：`src/components/settings/SettingsCategories.vue`
- 新增：`src/components/settings/SettingsTags.vue`
- 新增：`src/components/settings/SettingsPomodoro.vue`
- 新增：`src/components/settings/SettingsNotifications.vue`
- 新增：`src/components/settings/SettingsSystem.vue`
- 新增：`src/components/settings/SettingsData.vue`
- 新增：`src/components/settings/SettingsAbout.vue`
- 修改：`src/views/SettingsView.vue`（变为容器，组合子组件）

**拆分原则**：
- 按设置项的逻辑分组拆分
- 共享逻辑提取到 composables
- 共享样式提取到 CSS 变量 / 公共类
- 保持 props / emit 接口清晰

**风险**：中。需要确保所有功能在拆分后正常工作，建议配合测试。

---

### 3.3 GitHub Actions CI 工作流

**现状**：无自动化 CI，测试和构建依赖本地手动运行。

**收益**：
- PR 自动运行测试，保障代码质量
- 自动构建验证，提前发现构建失败
- 可扩展到自动发布（Electron 应用、GitHub Pages）

**涉及文件**：
- 新增：`.github/workflows/ci.yml`

**CI 工作流内容**：
```yaml
# 触发条件：push 到 main、PR 到 main
# 步骤：
# 1. checkout 代码
# 2. setup node
# 3. npm ci（安装依赖）
# 4. npm run lint（代码检查）
# 5. npm run test:run（单元测试）
# 6. npm run build（构建验证）
# 7. npm run build:pages（GitHub Pages 构建验证）
```

**可选扩展**：
- Codecov 测试覆盖率报告
- 自动部署 GitHub Pages（推送到 main 时）
- Electron 自动构建 + Release Draft

**风险**：低。纯工程化配置，不影响业务代码。

---

## 四、中优先级优化（建议中期迭代）

### 4.1 数据持久化升级：localStorage → IndexedDB

**现状**：所有数据存在 localStorage，容量限制约 5MB，且是同步阻塞操作。

**问题**：
- 容量限制：大量任务 + 附件 / 备注时可能超限
- 同步阻塞：数据量大时 save 操作会阻塞主线程
- 无事务支持：批量操作可能部分失败导致数据不一致

**收益**：
- 存储容量大幅提升（通常数百 MB）
- 异步操作，不阻塞 UI
- 支持索引查询，性能更好
- 为后续功能（任务附件、富文本描述）打基础

**涉及文件**：
- 新增：`src/utils/db.js`（IndexedDB 封装，推荐使用 idb 库）
- 修改：`src/stores/taskStore.js`（切换存储层）
- 修改：`src/stores/settingsStore.js`
- 修改：`src/stores/pomodoroStore.js`
- 新增：数据迁移逻辑（localStorage → IndexedDB）

**推荐方案**：使用 `idb` 库（IndexedDB 的 Promise 封装，体积小）。

**迁移策略**：
1. 应用启动时检查 IndexedDB 是否有数据
2. 若无，从 localStorage 导入
3. 导入成功后标记迁移完成
4. 保留 localStorage 读取作为降级方案（至少 2 个版本）

**风险**：中。数据迁移是关键路径，需确保迁移失败时有回退方案。

---

### 4.2 测试覆盖率提升

**现状**：5 个测试文件，覆盖基础组件和 store，但估计覆盖率 < 30%。

**目标**：核心逻辑覆盖率达到 60%+。

**优先级排序**：
1. `taskStore.js`（核心业务逻辑，最高优先级）
2. `pomodoroStore.js`（番茄钟状态机）
3. `settingsStore.js`
4. `utils/date.js`（日期工具函数）
5. `utils/smartParse.js`（智能解析）
6. 关键组件：`TaskList.vue`、`TaskModal.vue`、`Sidebar.vue`

**涉及文件**：
- 修改/新增：`tests/` 目录下各测试文件

**建议新增测试类型**：
- Store 操作的边界测试（空数据、异常输入）
- 日期工具函数的全面测试
- 组件交互测试（添加、编辑、删除任务）
- 快照测试（组件渲染结果）

**风险**：低。纯增量，不影响生产代码。

---

### 4.3 路由懒加载 + 组件懒加载

**现状**：所有视图在 `router/index.js` 中静态导入，首屏加载全部 JS。

**收益**：
- 减小首屏 bundle 体积
- 加快首屏渲染速度
- 按需加载，提升 Web 端体验

**涉及文件**：
- 修改：`src/router/index.js`

**改造方式**：
```javascript
// 改造前
import HomeView from '../views/HomeView.vue'

// 改造后
const HomeView = () => import('../views/HomeView.vue')
```

**配合 Vite 配置**：
- 可添加 webpackChunkName 风格的注释命名 chunk
- 结合 `rollupOptions.output.manualChunks` 优化分包策略

**风险**：极低。纯性能优化，功能不变。

---

### 4.4 键盘快捷键完善

**现状**：已有部分 Electron 全局快捷键，但应用内快捷键不完整。

**建议增加的快捷键**：

| 快捷键 | 功能 | 作用域 |
|--------|------|--------|
| `Ctrl/Cmd + N` | 新建任务 | 全局 |
| `Ctrl/Cmd + F` | 搜索任务 | 全局 |
| `Ctrl/Cmd + K` | 快捷命令面板（可选） | 全局 |
| `Ctrl/Cmd + ,` | 打开设置 | 全局 |
| `Ctrl/Cmd + Z` | 撤销（删除任务时） | 全局 |
| `Escape` | 关闭弹窗 / 取消编辑 | 弹窗内 |
| `Enter` | 保存 / 确认 | 表单内 |
| `J / K` | 上下移动选中任务 | 任务列表 |
| `Space` | 切换任务完成状态 | 任务列表 |
| `Ctrl/Cmd + D` | 删除当前任务 | 任务列表 |
| `Ctrl/Cmd + Shift + P` | 开始/暂停番茄钟 | 全局 |

**涉及文件**：
- 新增：`src/composables/useKeyboardShortcuts.js`
- 修改：`src/App.vue`
- 修改：`src/components/TaskList.vue`
- 修改：`src/components/TaskModal.vue`

**风险**：低。增量功能，可逐步添加。

---

### 4.5 引入 TypeScript

**现状**：全项目使用 JavaScript，无类型系统。

**收益**：
- 编译期发现类型错误
- 更好的 IDE 智能提示
- 重构更安全
- 代码自文档化

**涉及范围**：
- 所有 `.js` → `.ts`
- 所有 `.vue` 组件 script 块添加 `lang="ts"`
- Store 定义添加类型
- 新增 `tsconfig.json`
- 修改 `vite.config.js`

**迁移策略**（渐进式）：
1. 配置 TypeScript 环境（允许 JS 和 TS 共存）
2. 先迁移工具函数和 store（业务逻辑核心）
3. 再迁移组件
4. 最后开启严格模式

**风险**：高。改动范围大，建议分多个迭代完成。

---

## 五、低优先级优化（建议长期规划）

### 5.1 虚拟滚动

**适用场景**：任务列表超过 200+ 条时，DOM 节点过多导致卡顿。

**方案**：
- 使用 `vue-virtual-scroller` 或手写虚拟列表
- 仅渲染可视区域内的任务项
- 预估行高，动态计算滚动位置

**涉及文件**：
- 修改：`src/components/TaskList.vue`

**风险**：中。需要处理动态行高、滚动位置锚定等边缘情况。

---

### 5.2 任务模板 / 重复任务

**功能描述**：
- 任务模板：保存常用任务为模板，一键创建
- 重复任务：按日/周/月/自定义周期自动生成任务

**涉及文件**：
- 新增：`src/stores/templateStore.js`
- 修改：`src/stores/taskStore.js`（添加重复逻辑）
- 修改：`src/components/TaskModal.vue`（添加重复设置）
- 新增：`src/views/TemplateView.vue`（可选）

**风险**：大。功能复杂，涉及数据模型变更和迁移。

---

### 5.3 PWA 支持

**功能描述**：
- Web 端可安装到桌面 / 手机主屏幕
- 离线可用（已缓存数据）
- 推送通知

**方案**：使用 `vite-plugin-pwa` 插件。

**涉及文件**：
- 修改：`vite.config.js`
- 新增：`public/manifest.webmanifest`
- 新增：Service Worker 配置

**风险**：低。增量功能，不影响现有功能。

---

### 5.4 国际化（i18n）

**功能描述**：支持中英文切换，为多语言扩展打基础。

**方案**：使用 `vue-i18n`。

**涉及文件**：
- 新增：`src/locales/zh-CN.js`
- 新增：`src/locales/en-US.js`
- 新增：`src/i18n/index.js`
- 修改：`src/main.js`
- 修改：所有组件中的硬编码中文字符串

**风险**：中。改动面广，但逻辑简单。

---

### 5.5 错误边界 + 全局错误监控

**现状**：`main.js` 中有基础的 `errorHandler` 和 `unhandledrejection` 监听，但仅输出到 console。

**优化方向**：
1. 添加 Vue 错误边界组件（捕获组件渲染错误）
2. 错误信息收集到本地日志
3. 可选：集成 Sentry 等错误监控平台

**涉及文件**：
- 新增：`src/components/ErrorBoundary.vue`
- 修改：`src/App.vue`
- 修改：`src/main.js`

**风险**：低。

---

## 六、建议的迭代顺序

### 第一迭代（小步快跑，立竿见影）
1. ESLint + Prettier 代码规范
2. GitHub Actions CI
3. 路由懒加载
4. 增加核心 store 测试覆盖

### 第二迭代（架构优化）
1. SettingsView 组件拆分
2. 数据持久化升级到 IndexedDB
3. 键盘快捷键完善

### 第三迭代（体验提升）
1. 虚拟滚动
2. PWA 支持
3. 国际化

### 第四迭代（功能扩展）
1. 任务模板
2. 重复任务
3. 快捷命令面板

### 第五迭代（长期基建）
1. TypeScript 迁移
2. E2E 测试（Playwright）
3. 错误监控平台集成

---

## 七、快速检查清单

使用以下清单评估每个优化项是否值得做：

- [ ] **用户价值**：用户能直接感知到吗？
- [ ] **投入产出比**：收益是否大于成本？
- [ ] **风险可控**：失败了能回退吗？
- [ ] **可测试**：做完能验证效果吗？
- [ ] **可度量**：有量化指标衡量改进吗？

---

*文档生成时间：2026-07-18*
