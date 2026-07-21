<template>
  <div class="error-monitor-view">
    <div class="monitor-header">
      <div>
        <h1 class="monitor-title">错误监控</h1>
        <p class="monitor-subtitle">实时追踪应用运行时错误</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="refreshData">
          <RefreshCw :size="16" />
          刷新
        </button>
        <button class="btn-danger" @click="handleClearAll">
          <Trash2 :size="16" />
          清空日志
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <AlertTriangle :size="22" />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总错误数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card">
          <div class="stat-icon hour">
            <Clock :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.last1h }}</span>
            <span class="stat-label">近 1 小时</span>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card">
          <div class="stat-icon day">
            <Calendar :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.last24h }}</span>
            <span class="stat-label">近 24 小时</span>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card">
          <div class="stat-icon types">
            <Layers :size="22" />
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ Object.keys(stats.typeCount || {}).length }}</span>
            <span class="stat-label">错误类型</span>
          </div>
        </div>
      </div>
    </div>

    <div class="monitor-body">
      <div class="error-list-panel">
        <div class="panel-header">
          <h3>错误列表</h3>
          <div class="filter-row">
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="搜索错误..."
            />
            <select v-model="filterType" class="filter-select">
              <option value="">全部类型</option>
              <option value="vue-error">Vue 错误</option>
              <option value="window-error">窗口错误</option>
              <option value="unhandled-promise-rejection">Promise 拒绝</option>
              <option value="runtime">运行时</option>
            </select>
          </div>
        </div>

        <div class="error-list" v-if="filteredLogs.length > 0">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="error-item"
            :class="{ active: selectedId === log.id }"
            @click="selectLog(log)"
          >
            <div class="error-item-header">
              <span class="error-name" :class="typeClass(log.type)">
                {{ log.name }}
              </span>
              <span class="error-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <p class="error-message">{{ log.message }}</p>
            <div class="error-meta">
              <span class="error-type-tag">{{ log.type }}</span>
              <span v-if="log.component" class="error-component">{{ log.component }}</span>
            </div>
          </div>
        </div>

        <div class="empty-state" v-else>
          <CheckCircle :size="48" />
          <p>暂无错误记录</p>
        </div>
      </div>

      <div class="error-detail-panel" v-if="selectedLog">
        <div class="panel-header detail-header">
          <h3>错误详情</h3>
          <button class="icon-btn" @click="selectedId = null">
            <X :size="18" />
          </button>
        </div>
        <div class="detail-content">
          <div class="detail-row">
            <span class="detail-label">名称</span>
            <span class="detail-value">{{ selectedLog.name }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">类型</span>
            <span class="detail-value type-badge" :class="typeClass(selectedLog.type)">
              {{ selectedLog.type }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">时间</span>
            <span class="detail-value">{{ formatFullTime(selectedLog.timestamp) }}</span>
          </div>
          <div class="detail-row" v-if="selectedLog.component">
            <span class="detail-label">组件</span>
            <span class="detail-value mono">{{ selectedLog.component }}</span>
          </div>
          <div class="detail-row" v-if="selectedLog.info">
            <span class="detail-label">信息</span>
            <span class="detail-value mono">{{ selectedLog.info }}</span>
          </div>
          <div class="detail-block">
            <span class="detail-label">错误信息</span>
            <div class="detail-message">{{ selectedLog.message }}</div>
          </div>
          <div class="detail-block" v-if="selectedLog.stack">
            <span class="detail-label">调用栈</span>
            <pre class="stack-trace">{{ selectedLog.stack }}</pre>
          </div>
          <div class="detail-row" v-if="selectedLog.url">
            <span class="detail-label">页面 URL</span>
            <span class="detail-value mono small">{{ selectedLog.url }}</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn-secondary" @click="copyError">
            <Copy :size="14" />
            复制错误
          </button>
          <button class="btn-danger" @click="handleDelete">
            <Trash2 :size="14" />
            删除此条
          </button>
        </div>
      </div>

      <div class="error-detail-panel empty-panel" v-else>
        <div class="empty-state">
          <FileText :size="48" />
          <p>选择一个错误查看详情</p>
        </div>
      </div>
    </div>

    <div class="top-errors-section" v-if="stats.topErrors && stats.topErrors.length > 0">
      <h3 class="section-title">高频错误 Top 10</h3>
      <div class="top-errors-list">
        <div
          v-for="(err, idx) in stats.topErrors"
          :key="`${err.name}-${err.message}`"
          class="top-error-item"
        >
          <span class="top-rank" :class="`rank-${idx + 1}`">{{ idx + 1 }}</span>
          <div class="top-error-info">
            <span class="top-error-name">{{ err.name }}</span>
            <span class="top-error-msg">{{ err.message }}</span>
          </div>
          <div class="top-error-count">
            <span class="count-num">{{ err.count }}</span>
            <span class="count-label">次</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSnackbar } from '../composables/useSnackbar'
import { getErrorLogs, getErrorStats, clearErrorLogs, deleteErrorLog } from '../utils/errorMonitor'
import {
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  RefreshCw,
  Trash2,
  X,
  Copy,
  FileText,
  CheckCircle
} from '@lucide/vue'

const { show: showSnackbar } = useSnackbar()

const searchQuery = ref('')
const filterType = ref('')
const selectedId = ref(null)
const logs = ref([])
const stats = ref({
  total: 0,
  last1h: 0,
  last24h: 0,
  typeCount: {},
  topErrors: []
})

const filteredLogs = computed(() => {
  let result = logs.value

  if (filterType.value) {
    result = result.filter((l) => l.type === filterType.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (l) => l.message.toLowerCase().includes(q) || l.name.toLowerCase().includes(q)
    )
  }

  return result
})

const selectedLog = computed(() => {
  return logs.value.find((l) => l.id === selectedId.value) || null
})

const refreshData = () => {
  logs.value = getErrorLogs()
  stats.value = getErrorStats()
}

const selectLog = (log) => {
  selectedId.value = log.id
}

const formatTime = (ts) => {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`

  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatFullTime = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const typeClass = (type) => {
  switch (type) {
    case 'vue-error':
      return 'type-vue'
    case 'unhandled-promise-rejection':
      return 'type-promise'
    case 'window-error':
      return 'type-window'
    default:
      return 'type-runtime'
  }
}

const copyError = () => {
  if (!selectedLog.value) return
  const text = `${selectedLog.value.name}\n${selectedLog.value.message}\n${selectedLog.value.stack || ''}`
  navigator.clipboard.writeText(text).then(() => {
    showSnackbar('已复制到剪贴板')
  })
}

const handleClearAll = () => {
  if (confirm('确定要清空所有错误日志吗？')) {
    clearErrorLogs()
    refreshData()
    selectedId.value = null
    showSnackbar('日志已清空')
  }
}

const handleDelete = () => {
  if (!selectedId.value) return
  deleteErrorLog(selectedId.value)
  selectedId.value = null
  refreshData()
  showSnackbar('已删除')
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.error-monitor-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 28px;
  overflow: auto;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.monitor-title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
}

.monitor-subtitle {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-secondary,
.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border-light);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  border-color: var(--color-primary-alpha);
  color: var(--color-primary);
}

.btn-danger:hover {
  border-color: var(--color-error, #ef4444);
  color: var(--color-error, #ef4444);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.stat-icon.total {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.stat-icon.hour {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.stat-icon.day {
  background: rgba(59, 130, 246, 0.12);
  color: #3b82f6;
}

.stat-icon.types {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.monitor-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  min-height: 0;
  margin-bottom: 24px;
}

.error-list-panel,
.error-detail-panel {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.panel-header h3 {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.filter-row {
  display: flex;
  gap: 8px;
}

.search-input,
.filter-select {
  padding: 6px 10px;
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus,
.filter-select:focus {
  border-color: var(--color-primary);
}

.search-input {
  width: 160px;
}

.error-list {
  flex: 1;
  overflow-y: auto;
}

.error-item {
  padding: 14px 20px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.error-item:hover {
  background: var(--color-surface-2);
}

.error-item.active {
  background: var(--color-primary-tint);
  border-left: 3px solid var(--color-primary);
  padding-left: 17px;
}

.error-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.error-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.error-name.type-vue {
  color: #10b981;
}
.error-name.type-promise {
  color: #f59e0b;
}
.error-name.type-window {
  color: #ef4444;
}
.error-name.type-runtime {
  color: #6b7280;
}

.error-time {
  font-size: var(--font-size-2xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.error-message {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.error-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.error-type-tag,
.error-component {
  font-size: var(--font-size-3xs);
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-surface-3);
  color: var(--color-text-secondary);
}

.detail-header {
  padding: 16px 20px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.icon-btn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-light);
  gap: 12px;
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.detail-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  text-align: right;
  word-break: break-all;
}

.detail-value.mono {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: var(--font-size-2xs);
}

.detail-value.small {
  font-size: var(--font-size-2xs);
}

.type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-2xs);
  font-weight: 500;
}

.type-badge.type-vue {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}
.type-badge.type-promise {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}
.type-badge.type-window {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
.type-badge.type-runtime {
  background: rgba(107, 114, 128, 0.12);
  color: #6b7280;
}

.detail-block {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.detail-block .detail-label {
  display: block;
  margin-bottom: 8px;
}

.detail-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  padding: 10px 12px;
  background: var(--color-surface-2);
  border-radius: 8px;
  line-height: 1.5;
  word-break: break-word;
}

.stack-trace {
  font-size: var(--font-size-2xs);
  font-family: 'SF Mono', Monaco, monospace;
  padding: 12px;
  background: var(--color-surface-2);
  border-radius: 8px;
  color: var(--color-text-secondary);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  line-height: 1.5;
}

.detail-actions {
  padding: 14px 20px;
  border-top: 1px solid var(--color-border-light);
  display: flex;
  gap: 10px;
}

.detail-actions .btn-secondary,
.detail-actions .btn-danger {
  flex: 1;
  justify-content: center;
}

.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--color-text-tertiary);
  gap: 12px;
}

.empty-state p {
  margin: 0;
  font-size: var(--font-size-body);
}

.top-errors-section {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  padding: 20px;
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--color-text-primary);
}

.top-errors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.top-error-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-surface-2);
  border-radius: 10px;
}

.top-rank {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  flex-shrink: 0;
  background: var(--color-surface-3);
  color: var(--color-text-secondary);
}

.top-rank.rank-1 {
  background: #fef3c7;
  color: #d97706;
}
.top-rank.rank-2 {
  background: #f3f4f6;
  color: #6b7280;
}
.top-rank.rank-3 {
  background: #fee2e2;
  color: #b91c1c;
}

.top-error-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.top-error-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.top-error-msg {
  font-size: var(--font-size-2xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-error-count {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}

.count-num {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-primary);
}

.count-label {
  font-size: var(--font-size-2xs);
  color: var(--color-text-tertiary);
}
</style>
