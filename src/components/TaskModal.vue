<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-backdrop" @click.self="handleClose">
        <Transition name="slide-up">
          <div
            v-if="visible"
            class="modal-container"
            ref="modalRef"
            role="dialog"
            aria-modal="true"
            :aria-label="isEdit ? $t('task.editTask') : $t('task.newTask')"
            @keydown.esc="handleClose"
          >
            <div class="drag-handle">
              <div class="drag-bar"></div>
            </div>

            <div class="modal-header">
              <div>
                <h2>{{ isEdit ? $t('task.editTask') : $t('task.newTask') }}</h2>
              </div>
              <button class="close-btn" @click="handleClose" :aria-label="$t('common.close')">
                <X :size="18" />
              </button>
            </div>

            <div class="modal-body">
              <div class="title-input-wrap">
                <input
                  type="text"
                  class="form-title-input"
                  :placeholder="$t('task.titlePlaceholder')"
                  v-model="form.title"
                  ref="titleInput"
                  :aria-label="$t('task.taskTitle')"
                />
                <button
                  v-if="speechRecognitionSupported"
                  class="mic-btn"
                  :class="{ recording: isRecording }"
                  @click="toggleSpeechRecognition"
                  :aria-label="isRecording ? $t('common.stopRecording') : $t('common.voiceInput')"
                >
                  <Mic :size="20" />
                </button>
              </div>

              <div class="form-section-label">{{ $t('task.category') }}</div>
              <div
                class="category-scroll"
                role="radiogroup"
                :aria-label="$t('task.selectCategory')"
              >
                <div
                  v-for="cat in taskStore.categories"
                  :key="cat.id"
                  class="category-pill"
                  :class="{ active: form.category === cat.id }"
                  role="radio"
                  :aria-checked="form.category === cat.id"
                  tabindex="0"
                  @click="form.category = cat.id"
                  @keydown.enter.prevent="form.category = cat.id"
                  @keydown.space.prevent="form.category = cat.id"
                >
                  <span class="category-dot" :style="{ background: cat.color }"></span>
                  {{ cat.name }}
                </div>
              </div>

              <div class="form-section-label">
                <div class="section-label-row">
                  <span>{{ $t('task.tags') }}</span>
                  <button
                    class="add-tag-btn"
                    @click="showAddTag = !showAddTag"
                    :aria-label="$t('task.addTag')"
                  >
                    <Plus :size="14" />
                  </button>
                </div>
              </div>
              <div class="tags-wrap">
                <div
                  v-for="tag in taskStore.tags"
                  :key="tag.id"
                  class="tag-pill"
                  :class="{ active: form.tags.includes(tag.id) }"
                  role="checkbox"
                  :aria-checked="form.tags.includes(tag.id)"
                  tabindex="0"
                  @click="toggleTag(tag.id)"
                  @keydown.enter.prevent="toggleTag(tag.id)"
                  @keydown.space.prevent="toggleTag(tag.id)"
                >
                  <span class="tag-dot" :style="{ background: tag.color }"></span>
                  {{ tag.name }}
                  <Check v-if="form.tags.includes(tag.id)" :size="12" class="tag-check" />
                </div>
              </div>
              <div v-if="showAddTag" class="add-tag-wrap">
                <div class="color-picker-row">
                  <button
                    v-for="color in PRESET_COLORS"
                    :key="color"
                    class="color-option"
                    :class="{ active: newTagColor === color }"
                    :style="{ background: color }"
                    @click="newTagColor = color"
                    :aria-label="`${$t('common.selectColor')} ${color}`"
                  ></button>
                </div>
                <div class="add-tag-input-row">
                  <input
                    type="text"
                    class="form-input tag-name-input"
                    :placeholder="$t('task.newTagPlaceholder')"
                    v-model="newTagName"
                    @keyup.enter.prevent="handleAddTag"
                    :aria-label="$t('task.newTagName')"
                  />
                  <button
                    class="add-tag-confirm-btn"
                    @click="handleAddTag"
                    :disabled="!newTagName.trim()"
                  >
                    <Check :size="16" />
                  </button>
                </div>
              </div>

              <hr class="form-divider" />

              <div class="form-section-label">{{ $t('task.dateTime') }}</div>

              <div class="setting-row">
                <Calendar :size="18" class="row-icon" />
                <span class="setting-label">{{ $t('task.selectDate') }}</span>
                <div class="setting-action">
                  <input
                    type="date"
                    class="date-input"
                    v-model="form.date"
                    :aria-label="$t('task.selectDate')"
                  />
                </div>
              </div>

              <div class="setting-row">
                <Clock :size="18" class="row-icon" />
                <span class="setting-label">{{ $t('task.selectTime') }}</span>
                <div class="setting-action">
                  <input
                    type="time"
                    class="date-input"
                    v-model="form.time"
                    :aria-label="$t('task.selectTime')"
                  />
                </div>
              </div>

              <div class="setting-row repeat-row">
                <RotateCcw :size="18" class="row-icon" />
                <span class="setting-label">{{ $t('task.repeat') }}</span>
                <div class="setting-action">
                  <select
                    class="repeat-select"
                    :value="form.repeat ? form.repeat.frequency : ''"
                    @change="setRepeatFrequency($event.target.value || null)"
                    :aria-label="$t('task.repeatFrequency')"
                  >
                    <option
                      v-for="opt in REPEAT_OPTIONS"
                      :key="opt.value === null ? 'none' : opt.value"
                      :value="opt.value === null ? '' : opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div v-if="form.repeat" class="repeat-settings">
                <div class="setting-row sub-setting">
                  <span class="sub-setting-label">{{ $t('task.repeatInterval') }}</span>
                  <div class="setting-action interval-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      :value="form.repeat.interval || 1"
                      @input="setRepeatInterval($event.target.value)"
                      class="interval-input"
                    />
                    <span class="interval-unit">{{ repeatIntervalUnit }}</span>
                  </div>
                </div>

                <div v-if="form.repeat.frequency === 'weekly'" class="weekdays-wrap">
                  <div class="weekdays-label">{{ $t('task.selectWeekday') }}</div>
                  <div class="weekdays-row">
                    <button
                      v-for="day in WEEKDAYS"
                      :key="day.value"
                      class="weekday-btn"
                      :class="{
                        active: form.repeat.weekdays && form.repeat.weekdays.includes(day.value)
                      }"
                      @click="toggleWeekday(day.value)"
                      :aria-pressed="
                        form.repeat.weekdays && form.repeat.weekdays.includes(day.value)
                      "
                    >
                      {{ day.label }}
                    </button>
                  </div>
                </div>

                <div class="setting-row sub-setting">
                  <span class="sub-setting-label">{{ $t('task.endRepeat') }}</span>
                  <div class="setting-action">
                    <select
                      class="repeat-end-select"
                      :value="repeatEndType"
                      @change="setRepeatEndType($event.target.value)"
                      :aria-label="$t('task.endRepeatType')"
                    >
                      <option value="never">{{ $t('task.never') }}</option>
                      <option value="date">{{ $t('task.byDate') }}</option>
                      <option value="count">{{ $t('task.byCount') }}</option>
                    </select>
                  </div>
                </div>

                <div v-if="repeatEndType === 'date'" class="setting-row sub-setting">
                  <span class="sub-setting-label">{{ $t('task.endDate') }}</span>
                  <div class="setting-action">
                    <input
                      type="date"
                      :value="form.repeat.endDate || ''"
                      @input="setRepeatEndDate($event.target.value)"
                      class="repeat-end-date-input"
                    />
                  </div>
                </div>

                <div v-if="repeatEndType === 'count'" class="setting-row sub-setting">
                  <span class="sub-setting-label">{{ $t('task.repeatCount') }}</span>
                  <div class="setting-action interval-input-wrap">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      :value="form.repeat.endCount || 1"
                      @input="setRepeatEndCount($event.target.value)"
                      class="interval-input"
                    />
                    <span class="interval-unit">{{ $t('task.times') }}</span>
                  </div>
                </div>
              </div>

              <hr class="form-divider" />

              <div class="form-section-label">{{ $t('task.options') }}</div>

              <div class="setting-row">
                <Bell :size="18" class="row-icon" />
                <div class="setting-label-wrap">
                  <span class="setting-label">{{ $t('task.reminder') }}</span>
                  <p class="toggle-desc">{{ $t('task.reminderDesc') }}</p>
                </div>
                <div class="setting-action">
                  <button
                    class="toggle-switch"
                    role="switch"
                    :aria-checked="form.reminder"
                    @click="form.reminder = !form.reminder"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              </div>

              <div class="setting-row">
                <Star :size="18" class="row-icon" />
                <div class="setting-label-wrap">
                  <span class="setting-label">{{ $t('task.markImportant') }}</span>
                  <p class="toggle-desc">{{ $t('task.importantDesc') }}</p>
                </div>
                <div class="setting-action">
                  <button
                    class="toggle-switch"
                    role="switch"
                    :aria-checked="form.important"
                    @click="form.important = !form.important"
                  >
                    <span class="toggle-knob"></span>
                  </button>
                </div>
              </div>

              <div class="subtasks-wrap">
                <div class="form-section-label">
                  <div class="section-label-row">
                    <span>{{ $t('task.subTasks') }}</span>
                    <span v-if="subTaskProgress.total > 0" class="progress-text">
                      {{ subTaskProgress.completed }}/{{ subTaskProgress.total }}
                    </span>
                  </div>
                </div>

                <div class="subtasks-list">
                  <div v-for="sub in form.subTasks" :key="sub.id" class="subtask-item">
                    <button
                      class="subtask-checkbox"
                      :class="{ checked: sub.completed }"
                      role="checkbox"
                      :aria-checked="sub.completed"
                      @click="toggleSubTask(sub.id)"
                    >
                      <Check v-if="sub.completed" :size="12" />
                    </button>
                    <span class="subtask-title" :class="{ completed: sub.completed }">
                      {{ sub.title }}
                    </span>
                    <button
                      class="subtask-delete"
                      @click="deleteSubTask(sub.id)"
                      :aria-label="$t('task.deleteSubtask')"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>

                <div class="add-subtask-row">
                  <input
                    type="text"
                    class="form-input subtask-input"
                    :placeholder="$t('task.addSubtaskPlaceholder')"
                    v-model="newSubTaskTitle"
                    @keyup.enter.prevent="addSubTask"
                    :aria-label="$t('task.newSubtask')"
                  />
                  <button
                    class="add-subtask-btn"
                    @click="addSubTask"
                    :disabled="!newSubTaskTitle.trim()"
                    :aria-label="$t('task.addSubTask')"
                  >
                    <Plus :size="16" />
                  </button>
                </div>
              </div>

              <div class="notes-wrap">
                <div class="form-section-label">{{ $t('task.notes') }}</div>
                <textarea
                  class="form-input"
                  rows="3"
                  :placeholder="$t('task.notesPlaceholder')"
                  v-model="form.notes"
                  :aria-label="$t('task.notes')"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button class="save-btn" @click="handleSave">{{ $t('common.save') }}</button>
              <button class="cancel-btn" @click="handleClose">{{ $t('common.cancel') }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTaskStore, generateId } from '../stores/taskStore'
