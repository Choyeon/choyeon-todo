<template>
  <Teleport to="body">
    <Transition name="cp-overlay">
      <div
        v-if="visible"
        class="cp-overlay"
        @mousedown.self="onOverlayMousedown"
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
      >
        <Transition
          appear
          name="cp-panel"
          @after-enter="focusInput"
          @before-leave="beforeLeave"
        >
          <div
            v-if="visible"
            class="cp-panel"
            ref="panelRef"
            role="search"
            :aria-label="t('palette.a11yLabel')"
          >
            <!-- 搜索栏 -->
            <div class="cp-header">
              <span class="cp-search-icon" aria-hidden="true">
                <Search :size="18" />
              </span>
              <input
                ref="inputRef"
                v-model="query"
                class="cp-search-input"
                :placeholder="t('palette.placeholder')"
                @keydown="onInputKeydown"
                @input="onInputChange"
                role="searchbox"
                :aria-label="t('palette.searchAria')"
                :aria-autocomplete="'list'"
                :aria-controls="'cp-results'"
                :aria-activedescendant="
                  activeIndex >= 0 && filteredList[activeIndex]
                    ? `cp-item-${filteredList[activeIndex].id}`
                    : undefined
                "
                spellcheck="false"
                autocomplete="off"
              />
              <kbd class="cp-kbd" :title="t('palette.closeHint')">ESC</kbd>
            </div>

            <!-- 三栏主内容 -->
            <div class="cp-body" :class="{ 'cp-body-single': !!query.trim() }">
              <!-- 左：最近执行 -->
              <aside
                v-if="!query.trim()"
                class="cp-col cp-col-recent"
                aria-label="最近使用"
              >
                <div class="cp-col-title">
                  <Clock :size="14" class="cp-col-title-icon" />
                  <span>{{ t('palette.recent') }}</span>
                </div>
                <ul
                  class="cp-list"
                  role="listbox"
                  aria-label="最近使用的命令"
                >
                  <li v-if="recentList.length === 0" class="cp-empty-hint">
                    {{ t('palette.noRecent') }}
                  </li>
                  <li
                    v-for="(cmd, idx) in recentList"
                    :key="cmd.id"
                    :id="`cp-recent-${cmd.id}`"
                    class="cp-list-item"
                    :class="{ active: activeRecentIndex === idx }"
                    role="option"
                    :aria-selected="activeRecentIndex === idx"
                    @click="selectRecent(idx)"
                    @mousemove="() => (hoverGroup = 'recent')"
                  >
                    <span class="cp-item-title">{{ cmd.title }}</span>
                    <span class="cp-item-count">{{ mruCount(cmd.id) }}×</span>
                  </li>
                </ul>
              </aside>

              <!-- 中：分组（命令数量 ≤ 999 展示） -->
              <aside
                v-if="!query.trim()"
                class="cp-col cp-col-groups"
                aria-label="分组"
              >
                <div class="cp-col-title">
                  <Layers :size="14" class="cp-col-title-icon" />
                  <span>{{ t('palette.groups') }}</span>
                </div>
                <ul class="cp-list" role="listbox" aria-label="命令分组">
                  <li
                    v-for="(g, idx) in groups"
                    :key="g.key"
                    class="cp-list-item"
                    :class="{ active: activeGroupIndex === idx }"
                    role="option"
                    :aria-selected="activeGroupIndex === idx"
                    @click="selectGroup(idx)"
                    @mousemove="onGroupHover(idx)"
                  >
                    <component
                      :is="groupIcon(g.key)"
                      :size="15"
                      class="cp-group-icon"
                      :aria-hidden="true"
                    />
                    <span class="cp-item-title">{{ g.label }}</span>
                    <span class="cp-item-count">{{ g.count }}</span>
                  </li>
                </ul>
              </aside>

              <!-- 右：全部命令（有查询时，占满；无查询时显示当前分组的全部命令） -->
              <section
                class="cp-col cp-col-results"
                aria-label="搜索结果"
              >
                <div class="cp-col-title">
                  <template v-if="query.trim()">
                    <Search :size="14" class="cp-col-title-icon" />
                    <span>
                      {{ t('palette.results') }}
                      <em class="cp-col-title-count">({{ filteredList.length }})</em>
                    </span>
                  </template>
                  <template v-else>
                    <Zap :size="14" class="cp-col-title-icon" />
                    <span>{{ currentGroupLabel }}</span>
                  </template>
                </div>
                <ul
                  id="cp-results"
                  class="cp-list cp-list-results"
                  role="listbox"
                  :aria-label="
                    query.trim() ? t('palette.searchResultsAria') : t('palette.allCommandsAria')
                  "
                  ref="listRef"
                >
                  <li
                    v-if="filteredList.length === 0"
                    class="cp-empty cp-empty-results"
                    role="status"
                  >
                    <div class="cp-empty-icon" aria-hidden="true">
                      <Inbox :size="32" />
                    </div>
                    <div class="cp-empty-title">
                      {{ t('palette.noResults') }}
                    </div>
                    <div class="cp-empty-desc">
                      {{ t('palette.noResultsHint') }}
                    </div>
                  </li>
                  <li
                    v-for="(cmd, idx) in filteredList"
                    :key="cmd.id"
                    :id="`cp-item-${cmd.id}`"
                    ref="itemRefs"
                    class="cp-list-item cp-list-item-lg"
                    :class="{ active: activeIndex === idx }"
                    role="option"
                    :aria-selected="activeIndex === idx"
                    @click="run(idx)"
                    @mousemove="() => (activeIndex = idx)"
                    tabindex="-1"
                  >
                    <span class="cp-item-lhs">
                      <component
                        :is="sectionIcon(cmd.section)"
                        :size="16"
                        class="cp-item-icon"
                        :aria-hidden="true"
                      />
                      <span class="cp-item-texts">
                        <span class="cp-item-title cp-item-title-lg">
                          <Highlight :text="cmd.title" :query="highlightQuery" />
                        </span>
                        <span v-if="cmd.description" class="cp-item-desc">
                          <Highlight :text="cmd.description" :query="highlightQuery" />
                        </span>
                      </span>
                    </span>
                    <span class="cp-item-rhs">
                      <kbd
                        v-if="cmd.shortcut"
                        class="cp-kbd cp-kbd-sm"
                        aria-label="快捷键"
                      >
                        {{ cmd.shortcut }}
                      </kbd>
                      <kbd class="cp-kbd cp-kbd-sm" aria-label="执行">↵</kbd>
                    </span>
                  </li>
                </ul>
              </section>
            </div>

            <!-- 底部 hint -->
            <div class="cp-footer">
              <div class="cp-footer-left">
                <span class="cp-footnote-k"><kbd>↑</kbd><kbd>↓</kbd></span>
                <span class="cp-footnote-text">{{ t('palette.move') }}</span>
                <span class="cp-footnote-k"><kbd>←</kbd><kbd>→</kbd></span>
                <span class="cp-footnote-text">{{ t('palette.switchPane') }}</span>
              </div>
              <div class="cp-footer-right">
                <span class="cp-footnote-k"><kbd>Ctrl</kbd><kbd>Enter</kbd></span>
                <span class="cp-footnote-text">{{ t('palette.runInBg') }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  defineExpose,
  onMounted
} from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Search,
  Clock,
  Layers,
  Zap,
  Inbox,
  Compass,
  Sparkles,
  Timer,
  Settings,
  Database,
  HelpCircle,
  MoreHorizontal
} from '@lucide/vue'
import { useCommandPalette } from '../composables/useCommandPalette'

