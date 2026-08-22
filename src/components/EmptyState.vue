<template>
  <div
    class="empty-state"
    :class="[kind, { mini }]"
    role="status"
    :aria-label="computedTitle"
  >
    <!-- 插画（非 mini 模式） -->
    <div class="empty-illustration" v-if="!mini">
      <!-- kind: myday / today -->
      <svg
        v-if="kind === 'myday' || kind === 'today'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="100" cy="55" r="28" :stroke="primaryColor" stroke-width="2.5" stroke-linecap="round" />
        <g :stroke="primaryColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="100" y1="12" x2="100" y2="22" />
          <line x1="100" y1="88" x2="100" y2="98" />
          <line x1="57" y1="55" x2="67" y2="55" />
          <line x1="133" y1="55" x2="143" y2="55" />
          <line x1="70" y1="25" x2="77" y2="32" />
          <line x1="123" y1="78" x2="130" y2="85" />
          <line x1="70" y1="85" x2="77" y2="78" />
          <line x1="123" y1="32" x2="130" y2="25" />
        </g>
        <rect x="55" y="100" width="90" height="50" rx="6" :stroke="secondaryColor" stroke-width="2" fill="none" />
        <line x1="70" y1="115" x2="130" y2="115" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.5" />
        <line x1="70" y1="128" x2="115" y2="128" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.5" />
        <line x1="70" y1="141" x2="100" y2="141" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.3" />
      </svg>

      <!-- kind: tomorrow / week / planned -->
      <svg
        v-else-if="kind === 'tomorrow' || kind === 'week' || kind === 'planned'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="40" y="25" width="120" height="110" rx="8" :stroke="primaryColor" stroke-width="2.5" fill="none" />
        <line x1="40" y1="55" x2="160" y2="55" :stroke="primaryColor" stroke-width="2.5" />
        <line x1="70" y1="25" x2="70" y2="40" :stroke="primaryColor" stroke-width="2.5" stroke-linecap="round" />
        <line x1="130" y1="25" x2="130" y2="40" :stroke="primaryColor" stroke-width="2.5" stroke-linecap="round" />
        <g :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.4">
          <line x1="60" y1="75" x2="75" y2="75" />
          <line x1="85" y1="75" x2="100" y2="75" />
          <line x1="110" y1="75" x2="125" y2="75" />
          <line x1="60" y1="95" x2="75" y2="95" />
          <line x1="85" y1="95" x2="100" y2="95" />
          <line x1="110" y1="95" x2="125" y2="95" />
          <line x1="60" y1="115" x2="75" y2="115" />
          <line x1="85" y1="115" x2="100" y2="115" />
        </g>
        <circle cx="100" cy="105" r="18" :stroke="primaryColor" stroke-width="2" fill="none" stroke-dasharray="4 3" />
        <path d="M100 96 L100 105 L106 108" :stroke="primaryColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </svg>

      <!-- kind: important -->
      <svg
        v-else-if="kind === 'important'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="starGrad2" x1="100" y1="20" x2="100" y2="140" gradientUnits="userSpaceOnUse">
            <stop stop-color="var(--state-warning)" stop-opacity="0.15" />
            <stop offset="1" stop-color="var(--state-warning)" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="80" r="55" fill="url(#starGrad2)" />
        <path
          d="M100 38L107.5 62L133 66L113 84L120 109L100 96L80 109L87 84L67 66L92.5 62L100 38Z"
          :stroke="accentColor"
          stroke-width="2"
          stroke-linejoin="round"
          :fill="accentColor"
          fill-opacity="0.1"
        />
      </svg>

      <!-- kind: completed -->
      <svg
        v-else-if="kind === 'completed'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="100" cy="60" r="40" :stroke="successColor" stroke-width="2.5" fill="none" />
        <path d="M82 60L95 73L120 48" :stroke="successColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M82 60L95 73L120 48" :stroke="successColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="0.3" transform="translate(0 8)" />
        <rect x="50" y="115" width="100" height="35" rx="6" :stroke="secondaryColor" stroke-width="2" fill="none" />
        <line x1="65" y1="128" x2="135" y2="128" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.5" />
        <line x1="65" y1="142" x2="110" y2="142" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.3" />
      </svg>

      <!-- kind: search / all / inbox -->
      <svg
        v-else-if="kind === 'search' || kind === 'all' || kind === 'inbox'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="85" cy="70" r="40" :stroke="primaryColor" stroke-width="2.5" fill="none" />
        <line x1="115" y1="100" x2="150" y2="135" :stroke="primaryColor" stroke-width="2.5" stroke-linecap="round" />
        <g :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.4">
          <line x1="65" y1="55" x2="105" y2="55" />
          <line x1="65" y1="70" x2="95" y2="70" />
          <line x1="65" y1="85" x2="100" y2="85" />
        </g>
        <circle cx="100" cy="130" r="3" :fill="secondaryColor" opacity="0.3" />
        <circle cx="120" cy="125" r="2" :fill="secondaryColor" opacity="0.2" />
        <circle cx="80" cy="135" r="2" :fill="secondaryColor" opacity="0.2" />
      </svg>

      <!-- kind: category / list / area -->
      <svg
        v-else-if="kind === 'category' || kind === 'list' || kind === 'area'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M35 45H85L100 60H165V125C165 131.627 159.627 137 153 137H47C40.3726 137 35 131.627 35 125V45Z"
          :stroke="primaryColor"
          stroke-width="2.5"
          fill="none"
          stroke-linejoin="round"
        />
        <path d="M35 45H85L100 60H165" :stroke="primaryColor" stroke-width="2.5" fill="none" stroke-linejoin="round" opacity="0.5" />
        <g :stroke="secondaryColor" stroke-width="2" stroke-linecap="round">
          <line x1="55" y1="85" x2="90" y2="85" opacity="0.5" />
          <line x1="55" y1="102" x2="120" y2="102" opacity="0.4" />
          <line x1="55" y1="119" x2="100" y2="119" opacity="0.3" />
        </g>
      </svg>

      <!-- kind: filter -->
      <svg
        v-else-if="kind === 'filter'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M35 45H165L120 95V125L100 115L80 125V95L35 45Z" :stroke="primaryColor" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round" />
        <line x1="60" y1="60" x2="140" y2="60" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.5" />
        <line x1="75" y1="80" x2="125" y2="80" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.4" />
      </svg>

      <!-- kind: tag -->
      <svg
        v-else-if="kind === 'tag'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M100 28H155C165 28 172 35 172 45V100L112 160L28 76L88 28Z" :stroke="primaryColor" stroke-width="2.5" fill="none" stroke-linejoin="round" />
        <circle cx="132" cy="60" r="8" :stroke="accentColor" stroke-width="2.5" fill="none" />
        <line x1="60" y1="108" x2="90" y2="78" :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.4" />
      </svg>

      <!-- default fallback -->
      <svg
        v-else
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="50" y="40" width="100" height="80" rx="8" :stroke="primaryColor" stroke-width="2.5" fill="none" />
        <g :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.45">
          <line x1="65" y1="65" x2="135" y2="65" />
          <line x1="65" y1="85" x2="120" y2="85" />
          <line x1="65" y1="105" x2="100" y2="105" />
        </g>
      </svg>
    </div>

    <!-- mini 模式：小图标 -->
    <div class="empty-mini-icon" v-else aria-hidden="true">
      <component :is="miniIcon" :size="20" />
    </div>

    <div class="empty-text" :class="{ 'text-center': !mini }">
      <h3 class="empty-title">{{ computedTitle }}</h3>
      <p class="empty-desc" v-if="!mini || showMiniDesc">{{ computedDesc }}</p>
    </div>

    <!-- 操作按钮（非 mini 模式显示主/次按钮；mini 显示单一 primary） -->
    <div class="empty-actions" v-if="!mini" role="group" :aria-label="$t('common.actions') || '操作'">
      <button
        v-if="primaryLabel"
        class="empty-action-btn primary"
        type="button"
        @click="handlePrimary"
        :aria-label="primaryLabel"
      >
        <Plus v-if="primaryIcon === 'plus'" :size="18" aria-hidden="true" />
        <Sparkles v-else-if="primaryIcon === 'sparkles'" :size="18" aria-hidden="true" />
        <Zap v-else-if="primaryIcon === 'zap'" :size="18" aria-hidden="true" />
        <Filter v-else-if="primaryIcon === 'filter'" :size="18" aria-hidden="true" />
        <Tag v-else-if="primaryIcon === 'tag'" :size="18" aria-hidden="true" />
        <FolderPlus v-else-if="primaryIcon === 'folder-plus'" :size="18" aria-hidden="true" />
        <Layers v-else-if="primaryIcon === 'layers'" :size="18" aria-hidden="true" />
        {{ primaryLabel }}
      </button>
      <button
        v-if="secondaryLabel"
        class="empty-action-btn secondary"
        type="button"
        @click="handleSecondary"
        :aria-label="secondaryLabel"
      >
        {{ secondaryLabel }}
      </button>
    </div>

    <button
      v-else
      class="empty-mini-btn"
      type="button"
      @click="handlePrimary"
      :aria-label="primaryLabel"
      v-if="primaryLabel"
    >
      <Plus :size="12" aria-hidden="true" />
      <span>{{ primaryLabel }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Plus,
  Sparkles,
  Zap,
  Filter,
  Tag,
  FolderPlus,
  Layers,
  Folder,
  Inbox,
  Search,
  Star,
  CheckCircle,
  LayoutList
} from '@lucide/vue'

