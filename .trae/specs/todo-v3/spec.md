# Spec: 对标一流 To Do 产品的 v3.0 版本迭代

> 语言：中文（简体）
> 项目仓库：`d:\WebProjects\choyeon-todo-tmp`（远程 `https://github.com/Choyeon/choyeon-todo.git`）
> 当前基线版本：`2.0.1`；本次发布版本：`3.0.0`

---

## 1. 问题（Problem）

Choyeon To Do 已具备基础 Todo 能力（分类/清单/待办/日历/统计/番茄钟/习惯/成就/复盘/快捷键/多语言/深色模式/PWA/Electron 打包与自动更新），并在上一轮修复了状态互斥 Bug。但对标 **Microsoft To Do / Todoist / Things 3 / Apple Reminders / TickTick** 的一流体验，当前仍存在以下差距：

1. **任务模型粗**：缺少"子任务继承提醒时间""分组/列表自定义排序（拖拽）""任务依赖/阻断""注释/附件/活动历史""智能日期（`5月第二个周一`/`每月最后一天`）""从邮件/微信/剪贴板导入""评论和分配协作（可先做本地草稿版）"等。
2. **智能输入弱**：`smartParse` 不能解析相对时间（`下周二 15:30 提醒`、`5月第二个周一`）、重复规则（每周一三五、每两周、N 次后停止、结束日期），中文输入存在 `!重要`、`#标签`、`@分类`、`⏰` 的内联语法空白；缺少"命令面板"（Cmd/Ctrl+K）与自然语言输入建议。
3. **导航与 IA**：缺少 Todoist 式的 *Filters & Labels* 页与 Things 3 的 *Areas → Projects → Headings → Todos* 三阶层；当前侧边栏只到 Category 一级，没有自定义视图保存（"晚 8 点前可做的任务"、"全部我本周的 P1"）。
4. **UX / 视觉品质**：首次使用缺少"引导/欢迎引导"与"示例数据填充"；空状态图形通用化而非产品风格化；动画缺少任务行进入/完成/拖拽/聚焦/撤销的微交互；响应式布局在窄屏与 Windows 桌面分辨率（1366、1600）下密度/留白不可控；任务卡片"星标 + 完成 + 番茄 + 展开 + 操作"的动作区视觉层级混乱。
5. **统计与复盘**：当前统计视图以基础分组为主，缺少 Todoist 的 *Productivity*（完成率/连续天数/专注时长趋势）与 Microsoft To Do 的"每日重复 vs 一次性任务分解""每周推进曲线""每日最佳时段热力图"，以及 Things 3 的"这个周末你做到了什么"叙事式周报。
6. **提醒与通知**：缺少"到期未完成 → 自动延后/升级提醒""Snooze（稍后提醒）预设（10 分钟/1 小时/晚上/明天）与自定义 + 相对时间（3 天 2 小时后）""智能提醒（基于用户过往完成时段）""番茄钟会话与任务提醒冲突时的策略（静音/暂停/合并通知）"。
7. **番茄钟深度不足**：缺少"任务专注会话自动生成长摘要（聚焦任务 + 时段 + 中断次数）""干扰检测（任务切换率）""专注阶段统计（周报可嵌入）""跨窗口 FAB 窗口大小可调 + 点击穿透/置顶/常驻角落""主进程全局快捷键 Start/Stop/Pause/Skip/SwitchMode/MiniShowToggle"。
8. **Electron 能力未兑现**：系统托盘/迷你卡片交互弱；缺少"开机自启配置（含 UI）""Windows 通知渠道（Scheduled Toast 用于 future 提醒，而非 setInterval 轮询）""协议唤起（`choyeon-todo://add?text=...`）""文件/URL 拖拽到任务生成备注"、"主窗口单实例 + 启动参数解析"。
9. **多端与数据契约**：当前只有本地存储。缺失"可插拔同步后端适配器（本地文件 / WebDAV / iCloud Drive 占位接口）、变更日志/本地版本（Rollback）、导入 Microsoft To Do / Todoist CSV 的适配层、导出 Markdown/CSV/JSON 的全量与增量"。
10. **可访问性与国际化**：缺少键盘导航全量合规（行 Tab/回车/空格/方向键）、ARIA 补齐、动态中文日语文本截断与换行策略、`prefers-reduced-motion`/`forced-colors`/高对比度模式支持。
11. **发布与更新不完整**：虽然 `electron-builder` 已配置输出到 `C:/choyeon-todo/${version}` 与 GitHub publish，但缺少：1）`latest.yml`（electron-updater 通用更新文件）随 nsix/portable 产物同时发布；2）安装包额外拷贝一份到"版本命名 + 中文"可读目录名；3）Release Notes 自动生成（自上一个 tag 以来的 commits）。

