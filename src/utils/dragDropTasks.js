// dragDropTasks.js — drag & drop primitives for task reordering
// No Vue/Pinia dependencies; pure functions.

// ========== Helpers ==========
const buildTaskMap = (tasks) => {
  const map = new Map()
  if (Array.isArray(tasks)) {
    for (const t of tasks) {
      if (t && t.id) map.set(t.id, t)
    }
  }
  return map
}

const getDescendantIds = (taskId, taskMap, maxDepth = 1000) => {
  const descendants = new Set()
  if (!taskId || !taskMap.has(taskId)) return descendants
  const stack = [taskId]
  let visited = 0
  while (stack.length > 0 && visited < maxDepth) {
    visited++
    const current = stack.pop()
    if (descendants.has(current)) continue
    descendants.add(current)
    // Find children of current (parent link based)
    for (const t of taskMap.values()) {
      const pid = t.parentId ?? t.parentTaskId ?? null
      if (pid && pid === current && !descendants.has(t.id)) {
        stack.push(t.id)
      }
    }
  }
  descendants.delete(taskId) // exclude self
  return descendants
}

const isDeleted = (entity) => {
  if (!entity) return true
  return entity.deleted === true || entity.archived === true || entity.removed === true
}

// ========== buildDropIndex ==========
/**
 * 基于虚拟滚动坐标计算放置位置。
 * @param {Object|Array} insertions - 放置坐标 { y: number, x?: number }，或坐标数组（多选时）。
 * @param {Array} currentList - 当前视图的任务列表（有序，每项需要 id，可选 depth）。
 * @param {Object} viewOpts - { viewportHeight, rowHeight, vscrollOffset, nestThreshold?: number }
 * @returns {{ dropIndex:number, afterId:string|null, beforeId:string|null, parentId:string|null }}
 */
export const buildDropIndex = (insertions, currentList, viewOpts = {}) => {
  const viewportHeight = Math.max(0, Number(viewOpts.viewportHeight) || 0)
  const rowHeight = Math.max(8, Number(viewOpts.rowHeight) || 48)
  const vscrollOffset = Math.max(0, Number(viewOpts.vscrollOffset) || 0)
  const nestThreshold =
    typeof viewOpts.nestThreshold === 'number' ? viewOpts.nestThreshold : Math.max(20, rowHeight * 0.4)

  // Normalize insertions to single y
  let dropY = 0
  let dropX = null
  if (Array.isArray(insertions)) {
    if (insertions.length === 0) {
      // Default: append to end
      dropY = currentList.length * rowHeight
    } else if (typeof insertions[0] === 'number') {
      dropY = insertions[0]
    } else if (insertions[0] && typeof insertions[0].y === 'number') {
      dropY = insertions[0].y
      if (typeof insertions[0].x === 'number') dropX = insertions[0].x
    }
  } else if (typeof insertions === 'number') {
    dropY = insertions
  } else if (insertions && typeof insertions.y === 'number') {
    dropY = insertions.y
    if (typeof insertions.x === 'number') dropX = insertions.x
  }

  const listLen = currentList.length

  // Translate viewport y to content-space y (plus scroll offset)
  const contentY = dropY + vscrollOffset

  // Empty list → dropIndex 0
  if (!Array.isArray(currentList) || listLen === 0) {
    return { dropIndex: 0, afterId: null, beforeId: null, parentId: null }
  }

  // Compute which row index we are above / within (before clamping)
  const rawEstimatedRow = Math.floor(contentY / rowHeight)
  const rowFloat = contentY / rowHeight
  let estimatedRow = rawEstimatedRow
  let offsetInRow = contentY - rawEstimatedRow * rowHeight

  // Three zones per row (in order):
  //   [0, 0.5)    → top half → insert BEFORE this row
  //   [0.5, 0.7)  → middle 20% → insert AFTER this row (as next sibling)
  //   [0.7, 1.0)  → bottom 30% → nest INTO this row (first child)
  //
  // For rows outside the list (estimatedRow < 0 or >= listLen), we treat
  // them as before-first / after-last (no nesting possible there).

  let parentId = null
  let desiredDropIndex // before clamping
  let insertMode // 'before' | 'after' | 'nest' | 'start' | 'end'

  if (estimatedRow < 0) {
    insertMode = 'start'
    desiredDropIndex = 0
  } else if (estimatedRow >= listLen) {
    insertMode = 'end'
    desiredDropIndex = listLen
  } else {
    if (offsetInRow < rowHeight * 0.5) {
      insertMode = 'before'
      desiredDropIndex = estimatedRow
    } else if (offsetInRow < rowHeight * 0.7) {
      insertMode = 'after'
      desiredDropIndex = estimatedRow + 1
    } else {
      insertMode = 'nest'
      const rowTask = currentList[estimatedRow]
      if (rowTask && rowTask.id) {
        parentId = rowTask.id
        desiredDropIndex = estimatedRow + 1 // visually after parent slot
      } else {
        // No id to nest under → fall back to after
        insertMode = 'after'
        desiredDropIndex = estimatedRow + 1
      }
    }
  }

  // Clamp dropIndex
  let dropIndex = desiredDropIndex
  if (dropIndex < 0) dropIndex = 0
  if (dropIndex > listLen) dropIndex = listLen

  // Compute anchors
  let afterId = null
  let beforeId = null

  if (insertMode === 'nest') {
    // Nested drops: anchors are at the list level (handled by parentId in reorder)
    afterId = null
    beforeId = null
  } else if (dropIndex === 0) {
    afterId = null
    beforeId = listLen > 0 ? currentList[0].id : null
  } else if (dropIndex >= listLen) {
    afterId = listLen > 0 ? currentList[listLen - 1].id : null
    beforeId = null
  } else {
    // dropIndex between 1 and listLen-1
    afterId = currentList[dropIndex - 1].id
    beforeId = currentList[dropIndex].id
  }

  return { dropIndex, afterId, beforeId, parentId }
}