import { useFocusTrap } from '../composables/useFocusTrap'
import { useSnackbar } from '../composables/useSnackbar'
import { getTodayStr } from '../utils/date'
import { X, Calendar, Clock, Bell, Star, Plus, Trash2, Check, RotateCcw, Mic } from '@lucide/vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const { t } = useI18n()
const taskStore = useTaskStore()
const { show: showSnackbar } = useSnackbar()
const titleInput = ref(null)
const modalRef = ref(null)
const { activate, deactivate } = useFocusTrap(modalRef)

const isEdit = computed(() => props.task && props.task.id)

const form = reactive({
  title: '',
  category: 'work',
  date: getTodayStr(),
  time: '',
  reminder: false,
  important: false,
  notes: '',
  tags: [],
  subTasks: [],
  repeat: null
})

const newSubTaskTitle = ref('')
const newTagName = ref('')
const newTagColor = ref('#6B7280')
const showAddTag = ref(false)

const speechRecognitionSupported = ref(false)
const isRecording = ref(false)
let recognition = null

const initSpeechRecognition = () => {
  if (typeof window === 'undefined') return
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    speechRecognitionSupported.value = false
    return
  }
  speechRecognitionSupported.value = true
  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = true
  recognition.lang = 'zh-CN'

  recognition.onresult = (event) => {
    let transcript = ''
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript
    }
    form.title = transcript
  }

  recognition.onerror = (event) => {
    console.error('[TaskModal] Speech recognition error:', event.error)
    isRecording.value = false
    if (event.error !== 'no-speech') {
      showSnackbar(t('task.speechRecognitionError'), { duration: 3000 })
    }
  }

  recognition.onend = () => {
    isRecording.value = false
  }
}

