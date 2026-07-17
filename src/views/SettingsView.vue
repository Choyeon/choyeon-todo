<template>
  <div class="settings-view">
    <div class="content-inner">
      <div class="content-header">
        <h1>设置</h1>
        <p class="header-subtitle">个性化你的任务体验</p>
      </div>

      <div class="settings-card">
        <div class="settings-section-header">
          <div class="settings-section-icon icon-primary-tint">
            <Palette :size="18" />
          </div>
          <h3 class="settings-section-title">外观</h3>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-primary-tint">
            <component :is="settingsStore.isDark ? Moon : Sun" :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">主题模式</span>
            <p class="setting-desc">选择浅色、深色或跟随系统</p>
          </div>
        </div>

        <div class="segmented-control">
          <button
            class="segment-btn"
            :class="{ active: settingsStore.themeMode === 'light' }"
            @click="setThemeMode('light')"
            aria-label="浅色模式"
          >
            <Sun :size="16" />
            <span>浅色</span>
          </button>
          <button
            class="segment-btn"
            :class="{ active: settingsStore.themeMode === 'dark' }"
            @click="setThemeMode('dark')"
            aria-label="深色模式"
          >
            <Moon :size="16" />
            <span>深色</span>
          </button>
          <button
            class="segment-btn"
            :class="{ active: settingsStore.themeMode === 'system' }"
            @click="setThemeMode('system')"
            aria-label="跟随系统"
          >
            <Monitor :size="16" />
            <span>系统</span>
          </button>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-blue">
            <Type :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">字体大小</span>
            <p class="setting-desc">调整界面文字大小</p>
          </div>
        </div>

        <div class="segmented-control">
          <button
            class="segment-btn"
            :class="{ active: settingsStore.fontSize === 'small' }"
            @click="setFontSize('small')"
            aria-label="小字体"
          >
            <span>小</span>
          </button>
          <button
            class="segment-btn"
            :class="{ active: settingsStore.fontSize === 'medium' }"
            @click="setFontSize('medium')"
            aria-label="中字体"
          >
            <span>中</span>
          </button>
          <button
            class="segment-btn"
            :class="{ active: settingsStore.fontSize === 'large' }"
            @click="setFontSize('large')"
            aria-label="大字体"
          >
            <span>大</span>
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-icon-wrap icon-orange">
            <PanelLeft :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">侧边栏折叠</span>
            <p class="setting-desc">折叠侧边栏以获得更多空间</p>
          </div>
          <button
            class="toggle-switch"
            role="switch"
            :aria-checked="settingsStore.sidebarCollapsed"
            @click.stop="toggleSidebar"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-icon-wrap icon-cyan">
            <Layers :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">毛玻璃效果</span>
            <p class="setting-desc">启用半透明亚克力风格界面</p>
          </div>
          <button
            class="toggle-switch"
            role="switch"
            :aria-checked="settingsStore.glassEffectEnabled"
            aria-label="毛玻璃效果开关"
            @click.stop="toggleGlassEffect"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="color-picker-row">
          <div class="setting-icon-wrap icon-primary-tint">
            <Palette :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">主题色</span>
            <p class="setting-desc">选择你喜欢的主题颜色</p>
          </div>
        </div>

        <div class="color-options">
          <button
            v-for="color in settingsStore.themeColors"
            :key="color.value"
            class="color-option"
            :class="{ active: settingsStore.primaryColor === color.value }"
            :style="{ background: color.value }"
            :title="color.name"
            :aria-label="`主题色 ${color.name}`"
            @click="setThemeColor(color.value)"
          >
            <Check v-if="settingsStore.primaryColor === color.value" :size="16" />
          </button>
        </div>
      </div>

      <div class="settings-card">
        <div class="category-header">
          <div class="settings-section-header">
            <div class="settings-section-icon icon-orange">
              <FolderTree :size="18" />
            </div>
            <h3 class="settings-section-title">分类管理</h3>
          </div>
          <button
            v-if="selectedCategories.length > 0"
            class="batch-delete-btn"
            @click="handleBatchDelete"
          >
            <Trash2 :size="14" />
            删除选中 ({{ selectedCategories.length }})
          </button>
        </div>

        <div class="category-list">
          <div
            v-for="cat in taskStore.categories"
            :key="cat.id"
            class="category-item"
          >
            <label class="category-checkbox" v-if="cat.id !== 'other'">
              <input
                type="checkbox"
                :checked="selectedCategories.includes(cat.id)"
                @change="toggleSelectCategory(cat.id)"
              />
              <span class="checkmark"></span>
            </label>
            <span class="category-dot" :style="{ background: cat.color }"></span>
            <span class="category-name">{{ cat.name }}</span>
            <span class="category-count">{{ taskStore.getCategoryCount(cat.id) }}</span>
            <div class="category-actions" v-if="cat.id !== 'other'">
              <button class="cat-action-btn" @click="startEditCategory(cat)" title="编辑" aria-label="编辑分类">
                <Pencil :size="14" />
              </button>
              <button class="cat-action-btn delete" @click="handleDeleteCategory(cat)" title="删除" aria-label="删除分类">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>

        <button class="add-category-btn" @click="openAddCategory">
          <Plus :size="18" />
          添加新分类
        </button>
      </div>

      <div class="settings-card">
        <div class="settings-section-header">
          <div class="settings-section-icon icon-red">
            <Timer :size="18" />
          </div>
          <h3 class="settings-section-title">番茄钟</h3>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-red">
            <Timer :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">专注时长</span>
            <p class="setting-desc">每个番茄钟的工作时间（分钟）</p>
          </div>
          <div class="number-input-wrap">
            <input
              type="number"
              class="number-input"
              :value="settingsStore.pomodoroWorkMinutes"
              min="1"
              max="180"
              @change="onPomodoroWorkChange"
              aria-label="专注时长"
            />
          </div>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-green">
            <Coffee :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">短休息时长</span>
            <p class="setting-desc">每个番茄钟后的短休息（分钟）</p>
          </div>
          <div class="number-input-wrap">
            <input
              type="number"
              class="number-input"
              :value="settingsStore.pomodoroBreakMinutes"
              min="1"
              max="60"
              @change="onPomodoroBreakChange"
              aria-label="短休息时长"
            />
          </div>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-blue">
            <Sofa :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">长休息时长</span>
            <p class="setting-desc">长休息的持续时间（分钟）</p>
          </div>
          <div class="number-input-wrap">
            <input
              type="number"
              class="number-input"
              :value="settingsStore.pomodoroLongBreakMinutes"
              min="1"
              max="120"
              @change="onPomodoroLongBreakChange"
              aria-label="长休息时长"
            />
          </div>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-purple">
            <Repeat :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">长休息间隔</span>
            <p class="setting-desc">多少个番茄钟后进行长休息</p>
          </div>
          <div class="number-input-wrap">
            <input
              type="number"
              class="number-input"
              :value="settingsStore.pomodoroSessionsBeforeLongBreak"
              min="1"
              max="12"
              @change="onPomodoroSessionsChange"
              aria-label="长休息间隔"
            />
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-section-header">
          <div class="settings-section-icon icon-blue">
            <Bell :size="18" />
          </div>
          <h3 class="settings-section-title">通知</h3>
        </div>

        <div class="setting-row">
          <div class="setting-icon-wrap icon-blue">
            <Bell :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">通知提醒</span>
            <p class="setting-desc">任务到期时发送系统通知</p>
          </div>
          <button
            class="toggle-switch"
            role="switch"
            :aria-checked="settingsStore.notificationsEnabled"
            aria-label="通知提醒开关"
            @click.stop="toggleNotifications"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="setting-row">
          <div class="setting-icon-wrap icon-purple">
            <Moon :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">免打扰模式</span>
            <p class="setting-desc">开启后暂停所有通知提醒</p>
          </div>
          <button
            class="toggle-switch"
            role="switch"
            :aria-checked="settingsStore.doNotDisturb"
            aria-label="免打扰模式开关"
            @click.stop="toggleDoNotDisturb"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="setting-row no-hover">
          <div class="setting-icon-wrap icon-orange">
            <Clock :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">默认提醒时间</span>
            <p class="setting-desc">任务到期前多少分钟提醒</p>
          </div>
          <select
            class="reminder-select"
            :value="settingsStore.defaultReminderTime"
            aria-label="默认提醒时间"
            @change="onReminderTimeChange"
          >
            <option :value="5">5 分钟</option>
            <option :value="10">10 分钟</option>
            <option :value="15">15 分钟</option>
            <option :value="30">30 分钟</option>
            <option :value="60">1 小时</option>
            <option :value="1440">1 天</option>
          </select>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-section-header">
          <div class="settings-section-icon icon-green">
            <Power :size="18" />
          </div>
          <h3 class="settings-section-title">系统</h3>
        </div>

        <div class="setting-row" v-if="isElectron">
          <div class="setting-icon-wrap icon-green">
            <Power :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">开机自启</span>
            <p class="setting-desc">系统启动时自动打开应用</p>
          </div>
          <button
            class="toggle-switch"
            role="switch"
            :aria-checked="settingsStore.autoStart"
            aria-label="开机自启开关"
            @click.stop="toggleAutoStart"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>

        <div class="setting-row" v-if="isElectron">
          <div class="setting-icon-wrap icon-slate">
            <X :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">关闭窗口即退出</span>
            <p class="setting-desc">关闭窗口时直接退出应用</p>
          </div>
          <button
            class="toggle-switch"
            role="switch"
            :aria-checked="settingsStore.closeToQuit"
            aria-label="关闭窗口即退出开关"
            @click.stop="toggleCloseToQuit"
          >
            <span class="toggle-knob"></span>
          </button>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-section-header">
          <div class="settings-section-icon icon-purple">
            <Keyboard :size="18" />
          </div>
          <h3 class="settings-section-title">快捷键</h3>
        </div>

        <div class="shortcut-item">
          <div class="shortcut-info">
            <Keyboard :size="18" class="shortcut-icon" />
            <span class="shortcut-label">新建任务</span>
          </div>
          <div class="shortcut-keys">
            <kbd class="kbd">Ctrl</kbd>
            <span class="kbd-plus">+</span>
            <kbd class="kbd">N</kbd>
          </div>
        </div>

        <div class="shortcut-item">
          <div class="shortcut-info">
            <Search :size="18" class="shortcut-icon" />
            <span class="shortcut-label">搜索</span>
          </div>
          <div class="shortcut-keys">
            <kbd class="kbd">Ctrl</kbd>
            <span class="kbd-plus">+</span>
            <kbd class="kbd">K</kbd>
          </div>
        </div>

        <div class="shortcut-item">
          <div class="shortcut-info">
            <ArrowUpDown :size="18" class="shortcut-icon" />
            <span class="shortcut-label">上下移动</span>
          </div>
          <div class="shortcut-keys">
            <kbd class="kbd">J</kbd>
            <span class="kbd-slash">/</span>
            <kbd class="kbd">K</kbd>
          </div>
        </div>

        <div class="shortcut-item">
          <div class="shortcut-info">
            <CheckCircle :size="18" class="shortcut-icon" />
            <span class="shortcut-label">完成任务</span>
          </div>
          <div class="shortcut-keys">
            <kbd class="kbd">Space</kbd>
          </div>
        </div>

        <div class="shortcut-item">
          <div class="shortcut-info">
            <Star :size="18" class="shortcut-icon" />
            <span class="shortcut-label">标记重要</span>
          </div>
          <div class="shortcut-keys">
            <kbd class="kbd">I</kbd>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-section-header">
          <div class="settings-section-icon icon-slate">
            <Database :size="18" />
          </div>
          <h3 class="settings-section-title">数据</h3>
        </div>

        <div class="setting-row" @click="exportData">
          <div class="setting-icon-wrap icon-green">
            <Download :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">导出数据</span>
            <p class="setting-desc">将任务数据导出为JSON文件</p>
          </div>
          <ChevronRight :size="20" class="chevron" />
        </div>

        <div class="setting-row" @click="importData">
          <div class="setting-icon-wrap icon-blue">
            <Upload :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">导入数据</span>
            <p class="setting-desc">从JSON文件导入任务数据</p>
          </div>
          <ChevronRight :size="20" class="chevron" />
        </div>

        <div class="setting-row" @click="showResetDataModal = true">
          <div class="setting-icon-wrap icon-amber">
            <RefreshCw :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">恢复默认数据</span>
            <p class="setting-desc">清除当前数据并恢复默认示例数据</p>
          </div>
          <ChevronRight :size="20" class="chevron" />
        </div>

        <div class="setting-row danger" @click="showClearDataModal = true">
          <div class="setting-icon-wrap icon-red">
            <AlertTriangle :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">清除所有数据</span>
            <p class="setting-desc">删除所有任务和设置数据</p>
          </div>
          <ChevronRight :size="20" class="chevron" />
        </div>

        <div class="setting-row" @click="testNotification">
          <div class="setting-icon-wrap icon-blue">
            <Bell :size="20" />
          </div>
          <div class="setting-label-wrap">
            <span class="setting-label">测试通知</span>
            <p class="setting-desc">发送一条测试Windows通知</p>
          </div>
          <ChevronRight :size="20" class="chevron" />
        </div>
      </div>

      <div class="settings-card version-card" @click="handleVersionClick">
        <div class="version-info">
          <div class="version-logo">
            <svg width="28" height="28" viewBox="0 0 512 512">
              <rect width="512" height="512" rx="112" fill="#4C8BF5"/>
              <text x="256" y="320" font-family="'Segoe UI',Arial,sans-serif" font-size="200" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-4">ToDo</text>
            </svg>
          </div>
          <p class="version-title">Choyeon To Do</p>
          <p class="version-desc">版本 1.0.0</p>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCategoryModal" class="modal-backdrop" @click.self="closeCategoryModal">
          <Transition name="slide-up">
            <div v-if="showCategoryModal" class="category-modal" @keydown.esc="closeCategoryModal">
              <h3 class="modal-title">{{ editingCategory ? '编辑分类' : '添加新分类' }}</h3>
              <input
                type="text"
                class="form-input"
                placeholder="分类名称"
                v-model="categoryForm.name"
                ref="categoryNameInput"
                aria-label="分类名称"
                @keyup.enter="saveCategory"
              />
              <div class="modal-colors-label">选择颜色</div>
              <div class="modal-colors">
                <button
                  v-for="color in settingsStore.themeColors"
                  :key="color.value"
                  class="color-option small"
                  :class="{ active: categoryForm.color === color.value }"
                  :style="{ background: color.value }"
                  :title="color.name"
                  :aria-label="`分类颜色 ${color.name}`"
                  @click="categoryForm.color = color.value"
                >
                  <Check v-if="categoryForm.color === color.value" :size="12" />
                </button>
              </div>
              <div class="modal-actions">
                <button class="cancel-btn" @click="closeCategoryModal">取消</button>
                <button class="save-btn" @click="saveCategory">{{ editingCategory ? '保存' : '添加' }}</button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDeleteModal" class="modal-backdrop" @click.self="closeDeleteModal">
          <Transition name="slide-up">
            <div v-if="showDeleteModal" class="category-modal delete-modal" @keydown.esc="closeDeleteModal">
              <div class="delete-icon">
                <AlertTriangle :size="32" />
              </div>
              <h3 class="modal-title">确认删除</h3>
              <p class="delete-desc">
                {{ deleteModalMessage }}
              </p>
              <div class="delete-options">
                <button class="delete-option-btn move" @click="confirmDeleteWithMove">
                  <ArrowRight :size="16" />
                  移动到默认分类
                </button>
                <button class="delete-option-btn delete" @click="confirmDeleteWithRemove">
                  <Trash2 :size="16" />
                  删除待办事项
                </button>
              </div>
              <button class="cancel-btn full-width" @click="closeDeleteModal">取消</button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showClearDataModal" class="modal-backdrop" @click.self="showClearDataModal = false">
          <Transition name="slide-up">
            <div v-if="showClearDataModal" class="category-modal delete-modal" @keydown.esc="showClearDataModal = false">
              <div class="delete-icon">
                <AlertTriangle :size="32" />
              </div>
              <h3 class="modal-title">确认清除所有数据</h3>
              <p class="delete-desc">
                所有任务、分类和设置将被删除。此操作不可撤销，清除后页面将重新加载。
              </p>
              <div class="delete-options">
                <button class="delete-option-btn delete" @click="confirmClearAllData">
                  <Trash2 :size="16" />
                  确认清除
                </button>
              </div>
              <button class="cancel-btn full-width" @click="showClearDataModal = false">取消</button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showResetDataModal" class="modal-backdrop" @click.self="showResetDataModal = false">
          <Transition name="slide-up">
            <div v-if="showResetDataModal" class="category-modal delete-modal" @keydown.esc="showResetDataModal = false">
              <div class="delete-icon" style="background: rgba(245, 158, 11, 0.12); color: #F59E0B;">
                <RefreshCw :size="32" />
              </div>
              <h3 class="modal-title">确认恢复默认数据</h3>
              <p class="delete-desc">
                所有当前任务和设置将被清除，并恢复为默认示例数据。此操作不可撤销。
              </p>
              <div class="delete-options">
                <button class="delete-option-btn" style="background: rgba(245, 158, 11, 0.12); color: #D97706;" @click="confirmResetData">
                  <RefreshCw :size="16" />
                  确认恢复
                </button>
              </div>
              <button class="cancel-btn full-width" @click="showResetDataModal = false">取消</button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted, onUnmounted, inject } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useTaskStore } from '../stores/taskStore'