## 2. 目标用户与目标（Users & Goals）

- **个人知识工作者**（主）：日常多任务并行、对智能输入、过滤视图、统计复盘高度敏感，每天使用时长 15~60 分钟。
- **学生**：强调习惯追踪 + 番茄钟 + 周期复盘。
- **轻量小团队本地协作**：至少支持"本地分配者字段 + 评论 + 导出 CSV"。

### 目标（Goals）

1. 对标 Microsoft To Do 的"智能输入 + 分类/列表/标签/我的一天 + 到期/逾期/重要 + 提醒生态" 与 Todoist 的"过滤与自定义视图、Karma、项目/小节"，并结合 Things 3 的视觉质感与三阶层。
2. UI/交互在 Windows 桌面（1366×768 起）下达到"精致、专业、克制"三档的 agency 级验收（见 Rubric AC）。
3. 任务管理、提醒、番茄钟、统计的状态互斥：继续保持上一轮修复后的零冲突原则，并新增对"依赖/子任务/分组/撤销"组合状态的一致性保障。
4. Electron 安装包可直接用于分发：Windows NSIS + Portable 同时产出；`latest.yml` 必须一并发布并校验签名哈希；gh CLI 发 Release 并自动生成 Notes；版本目录落盘。
5. 构建与测试全绿：`vite build`、`vitest run`、`eslint` 三通道零错误。

## 3. 非目标（Non-Goals）

- 不做账号/云端同步服务端开发。仅加入*适配器接口*（SyncProvider），并提供本地文件（JSON 包 + 导入导出）与 WebDAV 两个参考实现的骨架（文件级 API 占位即可）。
- 不做移动端原生 App；本轮交付仍为 PWA + Electron 桌面。
- 不做第三方 OAuth 登录。
- 不做真正的多人实时协作；"分配/评论"仅本地字段与本地存储。

## 4. 功能需求（Functional Requirements）

### FR-1 任务模型升级
- 子任务：支持层级（≤4 级），继承父任务的提醒/分类/标签可选择；单独完成顺序；展开折叠。
- 分组/项目/小节：列表支持 Heading 分组并可拖拽折叠；Category 升级为"Area/List"二级。
- 任务依赖：`blockedBy` 数组（任务 ID），被依赖未完成时禁止完成并在 UI 显示依赖链。
- 注释/附件/活动：本地富文本编辑 + 拖入附件（Electron）+ 活动流（创建/编辑/完成/撤销/提醒触发/番茄完成）。
- 智能日期：支持 `每月最后一个周五`、`下个工作日`、`5 月第二个星期一` 等，并在 smartParse 中生效。

### FR-2 智能输入与命令体系
- `smartParse` 扩展：
  - 相对日期：`下个周一/下周三/大后天/下个工作日/本周五/5月第二个周一/每月最后一天`；
  - 重复规则：`每周一三五`、`每两周周三`、`每月15号`、`从今天起 7 次后停止`、`2026-12-31 前重复`；
  - 内联语法：`!优先级`（`!0..!4` 或 `!紧急`）、`@分类名`、`#标签`、`$area`、`~提醒 5:30pm`、`>截止 12/31`、`⏱25m` 番茄；
  - 剪贴板粘贴 URL → 自动生成任务（title=网页 title，notes=URL）。
- 命令面板（Ctrl/Cmd+K）：跳转视图/执行动作/搜索任务/切换模式/过滤最近编辑；与键盘快捷键配置 UI 双向同步。

### FR-3 导航、视图、过滤器
- Area / List / Heading / Task 四层模型（升级自现有 Category），向后兼容（现有 Category 映射到 List）。
- 自定义视图（Saved Filters）：任意布尔组合（日期范围、分类、标签、重要、优先级、是否逾期、是否子任务、关键字、创建人/分配人），可固定到侧边栏。
- 拖拽：跨分类/跨分组/跨视图排序；支持"把任务拖到我的一天/重要/某个分类"。
- "我的一天"改为"智能清单"：按统计学习的推荐自动加入（可开关）。