const toggleSpeechRecognition = () => {
  if (!recognition) return
  if (isRecording.value) {
    recognition.stop()
    isRecording.value = false
  } else {
    try {
      recognition.start()
      isRecording.value = true
    } catch (e) {
      console.error('[TaskModal] Failed to start speech recognition:', e)
      showSnackbar(t('task.speechRecognitionFailed'), { duration: 3000 })
    }
  }
}

const PRESET_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
  '#6B7280'
]

const WEEKDAYS = computed(() => [
  { value: 1, label: t('task.monday') },
  { value: 2, label: t('task.tuesday') },
  { value: 3, label: t('task.wednesday') },
  { value: 4, label: t('task.thursday') },
  { value: 5, label: t('task.friday') },
  { value: 6, label: t('task.saturday') },
  { value: 0, label: t('task.sunday') }
])

const REPEAT_OPTIONS = computed(() => [
  { value: null, label: t('task.noRepeat') },
  { value: 'daily', label: t('task.daily') },
  { value: 'weekly', label: t('task.weekly') },
  { value: 'monthly', label: t('task.monthly') },
  { value: 'yearly', label: t('task.yearly') }
])

const subTaskProgress = computed(() => {
  const total = form.subTasks.length
  const completed = form.subTasks.filter((st) => st.completed).length
  return { completed, total }
})