const props = defineProps({
  kind: {
    type: String,
    default: 'default',
    validator: (val) =>
      [
        'myday',
        'today',
        'tomorrow',
        'week',
        'important',
        'planned',
        'all',
        'inbox',
        'category',
        'tag',
        'search',
        'completed',
        'filter',
        'area',
        'list',
        'default'
      ].includes(val)
  },
  mini: { type: Boolean, default: false },
  showMiniDesc: { type: Boolean, default: false },
  // 可选覆盖（为空时按 kind 匹配 i18n 默认文案）
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  primaryLabel: { type: String, default: '' },
  primaryIcon: {
    type: String,
    default: 'plus',
    validator: (v) => ['plus', 'sparkles', 'zap', 'filter', 'tag', 'folder-plus', 'layers'].includes(v)
  },
  secondaryLabel: { type: String, default: '' }
})

const emit = defineEmits(['primary', 'secondary'])
const { t, te } = useI18n()

const primaryColor = 'var(--color-primary)'
const secondaryColor = 'var(--color-text-tertiary)'
const accentColor = 'var(--state-warning)'
const successColor = 'var(--state-success)'

// ---- 按 kind 的 i18n 文案兜底（key 不存在时优雅降级为通用空态） ----
const _tOrFallback = (key, fallback) => {
  try {
    if (te(key)) return t(key)
  } catch (_) {
    /* ignore */
  }
  return fallback
}

