import { ref, computed, onMounted, onUnmounted, nextTick, shallowRef } from 'vue'

export function useVirtualScroll(options = {}) {
  const { itemHeight = 60, buffer = 5, getScrollContainer, threshold = 100 } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const items = shallowRef([])

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
  let scrollTicking = false

  const updateContainer = () => {
    if (!container) return
    containerHeight.value = container.clientHeight
  }

  const handleScroll = () => {
    if (scrollTicking) return
    scrollTicking = true
    requestAnimationFrame(() => {
      scrollTop.value = container.scrollTop
      scrollTicking = false
    })
  }

  const init = async () => {
    await nextTick()
    container = typeof getScrollContainer === 'function' ? getScrollContainer() : null
    if (!container && typeof document !== 'undefined') {
      container = document.scrollingElement || document.documentElement
    }
    if (!container) return

    updateContainer()

    onScroll = handleScroll
    container.addEventListener('scroll', onScroll, { passive: true })

    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateContainer)
      ro.observe(container)
    }
  }

  const scrollToIndex = (index) => {
    if (!container) return
    const targetTop = index * itemHeight
    container.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    })
  }

  const scrollToItem = (id, getId = (item) => item.id) => {
    const idx = items.value.findIndex((item) => getId(item) === id)
    if (idx >= 0) {
      scrollToIndex(idx)
    }
  }

  const setItems = (newItems) => {
    items.value = newItems
  }

  const isItemVisible = (index) => {
    return index >= startIndex.value - threshold && index <= endIndex.value + threshold
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
    container = null
    onScroll = null
    ro = null
  })

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    scrollToIndex,
    scrollToItem,
    setItems,
    isItemVisible,
    containerHeight,
    scrollTop
  }
}
