<template>
  <div class="flip-card" :class="{ flip: isFlipping }">
    <div class="flip-card-inner">
      <div class="flip-card-card flip-card-bottom-top">
        <span class="digit-top">{{ nextValue }}</span>
      </div>
      <div class="flip-card-card flip-card-bottom-bottom">
        <span class="digit-bottom">{{ nextValue }}</span>
      </div>
      <div class="flip-card-card flip-card-top-top">
        <span class="digit-top">{{ displayValue }}</span>
      </div>
      <div class="flip-card-card flip-card-top-bottom">
        <span class="digit-bottom">{{ displayValue }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: {
    type: String,
    required: true
  }
})

const displayValue = ref(props.value)
const nextValue = ref(props.value)
const isFlipping = ref(false)
let flipTimer = null

watch(
  () => props.value,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      if (flipTimer) clearTimeout(flipTimer)
      nextValue.value = newVal
      // Use double rAF to ensure DOM updates before animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isFlipping.value = true
        })
      })

      flipTimer = setTimeout(() => {
        displayValue.value = newVal
        isFlipping.value = false
        flipTimer = null
      }, 600)
    }
  }
)

onMounted(() => {
  displayValue.value = props.value
  nextValue.value = props.value
})
</script>

<style scoped>
.flip-card {
  position: relative;
  width: 72px;
  height: 100px;
  perspective: 400px;
  font-family: var(--font-mono, 'SF Mono', 'Monaco', 'Courier New', monospace);
  font-variant-numeric: tabular-nums;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

/* Center divider line */
.flip-card-inner::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(0, 0, 0, 0.2);
  transform: translateY(-50%);
  z-index: 20;
  pointer-events: none;
}

.flip-card-card {
  position: absolute;
  width: 100%;
  height: 50%;
  overflow: hidden;
  background: var(--color-bg-tertiary);
  border: 1px solid rgba(0, 0, 0, 0.06);
  /* GPU acceleration */
  will-change: transform;
  transform: translateZ(0);
}

.digit-top,
.digit-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200%;
  font-size: 68px;
  font-weight: 300;
  color: var(--color-text-primary);
  line-height: 1;
}

.digit-top {
  transform: translateY(0);
}

.digit-bottom {
  transform: translateY(-50%);
}

/* Static layers - always visible */
.flip-card-bottom-top {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  z-index: 1;
}

.flip-card-top-bottom {
  bottom: 0;
  border-radius: 0 0 16px 16px;
  border-top: none;
  z-index: 1;
}

/* Animated top half - flips away */
.flip-card-top-top {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  transform-origin: bottom center;
  z-index: 3;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* Animated bottom half - flips in from back */
.flip-card-bottom-bottom {
  bottom: 0;
  border-radius: 0 0 16px 16px;
  border-top: none;
  transform-origin: top center;
  transform: rotateX(180deg);
  z-index: 2;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  opacity: 0;
}

/* Animation trigger */
.flip-card.flip .flip-card-top-top {
  animation: flipTopDown 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.flip-card.flip .flip-card-bottom-bottom {
  animation: flipBottomUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes flipTopDown {
  0% {
    transform: rotateX(0deg);
    opacity: 1;
  }
  50% {
    transform: rotateX(-90deg);
    opacity: 1;
  }
  50.01% {
    opacity: 0;
  }
  100% {
    transform: rotateX(-180deg);
    opacity: 0;
  }
}

@keyframes flipBottomUp {
  0% {
    transform: rotateX(180deg);
    opacity: 0;
  }
  49.99% {
    opacity: 0;
  }
  50% {
    transform: rotateX(90deg);
    opacity: 1;
  }
  100% {
    transform: rotateX(0deg);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .flip-card {
    width: 56px;
    height: 80px;
  }

  .digit-top,
  .digit-bottom {
    font-size: 52px;
  }
}

@media (max-width: 380px) {
  .flip-card {
    width: 48px;
    height: 68px;
  }

  .digit-top,
  .digit-bottom {
    font-size: 44px;
  }
}

@media (max-height: 568px) {
  .flip-card {
    width: 42px;
    height: 60px;
  }

  .digit-top,
  .digit-bottom {
    font-size: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip-card.flip .flip-card-top-top,
  .flip-card.flip .flip-card-bottom-bottom {
    animation: none !important;
  }

  .flip-card-bottom-bottom {
    opacity: 0;
  }

  .flip-card.flip .flip-card-bottom-bottom {
    opacity: 1;
    transform: rotateX(0deg);
  }

  .flip-card.flip .flip-card-top-top {
    opacity: 0;
    transform: rotateX(-180deg);
  }
}
</style>
