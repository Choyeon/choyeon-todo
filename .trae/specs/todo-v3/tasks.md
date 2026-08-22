# Implementation Tasks — Choyeon To Do v3.0

> 对应工件：[spec.md](./spec.md)
> 父验收标准缩写：AC-1..13 / AC-U1..U6
> 每任务都带 TR（rule 或 rubric）。Status 字段唯一表示进度。

---

## Task 1: 任务模型升级（子任务 + Area/List/Heading + 依赖 + 活动流 + 注释附件）
- **Status**: pending
- **Priority**: high
- **Depends on**: none
- **Covers**: AC-1, AC-2, FR-1
- **Scope**:
  1. 数据契约 v3：`tasksVersion: 3`；Task 新增 `parentId`（子任务 ≤4 层）、`areaId`、`listId`、`headingId`、`blockedBy: string[]`、`comments: Comment[]`、`attachments: Attachment[]`、`activity: Activity[]`、`createdAt`、`updatedAt`、`createdBy`、`assignee`。
  2. 新增 `areaStore` + `listStore`（原 Category → List，迁移脚本将 Category.id/name 写入 List）。
  3. `taskStore`：`addSubTask / convertToSubtask / promoteSubtask / reorder` 统一写入口；完成操作需校验 blockedBy，被阻断则抛错并 UI 提示。
  4. `migrate-v2-to-v3` 迁移脚本：自动填充 areaId（默认"未分组"Area），headingId 为空，parentId 为空，categoryId→listId，保持完成/顺序。
  5. TaskModal、TaskList 新增层级展开/折叠、依赖提示、附件拖拽、注释编辑器、活动时间轴 Tab。
- **Test Requirements (TR)**:
  - **[rule]** v2 fixtures（tasksVersion=2 或缺失）导入迁移后总数/完成数/排序序不变；失败即回滚。
  - **[rule]** 子任务/依赖组合用例 ≥ 50 条，均通过（例如：被阻断任务不可直接完成；完成父任务不递归修改子任务状态；解除阻断后可完成）。
  - **[rule]** 迁移失败或冲突时自动保存 `.conflict-v3.json` 并保留 v2 快照。
  - **[rubric] 任务层级视觉（0-2）**：≥ 1.5。锚：0 层级不分明，1 基本分明但折叠/展开动画突兀，2 清晰顺滑。证据：截图 + 自评。

---

## Task 2: 智能输入 v3 + 命令面板
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 1
- **Covers**: AC-3, AC-4, FR-2
- **Scope**:
  1. `smartParse.js`：新增"每月最后一个工作日""5月第二个周一""下个工作日""每周一三五""每两周""结束日期/次数"解析；内联语法 `!优先级`/`@分类`/`#标签`/`$Area`/`~提醒`/`>截止`/`⏱番茄时长`；支持粘贴 URL 自动填 notes。
  2. 新增 `CommandPalette.vue` 与 `src/composables/useCommandRegistry.js`：注册视图跳转、核心动作、历史任务搜索。Ctrl/Cmd+K 打开；Esc 关闭；Enter 执行；↑↓ 选择。
- **TR**:
  - **[rule]** `tests/utils/smartParse-v3.spec.js` ≥ 120 条用例通过（覆盖 3 语种 × 扩展语法分类）。正确率 ≥ 95%。
  - **[rule]** 命令面板注册命令 ≥ 20；搜索结果对关键字匹配/最近使用排序正确；键盘可达关闭均工作。
  - **[rubric] 输入体验质感（0-2）** ≥ 1.6。证据：首页创建 + 命令面板 10 条典型交互截图。

---