### FR-4 UX / 视觉现代化
- 首次启动：欢迎/引导三步（选语言、导入示例数据、绑定快捷键 + 自启动提示、是否开启推荐）。
- 空状态：按"无任务/无列表/筛选无结果/无网络（PWA）/无番茄数据"五种设计定制插画与 CTA。
- 微动画：任务行进入、勾选完成（翻转卡片 + 涟漪）、拖拽占位、聚焦脉冲、撤销浮动条。
- 密度控制：三档（舒适/标准/紧凑），对 Windows 1366/1600 分别自适应默认。
- 可访问性：WCAG AA 对比度、`prefers-reduced-motion`、键盘全流程可达、ARIA 标签补齐。

### FR-5 提醒、通知与智能调度
- 稍后提醒 Snooze 预设（10m/1h/3h/今晚/明天 9 点/下周一）+ 自定义相对时间 + "选一个具体时间"弹窗。
- Electron 下：到期/逾期使用系统 Scheduled Toast（`toast.xml`），替代纯渲染进程 setInterval；离线也能触发。
- 智能提醒：按用户最近 N 天实际完成的时间分布，提前推荐提醒时间。
- 冲突策略：番茄工作会话中，提醒默认为"仅弹窗不发声 + 记录为干扰"。

### FR-6 番茄钟深度集成
- 专注摘要自动生成（任务、耗时、时段、打断次数、实际专注比、自评专注等级 1-5）。
- 跨窗口 FAB：可调整大小 / 透明度 / 拖动吸附 / 点击穿透 / 常驻。
- 全局快捷键：Start/Stop/Pause/Restart/Skip/SwitchMode/ToggleMini/Mute。
- 统计仪表盘嵌入"最佳专注时段"小时热力图、最近 30 天趋势、完成中断比。

### FR-7 统计、复盘、成就
- Productivity 视图：完成曲线、逾期率、类别占比、标签热力、每日最佳时段、Karma（Todoist 风格：当日完成率、连续天数、P0 完成奖励）。
- 周报/月报：叙事式模板（本周你做了 X 个任务，其中 N% 是重复任务；最长连续专注 X 分钟；最常完成的 5 个时段；下一周建议），可导出 Markdown / PNG（截图）。
- 成就扩展：加入"首次完成 100 个任务""连续 7 天使用""番茄 100 小时""最佳周"等，且有解锁动画。

### FR-8 数据契约、导入导出与同步
- 导入：Microsoft To Do CSV、Todoist CSV/JSON、Apple Reminders（CSV）、通用 JSON。
- 导出：Markdown 周视图、CSV 全量、JSON 全量与增量（含 activity log）。
- SyncProvider 接口骨架：`LocalFileProvider`（默认，将完整包写入用户文档目录）+ `WebDAVProvider`（占位，仅文件上传下载 + 冲突提示：Last-Write-Wins + 保存为 .conflict 文件）。
- 本地快照（最多 30 天），一键回滚到某时刻。

### FR-9 Electron 深度集成（Windows 优先）
- 自启动（系统级 + 设置 UI 开关 + 当前状态显示）。
- 协议唤起：`choyeon-todo://add?text=...` 与 `choyeon-todo://search?query=...`，并在启动参数解析中支持。
- 拖拽：文件拖入主窗口 → 生成附件或新任务；URL 拖入 → 生成任务并自动读取标题。
- 系统托盘增强：显示"今天进度"环形 + 最近任务菜单 + 快速添加。
- 单实例：重复启动唤起主窗口并处理协议参数。
- 标题栏（Windows 11 Snap Layouts）：拖拽区/双击最大化/右键窗口菜单合规。