const { t } = useI18n()

const {
  visible,
  close,
  registry,
  runCommand,
  onOpen,
  onClose
} = useCommandPalette({ registerGlobalShortcut: false })

const panelRef = ref(null)
const inputRef = ref(null)
const listRef = ref(null)
const itemRefs = ref([])

const query = ref('')
const highlightQuery = ref('')
const activePane = ref('results') // 'recent' | 'groups' | 'results'
const activeIndex = ref(0)
const activeRecentIndex = ref(0)
const activeGroupIndex = ref(0)
const hoverGroup = ref('')
let _firstOpenRaf = null
let _searchRaf = null

const SECTION_ORDER = ['nav', 'action', 'pomodoro', 'settings', 'data', 'help']
const SECTION_LABELS = {
  nav: 'palette.sectionNav',
  action: 'palette.sectionAction',
  pomodoro: 'palette.sectionPomodoro',
  settings: 'palette.sectionSettings',
  data: 'palette.sectionData',
  help: 'palette.sectionHelp'
}

const allCommands = computed(() => registry.listAll())

const mruCounts = computed(() =>
  typeof registry._getMruCounts === 'function' ? registry._getMruCounts() : {}
)
const mruCount = (id) => mruCounts.value[id] || 0

// 最近使用命令（按次数降序，取前 7）
const recentList = computed(() => {
  const counts = mruCounts.value
  const entries = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
  const map = new Map(allCommands.value.map((c) => [c.id, c]))
  return entries
    .map(([id]) => map.get(id))
    .filter(Boolean)
})