## Task 3: 导航、过滤器、自定义视图、拖拽
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 1
- **Covers**: AC-5, FR-3, AC-U1, AC-U2
- **Scope**:
  1. `filterStore`：SavedFilter 数据结构（query/组合条件数组/排序/视图归属）；侧边栏支持将 SavedFilter 钉在对应区域。
  2. Sidebar 重构：Area → List → SavedFilters → Inbox/我的一天/已完成/重要/逾期 分层；Area/List/Filter 全部支持拖拽重排与右键菜单。
  3. 列表中任务拖拽（跨 List、跨 Heading、跨 Area），使用 HTML5 DnD + 虚拟滚动友好插入位。
  4. "我的一天"智能推荐开关：按过去 21 天的完成时段/重复率/重要加权评分，每日自动加入。
- **TR**:
  - **[rule]** `filterStore.spec.js`：组合条件（AND/OR/NOT）解析与缓存命中 ≥ 30 条用例全通过。
  - **[rule]** 拖拽在 30 条 × 3 组边界下，`tasks.order`、`headingId`、`listId` 写入正确，无重复序。
  - **[rubric] IA 清晰度（0-2）** ≥ 1.5。证据：首次使用用户任务计时清单 ≤ 目标。

---

## Task 4: UX 与视觉现代化 + 空状态/引导/动画
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 3, Task 2
- **Covers**: FR-4, AC-U1, AC-U2, AC-U3, NFR-5, NFR-6
- **Scope**:
  1. 设计系统 tokens（CSS 变量）重制：背景/表面/边线/阴影/强调色 2-4 套；三档密度；`prefers-reduced-motion` / `forced-colors` 分支。
  2. 首次启动引导 WelcomeWizard：语言 → 示例数据填充（默认）→ 自启动/桌面快捷 → 推荐开关。
  3. 空状态定制：无任务、无列表、无番茄、无网络、过滤无结果。
  4. 微动画：任务行 fade-in、完成 checkmark 涟漪+strike、拖拽 placeholder、撤销浮动条、聚焦态脉冲。
  5. 三语种 i18n 键补齐；WCAG AA 对比度、ARIA。
- **TR**:
  - **[rule]** 三语种全部 key 不缺失（脚本扫描 `locales/*.js` 对称）。
  - **[rule]** axe-core 注入 Playwright 扫描首页/设置/统计/番茄：0 严重、≤ 5 中度（阈值 ≤ AC-U6=1.5）。
  - **[rubric] 视觉质感** 按 spec rubric 打分清单 ≥ 1.6。
  - **[rubric] 动画流畅度** ≥ 1.6。

---

## Task 5: 提醒调度升级 + Snooze + Windows Toast
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 1
- **Covers**: AC-6, AC-7, FR-5
- **Scope**:
  1. `useReminderScheduler.js`：新增 `snoozeTask(id, { minutes?, untilDate? })`；支持 6 预设 + 自定义相对/绝对；持久化在 task.nextReminderAt / task.snoozeCount。
  2. Electron main.cjs：新增 `toastScheduler`（Scheduled Toast Notification，通过 `shell.writeShortcut` 与 `app.setAppUserModelId` 激活）；对未来提醒提前注册 Windows 级计划通知；离线依然触发。
  3. 冲突策略：番茄工作会话中 → 普通提醒降为"弹窗无音"并计入干扰。
  4. 智能提醒：基于最近 21 天完成时段分布，在未设置提醒的重要任务上给出候选时间（可在设置关闭）。
- **TR**:
  - **[rule]** Snooze 用例 ≥ 30 条（预设/自定义相对/自定义绝对/跨天跨时区）。
  - **[rule]** Toast 注册/取消：主进程日志断言 `scheduleToast`/`clearToast` 成对。
  - **[rubric] 提醒准确性**（0-2）：≥ 1.6。锚：遗漏则 0 分。

---