const toggleTag = (tagId) => {
  const idx = form.tags.indexOf(tagId)
  if (idx === -1) {
    form.tags.push(tagId)
  } else {
    form.tags.splice(idx, 1)
  }
}

const handleAddTag = () => {
  if (!newTagName.value.trim()) return
  const newTag = taskStore.addTag({
    name: newTagName.value.trim(),
    color: newTagColor.value
  })
  if (newTag) {
    form.tags.push(newTag.id)
    newTagName.value = ''
    showAddTag.value = false
  }
}

const setRepeatFrequency = (freq) => {
  if (freq === null) {
    form.repeat = null
  } else if (freq === 'weekly') {
    form.repeat = { frequency: 'weekly', interval: 1, weekdays: [] }
  } else {
    form.repeat = { frequency: freq, interval: 1 }
  }
}

const toggleWeekday = (day) => {
  if (!form.repeat || form.repeat.frequency !== 'weekly') return
  if (!form.repeat.weekdays) form.repeat.weekdays = []
  const idx = form.repeat.weekdays.indexOf(day)
  if (idx === -1) {
    form.repeat.weekdays.push(day)
  } else {
    form.repeat.weekdays.splice(idx, 1)
  }
}

const repeatIntervalUnit = computed(() => {
  if (!form.repeat) return ''
  const units = {
    daily: t('task.dayUnit'),
    weekly: t('task.weekUnit'),
    monthly: t('task.monthUnit'),
    yearly: t('task.yearUnit'),
    custom: t('task.dayUnit')
  }
  return units[form.repeat.frequency] || t('task.dayUnit')
})

const repeatEndType = computed(() => {
  if (!form.repeat) return 'never'
  if (form.repeat.endDate) return 'date'
  if (form.repeat.endCount) return 'count'
  return 'never'
})

const setRepeatInterval = (val) => {
  if (!form.repeat) return
  const num = parseInt(val, 10)
  if (!isNaN(num) && num >= 1) {
    form.repeat.interval = num
  }
}

const setRepeatEndType = (type) => {
  if (!form.repeat) return
  if (type === 'never') {
    delete form.repeat.endDate
    delete form.repeat.endCount
  } else if (type === 'date') {
    delete form.repeat.endCount
    if (!form.repeat.endDate) {
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
      form.repeat.endDate = nextMonth.toISOString().split('T')[0]
    }
  } else if (type === 'count') {
    delete form.repeat.endDate
    if (!form.repeat.endCount) {
      form.repeat.endCount = 10
    }
  }
}

