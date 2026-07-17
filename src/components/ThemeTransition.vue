<template>
  <Teleport to="body">
    <div
      v-if="isAnimating"
      class="theme-transition"
      :style="transitionStyle"
      @transitionend="onTransitionEnd"
    />
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  trigger: {
    type: Number,
    default: 0
  },
  startX: {
    type: Number,
    default: 0
  },
  startY: {
    type: Number,
    default: 0
  },
  targetTheme: {
    type: String,
    default: 'dark'
  }
})

const emit = defineEmits(['complete'])

const isAnimating = ref(false)
const isExpanding = ref(false)

const LIGHT_COLOR = '#F7F8FC'
const DARK_COLOR = '#12121A'

const transitionStyle = computed(() => {
  const color = props.targetTheme === 'dark' ? DARK_COLOR : LIGHT_COLOR
  const size = isExpanding.value ? '200vmax' : '0px'
  const opacity = isExpanding.value ? 1 : 0

  return {
    left: `${props.startX}px`,
    top: `${props.startY}px`,
    width: size,
    height: size,
    backgroundColor: color,
    opacity: opacity
  }
})

const onTransitionEnd = () => {
  if (isExpanding.value) {
    isAnimating.value = false
    isExpanding.value = false
    emit('complete')
  }
}

watch(() => props.trigger, () => {
  // 尊重用户的减少动画偏好
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('complete')
    return
  }
  isAnimating.value = true
  requestAnimationFrame(() => {
    isExpanding.value = true
  })
})

onMounted(() => {
  if (props.trigger > 0) {
    isAnimating.value = true
    requestAnimationFrame(() => {
      isExpanding.value = true
    })
  }
})
</script>

<style scoped>
.theme-transition {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              height 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width, height, opacity;
}
</style>