// 分组（全部命令按 section 聚合）
const groups = computed(() => {
  const sections = {}
  for (const c of allCommands.value) {
    const s = c.section || 'action'
    if (!sections[s]) sections[s] = 0
    sections[s]++
  }
  const keys = [...SECTION_ORDER, ...Object.keys(sections).filter((k) => !SECTION_ORDER.includes(k))]
  return keys
    .filter((k) => sections[k])
    .map((k) => ({
      key: k,
      count: sections[k],
      label: t(SECTION_LABELS[k] || 'palette.sectionOther')
    }))
})

const activeGroupKey = computed(() => {
  if (activeGroupIndex.value < 0 || activeGroupIndex.value >= groups.value.length) {
    return groups.value[0]?.key || 'action'
  }
  return groups.value[activeGroupIndex.value].key
})

const currentGroupLabel = computed(() => {
  if (query.value.trim()) return t('palette.results')
  const g = groups.value[activeGroupIndex.value] || groups.value[0]
  return g ? g.label : t('palette.sectionAction')
})

// filteredList：有查询时全局模糊搜索；否则显示当前分组命令
const filteredList = computed(() => {
  const q = query.value.trim()
  if (q) {
    return registry.search(q, { limit: 50, recentLimit: 0 })
  }
  const key = activeGroupKey.value
  return allCommands.value
    .filter((c) => (c.section || 'action') === key)
    .sort((a, b) => a.title.localeCompare(b.title))
})

// --- Icons ---
const sectionIcon = (sec) => {
  switch (sec) {
    case 'nav': return Compass
    case 'action': return Sparkles
    case 'pomodoro': return Timer
    case 'settings': return Settings
    case 'data': return Database
    case 'help': return HelpCircle
    default: return MoreHorizontal
  }
}
const groupIcon = (key) => sectionIcon(key)

// --- Keyboard + selection helpers ---
const clampActive = () => {
  const len = filteredList.value.length
  if (len === 0) { activeIndex.value = -1; return }
  if (activeIndex.value < 0) activeIndex.value = 0
  if (activeIndex.value >= len) activeIndex.value = len - 1
}
const clampRecent = () => {
  const len = recentList.value.length
  if (len === 0) { activeRecentIndex.value = -1; return }
  if (activeRecentIndex.value < 0) activeRecentIndex.value = 0
  if (activeRecentIndex.value >= len) activeRecentIndex.value = len - 1
}
const clampGroup = () => {
  const len = groups.value.length
  if (len === 0) { activeGroupIndex.value = -1; return }
  if (activeGroupIndex.value < 0) activeGroupIndex.value = 0
  if (activeGroupIndex.value >= len) activeGroupIndex.value = len - 1
}

const scrollActiveIntoView = () => {
  nextTick(() => {
    const idx = activeIndex.value
    if (idx < 0) return
    const node = Array.isArray(itemRefs.value)
      ? itemRefs.value[idx]
      : itemRefs.value[`${idx}`]
    const target = node?.$el || node
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest' })
    }
  })
}