const setRepeatEndDate = (date) => {
  if (!form.repeat) return
  if (date) {
    form.repeat.endDate = date
  } else {
    delete form.repeat.endDate
  }
}

const setRepeatEndCount = (val) => {
  if (!form.repeat) return
  const num = parseInt(val, 10)
  if (!isNaN(num) && num >= 1) {
    form.repeat.endCount = num
  }
}

const addSubTask = () => {
  if (!newSubTaskTitle.value.trim()) return
  const maxOrder = form.subTasks.reduce((max, st) => Math.max(max, st.order || 0), -1)
  form.subTasks.push({
    id: generateId('sub_'),
    title: newSubTaskTitle.value.trim(),
    completed: false,
    order: maxOrder + 1
  })
  newSubTaskTitle.value = ''
}

const toggleSubTask = (subId) => {
  const sub = form.subTasks.find((st) => st.id === subId)
  if (sub) sub.completed = !sub.completed
}

const deleteSubTask = (subId) => {
  const idx = form.subTasks.findIndex((st) => st.id === subId)
  if (idx !== -1) form.subTasks.splice(idx, 1)
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      if (props.task) {
        form.title = props.task.title || ''
        form.category = props.task.category || 'work'
        // 修复时区 Bug：使用本地日期函数而非 UTC
        form.date = props.task.date || getTodayStr()
        form.time = props.task.time || ''
        form.reminder = !!props.task.reminder
        form.important = !!props.task.important
        form.notes = props.task.notes || ''
        form.tags = Array.isArray(props.task.tags) ? [...props.task.tags] : []
        form.subTasks = Array.isArray(props.task.subTasks)
          ? props.task.subTasks.map((st) => ({ ...st }))
          : []
        form.repeat = props.task.repeat ? { ...props.task.repeat } : null
        if (form.repeat && form.repeat.weekdays) {
          form.repeat.weekdays = [...form.repeat.weekdays]
        }
      } else {
        form.title = ''
        form.category =
          taskStore.currentView === 'category' && taskStore.currentCategory
            ? taskStore.currentCategory
            : 'work'
        form.date = getTodayStr()
        form.time = ''
        form.reminder = false
        form.important = false
        form.notes = ''
        form.tags =
          taskStore.currentView === 'tag' && taskStore.currentTag ? [taskStore.currentTag] : []
        form.subTasks = []
        form.repeat = null
      }
      newSubTaskTitle.value = ''
      newTagName.value = ''
      showAddTag.value = false

      initSpeechRecognition()

      await nextTick()
      activate()
    } else {
      if (isRecording.value && recognition) {
        recognition.stop()
        isRecording.value = false
      }
      deactivate()
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('close')
}

const handleSave = () => {
  if (!form.title.trim()) {
    showSnackbar(t('task.pleaseEnterTitle'), { duration: 3000 })
    if (titleInput.value) titleInput.value.focus()
    return
  }

  const taskData = {
    title: form.title.trim(),
    category: form.category,
    date: form.date || getTodayStr(),
    time: form.time || null,
    reminder: form.reminder,
    important: form.important,
    notes: form.notes,
    tags: [...form.tags],
    subTasks: form.subTasks.map((st) => ({ ...st })),
    repeat: form.repeat ? { ...form.repeat } : null
  }

  if (isEdit.value) {
    taskStore.updateTask(props.task.id, taskData)
    showSnackbar(t('task.taskUpdated'))
  } else {
    taskStore.addTask(taskData)
    showSnackbar(t('task.taskAdded'))
  }

  emit('save', taskData)
  emit('close')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--duration-normal) var(--ease-out-quart);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  position: fixed;
  z-index: var(--z-modal);
  background: var(--color-surface);
  box-shadow: var(--shadow-float);
  display: flex;
  flex-direction: column;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 92vh;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  animation: slideUpSpring var(--duration-moderate) var(--ease-spring-soft);
  transform-origin: bottom center;
}

