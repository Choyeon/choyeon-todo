import { openDB } from 'idb'

const DB_NAME = 'choyeon-todo'
const DB_VERSION = 1

let dbPromise = null

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' })
          tasksStore.createIndex('date', 'date')
          tasksStore.createIndex('categoryId', 'categoryId')
          tasksStore.createIndex('completed', 'completed')
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      }
    })
  }
  return dbPromise
}

export const isIndexedDBSupported = () => {
  return typeof indexedDB !== 'undefined'
}

export const db = {
  async getAllTasks() {
    const db = await getDB()
    return db.getAll('tasks')
  },

  async putTask(task) {
    const db = await getDB()
    await db.put('tasks', task)
  },

  async deleteTask(id) {
    const db = await getDB()
    await db.delete('tasks', id)
  },

  async clearTasks() {
    const db = await getDB()
    await db.clear('tasks')
  },

  async getAllCategories() {
    const db = await getDB()
    return db.getAll('categories')
  },

  async putCategory(category) {
    const db = await getDB()
    await db.put('categories', category)
  },

  async deleteCategory(id) {
    const db = await getDB()
    await db.delete('categories', id)
  },

  async clearCategories() {
    const db = await getDB()
    await db.clear('categories')
  },

  async getSetting(key) {
    const db = await getDB()
    const item = await db.get('settings', key)
    return item?.value
  },

  async putSetting(key, value) {
    const db = await getDB()
    await db.put('settings', { key, value })
  },

  async getAllSettings() {
    const db = await getDB()
    const items = await db.getAll('settings')
    const result = {}
    items.forEach((item) => {
      result[item.key] = item.value
    })
    return result
  },

  async setMetadata(key, value) {
    const db = await getDB()
    await db.put('metadata', { key, value })
  },

  async getMetadata(key) {
    const db = await getDB()
    const item = await db.get('metadata', key)
    return item?.value
  }
}