const run = async (idx) => {
  const cmd = filteredList.value[idx]
  if (!cmd) return
  try {
    const res = await runCommand(cmd.id, undefined, { showError: true })
    if (!res.ok) {
      // 错误已在 runCommand 中处理
    } else {
      close()
    }
  } catch (_e) {
    // ignore
  }
}

const onInputKeydown = (e) => {
  const q = query.value.trim()
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (activePane.value === 'recent' && !q) {
        activeRecentIndex.value++
        clampRecent()
      } else if (activePane.value === 'groups' && !q) {
        activeGroupIndex.value++
        clampGroup()
      } else {
        activeIndex.value++
        clampActive()
        scrollActiveIntoView()
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (activePane.value === 'recent' && !q) {
        activeRecentIndex.value--
        clampRecent()
      } else if (activePane.value === 'groups' && !q) {
        activeGroupIndex.value--
        clampGroup()
      } else {
        activeIndex.value--
        clampActive()
        scrollActiveIntoView()
      }
      break
    case 'ArrowRight':
      if (!q) {
        e.preventDefault()
        if (activePane.value === 'recent') activePane.value = 'groups'
        else if (activePane.value === 'groups') activePane.value = 'results'
      }
      break
    case 'ArrowLeft':
      if (!q) {
        e.preventDefault()
        if (activePane.value === 'groups') activePane.value = 'recent'
        else if (activePane.value === 'results') activePane.value = 'groups'
      }
      break
    case 'Tab':
      if (!q) {
        e.preventDefault()
        const order = ['recent', 'groups', 'results']
        const i = order.indexOf(activePane.value)
        activePane.value = order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length]
      }
      break
    case 'Enter': {
      e.preventDefault()
      if (activePane.value === 'recent' && activeRecentIndex.value >= 0) {
        const cmd = recentList.value[activeRecentIndex.value]
        if (cmd) runCommand(cmd.id).then((res) => { if (res.ok) close() })
      } else if (activePane.value === 'groups' && activeGroupIndex.value >= 0) {
        activePane.value = 'results'
        activeIndex.value = 0
      } else {
        run(activeIndex.value)
      }
      break
    }
    case 'Escape':
      e.preventDefault()
      if (query.value) {
        query.value = ''
        highlightQuery.value = ''
      } else {
        close()
      }
      break
  }
}

const onInputChange = () => {
  if (_searchRaf) cancelAnimationFrame(_searchRaf)
  _searchRaf = requestAnimationFrame(() => {
    highlightQuery.value = query.value.trim()
    activeIndex.value = 0
    clampActive()
  })
}

const selectRecent = (idx) => {
  const cmd = recentList.value[idx]
  if (!cmd) return
  runCommand(cmd.id).then((res) => { if (res.ok) close() })
}

const selectGroup = (idx) => {
  activeGroupIndex.value = idx
  activeIndex.value = 0
  clampActive()
  activePane.value = 'results'
}

const onGroupHover = (idx) => {
  activeGroupIndex.value = idx
}

const onOverlayMousedown = () => close()

const focusInput = () => {
  nextTick(() => {
    inputRef.value?.focus?.()
    inputRef.value?.select?.()
  })
}

const beforeLeave = () => {
  // noop
}

// 打开时重置
onOpen(() => {
  query.value = ''
  highlightQuery.value = ''
  activePane.value = 'results'
  activeIndex.value = 0
  activeRecentIndex.value = 0
  activeGroupIndex.value = 0
  if (_firstOpenRaf) cancelAnimationFrame(_firstOpenRaf)
  _firstOpenRaf = requestAnimationFrame(() => {
    clampActive()
    clampRecent()
    clampGroup()
    focusInput()
  })
})

onClose(() => {
  if (_searchRaf) cancelAnimationFrame(_searchRaf)
})

watch([filteredList, activePane], () => {
  if (activePane.value === 'results') {
    clampActive()
  } else if (activePane.value === 'recent') {
    clampRecent()
  } else {
    clampGroup()
  }
}, { immediate: true })

defineExpose({
  open: () => {}, // kept for compatibility; use composable
  close
})