@keyframes slideUpSpring {
  from {
    transform: translateY(100%) scale(0.96);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.drag-handle {
  display: flex;
  justify-content: center;
  padding-top: 8px;
  padding-bottom: 4px;
  flex-shrink: 0;
}

.drag-bar {
  width: 32px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px 0 24px;
  flex-shrink: 0;
  min-height: 56px;
}

.modal-header h2 {
  font-size: var(--font-size-h3);
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
  font-family: var(--font-title);
  letter-spacing: -0.3px;
}

.close-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  border: none;
  transition:
    background var(--transition-smooth),
    transform var(--transition-spring-soft),
    color var(--transition-smooth);
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transform: scale(1.08) rotate(90deg);
}

.close-btn:active {
  transform: scale(0.94);
}

.modal-body {
  overflow-y: auto;
  flex: 1;
  padding: 0 24px 24px;
}

.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.modal-body:hover::-webkit-scrollbar-thumb {
  background: var(--color-border);
}

.title-input-wrap {
  margin-top: 16px;
  margin-bottom: 20px;
  position: relative;
}

.mic-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-spring-soft);
}

.mic-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-primary);
}

.mic-btn.recording {
  color: var(--state-error);
  animation: micPulse 1.5s ease-in-out infinite;
}

.mic-btn.recording:hover {
  background: var(--color-error-surface);
}

@keyframes micPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
  }
}

.form-title-input {
  width: 100%;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-lg);
  font-weight: 400;
  outline: none;
  transition:
    border-color var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
  box-sizing: border-box;
}

.form-title-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.form-title-input::placeholder {
  color: var(--color-text-tertiary);
}

.form-section-label {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin: 16px 0 10px 0;
  letter-spacing: 0.2px;
}

.form-section-label:first-of-type {
  margin-top: 0;
}

.category-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
}

.category-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-spring-soft);
  line-height: 1.4;
}

.category-pill:hover {
  border-color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.category-pill:active {
  transform: scale(0.96);
}

.category-pill.active {
  background: var(--color-primary-surface);
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.form-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 0 -24px;
  border: none;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  transition: background var(--transition-micro);
  border-radius: var(--radius-sm);
}

.setting-row:hover {
  background: transparent;
}

.row-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.setting-label {
  flex: 1;
  font-size: var(--font-size-body);
  font-weight: 400;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setting-label-wrap {
  flex: 1;
  min-width: 0;
}

.toggle-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 2px 0 0 0;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setting-action {
  flex-shrink: 0;
}

.date-input {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.date-input:hover {
  background: var(--color-border-light);
}

.date-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 28px;
  min-width: 48px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: background var(--transition-smooth);
  padding: 0;
  outline: none;
  background: var(--color-border);
}

.toggle-switch[aria-checked='true'] {
  background: var(--color-primary);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  transition:
    left var(--transition-spring-soft),
    right var(--transition-spring-soft),
    box-shadow var(--transition-smooth);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.2),
    0 1px 1px rgba(0, 0, 0, 0.1);
  left: 3px;
}

.toggle-switch[aria-checked='true'] .toggle-knob {
  right: 3px;
  left: auto;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.1);
}

.notes-wrap {
  margin-top: 16px;
  margin-bottom: 20px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-body);
  outline: none;
  transition:
    border-color var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
  box-sizing: border-box;
  resize: none;
  line-height: 1.5;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.form-input::placeholder {
  color: var(--color-text-tertiary);
}

.modal-footer {
  padding: 12px 24px 24px 24px;
  display: flex;
  flex-direction: row-reverse;
  gap: 8px;
  flex-shrink: 0;
}

.save-btn {
  padding: 0 24px;
  height: 40px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    box-shadow var(--transition-smooth),
    transform var(--transition-spring-soft);
  box-shadow: var(--shadow-xs);
  letter-spacing: 0.5px;
}

.save-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.save-btn:active {
  background: var(--color-primary-darker);
  box-shadow: var(--shadow-xs);
  transform: scale(0.97);
}

.cancel-btn {
  padding: 0 24px;
  height: 40px;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    background var(--transition-smooth),
    transform var(--transition-spring-soft);
  letter-spacing: 0.5px;
}

.cancel-btn:hover {
  background: var(--color-primary-lighter);
}