### FR-10 发布、更新、安装包
- 版本号升级：`2.0.1 → 3.0.0`（major，因数据契约与任务模型均为 breaking，提供一次性迁移脚本）。
- 输出目录：`C:\choyeon-todo\v3.0.0\` 与 `C:\choyeon-todo\3.0.0-正式发布版\`（两份，用户可读中文命名），分别包含 NSIS、Portable、latest.yml、blockmap、release notes。
- Release：
  - `gh release create v3.0.0 --title "Choyeon To Do v3.0.0" --notes-file <release-notes>`；
  - 上传全部产物（.exe Setup、Portable、blockmap、latest.yml、latest.yml 签名若有）；
  - latest.yml 的 URL 指向该 Release 下载地址，版本行正确；
- autoUpdater 冒烟：Electron 端启动后执行 checkForUpdates 不抛错；latest.yml 解析成功匹配当前平台 NSIS。
- 迁移：启动时检测 `tasksVersion < 3` → 跑 `migrate-v2-to-v3`（Area/List 映射、Heading 默认、子任务结构默认扁平），并保存一个版本快照。

## 5. 非功能需求（Non-Functional Requirements）

- **NFR-1 性能**：1 万条任务下滚动（虚拟滚动已存在）保持 60fps；搜索/过滤器 < 80ms；启动冷启动 < 3s（主窗口 first paint）。
- **NFR-2 一致性**：状态机互斥保持零冲突（所有写路径唯一归属 store action；Electron 主进程单一真源；从窗口只读 + 事件转发）。
- **NFR-3 稳定性**：ErrorMonitor 捕获的 JS 异常在迭代后不得高于基线（按 vitest 与 main.cjs 启动日志统计 ≤ 0 未处理异常）。
- **NFR-4 兼容性**：升级后既有 `2.0.x` 数据不丢失；旧 import JSON 仍能成功导入。
- **NFR-5 国际化**：新增键位在 zh-CN / en-US / ja-JP 三语下全部有译文，不得出现 `__missing__`。
- **NFR-6 可访问性**：通过 axe-core 关键页面的无严重/无中度（尽量）问题。
- **NFR-7 包体积**：Setup.exe 相对 2.0.x 增长 ≤ 15%。
- **NFR-8 安全**：preload 仅暴露白名单 API；`sandbox` 或 `contextIsolation: true` 保持开启；`nodeIntegration: false`；未使用的 remote 模块不启用。

## 6. 约束与依赖

- 技术栈保留：Vue 3.5 + Pinia 3 + Vue Router 5 + Vite 8 + Electron 43 + electron-builder 26。
- Windows 打包为本轮必做；macOS/Linux 保留构建能力但不做 Release 上传。
- 远程仓库 master 分支上一次提交为 `430e72d`（本次所有提交在其之上）。
- 用户要求：打包输出到 `C:\项目名\`；每个版本独立目录；Electron 发布必须用 `gh release` 并保证 `latest.yml`；修复/更新完成自动 push。
- 代理：`$env:HTTP_PROXY=http://127.0.0.1:7897`；`GH_TOKEN` 或 keyring 中可用凭据。

## 7. 假设与开放问题

- Assumption 1：用户对 Windows 平台为首要（用户环境为 Windows），macOS/Linux 打包做冒烟即可。
- Assumption 2：智能输入无需 LLM API；仅用启发式 + 正则即可覆盖对标范围。
- Open Question A（已按默认决定）："分配/评论"仅本地字段，不做云端多人。
- Open Question B（已按默认决定）：同步只提供接口 + LocalFile/WebDAV 骨架，不接账号。

## 8. 验收标准（Acceptance Criteria）

### 规则（rule）—— 可客观验证

- **AC-1 [rule]**：启动检测到 v2 数据（tasksVersion=2 或不存在）时，自动执行迁移；迁移后任务数、完成率、已排序序不变（相对差值 ≤ 0）；旧 JSON 导入 100% 成功。证据：`vitest run tests/stores/taskStore.spec.js` 的迁移用例 + 手工 500 条 v2 fixture 导入通过。
- **AC-2 [rule]**：子任务/依赖/分组的组合写操作下不出现状态互斥（例如完成已被阻断任务被拒绝、完成父任务不影响未完成子任务、分组排序不破坏 completedOrder、重复任务不产生无限循环）。证据：新增 `tests/stores/taskStore-dag.spec.js` 100% 通过。
- **AC-3 [rule]**：smartParse 在扩展语法集中正确率 ≥ 95%。证据：新增 `tests/utils/smartParse-v3.spec.js`（≥120 条用例，覆盖 3 语种）全通过。
- **AC-4 [rule]**：命令面板 Ctrl/Cmd+K 可达、可搜索 100% 视图与 20+ 个命令，键盘 Esc 关闭、Enter 执行、↑↓ 选择。证据：新组件 `CommandPalette.vue` + vitest 用例通过 + Playwright/Electron CDP 录制的交互通过。
- **AC-5 [rule]**：Saved Filters 保存/编辑/删除/拖到侧边栏可用；过滤结果与实际任务集匹配。证据：`tests/stores/filterStore.spec.js`。
- **AC-6 [rule]**：提醒 Snooze 6 预设 + 自定义相对/绝对时间都能正确生成下一次触发时间，且到期立即触发（在提醒调度语义内）。证据：`tests/composables/useReminderScheduler.spec.js` 新增 30+ 条 Snooze 用例全部通过。
- **AC-7 [rule]**：Electron Windows Scheduled Toast 到期能离线弹出（不依赖渲染进程轮询），且"番茄会话期间"策略生效（静默/合并）。证据：主进程 `registerToastReminder` 单测 + 日志断言。
- **AC-8 [rule]**：番茄 FAB 可调大小/透明度/吸附/点击穿透；全局快捷键在主窗口未聚焦情况下仍可触发。证据：Electron CDP 自动化验证 + 日志断言 `globalShortcut` 注册数 ≥ 8。
- **AC-9 [rule]**：发布阶段：`electron-builder --win` 产物位于 `C:\choyeon-todo\v3.0.0\`，且中文副本目录 `C:\choyeon-todo\3.0.0-正式发布版\` 同时存在；目录下包含 Setup.exe、Portable.exe、对应 .blockmap 文件、`latest.yml`；latest.yml 中 `version: 3.0.0`；`gh release view v3.0.0` 返回 assets 覆盖以上文件。
- **AC-10 [rule]**：autoUpdater 能成功下载解析 latest.yml，且 files 哈希比对匹配（不抛错）。证据：启动时主进程日志存在 `update-found` 或 `update-not-available` 任一正常结果，无未处理异常。
- **AC-11 [rule]**：`vite build`、`vitest run`、`eslint . --ext .vue,.js,.cjs` 均退出码 0。
- **AC-12 [rule]**：导入 Microsoft To Do CSV 与 Todoist CSV 至少各自能正确创建任务（含标题/日期/分类/完成状态）。证据：fixtures + 单测。
- **AC-13 [rule]**：协议 `choyeon-todo://add?text=明天下午2点 !高 #工作` 唤起后创建任务，字段符合 smartParse。证据：主进程单实例处理器用例。