import { useSnackbar } from '../composables/useSnackbar'
import {
  Sun, Moon, Palette, Plus, Download, Upload, AlertTriangle,
  Check, ChevronRight, Pencil, Trash2, ArrowRight, Bell,
  Clock, Power, X, Monitor, Type, PanelLeft,
  Timer, Coffee, Sofa, Repeat, Keyboard, Search, ArrowUpDown,
  CheckCircle, Star, RefreshCw, FolderTree, Database, Layers
} from '@lucide/vue'

const settingsStore = useSettingsStore()
const taskStore = useTaskStore()
const { show: showSnackbar } = useSnackbar()
const triggerThemeTransition = inject('triggerThemeTransition')

const isElectron = typeof window !== 'undefined' && !!window.electronAPI

// Debug触发：2秒内点击版本号5次
let versionClickCount = 0
let versionClickTimer = null
const handleVersionClick = () => {
  versionClickCount++
  if (versionClickTimer) clearTimeout(versionClickTimer)
  versionClickTimer = setTimeout(() => {
    versionClickCount = 0
  }, 2000)
  if (versionClickCount >= 5) {
    versionClickCount = 0
    if (versionClickTimer) {
      clearTimeout(versionClickTimer)
      versionClickTimer = null
    }
    if (window.electronAPI?.openDebugWindow) {
      window.electronAPI.openDebugWindow()
    }
  }
}

