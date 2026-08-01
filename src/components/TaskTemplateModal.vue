<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="handleOverlayClick">
        <Transition name="modal-scale" mode="out-in">
          <div v-if="visible" class="modal-container glass-panel" :class="{ 'dark-mode': isDark }">
            <!-- 头部 -->
            <div class="modal-header">
              <div class="header-left">
                <button class="icon-btn back-btn" @click="goBack" v-if="currentView !== 'list'">
                  <ArrowLeft :size="18" />
                </button>
                <h2 class="modal-title">{{ modalTitle }}</h2>
              </div>
              <button class="icon-btn close-btn" @click="closeModal">
                <X :size="18" />
              </button>
            </div>

            <!-- 内容区 -->
            <div class="modal-body">
              <!-- 模板列表视图 -->
              <div v-if="currentView === 'list'" class="template-list-view">
                <div class="section-header">
                  <span class="section-title">{{ $t('template.myTemplates') }}</span>
                  <button class="create-btn" @click="openCreateView">
                    <Plus :size="16" />
                    <span>{{ $t('template.create') }}</span>
                  </button>
                </div>

                <div v-if="taskStore.templates.length === 0" class="empty-state">
                  <div class="empty-icon">
                    <FileText :size="48" />
                  </div>
                  <p class="empty-text">{{ $t('template.empty') }}</p>
                  <button class="primary-btn" @click="openCreateView">
                    <Plus :size="16" />
                    <span>{{ $t('template.createFirst') }}</span>
                  </button>
                </div>

                <div v-else class="template-grid">
                  <div
                    v-for="template in taskStore.templates"
                    :key="template.id"
                    class="template-card"
                    @click="selectTemplate(template)"
                  >
                    <div class="template-icon" :style="{ background: template.color }">
                      <component :is="getIcon(template.icon)" :size="20" />
                    </div>
                    <div class="template-info">
                      <h3 class="template-name">{{ template.name }}</h3>
                      <p class="template-meta">
                        <span v-if="template.subTasks.length > 0">
                          {{ template.subTasks.length }} {{ $t('template.subtasks') }}
                        </span>
                        <span v-if="template.tags.length > 0">
                          · {{ template.tags.length }} {{ $t('template.tags') }}
                        </span>
                      </p>
                    </div>
                    <div class="template-actions">
                      <button
                        class="action-icon"
                        @click.stop="editTemplate(template)"
                        :title="$t('template.edit')"
                      >
                        <Edit2 :size="14" />
                      </button>
                      <button
                        class="action-icon delete"
                        @click.stop="confirmDelete(template)"
                        :title="$t('template.delete')"
                      >
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 创建/编辑模板视图 -->
              <div v-else-if="currentView === 'edit'" class="template-edit-view">
                <div class="form-group">
                  <label class="form-label">{{ $t('template.name') }}</label>
                  <input
                    v-model="editForm.name"
                    type="text"
                    class="form-input"
                    :placeholder="$t('template.namePlaceholder')"
                    maxlength="50"
                  />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">{{ $t('template.icon') }}</label>
                    <div class="icon-selector">
                      <button
                        v-for="icon in availableIcons"
                        :key="icon"
                        class="icon-option"
                        :class="{ active: editForm.icon === icon }"
                        @click="editForm.icon = icon"
                      >
                        <component :is="getIcon(icon)" :size="18" />
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">{{ $t('template.color') }}</label>
                    <div class="color-selector">
                      <button
                        v-for="color in availableColors"
                        :key="color"
                        class="color-option"
                        :class="{ active: editForm.color === color }"
                        :style="{ background: color }"
                        @click="editForm.color = color"
                      />
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ $t('template.category') }}</label>
                  <select v-model="editForm.category" class="form-select">
                    <option v-for="cat in taskStore.categories" :key="cat.id" :value="cat.id">
                      {{ cat.name }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ $t('template.priority') }}</label>
                  <div class="priority-selector">
                    <button
                      v-for="p in [1, 2, 3, 4]"
                      :key="p"
                      class="priority-option"
                      :class="`priority-${p}`"
                      :class2="{ active: editForm.priority === p }"
                      @click="editForm.priority = p"
                    >
                      P{{ p }}
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ $t('template.subtasks') }}</label>
                  <div class="subtask-list">
                    <div
                      v-for="(sub, index) in editForm.subTasks"
                      :key="index"
                      class="subtask-item"
                    >
                      <input
                        v-model="sub.title"
                        type="text"
                        class="subtask-input"
                        :placeholder="$t('template.subtaskPlaceholder')"
                        maxlength="100"
                      />
                      <button class="remove-btn" @click="removeSubTask(index)">
                        <X :size="14" />
                      </button>
                    </div>
                    <button class="add-subtask-btn" @click="addSubTask">
                      <Plus :size="14" />
                      <span>{{ $t('template.addSubtask') }}</span>
                    </button>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ $t('template.notes') }}</label>
                  <textarea
                    v-model="editForm.notes"
                    class="form-textarea"
                    :placeholder="$t('template.notesPlaceholder')"
                    rows="3"
                    maxlength="2000"
                  />
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="editForm.important" />
                    <span>{{ $t('template.important') }}</span>
                  </label>
                </div>

                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="editForm.reminder" />
                    <span>{{ $t('template.reminder') }}</span>
                  </label>
                </div>

                <div class="form-actions">
                  <button class="secondary-btn" @click="goBack">{{ $t('common.cancel') }}</button>
                  <button class="primary-btn" @click="saveTemplate" :disabled="!canSave">
                    {{ isEditing ? $t('common.save') : $t('template.create') }}
                  </button>
                </div>
              </div>

              <!-- 使用模板视图 -->
              <div v-else-if="currentView === 'use'" class="template-use-view">
                <div class="template-preview">
                  <div class="template-icon large" :style="{ background: selectedTemplate.color }">
                    <component :is="getIcon(selectedTemplate.icon)" :size="32" />
                  </div>
                  <h3 class="template-name">{{ selectedTemplate.name }}</h3>
                  <div class="template-details">
                    <div class="detail-item">
                      <span class="detail-label">{{ $t('template.category') }}:</span>
                      <span class="detail-value">
                        {{ getCategoryName(selectedTemplate.category) }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">{{ $t('template.priority') }}:</span>
                      <span
                        class="detail-value priority-badge"
                        :class="`priority-${selectedTemplate.priority}`"
                      >
                        P{{ selectedTemplate.priority }}
                      </span>
                    </div>
                    <div v-if="selectedTemplate.subTasks.length > 0" class="detail-item">
                      <span class="detail-label">{{ $t('template.subtasks') }}:</span>
                      <ul class="subtask-preview">
                        <li v-for="sub in selectedTemplate.subTasks" :key="sub.id">
                          {{ sub.title }}
                        </li>
                      </ul>
                    </div>
                    <div v-if="selectedTemplate.notes" class="detail-item">
                      <span class="detail-label">{{ $t('template.notes') }}:</span>
                      <p class="notes-preview">{{ selectedTemplate.notes }}</p>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">{{ $t('template.taskTitle') }}</label>
                  <input
                    v-model="useForm.title"
                    type="text"
                    class="form-input"
                    :placeholder="$t('template.taskTitlePlaceholder')"
                    maxlength="500"
                  />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">{{ $t('template.date') }}</label>
                    <input v-model="useForm.date" type="date" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ $t('template.time') }}</label>
                    <input v-model="useForm.time" type="time" class="form-input" />
                  </div>
                </div>

                <div class="form-actions">
                  <button class="secondary-btn" @click="goBack">{{ $t('common.cancel') }}</button>
                  <button
                    class="primary-btn"
                    @click="applySelectedTemplate"
                    :disabled="!useForm.title"
                  >
                    <Check :size="16" />
                    <span>{{ $t('template.useTemplate') }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- 删除确认对话框 -->
    <Transition name="modal-fade">
      <div v-if="showDeleteConfirm" class="modal-overlay delete-confirm" @click.self="cancelDelete">
        <div class="confirm-dialog glass-panel" :class="{ 'dark-mode': isDark }">
          <h3 class="confirm-title">{{ $t('template.deleteConfirm') }}</h3>
          <p class="confirm-text">
            {{ $t('template.deleteConfirmText', { name: templateToDelete?.name }) }}
          </p>
          <div class="confirm-actions">
            <button class="secondary-btn" @click="cancelDelete">{{ $t('common.cancel') }}</button>
            <button class="danger-btn" @click="executeDelete">{{ $t('common.delete') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSnackbar } from '../composables/useSnackbar'
import { getTodayStr } from '../utils/date'
import {
  X,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Check,
  FileText,
  Sun,
  Users,
  BookOpen,
  Briefcase,
  User,
  ShoppingCart,
  Heart,
  MoreHorizontal,
  Star,
  Bell,
  Calendar,
  Clock,
  Tag,
  Flag,
  Target,
  Zap,
  Award,
  Coffee,
  Music,
  Camera,
  Plane,
  Home,
  Car,
  Gift,
  Code,
  PenTool,
  Database,
  Settings
} from '@lucide/vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'template-applied'])

const { t } = useI18n()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()
const { show: showSnackbar } = useSnackbar()

const isDark = computed(() => settingsStore.theme === 'dark')
const currentView = ref('list')
const isEditing = ref(false)
const editingTemplateId = ref(null)
const selectedTemplate = ref(null)
const showDeleteConfirm = ref(false)
const templateToDelete = ref(null)

const editForm = ref({
  name: '',
  icon: 'file-text',
  color: '#6B7280',
  category: 'other',
  priority: 3,
  subTasks: [],
  notes: '',
  important: false,
  reminder: false
})

const useForm = ref({
  title: '',
  date: '',
  time: ''
})

const availableIcons = [
  'file-text',
  'sun',
  'users',
  'book-open',
  'briefcase',
  'user',
  'shopping-cart',
  'heart',
  'star',
  'bell',
  'calendar',
  'clock',
  'tag',
  'flag',
  'target',
  'zap',
  'award',
  'coffee',
  'music',
  'camera',
  'plane',
  'home',
  'car',
  'gift',
  'code',
  'pen-tool',
  'database',
  'settings'
]

const availableColors = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#F97316',
  '#6B7280'
]

const modalTitle = computed(() => {
  switch (currentView.value) {
    case 'list':
      return t('template.title')
    case 'edit':
      return isEditing.value ? t('template.editTitle') : t('template.createTitle')
    case 'use':
      return t('template.useTitle')
    default:
      return ''
  }
})

const canSave = computed(() => {
  return editForm.value.name.trim().length > 0
})

const getIcon = (iconName) => {
  const iconMap = {
    'file-text': FileText,
    sun: Sun,
    users: Users,
    'book-open': BookOpen,
    briefcase: Briefcase,
    user: User,
    'shopping-cart': ShoppingCart,
    heart: Heart,
    'more-horizontal': MoreHorizontal,
    star: Star,
    bell: Bell,
    calendar: Calendar,
    clock: Clock,
    tag: Tag,
    flag: Flag,
    target: Target,
    zap: Zap,
    award: Award,
    coffee: Coffee,
    music: Music,
    camera: Camera,
    plane: Plane,
    home: Home,
    car: Car,
    gift: Gift,
    code: Code,
    'pen-tool': PenTool,
    database: Database,
    settings: Settings
  }
  return iconMap[iconName] || FileText
}

const getCategoryName = (catId) => {
  const cat = taskStore.getCategoryById(catId)
  return cat ? cat.name : t('categories.other')
}

const handleOverlayClick = () => {
  closeModal()
}

const closeModal = () => {
  emit('update:visible', false)
  setTimeout(() => {
    currentView.value = 'list'
    isEditing.value = false
    editingTemplateId.value = null
    selectedTemplate.value = null
    resetEditForm()
    resetUseForm()
  }, 300)
}

const goBack = () => {
  if (currentView.value === 'edit' || currentView.value === 'use') {
    currentView.value = 'list'
    resetEditForm()
    resetUseForm()
  }
}

const resetEditForm = () => {
  editForm.value = {
    name: '',
    icon: 'file-text',
    color: '#6B7280',
    category: 'other',
    priority: 3,
    subTasks: [],
    notes: '',
    important: false,
    reminder: false
  }
  isEditing.value = false
  editingTemplateId.value = null
}

const resetUseForm = () => {
  useForm.value = {
    title: '',
    date: getTodayStr(),
    time: ''
  }
  selectedTemplate.value = null
}

const openCreateView = () => {
  resetEditForm()
  currentView.value = 'edit'
}

const editTemplate = (template) => {
  editForm.value = {
    name: template.name,
    icon: template.icon,
    color: template.color,
    category: template.category,
    priority: template.priority,
    subTasks: template.subTasks.map((st) => ({ title: st.title })),
    notes: template.notes,
    important: template.important,
    reminder: template.reminder
  }
  isEditing.value = true
  editingTemplateId.value = template.id
  currentView.value = 'edit'
}

const selectTemplate = (template) => {
  selectedTemplate.value = template
  useForm.value.title = template.name
  useForm.value.date = getTodayStr()
  currentView.value = 'use'
}

const saveTemplate = () => {
  if (!canSave.value) return

  const templateData = {
    name: editForm.value.name,
    icon: editForm.value.icon,
    color: editForm.value.color,
    category: editForm.value.category,
    priority: editForm.value.priority,
    subTasks: editForm.value.subTasks.filter((st) => st.title.trim()),
    notes: editForm.value.notes,
    important: editForm.value.important,
    reminder: editForm.value.reminder
  }

  if (isEditing.value) {
    taskStore.updateTemplate(editingTemplateId.value, templateData)
    showSnackbar(t('template.updated'), { duration: 2000 })
  } else {
    taskStore.addTemplate(templateData)
    showSnackbar(t('template.created'), { duration: 2000 })
  }

  goBack()
}

const addSubTask = () => {
  editForm.value.subTasks.push({ title: '' })
}

const removeSubTask = (index) => {
  editForm.value.subTasks.splice(index, 1)
}

const confirmDelete = (template) => {
  templateToDelete.value = template
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  templateToDelete.value = null
}

const executeDelete = () => {
  if (templateToDelete.value) {
    taskStore.deleteTemplate(templateToDelete.value.id)
    showSnackbar(t('template.deleted'), { duration: 2000 })
  }
  cancelDelete()
}

const applySelectedTemplate = () => {
  if (!selectedTemplate.value || !useForm.value.title) return

  const task = taskStore.applyTemplate(selectedTemplate.value.id, {
    title: useForm.value.title,
    date: useForm.value.date,
    time: useForm.value.time
  })

  if (task) {
    showSnackbar(t('template.applied'), { duration: 2000 })
    emit('template-applied', task)
    closeModal()
  }
}

watch(
  () => props.visible,
  (newVal) => {
    if (!newVal) {
      currentView.value = 'list'
      resetEditForm()
      resetUseForm()
    }
  }
)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-container.dark-mode {
  background: rgba(30, 30, 40, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.06));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary, #1a1a1a);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.05));
  color: var(--color-text-primary, #1a1a1a);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary, #4285f4);
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.create-btn:hover {
  background: var(--color-primary-hover, #3367d6);
  transform: translateY(-1px);
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  color: var(--color-text-tertiary, #9ca3af);
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 24px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.template-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 14px;
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.06));
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.05));
  border-color: var(--color-primary, #4285f4);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.template-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 12px;
}

.template-icon.large {
  width: 64px;
  height: 64px;
  border-radius: 16px;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--color-text-primary, #1a1a1a);
}

.template-meta {
  font-size: 12px;
  color: var(--color-text-tertiary, #9ca3af);
}

.template-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.template-card:hover .template-actions {
  opacity: 1;
}

.action-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.05));
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.action-icon:hover {
  background: var(--color-primary, #4285f4);
  color: white;
}

.action-icon.delete:hover {
  background: #ef4444;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 8px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1));
  background: var(--color-bg-primary, white);
  color: var(--color-text-primary, #1a1a1a);
  font-size: 14px;
  transition: all 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary, #4285f4);
  box-shadow: 0 0 0 3px var(--color-primary-ring, rgba(66, 133, 244, 0.15));
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.icon-option:hover {
  background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.05));
}

.icon-option.active {
  border-color: var(--color-primary, #4285f4);
  color: var(--color-primary, #4285f4);
  background: var(--color-primary-light, rgba(66, 133, 244, 0.1));
}

.color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--color-text-primary, #1a1a1a);
  box-shadow:
    0 0 0 2px white,
    0 0 0 4px var(--color-text-primary, #1a1a1a);
}

.priority-selector {
  display: flex;
  gap: 8px;
}

.priority-option {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  color: var(--color-text-secondary, #6b7280);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.priority-option.active {
  border-color: currentColor;
}

.priority-option.priority-1 {
  color: #ef4444;
}

.priority-option.priority-2 {
  color: #f97316;
}

.priority-option.priority-3 {
  color: #eab308;
}

.priority-option.priority-4 {
  color: #6b7280;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.subtask-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1));
  background: var(--color-bg-primary, white);
  color: var(--color-text-primary, #1a1a1a);
  font-size: 13px;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary, #9ca3af);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.remove-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.add-subtask-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed var(--color-border, rgba(0, 0, 0, 0.1));
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-subtask-btn:hover {
  border-color: var(--color-primary, #4285f4);
  color: var(--color-primary, #4285f4);
  background: var(--color-primary-light, rgba(66, 133, 244, 0.05));
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-primary, #1a1a1a);
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.06));
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary, #4285f4);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.primary-btn:hover:not(:disabled) {
  background: var(--color-primary-hover, #3367d6);
  transform: translateY(-1px);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1));
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.secondary-btn:hover {
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
  color: var(--color-text-primary, #1a1a1a);
}

.danger-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: #ef4444;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.danger-btn:hover {
  background: #dc2626;
}

.template-preview {
  text-align: center;
  padding: 24px;
  margin-bottom: 24px;
  border-radius: 14px;
  background: var(--color-bg-secondary, rgba(0, 0, 0, 0.03));
}

.template-details {
  margin-top: 20px;
  text-align: left;
}

.detail-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
}

.detail-label {
  color: var(--color-text-secondary, #6b7280);
  min-width: 80px;
}

.detail-value {
  color: var(--color-text-primary, #1a1a1a);
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.priority-badge.priority-1 {
  background: #fee2e2;
  color: #ef4444;
}

.priority-badge.priority-2 {
  background: #fed7aa;
  color: #f97316;
}

.priority-badge.priority-3 {
  background: #fef3c7;
  color: #eab308;
}

.priority-badge.priority-4 {
  background: #f3f4f6;
  color: #6b7280;
}

.subtask-preview {
  margin: 0;
  padding-left: 16px;
}

.subtask-preview li {
  margin-bottom: 4px;
  color: var(--color-text-primary, #1a1a1a);
}

.notes-preview {
  margin: 0;
  color: var(--color-text-primary, #1a1a1a);
  white-space: pre-wrap;
}

.delete-confirm {
  z-index: 1001;
}

.confirm-dialog {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.confirm-dialog.dark-mode {
  background: rgba(40, 40, 50, 0.95);
}

.confirm-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--color-text-primary, #1a1a1a);
}

.confirm-text {
  font-size: 14px;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