### 评估维度（rubric）—— 0-2 分，通过阈值均为 ≥ 1.5

- **AC-U1 [rubric] 视觉与桌面质感（0-2）**
  - 0：与 2.0.x 无明显差异或密度/留白/层级混乱。
  - 1：有明显提升，但仍有 ≥ 3 处可感知视觉瑕疵（色彩不一致、卡片混乱、空状态简陋）。
  - 2：达到 Microsoft To Do / Things 3 级别的克制、干净、产品级视觉。
  - 阈值：≥ 1.6。证据：3 个屏截图（首页、命令面板、统计页）× 人工打分清单 ≥ 1.6。

- **AC-U2 [rubric] 信息架构与易上手性（0-2）**
  - 0：找不到功能或层级混乱。
  - 1：可使用，但首次使用需 > 3 次点击才到达关键功能。
  - 2：首次使用 ≤ 2 步到达任一核心功能；引导清晰；空状态 CTA 明确。
  - 阈值：≥ 1.5。证据：引导引导日志 + 10 条典型用户任务（创建、完成、过滤、番茄、提醒、导入、导出、设置、复盘、搜索）计时 ≤ 预设时间。

- **AC-U3 [rubric] 动画与性能质感（0-2）**
  - 0：卡顿、掉帧、动画打断。
  - 1：大多数动画平滑，有 1-2 处突兀。
  - 2：所有动画流畅一致，符合 `prefers-reduced-motion`。
  - 阈值：≥ 1.6。证据：Playwright 录制滚动/拖拽动画帧数 ≥ 55fps（Windows 桌面默认分辨率）。

- **AC-U4 [rubric] Electron 桌面体验（0-2）**
  - 0：原生集成缺失或不稳定。
  - 1：多数工作，有 1 处体验瑕疵（自启动 UI 无反馈 / 托盘菜单乱码等）。
  - 2：体验顺滑，Snap Layouts、协议、拖拽、Scheduled Toast、FAB、全局快捷键、单实例均工作。
  - 阈值：≥ 1.5。证据：Electron CDP + 本地进程日志。

- **AC-U5 [rubric] 统计复盘质量（0-2）**
  - 0：只有数字列表。
  - 1：有图表与分组，但缺乏叙事或可视维度有限。
  - 2：视觉好、叙事强（周报/月报模板 + Karma + 热力图 + 最佳时段），可导出。
  - 阈值：≥ 1.6。证据：统计页截图 + 导出的 Markdown 样本。

- **AC-U6 [rubric] 可访问性（0-2）**
  - 0：关键页面 axe-core 严重问题 > 5。
  - 1：0 个严重，≤ 5 个中度。
  - 2：0 个严重/中度，且键盘可完成全部主流程。
  - 阈值：≥ 1.5。证据：axe-core（Playwright 注入）扫描结果。