// ---- Highlight 辅助组件（简单内联） ----
import { h as _h, defineComponent as _defineComponent } from 'vue'
const Highlight = _defineComponent({
  name: 'Highlight',
  props: {
    text: { type: String, required: true },
    query: { type: String, default: '' }
  },
  setup(props) {
    return () => {
      const q = (props.query || '').trim()
      const txt = props.text || ''
      if (!q) return txt
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
      const parts = txt.split(re)
      return _h(
        'span',
        { class: 'cp-highlight-wrap' },
        parts.map((p, i) =>
          re.test(p)
            ? _h('mark', { class: 'cp-highlight', key: i }, p)
            : _h('span', { key: i }, p)
        )
      )
    }
  }
})
</script>

<style scoped>
.cp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px) saturate(1.1);
  -webkit-backdrop-filter: blur(6px) saturate(1.1);
  z-index: 9998;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
}

.cp-panel {
  width: min(900px, 94vw);
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  background: var(--cp-bg, rgba(255, 255, 255, 0.92));
  border: 1px solid var(--cp-border, rgba(15, 23, 42, 0.08));
  border-radius: 14px;
  box-shadow:
    0 30px 60px -20px rgba(15, 23, 42, 0.35),
    0 10px 24px -12px rgba(15, 23, 42, 0.25);
  overflow: hidden;
  color: var(--cp-text, #0f172a);
  font-family: var(--font-body, system-ui, -apple-system, sans-serif);
  animation: cp-pop 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

html[data-theme='dark'] .cp-panel {
  --cp-bg: rgba(22, 27, 34, 0.94);
  --cp-border: rgba(255, 255, 255, 0.08);
  --cp-text: #e5e7eb;
  --cp-muted: #94a3b8;
  --cp-active-bg: rgba(59, 130, 246, 0.18);
  --cp-active-border: rgba(96, 165, 250, 0.35);
  --cp-divider: rgba(255, 255, 255, 0.06);
  --cp-input-bg: rgba(255, 255, 255, 0.03);
}
html[data-theme='light'] .cp-panel,
:not(html[data-theme='dark']) .cp-panel {
  --cp-muted: #64748b;
  --cp-active-bg: rgba(59, 130, 246, 0.12);
  --cp-active-border: rgba(59, 130, 246, 0.28);
  --cp-divider: rgba(15, 23, 42, 0.06);
  --cp-input-bg: rgba(15, 23, 42, 0.02);
}

/* ---- header ---- */
.cp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--cp-divider);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.04), transparent);
}
.cp-search-icon {
  color: var(--cp-muted);
  flex-shrink: 0;
}
.cp-search-input {
  flex: 1;
  background: var(--cp-input-bg);
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--cp-text);
  outline: none;
  transition: border-color 0.18s ease, background 0.18s ease;
  font-family: inherit;
}
.cp-search-input::placeholder {
  color: var(--cp-muted);
  opacity: 0.9;
}
.cp-search-input:focus {
  border-color: var(--cp-active-border, rgba(59, 130, 246, 0.35));
  background: transparent;
}
.cp-search-input:focus-visible {
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.14);
}

.cp-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 6px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  font-weight: 600;
  color: var(--cp-muted);
  background: rgba(127, 127, 127, 0.1);
  border: 1px solid var(--cp-divider);
  border-radius: 6px;
  border-bottom-width: 2px;
  user-select: none;
}
.cp-kbd-sm {
  min-width: 22px;
  height: 20px;
  font-size: 10px;
  padding: 0 5px;
}

/* ---- body ---- */
.cp-body {
  display: grid;
  grid-template-columns: 170px 200px 1fr;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
.cp-body.cp-body-single {
  grid-template-columns: 1fr;
}
.cp-col {
  min-height: 0;
  overflow-y: auto;
  border-right: 1px solid var(--cp-divider);
}
.cp-col:last-child {
  border-right: none;
}
.cp-col::-webkit-scrollbar {
  width: 8px;
}
.cp-col::-webkit-scrollbar-thumb {
  background: rgba(127, 127, 127, 0.18);
  border-radius: 8px;
}
.cp-col::-webkit-scrollbar-track { background: transparent; }

.cp-col-title {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px 8px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--cp-muted);
  background: var(--cp-bg);
  z-index: 1;
}
.cp-col-title-icon { opacity: 0.9; }
.cp-col-title-count {
  font-weight: 500;
  font-style: normal;
  opacity: 0.85;
}