// ========== validateDrop ==========
/**
 * 校验拖拽合法性：DAG 环（祖先→后代）、已删除的 list/area。
 * @param {Object} payload
 * @param {string[]} payload.draggedTaskIds
 * @param {{ listId?:string|null, headingId?:string|null, parentId?:string|null, areaId?:string|null }} payload.target
 * @param {Array} payload.tasks
 * @param {Array} payload.lists
 * @param {Array} payload.areas
 * @returns {{ ok:boolean, reason?:string, normalizedTarget?:Object }}
 */
export const validateDrop = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, reason: 'payload 无效' }
  }
  const { draggedTaskIds = [], target = {}, tasks = [], lists = [], areas = [] } = payload

  if (!Array.isArray(draggedTaskIds) || draggedTaskIds.length === 0) {
    return { ok: false, reason: '未选择任何任务' }
  }

  const taskMap = buildTaskMap(tasks)

  // All dragged tasks must exist
  for (const id of draggedTaskIds) {
    if (!taskMap.has(id)) {
      return { ok: false, reason: `任务不存在: ${id}` }
    }
  }

  // Deduplicate
  const uniqueIds = [...new Set(draggedTaskIds)]

  // Normalize target
  const normalizedTarget = {
    listId: target.listId !== undefined ? (target.listId || null) : null,
    headingId: target.headingId !== undefined ? (target.headingId || null) : null,
    parentId: target.parentId !== undefined ? (target.parentId || null) : null,
    areaId: target.areaId !== undefined ? (target.areaId || null) : null
  }

  // DAG validation: target parent must not be a descendant of any dragged task
  if (normalizedTarget.parentId) {
    // Target parent must exist
    if (!taskMap.has(normalizedTarget.parentId)) {
      return { ok: false, reason: `父任务不存在: ${normalizedTarget.parentId}`, normalizedTarget }
    }
    // Can't nest a task inside itself
    if (uniqueIds.includes(normalizedTarget.parentId)) {
      return { ok: false, reason: '不能把任务拖入自己内部', normalizedTarget }
    }
    for (const draggedId of uniqueIds) {
      const descendants = getDescendantIds(draggedId, taskMap)
      if (descendants.has(normalizedTarget.parentId)) {
        return {
          ok: false,
          reason: `不能把祖先任务 (${draggedId}) 拖入其后代 (${normalizedTarget.parentId})`,
          normalizedTarget
        }
      }
    }
  }

  // List validation: if listId provided, must exist and not deleted
  if (normalizedTarget.listId) {
    const listMap = new Map()
    if (Array.isArray(lists)) {
      for (const l of lists) {
        if (l && l.id) listMap.set(l.id, l)
      }
    }
    const targetList = listMap.get(normalizedTarget.listId)
    if (!targetList) {
      return { ok: false, reason: `目标清单不存在: ${normalizedTarget.listId}`, normalizedTarget }
    }
    if (isDeleted(targetList)) {
      return { ok: false, reason: `目标清单已删除: ${normalizedTarget.listId}`, normalizedTarget }
    }
  }

  // Area validation: if areaId provided, must exist and not deleted
  if (normalizedTarget.areaId) {
    const areaMap = new Map()
    if (Array.isArray(areas)) {
      for (const a of areas) {
        if (a && a.id) areaMap.set(a.id, a)
      }
    }
    const targetArea = areaMap.get(normalizedTarget.areaId)
    if (!targetArea) {
      return { ok: false, reason: `目标区域不存在: ${normalizedTarget.areaId}`, normalizedTarget }
    }
    if (isDeleted(targetArea)) {
      return { ok: false, reason: `目标区域已删除: ${normalizedTarget.areaId}`, normalizedTarget }
    }
  }

  return { ok: true, normalizedTarget }
}

