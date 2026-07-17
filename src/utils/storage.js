import { db, isIndexedDBSupported } from './db'

const STORAGE_KEYS = {
  tasks: 'choyeon_tasks_v2',
  categories: 'choyeon_categories_v2',
  tags: 'choyeon_tags_v2',
  settings: 'choyeon_settings_v2'
}

const useIndexedDB = () => {
  return isIndexedDBSupported() && localStorage.getItem('choyeon_use_indexeddb') === '1'
}

export const storage = {
  async getTasks() {
    if (useIndexedDB()) {
      return db.getAllTasks()
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.tasks)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      console.error('[storage] getTasks failed:', e)
      return null
    }
  },

  async saveTasks(tasks) {
    if (useIndexedDB()) {
      const tx = (await db).transaction('tasks', 'readwrite')
      await Promise.all(tasks.map((t) => tx.store.put(t)))
      await tx.done
      return
    }
    try {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
    } catch (e) {
      console.error('[storage] saveTasks failed:', e)
    }
  },

  async getCategories() {
    if (useIndexedDB()) {
      return db.getAllCategories()
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.categories)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      console.error('[storage] getCategories failed:', e)
      return null
    }
  },

  async saveCategories(categories) {
    if (useIndexedDB()) {
      const tx = (await db).transaction('categories', 'readwrite')
      await Promise.all(categories.map((c) => tx.store.put(c)))
      await tx.done
      return
    }
    try {
      localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories))
    } catch (e) {
      console.error('[storage] saveCategories failed:', e)
    }
  },

  async getTags() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.tags)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      console.error('[storage] getTags failed:', e)
      return null
    }
  },

  async saveTags(tags) {
    try {
      localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags))
    } catch (e) {
      console.error('[storage] saveTags failed:', e)
    }
  },

  async getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      console.error('[storage] getSettings failed:', e)
      return null
    }
  },

  async saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
    } catch (e) {
      console.error('[storage] saveSettings failed:', e)
    }
  },

  async migrateToIndexedDB() {
    if (!isIndexedDBSupported()) {
      return { success: false, error: 'IndexedDB not supported' }
    }

    try {
      const tasks = await this.getTasks()
      const categories = await this.getCategories()

      if (tasks) {
        const tx = (await db).transaction('tasks', 'readwrite')
        await Promise.all(tasks.map((t) => tx.store.put(t)))
        await tx.done
      }

      if (categories) {
        const tx = (await db).transaction('categories', 'readwrite')
        await Promise.all(categories.map((c) => tx.store.put(c)))
        await tx.done
      }

      await db.setMetadata('migrated_from_localstorage', '1')
      localStorage.setItem('choyeon_use_indexeddb', '1')

      return { success: true }
    } catch (e) {
      console.error('[storage] migration failed:', e)
      return { success: false, error: e.message }
    }
  }
}