.cp-list {
  list-style: none;
  margin: 0;
  padding: 2px 8px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cp-list-results { padding-bottom: 14px; }

.cp-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  font-size: 13px;
  color: var(--cp-text);
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease, transform 0.1s ease;
  border: 1px solid transparent;
  user-select: none;
  min-height: 34px;
}
.cp-list-item:hover {
  background: var(--cp-active-bg);
  border-color: var(--cp-active-border);
}
.cp-list-item.active {
  background: var(--cp-active-bg);
  border-color: var(--cp-active-border);
  box-shadow: inset 2px 0 0 #3b82f6;
}
.cp-list-item .cp-item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.cp-item-count {
  font-size: 11px;
  color: var(--cp-muted);
  font-variant-numeric: tabular-nums;
}
.cp-group-icon {
  color: var(--cp-muted);
  flex-shrink: 0;
}

/* ---- larger item variant (结果区) ---- */
.cp-list-item-lg {
  padding: 9px 12px;
  min-height: 44px;
}
.cp-item-lhs {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.cp-item-icon {
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  flex-shrink: 0;
}
html[data-theme='dark'] .cp-item-icon {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
}
.cp-item-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.cp-item-title-lg {
  font-size: 14px;
  font-weight: 600;
}
.cp-item-desc {
  font-size: 12px;
  color: var(--cp-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cp-item-rhs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  color: var(--cp-muted);
}

/* ---- highlight ---- */
.cp-highlight-wrap { font: inherit; color: inherit; }
.cp-highlight {
  background: rgba(250, 204, 21, 0.32);
  color: inherit;
  padding: 0 1px;
  border-radius: 3px;
  font-weight: 600;
}
html[data-theme='dark'] .cp-highlight {
  background: rgba(250, 204, 21, 0.28);
}

/* ---- empty states ---- */
.cp-empty-hint {
  padding: 8px 10px;
  color: var(--cp-muted);
  font-size: 12px;
  font-style: italic;
}
.cp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  gap: 8px;
  color: var(--cp-muted);
}
.cp-empty-icon { opacity: 0.6; margin-bottom: 6px; }
.cp-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cp-text);
}
.cp-empty-desc {
  font-size: 12px;
}

/* ---- footer ---- */
.cp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid var(--cp-divider);
  background: rgba(127, 127, 127, 0.04);
  font-size: 11px;
  color: var(--cp-muted);
}
.cp-footer-left,
.cp-footer-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cp-footnote-k {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}
.cp-footnote-k kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  color: var(--cp-muted);
  background: rgba(127, 127, 127, 0.08);
  border: 1px solid var(--cp-divider);
  border-radius: 5px;
  border-bottom-width: 2px;
}
.cp-footnote-text { white-space: nowrap; }

/* ---- transitions ---- */
.cp-overlay-enter-active,
.cp-overlay-leave-active {
  transition: opacity 180ms ease;
}
.cp-overlay-enter-from,
.cp-overlay-leave-to {
  opacity: 0;
}

.cp-panel-enter-active {
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms ease,
    filter 200ms ease;
}
.cp-panel-leave-active {
  transition:
    transform 160ms ease-in,
    opacity 160ms ease,
    filter 160ms ease;
}
.cp-panel-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
  filter: blur(3px);
}
.cp-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.99);
  filter: blur(2px);
}

@keyframes cp-pop {
  from {
    transform: translateY(-10px) scale(0.985);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* ---- focus ring fallback ---- */
.cp-search-input:focus-visible,
.cp-list-item:focus-visible {
  outline: none;
}

/* ---- mobile ---- */
@media (max-width: 720px) {
  .cp-body { grid-template-columns: 1fr; }
  .cp-col { border-right: none; border-bottom: 1px solid var(--cp-divider); }
  .cp-col:last-child { border-bottom: none; }
  .cp-overlay { padding-top: 6vh; }
  .cp-footer { display: none; }
}
</style>