const showCategoryModal = ref(false)
const showDeleteModal = ref(false)
const showClearDataModal = ref(false)
const showResetDataModal = ref(false)
const editingCategory = ref(null)
const categoryNameInput = ref(null)
const selectedCategories = ref([])
const deletingCategory = ref(null)
const deletingCategories = ref([])

const categoryForm = reactive({
  name: '',
  color: '#4A90D9'
})

const deleteModalMessage = computed(() => {
  if (deletingCategories.value.length > 0) {
    const totalCount = deletingCategories.value.reduce((sum, catId) => {
      return sum + taskStore.getCategoryCount(catId)
    }, 0)
    return `即将删除 ${deletingCategories.value.length} 个分类，共包含 ${totalCount} 个待办事项。这些待办事项如何处理？`
  }
  if (deletingCategory.value) {
    const count = taskStore.getCategoryCount(deletingCategory.value.id)
    return `即将删除分类 "${deletingCategory.value.name}"，该分类下有 ${count} 个待办事项。这些待办事项如何处理？`
  }
  return ''
})

const toggleTheme = (e) => {
  const targetTheme = settingsStore.themeMode === 'light' ? 'dark' : 'light'
  
  if (e && triggerThemeTransition) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    triggerThemeTransition(x, y, targetTheme)
  }
  
  settingsStore.toggleTheme()
}

