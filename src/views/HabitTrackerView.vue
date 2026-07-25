<template>
  <div class="habit-tracker-view">
    <div class="tracker-header">
      <div class="header-content">
        <h1>{{ $t('habitTracker.title') }}</h1>
        <p class="header-subtitle">{{ $t('habitTracker.subtitle') }}</p>
      </div>
      <button class="add-habit-btn" @click="showAddHabitModal = true">
        <Plus :size="20" />
        {{ $t('habitTracker.addHabit') }}
      </button>
    </div>

    <div class="habits-grid">
      <div v-for="habit in habits" :key="habit.id" class="habit-card">
        <div class="habit-header">
          <div class="habit-icon" :style="{ background: habit.color }">
            <component :is="getIcon(habit.icon)" :size="20" />
          </div>
          <div class="habit-info">
            <h3 class="habit-name">{{ habit.name }}</h3>
            <p class="habit-streak">
              <Flame :size="14" />
              {{ getCurrentStreak(habit) }} {{ $t('habitTracker.days') }}
            </p>
          </div>
          <button class="menu-btn" @click="toggleMenu(habit.id)">
            <MoreVertical :size="18" />
          </button>
          <div v-if="openMenuId === habit.id" class="habit-menu">
            <button @click="editHabit(habit)">
              <Edit2 :size="14" />
              {{ $t('common.edit') }}
            </button>
            <button @click="deleteHabit(habit)" class="danger">
              <Trash2 :size="14" />
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>

        <div class="habit-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{
                width: `${getCompletionRate(habit)}%`,
                background: habit.color
              }"
            ></div>
          </div>
          <div class="progress-text">
            {{ getCompletedDays(habit) }}/{{ habit.targetDays }} {{ $t('habitTracker.days') }}
          </div>
        </div>

        <div class="habit-calendar">
          <div
            v-for="day in getLast30Days()"
            :key="day"
            class="calendar-day"
            :class="{
              completed: isCompletedOn(habit, day),
              today: isToday(day)
            }"
            @click="toggleCompletion(habit, day)"
          >
            <div class="day-marker"></div>
          </div>
        </div>

        <button
          class="checkin-btn"
          :class="{ completed: isCompletedToday(habit) }"
          @click="toggleTodayCompletion(habit)"
        >
          <Check :size="18" v-if="isCompletedToday(habit)" />
          <Circle :size="18" v-else />
          {{ isCompletedToday(habit) ? $t('habitTracker.checkedIn') : $t('habitTracker.checkIn') }}
        </button>
      </div>

      <div v-if="habits.length === 0" class="empty-state">
        <div class="empty-icon">
          <Target :size="64" />
        </div>
        <h3>{{ $t('habitTracker.noHabits') }}</h3>
        <p>{{ $t('habitTracker.noHabitsDesc') }}</p>
        <button class="add-first-btn" @click="showAddHabitModal = true">
          <Plus :size="18" />
          {{ $t('habitTracker.addFirstHabit') }}
        </button>
      </div>
    </div>

    <!-- 添加/编辑习惯模态框 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showAddHabitModal" class="modal-overlay" @click="closeModal">
          <div class="modal-container" @click.stop>
            <div class="modal-header">
              <h2>
                {{ editingHabit ? $t('habitTracker.editHabit') : $t('habitTracker.newHabit') }}
              </h2>
              <button class="close-btn" @click="closeModal">
                <X :size="20" />
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>{{ $t('habitTracker.habitName') }}</label>
                <input
                  v-model="habitForm.name"
                  type="text"
                  :placeholder="$t('habitTracker.habitNamePlaceholder')"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label>{{ $t('habitTracker.icon') }}</label>
                <div class="icon-selector">
                  <button
                    v-for="icon in availableIcons"
                    :key="icon.name"
                    class="icon-option"
                    :class="{ active: habitForm.icon === icon.name }"
                    @click="habitForm.icon = icon.name"
                  >
                    <component :is="icon.component" :size="20" />
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>{{ $t('habitTracker.color') }}</label>
                <div class="color-selector">
                  <button
                    v-for="color in availableColors"
                    :key="color"
                    class="color-option"
                    :style="{ background: color }"
                    :class="{ active: habitForm.color === color }"
                    @click="habitForm.color = color"
                  ></button>
                </div>
              </div>

              <div class="form-group">
                <label>{{ $t('habitTracker.targetDays') }}</label>
                <input
                  v-model.number="habitForm.targetDays"
                  type="number"
                  min="1"
                  max="365"
                  class="form-input"
                />
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn secondary" @click="closeModal">
                {{ $t('common.cancel') }}
              </button>
              <button class="btn primary" @click="saveHabit">
                {{ $t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Plus,
  Check,
  Circle,
  Flame,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Target,
  Heart,
  BookOpen,
  Dumbbell,
  Coffee,
  Moon,
  Sun,
  Droplet,
  Apple,
  Music,
  PenTool
} from '@lucide/vue'

const { t } = useI18n()

const habits = ref([])
const showAddHabitModal = ref(false)
const editingHabit = ref(null)
const openMenuId = ref(null)

const habitForm = ref({
  name: '',
  icon: 'heart',
  color: '#4A90D9',
  targetDays: 30
})

const availableIcons = [
  { name: 'heart', component: Heart },
  { name: 'book', component: BookOpen },
  { name: 'dumbbell', component: Dumbbell },
  { name: 'coffee', component: Coffee },
  { name: 'moon', component: Moon },
  { name: 'sun', component: Sun },
  { name: 'droplet', component: Droplet },
  { name: 'apple', component: Apple },
  { name: 'music', component: Music },
  { name: 'pen', component: PenTool }
]

const availableColors = [
  '#4A90D9',
  '#EF4444',
  '#F97316',
  '#22C55E',
  '#06B6D4',
  '#14B8A6',
  '#A855F7',
  '#EC4899'
]

const getIcon = (iconName) => {
  const icon = availableIcons.find((i) => i.name === iconName)
  return icon ? icon.component : Heart
}

const getLast30Days = () => {
  const days = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }
  return days
}

