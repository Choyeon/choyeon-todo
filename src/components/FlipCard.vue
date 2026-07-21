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
    <div class="flip-card-shadow"></div>
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

watch(
  () => props.value,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      nextValue.value = newVal
      isFlipping.value = true

      setTimeout(() => {
        displayValue.value = newVal
        isFlipping.value = false
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
  perspective: 600px;
  font-family: var(--font-mono, 'SF Mono', 'Monaco', 'Courier New', monospace);
  font-variant-numeric: tabular-nums;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
}

.flip-card-inner::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(0, 0, 0, 0.3);
  transform: translateY(-50%);
  z-index: 20;
  pointer-events: none;
}

.flip-card-card {
  position: absolute;
  width: 100%;
  height: 50%;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.03) 50%,
    rgba(0, 0, 0, 0.05) 100%
  );
  border: 1px solid rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(4px);
}

.digit-top,
.digit-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200%;
  font-size: 68px;
  font-weight: 200;
  color: var(--color-text-primary);
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.digit-top {
  transform: translateY(0);
}

.digit-bottom {
  transform: translateY(-50%);
}

.flip-card-bottom-top {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  z-index: 1;
}

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

.flip-card-top-top {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  transform-origin: bottom center;
  z-index: 3;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-card-top-bottom {
  bottom: 0;
  border-radius: 0 0 16px 16px;
  border-top: none;
  z-index: 1;
}

.flip-card.flip .flip-card-top-top {
  animation: flipTopDown 0.6s ease-in-out forwards;
}

.flip-card.flip .flip-card-bottom-bottom {
  animation: flipBottomUp 0.6s ease-in-out forwards;
}

@keyframes flipTopDown {
  0% {
    transform: rotateX(0deg);
    opacity: 1;
  }
  45% {
    opacity: 1;
  }
  55% {
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
  45% {
    opacity: 0;
  }
  55% {
    opacity: 1;
  }
  100% {
    transform: rotateX(0deg);
    opacity: 1;
  }
}

.flip-card-shadow {
  position: absolute;
  top: 4px;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: -1;
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