const setThemeMode = (mode) => {
  settingsStore.setThemeMode(mode)
  showSnackbar('主题模式已更新')
}

const setFontSize = (size) => {
  settingsStore.setFontSize(size)
  showSnackbar('字体大小已更新')
}

const toggleSidebar = () => {
  settingsStore.toggleSidebar()
  showSnackbar(settingsStore.sidebarCollapsed ? '侧边栏已折叠' : '侧边栏已展开')
}

const toggleGlassEffect = () => {
  settingsStore.toggleGlassEffect()
  showSnackbar(settingsStore.glassEffectEnabled ? '毛玻璃效果已开启' : '毛玻璃效果已关闭')
}

const onPomodoroWorkChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 180) {
    settingsStore.pomodoroWorkMinutes = value
    showSnackbar('专注时长已更新')
  }
}

const onPomodoroBreakChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 60) {
    settingsStore.pomodoroBreakMinutes = value
    showSnackbar('短休息时长已更新')
  }
}

const onPomodoroLongBreakChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 120) {
    settingsStore.pomodoroLongBreakMinutes = value
    showSnackbar('长休息时长已更新')
  }
}

const onPomodoroSessionsChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value >= 1 && value <= 12) {
    settingsStore.pomodoroSessionsBeforeLongBreak = value
    showSnackbar('长休息间隔已更新')
  }
}

const setThemeColor = (color) => {
  settingsStore.setPrimaryColor(color)
}

const openAddCategory = () => {
  editingCategory.value = null
  categoryForm.name = ''
  categoryForm.color = '#4A90D9'
  showCategoryModal.value = true
  nextTick(() => {
    if (categoryNameInput.value) {
      categoryNameInput.value.focus()
    }
  })
}

const startEditCategory = (cat) => {
  editingCategory.value = cat
  categoryForm.name = cat.name
  categoryForm.color = cat.color
  showCategoryModal.value = true
  nextTick(() => {
    if (categoryNameInput.value) {
      categoryNameInput.value.focus()
    }
  })
}

const closeCategoryModal = () => {
  showCategoryModal.value = false
  editingCategory.value = null
}

const saveCategory = () => {
  if (!categoryForm.name.trim()) {
    showSnackbar('请输入分类名称', { duration: 3000 })
    return
  }

  if (editingCategory.value) {
    taskStore.updateCategory(editingCategory.value.id, {
      name: categoryForm.name.trim(),
      color: categoryForm.color
    })
    showSnackbar('分类已更新')
  } else {
    taskStore.addCategory({
      name: categoryForm.name.trim(),
      color: categoryForm.color
    })
    showSnackbar('分类已添加')
  }

  closeCategoryModal()
}

const toggleSelectCategory = (catId) => {
  const index = selectedCategories.value.indexOf(catId)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(catId)
  }
}

const openDeleteModal = (category) => {
  deletingCategory.value = category
  deletingCategories.value = []
  showDeleteModal.value = true
}

const openBatchDeleteModal = () => {
  deletingCategories.value = [...selectedCategories.value]
  deletingCategory.value = null
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deletingCategory.value = null
  deletingCategories.value = []
}

