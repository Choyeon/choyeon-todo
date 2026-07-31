<template>
  <div class="inbox-view">
    <div class="inbox-header">
      <div class="header-content">
        <h1>{{ $t('nav.inbox') }}</h1>
        <p class="header-subtitle">{{ inboxTasks.length }} {{ $t('inbox.itemsToOrganize') }}</p>
      </div>
      <button v-if="inboxTasks.length > 0" class="clear-btn" @click="confirmClearAll">
        <Trash2 :size="16" />
        {{ $t('inbox.clearAll') }}
      </button>
    </div>

    <div v-if="inboxTasks.length === 0" class="empty-state">
      <div class="empty-icon">
        <Inbox :size="64" />
      </div>
      <h3>{{ $t('inbox.empty') }}</h3>
      <p>{{ $t('inbox.emptyDesc') }}</p>
    </div>

    <div v-else class="inbox-list">
      <div v-for="task in inboxTasks" :key="task.id" class="inbox-item">
        <div class="task-content">
          <div class="task-title">{{ task.title }}</div>
          <div class="task-meta">
            <span class="meta-item">
              <Calendar :size="14" />
              {{ formatDate(task.createdAt) }}
            </span>
          </div>
        </div>

        <div class="task-actions">
          <button class="action-btn edit" @click="editTask(task)">
            <Edit2 :size="16" />
            {{ $t('common.edit') }}
          </button>
          <button class="action-btn organize" @click="openOrganizeDialog(task)">
            <FolderInput :size="16" />
            {{ $t('inbox.organize') }}
          </button>
          <button class="action-btn delete" @click="confirmDelete(task)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- 整理对话框 -->
    <div v-if="showOrganizeDialog" class="dialog-overlay" @click="closeOrganizeDialog">
      <div class="organize-dialog" @click.stop>
        <div class="dialog-header">
          <h3>{{ $t('inbox.organizeTask') }}</h3>
          <button class="close-btn" @click="closeOrganizeDialog">
            <X :size="20" />
          </button>
        </div>

        <div class="dialog-content">
          <div class="form-group">
            <label>{{ $t('task.category') }}</label>
            <select v-model="organizeForm.category" class="form-select">
              <option v-for="cat in taskStore.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>{{ $t('task.date') }}</label>
            <input type="date" v-model="organizeForm.date" class="form-input" />
          </div>

          <div class="form-group">
            <label>{{ $t('task.priority') }}</label>
            <div class="priority-selector">
              <button
                v-for="p in [1, 2, 3, 4]"
                :key="p"
                :class="['priority-btn', `priority-${p}`, { active: organizeForm.priority === p }]"
                @click="organizeForm.priority = p"
              >
                P{{ p }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="organizeForm.important" />
              <span>{{ $t('task.important') }}</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="organizeForm.reminder" />
              <span>{{ $t('task.reminder') }}</span>
            </label>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn secondary" @click="closeOrganizeDialog">
            {{ $t('common.cancel') }}
          </button>
          <button class="btn primary" @click="saveOrganize">
            {{ $t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useConfirm } from '../composables/useConfirm'
import { formatDateStr } from '../utils/date'
import { Inbox, Calendar, Edit2, Trash2, FolderInput, X } from '@lucide/vue'

const { t } = useI18n()
const taskStore = useTaskStore()
const { confirm } = useConfirm()

const showOrganizeDialog = ref(false)
const currentTask = ref(null)
const organizeForm = ref({
  category: 'other',
  date: '',
  priority: 3,
  important: false,
  reminder: false
})

const inboxTasks = computed(() => {
  return taskStore.tasks.filter((task) => task.isInbox).sort((a, b) => b.createdAt - a.createdAt)
})

const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return formatDateStr(date)
}

/** 打开任务整理对话框，复用现有的整理功能 */
const editTask = (task) => {
  openOrganizeDialog(task)
}

const openOrganizeDialog = (task) => {
  currentTask.value = task
  organizeForm.value = {
    category: task.category || 'other',
    date: task.date || new Date().toISOString().split('T')[0],
    priority: task.priority || 3,
    important: task.important || false,
    reminder: task.reminder || false
  }
  showOrganizeDialog.value = true
}

const closeOrganizeDialog = () => {
  showOrganizeDialog.value = false
  currentTask.value = null
}

const saveOrganize = () => {
  if (!currentTask.value) return

  taskStore.organizeInboxTask(currentTask.value.id, {
    category: organizeForm.value.category,
    date: organizeForm.value.date,
    priority: organizeForm.value.priority,
    important: organizeForm.value.important,
    reminder: organizeForm.value.reminder
  })

  closeOrganizeDialog()
}

const confirmDelete = async (task) => {
  const result = await confirm({
    title: t('inbox.deleteConfirm'),
    message: t('inbox.deleteConfirmMessage', { title: task.title }),
    confirmText: t('common.delete'),
    cancelText: t('common.cancel'),
    type: 'danger'
  })

  if (result) {
    taskStore.deleteTask(task.id)
  }
}

const confirmClearAll = async () => {
  const result = await confirm({
    title: t('inbox.clearAllConfirm'),
    message: t('inbox.clearAllConfirmMessage', { count: inboxTasks.value.length }),
    confirmText: t('common.clear'),
    cancelText: t('common.cancel'),
    type: 'danger'
  })

  if (result) {
    taskStore.clearInbox()
  }
}
</script>

<style scoped>
.inbox-view {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.inbox-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
}

.header-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  color: var(--color-text-tertiary);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.inbox-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inbox-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.2s;
}

.inbox-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.task-content {
  flex: 1;
}

.task-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 6px;
}

.task-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.task-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.edit {
  color: var(--color-primary);
}

.action-btn.edit:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.action-btn.organize {
  color: var(--color-success);
}

.action-btn.organize:hover {
  background: var(--color-success-light);
  border-color: var(--color-success);
}

.action-btn.delete {
  color: var(--color-danger);
  padding: 8px;
}

.action-btn.delete:hover {
  background: var(--color-danger-light);
  border-color: var(--color-danger);
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.organize-dialog {
  background: var(--color-bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.dialog-content {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.form-select,
.form-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--color-text-primary);
  transition: all 0.2s;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-bg-primary);
}

.priority-selector {
  display: flex;
  gap: 8px;
}

.priority-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.priority-btn.priority-1 {
  color: var(--color-danger);
}

.priority-btn.priority-2 {
  color: var(--color-warning);
}

.priority-btn.priority-3 {
  color: var(--color-info);
}

.priority-btn.priority-4 {
  color: var(--color-text-secondary);
}

.priority-btn.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-primary);
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn.secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.btn.secondary:hover {
  background: var(--color-bg-tertiary);
}

.btn.primary {
  background: var(--color-primary);
  color: white;
}

.btn.primary:hover {
  background: var(--color-primary-dark);
}
</style>
