import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

export function useVirtualScroll(options = {}) {
  const { itemHeight = 60, buffer = 5, getScrollContainer } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const items = ref([])

  const totalHeight = computed(() => items.value.length * itemHeight)

  const visibleCount = computed(() => Math.ceil(containerHeight.value / itemHeight) + buffer * 2)

  const startIndex = computed(() => {
    const idx = Math.max(0, Math.floor(scrollTop.value / itemHeight) - buffer)
    return Math.min(idx, Math.max(0, items.value.length - visibleCount.value))
  })

  const endIndex = computed(() => {
    return Math.min(startIndex.value + visibleCount.value, items.value.length)
  })

  const visibleItems = computed(() => {
    return items.value.slice(startIndex.value, endIndex.value)
  })

  const offsetY = computed(() => startIndex.value * itemHeight)

  let container = null
  let onScroll = null
  let ro = null

  const updateContainer = () => {
    if (!container) return
    containerHeight.value = container.clientHeight
  }

  const init = async () => {
    await nextTick()
    container = typeof getScrollContainer === 'function' ? getScrollContainer() : null
    if (!container && typeof document !== 'undefined') {
      container = document.scrollingElement || document.documentElement
    }
    if (!container) return

    updateContainer()

    onScroll = () => {
      scrollTop.value = container.scrollTop
    }

    container.addEventListener('scroll', onScroll, { passive: true })

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateContainer)
      ro.observe(container)
    }
  }

  const scrollToIndex = (index) => {
    if (!container) return
    container.scrollTop = index * itemHeight
  }

  const setItems = (newItems) => {
    items.value = newItems
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    if (container && onScroll) {
      container.removeEventListener('scroll', onScroll)
    }
    if (ro) {
      ro.disconnect()
    }
  })

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    scrollToIndex,
    setItems
  }
}