const computedTitle = computed(() => {
  if (props.title) return props.title
  const map = {
    myday: () => _tOrFallback('empty.mydayTitle', '开启美好的一天'),
    today: () => _tOrFallback('empty.todayTitle', '今天还没有任务'),
    tomorrow: () => _tOrFallback('empty.tomorrowTitle', '明天暂无安排'),
    week: () => _tOrFallback('empty.weekTitle', '下周还没计划'),
    important: () => _tOrFallback('empty.importantTitle', '暂无重要任务'),
    planned: () => _tOrFallback('empty.plannedTitle', '还没有规划任务'),
    all: () => _tOrFallback('empty.allTitle', '还没有任何任务'),
    inbox: () => _tOrFallback('empty.inboxTitle', '收件箱是空的'),
    category: () => _tOrFallback('empty.categoryTitle', '该分类下暂无任务'),
    tag: () => _tOrFallback('empty.tagTitle', '该标签下暂无任务'),
    search: () => _tOrFallback('empty.searchTitle', '没有找到匹配的任务'),
    completed: () => _tOrFallback('empty.completedTitle', '还没有完成的任务'),
    filter: () => _tOrFallback('empty.filterTitle', '还没有过滤器'),
    area: () => _tOrFallback('empty.areaTitle', '还没有分区'),
    list: () => _tOrFallback('empty.listTitle', '这里还没有列表'),
    default: () => _tOrFallback('empty.defaultTitle', '暂无内容')
  }
  const fn = map[props.kind] || map.default
  return fn()
})