## Task 6: 番茄钟深度 + FAB 可调 + 全局快捷键 + 专注摘要
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 1, Task 5
- **Covers**: AC-8, FR-6, AC-U3, AC-U4
- **Scope**:
  1. `pomodoroStore`：新增 `sessionSummary[]`（任务、耗时、打断次数、开始/结束时刻、自评等级 1-5、文本备注）。
  2. PomodoroFabView：大小滑杆、透明度、吸附边缘开关、点击穿透切换、常驻桌面、拖拽移动；`alwaysOnTop` 与"显示在所有工作区"。
  3. main.cjs 全局快捷键 8 个：Start/Stop/Pause/Restart/Skip + Mode(work↔short) + ToggleMini + Mute；`will-quit` 解除注册。
  4. 干扰检测：切换任务/窗口失焦 ≥ 设定阈值记为打断。
- **TR**:
  - **[rule]** 全局快捷键注册成功数 ≥ 8；在主窗口最小化下仍可响应并产生日志。
  - **[rule]** 番茄专注摘要生成：每次完整 work 会话后自动插入，字段齐全；导出 Markdown 时可嵌入。
  - **[rubric] FAB 体验** ≥ 1.5。

---

## Task 7: 统计复盘、Karma、热力图、周报月报
- **Status**: pending
- **Priority**: medium
- **Depends on**: Task 1, Task 6
- **Covers**: FR-7, AC-U5
- **Scope**:
  1. StatsView 升级为 Dashboard：Karma 分数与等级、完成曲线、逾期率、类别占比、标签热力、小时专注热力图、最佳时段。
  2. WeeklyMonthlyReview 改为叙事式周报："本周你完成了 X 个任务…最长专注…下一周建议…"，导出 Markdown；并支持截图导出（electron 截图）。
  3. AchievementView 新增 ≥ 10 个成就与解锁动画。
- **TR**:
  - **[rule]** 导出 Markdown 在 500/1000/5000 条任务规模下无错误。
  - **[rubric] 统计质量** ≥ 1.6。证据：Dashboard + 周报导出样本。

---

## Task 8: 数据契约/导入导出/SyncProvider 骨架 + 本地快照
- **Status**: pending
- **Priority**: medium
- **Depends on**: Task 1
- **Covers**: AC-12, FR-8, NFR-4
- **Scope**:
  1. 导入器：Microsoft To Do CSV、Todoist CSV、Apple Reminders CSV、通用 JSON。
  2. 导出器：JSON（全量/增量）、CSV（全量）、Markdown（一周/列表/选中任务）。
  3. `SyncProvider` 接口：`pull / push / diff / resolve`；实现 `LocalFileProvider`（默认存文档目录）与 `WebDAVProvider` 占位（仅文件级 fetch/put + Last-Write-Wins + `.conflict` 副本）。
  4. 本地快照：最多 30 天，设置页允许回滚并在回滚前保存当前态。
- **TR**:
  - **[rule]** MS To Do / Todoist fixtures 导入后字段匹配度 ≥ 95%。
  - **[rule]** 导出→再导入一次后任务数/状态一致。
  - **[rubric] 导入 UI** ≥ 1.5（流程可视化、冲突提示、预览）。

---

## Task 9: Electron 深度集成（自启动/协议/拖拽/Snap Layouts/单实例/托盘增强）
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 1, Task 2, Task 6
- **Covers**: AC-13, FR-9, AC-U4
- **Scope**:
  1. 自启动：使用 `app.setLoginItemSettings(settings)` + SettingsAbout 或 SettingsSystem 页面显示当前状态与开关 UI。
  2. 协议注册：`choyeon-todo://`；Windows 用 `protocol.registerSchemesAsPrivileged` + 安装期 NSIS 写入注册表（或 electron-builder `fileAssociations` + 代码内回退注册）。
  3. 单实例 + 启动参数：`app.requestSingleInstanceLock` + 处理 second-instance 事件（唤起主窗 + 解析参数）。
  4. 拖拽：文件/URL 拖入窗口 → 附件或 URL 任务自动抓取标题。
  5. 托盘增强：环形进度、最近任务菜单、快速添加。
  6. Snap Layouts：自定义标题栏按钮保持 Windows 11 行为。