// ========== applyDrop ==========
/**
 * 生成 moves 数组，供批量 reorderTasks(moves) 使用。
 * @param {Object} payload
 * @param {string[]} payload.draggedTaskIds
 * @param {Object} payload.target  - { listId?, headingId?, parentId?, areaId? }
 * @param {number} [payload.dropIndex] - 可选的目标位置索引
 * @param {string|null} [payload.afterId] - 可选的锚点（插入之后）
 * @param {string|null} [payload.beforeId] - 可选的锚点（插入之前）
 * @param {Array} payload.tasks - 全部任务（用于计算顺序）
 * @param {Array} [payload.lists]
 * @param {Array} [payload.areas]
 * @returns {Array<{ taskId:string, afterId:string|null, beforeId:string|null, parentId:string|null, listId:string|null, headingId:string|null, areaId:string|null, dropIndex:number|null }>}
 */
export const applyDrop = (payload) => {
  const moves = []
  if (!payload || typeof payload !== 'object') return moves
  const { draggedTaskIds = [], target = {}, tasks = [] } = payload
  if (!Array.isArray(draggedTaskIds) || draggedTaskIds.length === 0) return moves

  const uniqueIds = [...new Set(draggedTaskIds)]
  const taskMap = buildTaskMap(tasks)

  // Filter: only existing tasks
  const validIds = uniqueIds.filter((id) => taskMap.has(id))
  if (validIds.length === 0) return moves

  // Validate and use normalized target if provided
  let normalizedTarget = {
    listId: target.listId !== undefined ? (target.listId || null) : null,
    headingId: target.headingId !== undefined ? (target.headingId || null) : null,
    parentId: target.parentId !== undefined ? (target.parentId || null) : null,
    areaId: target.areaId !== undefined ? (target.areaId || null) : null
  }
  const validation = validateDrop(payload)
  if (!validation.ok) {
    // Still return empty moves for invalid drops
    return moves
  }
  if (validation.normalizedTarget) normalizedTarget = validation.normalizedTarget

  const dropIndex = typeof payload.dropIndex === 'number' ? payload.dropIndex : null
  const afterId = payload.afterId !== undefined ? payload.afterId || null : null
  const beforeId = payload.beforeId !== undefined ? payload.beforeId || null : null

  // For multiple dragged tasks, we need a stable order.
  // Preserve the original order of dragged tasks as they appeared in the payload.
  // The first task gets the primary anchors; subsequent tasks get chained afterId links.
  for (let i = 0; i < validIds.length; i++) {
    const taskId = validIds[i]
    let moveAfterId = null
    let moveBeforeId = null

    if (i === 0) {
      moveAfterId = afterId
      moveBeforeId = beforeId
    } else {
      // Chain: each subsequent task comes after the previous dragged task in sequence
      moveAfterId = validIds[i - 1]
      moveBeforeId = null
    }

    // If moving into a parent (nesting), ensure that the chained afterId points to the
    // same parent context — handled by the fact that previous is already placed into parent.

    moves.push({
      taskId,
      afterId: moveAfterId,
      beforeId: moveBeforeId,
      parentId: normalizedTarget.parentId,
      listId: normalizedTarget.listId,
      headingId: normalizedTarget.headingId,
      areaId: normalizedTarget.areaId,
      dropIndex: dropIndex !== null ? dropIndex + i : null
    })
  }

  return moves
}