@media (min-width: 768px) {
  .modal-container {
    position: relative;
    bottom: auto;
    left: auto;
    right: auto;
    top: auto;
    width: 512px;
    max-height: 85vh;
    border-radius: var(--radius-lg);
    animation: scaleInSpring var(--duration-moderate) var(--ease-spring-soft);
    transform-origin: center center;
  }

  @keyframes scaleInSpring {
    from {
      transform: scale(0.9) translateY(12px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .drag-handle {
    display: none;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-out-quart);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition:
    transform var(--duration-moderate) var(--ease-spring-soft),
    opacity var(--duration-normal) var(--ease-out-quart);
}

.slide-up-leave-active {
  transition:
    transform var(--duration-fast) var(--ease-standard),
    opacity var(--duration-fast) var(--ease-standard);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%) scale(0.96);
  opacity: 0;
}

@media (min-width: 768px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: scale(0.9) translateY(12px);
    opacity: 0;
  }
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.add-tag-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background var(--transition-micro),
    color var(--transition-micro);
}

.add-tag-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.tag-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    color var(--transition-smooth),
    transform var(--transition-spring-soft);
}

.tag-pill:hover {
  border-color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  transform: translateY(-1px);
}

.tag-pill.active {
  background: var(--color-primary-lighter);
  border-color: var(--color-primary-lighter);
  color: var(--color-primary-dark);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-check {
  flex-shrink: 0;
}

.add-tag-wrap {
  margin-top: 8px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.color-picker-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    transform var(--transition-spring-soft),
    border-color var(--transition-smooth);
  padding: 0;
  flex-shrink: 0;
}

.color-option:hover {
  transform: scale(1.15);
}

.color-option:active {
  transform: scale(0.92);
}

.color-option.active {
  border-color: var(--color-text-primary);
}

.add-tag-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tag-name-input {
  flex: 1;
  padding: 8px 12px;
  font-size: var(--font-size-sm);
}

.add-tag-confirm-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-micro);
  flex-shrink: 0;
}

.add-tag-confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.add-tag-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.repeat-row {
  padding-top: 8px;
}

.repeat-select {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.repeat-select:hover {
  background: var(--color-border-light);
}

.repeat-select:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.weekdays-wrap {
  padding: 0;
}

.weekdays-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.weekdays-row {
  display: flex;
  gap: 6px;
}

.weekday-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-micro);
  flex-shrink: 0;
}

.weekday-btn:hover {
  border-color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
}

.weekday-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.repeat-settings {
  padding: 4px 0 12px 36px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-setting {
  padding: 0 !important;
  min-height: 36px;
}

.sub-setting-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.interval-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.interval-input {
  width: 60px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  outline: none;
  text-align: center;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.interval-input:hover {
  background: var(--color-border-light);
}

.interval-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.interval-unit {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 16px;
}

.repeat-end-select {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.repeat-end-select:hover {
  background: var(--color-border-light);
}

.repeat-end-select:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.repeat-end-date-input {
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid transparent;
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  outline: none;
  transition:
    border-color var(--transition-smooth),
    background var(--transition-smooth),
    box-shadow var(--transition-spring-soft);
}

.repeat-end-date-input:hover {
  background: var(--color-border-light);
}

.repeat-end-date-input:focus {
  border-color: var(--color-primary);
  background: var(--color-surface);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.subtasks-wrap {
  margin-top: 8px;
  margin-bottom: 4px;
}

.progress-text {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-micro);
}

.subtask-item:hover {
  background: var(--color-bg-secondary);
}

.subtask-checkbox {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--color-border);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--transition-micro);
  padding: 0;
  color: white;
}

.subtask-checkbox:hover {
  border-color: var(--color-primary);
}

.subtask-checkbox.checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.subtask-title {
  flex: 1;
  font-size: var(--font-size-body);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  line-height: 1.4;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtask-title.completed {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.subtask-delete {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-micro);
  flex-shrink: 0;
  opacity: 0;
}

.subtask-item:hover .subtask-delete {
  opacity: 1;
}

.subtask-delete:hover {
  background: var(--color-error-lighter);
  color: var(--color-error);
}

.add-subtask-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.subtask-input {
  flex: 1;
  padding: 8px 12px;
  font-size: var(--font-size-sm);
}

.add-subtask-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-micro);
  flex-shrink: 0;
}