const confirmDeleteWithMove = () => {
  if (deletingCategory.value) {
    taskStore.deleteCategory(deletingCategory.value.id, { moveTasks: true })
    showSnackbar('分类已删除，任务已移动到默认分类')
  } else if (deletingCategories.value.length > 0) {
    deletingCategories.value.forEach(catId => {
      taskStore.deleteCategory(catId, { moveTasks: true })
    })
    selectedCategories.value = []
    showSnackbar(`${deletingCategories.value.length} 个分类已删除`)
  }
  closeDeleteModal()
}

const confirmDeleteWithRemove = () => {
  if (deletingCategory.value) {
    taskStore.deleteCategory(deletingCategory.value.id, { moveTasks: false })
    showSnackbar('分类及任务已删除')
  } else if (deletingCategories.value.length > 0) {
    deletingCategories.value.forEach(catId => {
      taskStore.deleteCategory(catId, { moveTasks: false })
    })
    selectedCategories.value = []
    showSnackbar(`${deletingCategories.value.length} 个分类及任务已删除`)
  }
  closeDeleteModal()
}

const handleDeleteCategory = (category) => {
  openDeleteModal(category)
}

const handleBatchDelete = () => {
  if (selectedCategories.value.length > 0) {
    openBatchDeleteModal()
  }
}