- **TR**:
  - **[rule]** 协议唤起始发 → 创建任务字段正确（10 条用例）。
  - **[rule]** 单实例：启动第二个实例不重复开窗口，并成功转发协议参数。
  - **[rubric] Electron 桌面体验** ≥ 1.5。

---

## Task 10: 测试扩展、a11y、构建与代码质量
- **Status**: pending
- **Priority**: high
- **Depends on**: Tasks 1-9
- **Covers**: AC-11, NFR-1..8, AC-U6
- **Scope**:
  1. 新增测试：smartParse v3、filterStore、taskStore DAG、迁移、snooze、command palette、command registry、协议处理器、toast 调度、专注摘要、import/export。
  2. a11y：Playwright + axe-core 验收脚本。
  3. `eslint / vitest run / vite build` 三通道零错误；覆盖率不得低于当前基线。
  4. 解决既有 dependabot 安全问题（升级非破坏性依赖或在允许范围内降级）。
- **TR**:
  - **[rule]** 三条命令退出码均为 0；`vitest run` 新增用例 ≥ 300 且全部通过。
  - **[rule]** axe-core 严重问题为 0，中度 ≤ 5。
  - **[rubric] 代码质量/一致性** ≥ 1.6。

---

## Task 11: 版本升级、安装包构建、latest.yml 生成与 gh Release 发布、自动推送
- **Status**: pending
- **Priority**: high
- **Depends on**: Task 10
- **Covers**: AC-9, AC-10, FR-10
- **Scope**:
  1. package.json: `version: "3.0.0"`；更新版权/描述；vite define `__APP_VERSION__`。
  2. `npm run build` → `electron-builder --win --publish always`（或分两步：先 build 再 upload 到本地校验）。
  3. 输出目录：`C:/choyeon-todo/v3.0.0/` 原产物；同时复制一份到 `C:/choyeon-todo/3.0.0-正式发布版/`（中文可读）。
  4. 校验 `latest.yml` 存在、`version` 正确、files 哈希与 Setup.exe 匹配；必要时用脚本重新生成 latest.yml 的下载 URL（指向 Release assets 地址）。
  5. Release Notes：自上一个 tag（`v2.0.1`）以来 `git log --pretty` + 分类；`gh release create v3.0.0 --title "Choyeon To Do v3.0.0" --notes-file`。
  6. 上传资产：Setup.exe、Portable.exe、blockmap、latest.yml。
  7. autoUpdater 冒烟：运行 Setup 安装版 → 启动后查看主进程日志 `update-not-available`（或更新成功）无异常。
  8. 提交所有变更、打 tag v3.0.0、push 到远程（用 gh git-credential 辅助，必要时切账号）。
- **TR**:
  - **[rule]** 目录检查：两个输出目录同时存在且包含 ≥ 4 个目标文件；`latest.yml` 中 `version: 3.0.0`。
  - **[rule]** `gh release view v3.0.0` assets ≥ 4（Setup / Portable / 2 blockmap / latest.yml 共 ≥ 5 更优）。
  - **[rule]** 主进程启动日志无 `uncaughtException`；updater 阶段不抛错。
  - **[rubric] 发布完整性** ≥ 1.6（是否附带签名、notes 分类质量等）。

---

## 全局顺序依赖图

```
Task 1 (任务模型 + 迁移)
├─ Task 2 (智能输入 + 命令面板)
├─ Task 3 (导航/过滤/拖拽)
├─ Task 5 (提醒/Snooze/Toast)
├─ Task 8 (导入导出/同步骨架)
└─ Task 6 (番茄深度)  ─┬─ Task 7 (统计/复盘)
                        └─ Task 9 (Electron 集成)
Task 4 (UX/视觉) 需 Task 2+3 完成后（IA 稳定）
Task 10 (测试/质量) 在 Task 1-9 之后
Task 11 (发布) 在 Task 10 之后，最后执行
```