const isToday = (dateStr) => {
  return dateStr === new Date().toISOString().split('T')[0]
}

const isCompletedOn = (habit, dateStr) => {
  return habit.completions && habit.completions.includes(dateStr)
}

const isCompletedToday = (habit) => {
  const today = new Date().toISOString().split('T')[0]
  return isCompletedOn(habit, today)
}

const getCompletedDays = (habit) => {
  return habit.completions ? habit.completions.length : 0
}

const getCompletionRate = (habit) => {
  const completed = getCompletedDays(habit)
  return Math.min(100, Math.round((completed / habit.targetDays) * 100))
}

const getCurrentStreak = (habit) => {
  if (!habit.completions || habit.completions.length === 0) return 0

  const sorted = [...habit.completions].sort().reverse()
  const today = new Date().toISOString().split('T')[0]

  if (sorted[0] !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (sorted[0] !== yesterday.toISOString().split('T')[0]) {
      return 0
    }
  }

  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i - 1])
    const prev = new Date(sorted[i])
    const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

const toggleTodayCompletion = (habit) => {
  const today = new Date().toISOString().split('T')[0]
  toggleCompletion(habit, today)
}

const toggleCompletion = (habit, dateStr) => {
  if (!habit.completions) {
    habit.completions = []
  }

  const index = habit.completions.indexOf(dateStr)
  if (index >= 0) {
    habit.completions.splice(index, 1)
  } else {
    habit.completions.push(dateStr)
  }

  saveHabits()
}

const toggleMenu = (habitId) => {
  openMenuId.value = openMenuId.value === habitId ? null : habitId
}

const editHabit = (habit) => {
  editingHabit.value = habit
  habitForm.value = {
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    targetDays: habit.targetDays
  }
  showAddHabitModal.value = true
  openMenuId.value = null
}

const deleteHabit = (habit) => {
  if (confirm(t('habitTracker.deleteConfirm'))) {
    habits.value = habits.value.filter((h) => h.id !== habit.id)
    saveHabits()
    openMenuId.value = null
  }
}

const saveHabit = () => {
  if (!habitForm.value.name.trim()) {
    alert(t('habitTracker.pleaseEnterName'))
    return
  }

  if (editingHabit.value) {
    Object.assign(editingHabit.value, habitForm.value)
  } else {
    habits.value.push({
      id: Date.now().toString(),
      ...habitForm.value,
      completions: []
    })
  }

  saveHabits()
  closeModal()
}

const closeModal = () => {
  showAddHabitModal.value = false
  editingHabit.value = null
  habitForm.value = {
    name: '',
    icon: 'heart',
    color: '#4A90D9',
    targetDays: 30
  }
}

const saveHabits = () => {
  localStorage.setItem('choyeon_habits', JSON.stringify(habits.value))
}

const loadHabits = () => {
  const saved = localStorage.getItem('choyeon_habits')
  if (saved) {
    try {
      habits.value = JSON.parse(saved)
    } catch (e) {
      console.error('Failed to load habits:', e)
    }
  }
}

loadHabits()
</script>

<style scoped>
.habit-tracker-view {
  min-height: 100vh;
  background: var(--color-bg-primary);
  padding: 24px;
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-content h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
}

.header-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0;
}

.add-habit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-habit-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.habit-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.habit-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.habit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  position: relative;
}

.habit-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.habit-info {
  flex: 1;
}

.habit-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
}

.habit-streak {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
}

.menu-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.habit-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 120px;
}

.habit-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.habit-menu button:hover {
  background: var(--color-bg-secondary);
}

.habit-menu button.danger {
  color: var(--color-danger);
}

.habit-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.habit-calendar {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}

.calendar-day {
  aspect-ratio: 1;
  background: var(--color-bg-secondary);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.calendar-day:hover {
  transform: scale(1.1);
}

.calendar-day.completed .day-marker {
  position: absolute;
  inset: 0;
  background: var(--color-primary);
  border-radius: 3px;
  opacity: 0.8;
}

.calendar-day.today {
  border: 2px solid var(--color-primary);
}

.checkin-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.checkin-btn:hover {
  background: var(--color-bg-tertiary);
}

.checkin-btn.completed {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.empty-state {
  grid-column: 1 / -1;
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
  margin: 0 0 24px 0;
}

.add-first-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-first-btn:hover {
  background: var(--color-primary-dark);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
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

.modal-container {
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
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

.modal-body {
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

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: var(--color-bg-primary);
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.icon-option {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--color-text-primary);
}

.icon-option:hover {
  background: var(--color-bg-tertiary);
}

.icon-option.active {
  border-color: var(--color-primary);
  background: var(--color-primary-lightest);
}

.color-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 2px var(--color-bg-primary);
}

.modal-footer {
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

@media (max-width: 768px) {
  .habit-tracker-view {
    padding: 16px;
  }

  .habits-grid {
    grid-template-columns: 1fr;
  }

  .header-content h1 {
    font-size: 24px;
  }
}
</style>
