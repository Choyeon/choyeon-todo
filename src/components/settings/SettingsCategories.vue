<template>
  <div class="settings-card">
    <div class="category-header">
      <div class="settings-section-header">
        <div class="settings-section-icon icon-orange">
          <FolderTree :size="18" />
        </div>
        <h3 class="settings-section-title">{{ $t('categories.manage') }}</h3>
      </div>
      <button v-if="selectedCategories.length > 0" class="batch-delete-btn" @click="handleBatchDelete">
        <Trash2 :size="14" />
        {{ $t('categories.batchDelete') }} ({{ selectedCategories.length }})
      </button>
    </div>

    <div class="category-list">
      <div v-for="cat in taskStore.categories" :key="cat.id" class="category-item">
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
          <button
            class="cat-action-btn"
            @click="startEditCategory(cat)"
            :title="$t('common.edit')"
            :aria-label="$t('categories.editCategory')"
          >
            <Pencil :size="14" />
          </button>
          <button
            class="cat-action-btn delete"
            @click="handleDeleteCategory(cat)"
            :title="$t('common.delete')"
            :aria-label="$t('categories.deleteCategory')"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>

    <button class="add-category-btn" @click="openAddCategory">
      <Plus :size="18" />
      {{ $t('categories.addNew') }}
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCategoryModal" class="modal-backdrop" @click.self="closeCategoryModal">
          <Transition name="slide-up">
            <div v-if="showCategoryModal" class="category-modal" @keydown.esc="closeCategoryModal">
              <h3 class="modal-title">{{ editingCategory ? $t('categories.editCategory') : $t('categories.addNew') }}</h3>
              <input
                type="text"
                class="form-input"
                :placeholder="$t('categories.name')"
                v-model="categoryForm.name"
                ref="categoryNameInput"
                :aria-label="$t('categories.name')"
                @keyup.enter="saveCategory"
              />
              <div class="modal-colors-label">{{ $t('categories.color') }}</div>
              <div class="modal-colors">
                <button
                  v-for="color in settingsStore.themeColors"
                  :key="color.value"
                  class="color-option small"
                  :class="{ active: categoryForm.color === color.value }"
                  :style="{ background: color.value }"
                  :title="color.name"
                  :aria-label="`${$t('categories.color')} ${color.name}`"
                  @click="categoryForm.color = color.value"
                >
                  <Check v-if="categoryForm.color === color.value" :size="12" />
                </button>
              </div>
              <div class="modal-actions">
                <button class="cancel-btn" @click="closeCategoryModal">{{ $t('common.cancel') }}</button>
                <button class="save-btn" @click="saveCategory">
                  {{ editingCategory ? $t('common.save') : $t('common.add') }}
                </button>
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
            <div
              v-if="showDeleteModal"
              class="category-modal delete-modal"
              @keydown.esc="closeDeleteModal"
            >
              <div class="delete-icon">
                <AlertTriangle :size="32" />
              </div>
              <h3 class="modal-title">{{ $t('categories.deleteConfirm') }}</h3>
              <p class="delete-desc">
                {{ deleteModalMessage }}
              </p>
              <div class="delete-options">
                <button class="delete-option-btn move" @click="confirmDeleteWithMove">
                  <ArrowRight :size="16" />
                  {{ $t('settings.moveToDefaultCategory') }}
                </button>
                <button class="delete-option-btn delete" @click="confirmDeleteWithRemove">
                  <Trash2 :size="16" />
                  {{ $t('settings.deleteTasks') }}
                </button>
              </div>
              <button class="cancel-btn full-width" @click="closeDeleteModal">{{ $t('common.cancel') }}</button>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTaskStore } from '../../stores/taskStore'
import { useSnackbar } from '../../composables/useSnackbar'
import {
  FolderTree,
  Plus,
  Trash2,
  Pencil,
  Check,
  AlertTriangle,
  ArrowRight
} from '@lucide/vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const taskStore = useTaskStore()
const { show: showSnackbar } = useSnackbar()

const showCategoryModal = ref(false)
const showDeleteModal = ref(false)
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
    return t('settings.deleteCategoriesConfirm', { count: deletingCategories.value.length, taskCount: totalCount })
  }
  if (deletingCategory.value) {
    const count = taskStore.getCategoryCount(deletingCategory.value.id)
    return t('settings.deleteCategoryConfirm', { name: deletingCategory.value.name, count: count })
  }
  return ''
})

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
    showSnackbar(t('settings.pleaseEnterCategoryName'), { duration: 3000 })
    return
  }

  if (editingCategory.value) {
    taskStore.updateCategory(editingCategory.value.id, {
      name: categoryForm.name.trim(),
      color: categoryForm.color
    })
    showSnackbar(t('settings.categoryUpdated'))
  } else {
    taskStore.addCategory({
      name: categoryForm.name.trim(),
      color: categoryForm.color
    })
    showSnackbar(t('settings.categoryAdded'))
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
    showSnackbar(t('settings.categoryDeletedMoved'))
  } else if (deletingCategories.value.length > 0) {
    deletingCategories.value.forEach((catId) => {
      taskStore.deleteCategory(catId, { moveTasks: true })
    })
    selectedCategories.value = []
    showSnackbar(t('settings.categoriesDeleted', { count: deletingCategories.value.length }))
  }
  closeDeleteModal()
}

const confirmDeleteWithRemove = () => {
  if (deletingCategory.value) {
    taskStore.deleteCategory(deletingCategory.value.id, { moveTasks: false })
    showSnackbar(t('settings.categoryAndTasksDeleted'))
  } else if (deletingCategories.value.length > 0) {
    deletingCategories.value.forEach((catId) => {
      taskStore.deleteCategory(catId, { moveTasks: false })
    })
    selectedCategories.value = []
    showSnackbar(t('settings.categoriesAndTasksDeleted', { count: deletingCategories.value.length }))
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
</script>