.add-subtask-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.add-subtask-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .modal-container {
    max-height: 92vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .modal-header {
    padding: 8px 20px 0 20px;
    min-height: 56px;
  }

  .modal-header h2 {
    font-size: var(--font-size-xl);
  }

  .close-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .modal-body {
    padding: 0 20px 20px;
  }

  .title-input-wrap {
    margin-top: 12px;
    margin-bottom: 16px;
  }

  .form-title-input {
    font-size: var(--font-size-lg);
    min-height: 52px;
    padding: 14px 52px 14px 16px;
  }

  .mic-btn {
    width: 44px;
    height: 44px;
    right: 8px;
  }

  .category-pill {
    min-height: 40px;
    padding: 8px 14px;
    font-size: var(--font-size-body);
  }

  .setting-row {
    gap: 12px;
    padding: 14px 0;
    min-height: 56px;
  }

  .row-icon {
    width: 22px;
    height: 22px;
  }

  .setting-label {
    font-size: var(--font-size-base);
  }

  .toggle-desc {
    font-size: var(--font-size-xs);
  }

  .date-input {
    font-size: var(--font-size-lg);
    min-height: 44px;
    padding: 10px 14px;
  }

  .toggle-switch {
    width: 52px;
    height: 32px;
    min-width: 52px;
  }

  .toggle-knob {
    width: 26px;
    height: 26px;
    top: 3px;
    left: 3px;
  }

  .toggle-switch[aria-checked='true'] .toggle-knob {
    right: 3px;
    left: auto;
  }

  .form-input {
    font-size: var(--font-size-lg);
    min-height: 48px;
    padding: 14px 16px;
  }

  .tag-pill {
    min-height: 36px;
    padding: 8px 12px;
    font-size: var(--font-size-sm);
  }

  .add-tag-btn {
    width: 36px;
    height: 36px;
    min-width: 36px;
  }

  .color-option {
    width: 36px;
    height: 36px;
  }

  .tag-name-input {
    font-size: var(--font-size-base);
    min-height: 44px;
    padding: 10px 12px;
  }

  .add-tag-confirm-btn {
    width: 44px;
    height: 44px;
  }

  .repeat-select {
    font-size: var(--font-size-base);
    min-height: 44px;
    padding: 10px 32px 10px 14px;
  }

  .sub-setting {
    min-height: 48px;
  }

  .sub-setting-label {
    font-size: var(--font-size-body);
  }

  .weekday-btn {
    width: 40px;
    height: 40px;
    font-size: var(--font-size-sm);
  }

  .interval-input {
    font-size: var(--font-size-lg);
    min-height: 40px;
    width: 64px;
  }

  .interval-unit {
    font-size: var(--font-size-body);
  }

  .repeat-end-select {
    font-size: var(--font-size-base);
    min-height: 40px;
    padding: 8px 28px 8px 12px;
  }

  .repeat-end-date-input {
    font-size: var(--font-size-base);
    min-height: 40px;
    padding: 8px 10px;
  }

  .subtask-item {
    min-height: 52px;
    padding: 10px 4px;
    gap: 12px;
  }

  .subtask-checkbox {
    width: 24px;
    height: 24px;
    min-width: 24px;
  }

  .subtask-title {
    font-size: var(--font-size-base);
  }

  .subtask-delete {
    width: 40px;
    height: 40px;
    opacity: 1;
  }

  .subtask-input {
    font-size: var(--font-size-base);
    min-height: 44px;
    padding: 10px 12px;
  }

  .add-subtask-btn {
    width: 44px;
    height: 44px;
  }

  .modal-footer {
    padding: 12px 20px 24px 20px;
    flex-direction: column-reverse;
    gap: 10px;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
    height: 48px;
    font-size: var(--font-size-base);
    border-radius: var(--radius-lg);
  }

  .progress-text {
    font-size: var(--font-size-sm);
  }

  .form-section-label {
    font-size: var(--font-size-sm);
    margin: 14px 0 8px 0;
  }

  .form-divider {
    margin: 0 -20px;
  }

  .notes-wrap {
    margin-top: 12px;
    margin-bottom: 16px;
  }

  .repeat-settings {
    padding: 4px 0 12px 34px;
    gap: 10px;
  }

  .weekdays-row {
    gap: 6px;
    flex-wrap: wrap;
  }
}
</style>