const exportData = () => {
  try {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: taskStore.tasks,
      categories: taskStore.categories,
      settings: {
        themeMode: settingsStore.themeMode,
        primaryColor: settingsStore.primaryColor,
        fontSize: settingsStore.fontSize,
        sidebarCollapsed: settingsStore.sidebarCollapsed,
        language: settingsStore.language,
        notificationsEnabled: settingsStore.notificationsEnabled,
        defaultReminderTime: settingsStore.defaultReminderTime,
        doNotDisturb: settingsStore.doNotDisturb,
        autoStart: settingsStore.autoStart,
        closeToQuit: settingsStore.closeToQuit,
        pomodoroWorkMinutes: settingsStore.pomodoroWorkMinutes,
        pomodoroBreakMinutes: settingsStore.pomodoroBreakMinutes,
        pomodoroLongBreakMinutes: settingsStore.pomodoroLongBreakMinutes,
        pomodoroSessionsBeforeLongBreak: settingsStore.pomodoroSessionsBeforeLongBreak
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().split('T')[0]
    a.download = `choyeon-backup-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showSnackbar('数据已导出')
  } catch (e) {
    console.error('[SettingsView] Export failed:', e)
    showSnackbar('导出失败：' + e.message, { duration: 4000 })
  }
}

const importData = () => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'

    const handleChange = (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)

          const result = taskStore.importData(JSON.stringify(data))

          if (!result.success) {
            showSnackbar('导入失败：' + result.error, { duration: 4000 })
            return
          }

          // 恢复全部设置
          if (result.settings) {
            const s = result.settings
            if (s.themeMode && ['light', 'dark', 'system'].includes(s.themeMode)) {
              settingsStore.setThemeMode(s.themeMode)
            }
            if (s.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(s.primaryColor)) {
              settingsStore.setPrimaryColor(s.primaryColor)
            }
            if (s.fontSize && ['small', 'medium', 'large'].includes(s.fontSize)) {
              settingsStore.setFontSize(s.fontSize)
            }
            if (typeof s.sidebarCollapsed === 'boolean') {
              settingsStore.sidebarCollapsed = s.sidebarCollapsed
            }
            if (s.language && typeof s.language === 'string') {
              settingsStore.language = s.language
            }
            if (typeof s.notificationsEnabled === 'boolean') {
              settingsStore.notificationsEnabled = s.notificationsEnabled
            }
            if (typeof s.defaultReminderTime === 'number' && s.defaultReminderTime > 0 && s.defaultReminderTime <= 1440) {
              settingsStore.defaultReminderTime = s.defaultReminderTime
            }
            if (typeof s.doNotDisturb === 'boolean') {
              settingsStore.doNotDisturb = s.doNotDisturb
            }
            if (typeof s.autoStart === 'boolean') {
              settingsStore.autoStart = s.autoStart
            }
            if (typeof s.closeToQuit === 'boolean') {
              settingsStore.closeToQuit = s.closeToQuit
            }
            if (typeof s.pomodoroWorkMinutes === 'number' && s.pomodoroWorkMinutes > 0 && s.pomodoroWorkMinutes <= 180) {
              settingsStore.pomodoroWorkMinutes = s.pomodoroWorkMinutes
            }
            if (typeof s.pomodoroBreakMinutes === 'number' && s.pomodoroBreakMinutes > 0 && s.pomodoroBreakMinutes <= 60) {
              settingsStore.pomodoroBreakMinutes = s.pomodoroBreakMinutes
            }
            if (typeof s.pomodoroLongBreakMinutes === 'number' && s.pomodoroLongBreakMinutes > 0 && s.pomodoroLongBreakMinutes <= 120) {
              settingsStore.pomodoroLongBreakMinutes = s.pomodoroLongBreakMinutes
            }
            if (typeof s.pomodoroSessionsBeforeLongBreak === 'number' && s.pomodoroSessionsBeforeLongBreak > 0 && s.pomodoroSessionsBeforeLongBreak <= 12) {
              settingsStore.pomodoroSessionsBeforeLongBreak = s.pomodoroSessionsBeforeLongBreak
            }
          }

          showSnackbar(`导入成功！共导入 ${result.imported} 个任务`)
        } catch (err) {
          console.error('[SettingsView] Import parse failed:', err)
          showSnackbar('导入失败：文件格式错误', { duration: 4000 })
        }
      }
      reader.onerror = () => {
        showSnackbar('导入失败：文件读取错误', { duration: 4000 })
      }
      reader.readAsText(file)

      input.removeEventListener('change', handleChange)
    }

    input.addEventListener('change', handleChange)
    input.click()
  } catch (e) {
    console.error('[SettingsView] Import failed:', e)
    showSnackbar('导入失败：' + e.message, { duration: 4000 })
  }
}

const confirmClearAllData = () => {
  showClearDataModal.value = false
  try {
    taskStore.resetAll()
    settingsStore.resetSettings()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
      // 设置标志，防止重新加载后生成样本数据
      localStorage.setItem('choyeon_skip_sample', '1')
    }
    showSnackbar('数据已清除，页面即将重新加载...', { duration: 2000 })
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (e) {
    console.error('[SettingsView] Clear data failed:', e)
    showSnackbar('清除数据失败：' + e.message, { duration: 4000 })
  }
}

const toggleNotifications = () => {
  settingsStore.notificationsEnabled = !settingsStore.notificationsEnabled
  showSnackbar(settingsStore.notificationsEnabled ? '通知已开启' : '通知已关闭')
}

const toggleDoNotDisturb = () => {
  settingsStore.doNotDisturb = !settingsStore.doNotDisturb
  showSnackbar(settingsStore.doNotDisturb ? '免打扰模式已开启' : '免打扰模式已关闭')
}

const onReminderTimeChange = (e) => {
  const value = parseInt(e.target.value, 10)
  if (!isNaN(value) && value > 0 && value <= 1440) {
    settingsStore.defaultReminderTime = value
    showSnackbar('提醒时间已更新')
  }
}

const toggleAutoStart = () => {
  if (!window.electronAPI?.setAutoStart) {
    showSnackbar('此功能仅在桌面版可用', { duration: 3000 })
    return
  }
  const newValue = !settingsStore.autoStart
  window.electronAPI.setAutoStart(newValue).then((success) => {
    if (success) {
      settingsStore.autoStart = newValue
      showSnackbar(newValue ? '开机自启已开启' : '开机自启已关闭')
    } else {
      showSnackbar('设置失败，请稍后重试', { duration: 3000 })
    }
  })
}

const toggleCloseToQuit = () => {
  if (!window.electronAPI?.setCloseToQuit) {
    showSnackbar('此功能仅在桌面版可用', { duration: 3000 })
    return
  }
  const newValue = !settingsStore.closeToQuit
  window.electronAPI.setCloseToQuit(newValue)
  settingsStore.closeToQuit = newValue
  showSnackbar(newValue ? '关闭窗口即退出已开启' : '关闭窗口最小化到托盘')
}

const confirmResetData = () => {
  showResetDataModal.value = false
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('choyeon_skip_sample')
    }
    taskStore.resetToDefault()
    showSnackbar('已恢复默认数据', { duration: 2000 })
  } catch (e) {
    console.error('[SettingsView] Reset data failed:', e)
    showSnackbar('恢复默认数据失败：' + e.message, { duration: 4000 })
  }
}

const testNotification = () => {
  if (!window.electronAPI || !window.electronAPI.sendNotification) {
    showSnackbar('通知API不可用（非Electron环境）', { duration: 3000 })
    return
  }

  window.electronAPI.sendNotification('Choyeon To Do', '测试通知：您的任务提醒功能正常工作！')
  showSnackbar('测试通知已发送，请查看系统通知栏')
}

// 监听来自 Sidebar 右键菜单的 CustomEvent
const onEditCategory = (e) => {
  if (e.detail) startEditCategory(e.detail)
}
const onAddCategory = () => {
  openAddCategory()
}
const onDeleteCategory = (e) => {
  if (e.detail) handleDeleteCategory(e.detail)
}

onMounted(() => {
  window.addEventListener('edit-category', onEditCategory)
  window.addEventListener('add-category', onAddCategory)
  window.addEventListener('delete-category', onDeleteCategory)
})

onUnmounted(() => {
  window.removeEventListener('edit-category', onEditCategory)
  window.removeEventListener('add-category', onAddCategory)
  window.removeEventListener('delete-category', onDeleteCategory)
})
</script>

<style scoped>
.settings-view {
  min-height: 100%;
  background: transparent;
}

.content-inner {
  max-width: 640px;
  padding: 0 48px 48px 48px;
  margin: 0 auto;
}

.content-header {
  margin-bottom: 8px;
  padding: 48px 0 24px 0;
  animation: slideDown var(--duration-moderate) var(--ease-out-expo);
}

.content-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
  line-height: 1.2;
  font-family: var(--font-title);
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.2px;
}

.settings-card {
  background: var(--card-bg);
  backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  -webkit-backdrop-filter: blur(var(--sidebar-search-blur)) saturate(var(--sidebar-search-saturate));
  border-radius: var(--radius-xl);
  border: 1px solid var(--card-border);
  padding: 8px 0;
  margin-bottom: 16px;
  box-shadow: var(--card-shadow);
  transition: box-shadow var(--transition-smooth), border-color var(--transition-smooth);
  animation: cardEnter var(--duration-moderate) var(--ease-out-quart) backwards;
}

.settings-card:nth-child(2) { animation-delay: 0.05s; }
.settings-card:nth-child(3) { animation-delay: 0.1s; }
.settings-card:nth-child(4) { animation-delay: 0.15s; }
.settings-card:nth-child(5) { animation-delay: 0.2s; }
.settings-card:nth-child(6) { animation-delay: 0.25s; }
.settings-card:nth-child(7) { animation-delay: 0.3s; }
.settings-card:nth-child(8) { animation-delay: 0.35s; }

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.settings-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 24px 12px 24px;
}

.settings-section-icon {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-section-title {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: 0.1px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 24px 12px 24px;
  gap: 12px;
}

.category-header .settings-section-header {
  margin: 0;
  min-width: 0;
}

.batch-delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: var(--state-error);
  border: none;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background var(--transition-micro), transform var(--transition-micro);
  flex-shrink: 0;
}

.batch-delete-btn:hover {
  background: var(--color-error-surface);
}

.batch-delete-btn:active {
  transform: scale(0.96);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background var(--transition-smooth);
  min-height: 52px;
  position: relative;
}

.setting-row:hover {
  background: var(--color-bg-secondary);
}

.setting-row:active {
  background: var(--color-surface-hover);
}

.setting-row.no-hover {
  cursor: default;
}

.setting-row.no-hover:hover {
  background: transparent;
}

.setting-row.danger .setting-label {
  color: var(--state-error);
}

.setting-icon-wrap {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  transition: transform var(--transition-spring-soft);
}

.setting-row:hover .setting-icon-wrap {
  transform: scale(1.08);
}

.icon-primary-tint {
  background: var(--color-primary-surface);
  color: var(--color-primary);
}

.icon-green {
  background: rgba(34, 197, 94, 0.10);
  color: #22c55e;
}

.icon-blue {
  background: rgba(59, 130, 246, 0.10);
  color: #3b82f6;
}

.icon-red {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.icon-amber {
  background: rgba(251, 191, 36, 0.12);
  color: #f59e0b;
}

.icon-orange {
  background: rgba(249, 115, 22, 0.12);
  color: #f97316;
}

.icon-purple {
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.icon-slate {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.setting-label-wrap {
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  display: block;
  letter-spacing: 0.1px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setting-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 2px 0 0 0;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  transition: transform var(--transition-smooth), color var(--transition-smooth);
}

.setting-row:hover .chevron {
  color: var(--color-text-secondary);
  transform: translateX(2px);
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
  flex-shrink: 0;
}

.toggle-switch:focus-visible {
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.toggle-switch[aria-checked="true"] {
  background: var(--color-primary);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface);
  transition: left var(--transition-spring-soft), box-shadow var(--transition-smooth);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.1);
}

.toggle-switch[aria-checked="true"] .toggle-knob {
  left: 23px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-switch:active .toggle-knob {
  width: 24px;
}

.reminder-select {
  padding: 6px 32px 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-body);
  cursor: pointer;
  outline: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  transition: border-color var(--transition-smooth), box-shadow var(--transition-spring-soft);
}

.reminder-select:hover {
  border-color: var(--color-text-tertiary);
}

.reminder-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-light);
  min-height: 52px;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 24px 20px 24px;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-on-primary);
  transition: transform var(--transition-spring-soft), box-shadow var(--transition-smooth);
  box-sizing: border-box;
  position: relative;
}

.color-option:hover {
  transform: scale(1.12) rotate(-5deg);
}

.color-option.active {
  box-shadow: 0 0 0 3px var(--color-surface), 0 0 0 5px currentColor;
}

.color-option.active::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1px solid currentColor;
  opacity: 0.2;
  animation: pulseRing 2s var(--ease-out-expo) infinite;
}

.color-option:focus-visible {
  box-shadow: 0 0 0 2px var(--color-primary-ring);
  outline: none;
}

.segmented-control {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin: 0 24px 16px 24px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
}

.segment-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: color var(--transition-smooth), background var(--transition-smooth),
              box-shadow var(--transition-smooth), transform var(--transition-spring-soft);
  position: relative;
  overflow: hidden;
}

.segment-btn:hover {
  color: var(--color-text-primary);
}

.segment-btn:active {
  transform: scale(0.96);
}

.segment-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.segment-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-primary-ring);
}

.number-input-wrap {
  flex-shrink: 0;
}

.number-input {
  width: 70px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  text-align: center;
  outline: none;
  transition: border-color var(--transition-smooth), box-shadow var(--transition-spring-soft);
}

.number-input:hover {
  border-color: var(--color-text-tertiary);
}

.number-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.number-input::-webkit-outer-spin-button,
.number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.number-input[type=number] {
  -moz-appearance: textfield;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  transition: background var(--transition-smooth);
}

.shortcut-item:hover {
  background: var(--color-bg-secondary);
}

.shortcut-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.shortcut-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: color var(--transition-smooth);
}

.shortcut-item:hover .shortcut-icon {
  color: var(--color-primary);
}

.shortcut-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  font-family: var(--font-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 6px;
}

.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  background: var(--color-bg-secondary);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: var(--font-mono, var(--font-body));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), inset 0 -1.5px 0 rgba(0, 0, 0, 0.06);
  transition: transform var(--transition-micro);
}

.shortcut-item:hover .kbd {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 -1.5px 0 rgba(0, 0, 0, 0.06);
}

.kbd-plus,
.kbd-slash {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.category-list {
  margin: 4px 0 8px 0;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-smooth);
}

.category-item:hover {
  background: var(--color-bg-secondary);
}

.category-item:last-of-type {
  border-bottom: none;
}

.category-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.category-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.category-checkbox .checkmark {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  transition: border-color var(--transition-smooth), background var(--transition-spring-soft);
}

.category-checkbox:hover .checkmark {
  border-color: var(--color-primary);
}

.category-checkbox input:checked + .checkmark {
  background: var(--color-primary);
  border-color: var(--color-primary);
  animation: checkPop var(--transition-spring);
}

@keyframes checkPop {
  0% { transform: scale(0.8); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.category-checkbox input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid var(--color-text-on-primary);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.category-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px transparent;
  transition: box-shadow var(--transition-smooth);
}

.category-item:hover .category-dot {
  box-shadow: 0 0 0 3px var(--color-bg-secondary);
}

.category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-count {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 600;
  padding: 2px 10px;
  min-width: 28px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  transition: background var(--transition-smooth), color var(--transition-smooth);
}

.category-item:hover .category-count {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.category-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.cat-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-micro), color var(--transition-micro), transform var(--transition-spring-soft);
  opacity: 0;
}

.category-item:hover .cat-action-btn {
  opacity: 1;
}

.cat-action-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  transform: scale(1.08);
}

.cat-action-btn:active {
  transform: scale(0.92);
}

.cat-action-btn.delete:hover {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.cat-action-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--color-primary-ring);
  outline: none;
  opacity: 1;
}

.add-category-btn {
  width: calc(100% - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  margin: 12px 24px 20px 24px;
  background: transparent;
  color: var(--color-primary);
  border: 1.5px dashed var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: background var(--transition-smooth), border-color var(--transition-smooth),
              transform var(--transition-spring-soft);
}

.add-category-btn:hover {
  background: var(--color-primary-surface);
  border-color: var(--color-primary-lighter);
}

.add-category-btn:active {
  transform: scale(0.98);
}

.version-card {
  display: flex;
  justify-content: center;
  padding: 32px 24px;
  border: none;
  box-shadow: none;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.version-card:active {
  transform: scale(0.98);
}

.version-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.version-logo {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(76, 139, 245, 0.3);
}

.version-logo svg {
  width: 100%;
  height: 100%;
  display: block;
}

.version-title {
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
}

.version-desc {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(60, 64, 67, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn var(--duration-normal) var(--ease-out-quart);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.category-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-float);
  animation: modalScaleIn var(--duration-moderate) var(--ease-spring-soft);
}

@keyframes modalScaleIn {
  from {
    transform: scale(0.9) translateY(12px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.delete-modal {
  text-align: center;
}

.delete-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px auto;
  border-radius: 50%;
  background: var(--color-error-surface);
  color: var(--state-error);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: iconBounce var(--duration-moderate) var(--ease-spring);
}

@keyframes iconBounce {
  0% { transform: scale(0); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.delete-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
  line-height: 1.5;
  font-weight: 400;
}

.delete-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.delete-option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: background var(--transition-smooth), transform var(--transition-spring-soft);
}

.delete-option-btn:active {
  transform: scale(0.97);
}

.delete-option-btn.move {
  background: var(--color-primary-surface);
  color: var(--color-primary-dark);
}

.delete-option-btn.move:hover {
  background: var(--color-primary-lighter);
}

.delete-option-btn.delete {
  background: var(--color-error-surface);
  color: var(--state-error);
}

.delete-option-btn.delete:hover {
  background: var(--color-error-surface-hover);
}

.cancel-btn.full-width {
  width: 100%;
}

.modal-title {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 20px 0;
  letter-spacing: -0.3px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-smooth), box-shadow var(--transition-spring-soft);
  box-sizing: border-box;
  margin-bottom: 16px;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

.modal-colors-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.modal-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  flex-direction: row-reverse;
  gap: 8px;
}

.save-btn,
.cancel-btn {
  padding: 0 24px;
  height: 40px;
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition: background var(--transition-smooth), box-shadow var(--transition-smooth),
              transform var(--transition-micro);
  letter-spacing: 0.5px;
}

.save-btn {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: var(--shadow-xs);
}

.save-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.save-btn:active {
  transform: scale(0.97);
}

.cancel-btn {
  background: transparent;
  color: var(--color-primary);
}

.cancel-btn:hover {
  background: var(--color-primary-surface);
}

.cancel-btn:active {
  transform: scale(0.97);
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-inner {
    padding: 0 32px 40px 32px;
  }

  .content-header {
    padding: 36px 0 20px 0;
  }

  .content-header h1 {
    font-size: 24px;
  }
}

@media (max-width: 767px) {
  .content-inner {
    padding: 0 16px 120px 16px;
  }

  .content-header {
    padding: 24px 0 16px 0;
  }

  .content-header h1 {
    font-size: 22px;
  }

  .batch-delete-btn {
    padding: 6px 12px;
    font-size: 12px;
    min-height: 44px;
    min-width: 44px;
  }

  .setting-row,
  .color-picker-row,
  .category-item {
    padding-left: 16px;
    padding-right: 16px;
    min-height: 56px;
  }

  .settings-section-title,
  .category-header {
    margin-left: 16px;
    margin-right: 16px;
  }

  .color-options {
    padding-left: 16px;
    padding-right: 16px;
    gap: 12px;
  }

  .color-option {
    width: 44px;
    height: 44px;
  }

  .color-option.small {
    width: 40px;
    height: 40px;
  }

  .add-category-btn {
    width: calc(100% - 32px);
    margin-left: 16px;
    margin-right: 16px;
    min-height: 48px;
    font-size: 15px;
  }

  .segmented-control {
    margin: 0 16px 16px 16px;
  }

  .segment-btn {
    min-height: 44px;
    font-size: 14px;
  }

  .number-input {
    font-size: 16px;
    min-height: 44px;
    min-width: 64px;
  }

  .reminder-select {
    font-size: 16px;
    min-height: 44px;
    padding: 10px 40px 10px 16px;
    background-position: right 12px center;
  }

  .cat-action-btn {
    width: 44px;
    height: 44px;
  }

  .category-checkbox {
    width: 24px;
    height: 24px;
    min-width: 24px;
  }

  .category-checkbox .checkmark {
    width: 22px;
    height: 22px;
  }

  .category-checkbox input:checked + .checkmark::after {
    left: 8px;
    top: 3px;
    width: 6px;
    height: 12px;
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

  .toggle-switch[aria-checked="true"] .toggle-knob {
    left: 23px;
  }

  .setting-icon-wrap {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .shortcut-item {
    padding: 12px 16px;
    min-height: 52px;
  }

  .modal-backdrop {
    align-items: flex-end;
  }

  .category-modal {
    width: 100%;
    max-width: none;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: 20px 20px 28px 20px;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .form-input {
    font-size: 16px;
    min-height: 48px;
    padding: 14px 16px;
  }

  .modal-title {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .modal-colors {
    gap: 10px;
    margin-bottom: 20px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .save-btn,
  .cancel-btn {
    width: 100%;
    height: 48px;
    font-size: 15px;
  }

  .delete-desc {
    font-size: 15px;
    line-height: 1.6;
  }

  .delete-option-btn {
    min-height: 48px;
    font-size: 15px;
  }

  .cancel-btn.full-width {
    min-height: 48px;
    font-size: 15px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