const computedDesc = computed(() => {
  if (props.description) return props.description
  const map = {
    myday: () => _tOrFallback('empty.mydayDesc', '点击下方按钮添加第一个任务，或使用「智能我的一天」自动挑选。'),
    today: () => _tOrFallback('empty.todayDesc', '添加一个今天的待办，保持高效节奏。'),
    tomorrow: () => _tOrFallback('empty.tomorrowDesc', '提前规划明天，从容应对。'),
    week: () => _tOrFallback('empty.weekDesc', '安排下周任务，按优先级逐个击破。'),
    important: () => _tOrFallback('empty.importantDesc', '为关键任务标记星标，它们将显示在这里。'),
    planned: () => _tOrFallback('empty.plannedDesc', '为任务指定日期后会出现在这里。'),
    all: () => _tOrFallback('empty.allDesc', '创建第一个任务开始吧。'),
    inbox: () => _tOrFallback('empty.inboxDesc', '想到什么就记到收件箱，稍后再整理。'),
    category: () => _tOrFallback('empty.categoryDesc', '在新分类中创建第一个任务。'),
    tag: () => _tOrFallback('empty.tagDesc', '为任务打上标签，分类更清晰。'),
    search: () => _tOrFallback('empty.searchDesc', '试试换个关键词或清除筛选条件。'),
    completed: () => _tOrFallback('empty.completedDesc', '完成任务后，会在这里留下你的足迹。'),
    filter: () => _tOrFallback('empty.filterDesc', '创建一个自定义过滤器，精准筛选任务。'),
    area: () => _tOrFallback('empty.areaDesc', '创建分区，按工作/生活等维度组织列表。'),
    list: () => _tOrFallback('empty.listDesc', '新建一个列表开始收集相关任务。'),
    default: () => _tOrFallback('empty.defaultDesc', '这里还没有任何内容。')
  }
  const fn = map[props.kind] || map.default
  return fn()
})

const miniIconMap = {
  myday: Zap,
  today: Zap,
  tomorrow: Zap,
  week: LayoutList,
  important: Star,
  planned: LayoutList,
  all: LayoutList,
  inbox: Inbox,
  category: Folder,
  tag: Tag,
  search: Search,
  completed: CheckCircle,
  filter: Filter,
  area: Layers,
  list: FolderPlus,
  default: FolderPlus
}
const miniIcon = computed(() => miniIconMap[props.kind] || miniIconMap.default)

const handlePrimary = () => emit('primary')
const handleSecondary = () => emit('secondary')
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 20px;
  text-align: center;
  animation: emptyFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.empty-state.mini {
  padding: 10px 8px;
  flex-direction: row;
  gap: 10px;
  text-align: left;
  justify-content: flex-start;
  background: transparent;
  animation: emptyFadeIn 0.3s ease;
}

@keyframes emptyFadeIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.empty-illustration {
  width: 200px;
  height: 160px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: emptyFloat 6s ease-in-out infinite;
}
@keyframes emptyFloat {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-6px); }
}
.empty-illustration svg { width: 100%; height: 100%; }

.empty-mini-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-micro);
}
.empty-state.mini:hover .empty-mini-icon {
  color: var(--color-primary);
  background: var(--color-primary-surface);
}

.empty-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
}
.empty-text.text-center { align-items: center; }

.empty-title {
  font-size: var(--font-size-h3);
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0;
  font-family: var(--font-title);
  letter-spacing: -0.2px;
  animation: emptySlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
  line-height: 1.35;
}
.empty-state.mini .empty-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  animation: none;
}

@keyframes emptySlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.empty-desc {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
  font-weight: 400;
  line-height: 1.6;
  animation: emptySlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}
.empty-state.mini .empty-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  animation: none;
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 12px;
  animation: emptySlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition:
    background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}
.empty-action-btn.primary {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}
.empty-action-btn.primary:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}
.empty-action-btn.primary:active {
  background: var(--color-primary-darker);
  transform: translateY(0);
}
.empty-action-btn.primary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.empty-action-btn.secondary {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-light);
}
.empty-action-btn.secondary:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.empty-action-btn.secondary:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

/* mini 单按钮样式 */
.empty-mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 500;
  font-family: var(--font-body);
  color: var(--color-primary-dark);
  background: var(--color-primary-surface);
  border: none;
  cursor: pointer;
  margin-left: auto;
  flex-shrink: 0;
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.empty-mini-btn:hover {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  transform: translateY(-1px);
}
.empty-mini-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

@media (max-width: 767px) {
  .empty-state { padding: 36px 16px; }
  .empty-illustration { width: 160px; height: 128px; margin-bottom: 16px; }
  .empty-title { font-size: var(--font-size-h4); }
  .empty-actions { flex-direction: column; width: 100%; }
  .empty-action-btn { width: 100%; justify-content: center; }
}
</style>
