<template>
  <div class="flip-card" :class="{ flipping: isFlipping }">
    <div class="flip-card-inner">
      <div class="flip-card-top">
        <span>{{ isFlipping ? previousValue : displayValue }}</span>
      </div>
      <div class="flip-card-bottom">
        <span>{{ displayValue }}</span>
      </div>
      <div class="flip-card-back">
        <div class="flip-card-back-top">
          <span>{{ displayValue }}</span>
        </div>
        <div class="flip-card-back-bottom">
          <span>{{ isFlipping ? previousValue : displayValue }}</span>
        </div>
      </div>
    </div>
    <div class="flip-card-shadow"></div>
    <div class="flip-card-gloss"></div>
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
const previousValue = ref(props.value)
const isFlipping = ref(false)

watch(
  () => props.value,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      previousValue.value = oldVal
      isFlipping.value = true

      setTimeout(() => {
        displayValue.value = newVal
      }, 300)

      setTimeout(() => {
        isFlipping.value = false
        previousValue.value = newVal
      }, 600)
    }
  }
)

onMounted(() => {
  displayValue.value = props.value
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
}

.flip-card-top,
.flip-card-bottom {
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
  backface-visibility: hidden;
}

.flip-card-top {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);
  transform-origin: bottom center;
}

.flip-card-bottom {
  bottom: 0;
  border-radius: 0 0 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  transform-origin: top center;
}

.flip-card-top span,
.flip-card-bottom span {
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

.flip-card-top span {
  transform: translateY(0);
}

.flip-card-bottom span {
  transform: translateY(-50%);
}

.flip-card-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.flip-card-back-top,
.flip-card-back-bottom {
  position: absolute;
  width: 100%;
  height: 50%;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.02) 50%,
    rgba(0, 0, 0, 0.08) 100%
  );
  border: 1px solid rgba(0, 0, 0, 0.1);
  backface-visibility: hidden;
}

.flip-card-back-top {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.2);
  transform-origin: bottom center;
  transform: rotateX(90deg);
}

.flip-card-back-bottom {
  bottom: 0;
  border-radius: 0 0 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  transform-origin: top center;
  transform: rotateX(-90deg);
}

.flip-card-back-top span,
.flip-card-back-bottom span {
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

.flip-card-back-top span {
  transform: translateY(0);
}

.flip-card-back-bottom span {
  transform: translateY(-50%);
}

.flip-card.flipping .flip-card-top {
  animation: flipTopFront 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.flip-card.flipping .flip-card-bottom {
  animation: flipBottomFront 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  animation-delay: 0.15s;
}

.flip-card.flipping .flip-card-back-top {
  animation: flipTopBack 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  animation-delay: 0.15s;
}

.flip-card.flipping .flip-card-back-bottom {
  animation: flipBottomBack 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes flipTopFront {
  0% {
    transform: rotateX(0deg);
  }
  100% {
    transform: rotateX(-90deg);
  }
}

@keyframes flipBottomFront {
  0% {
    transform: rotateX(0deg);
  }
  100% {
    transform: rotateX(90deg);
  }
}

@keyframes flipTopBack {
  0% {
    transform: rotateX(90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

@keyframes flipBottomBack {
  0% {
    transform: rotateX(-90deg);
  }
  100% {
    transform: rotateX(0deg);
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

.flip-card-gloss {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 50%;
  border-radius: 16px 16px 0 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 60%);
  pointer-events: none;
  z-index: 10;
}

.flip-card-inner::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.25);
  transform: translateY(-50%);
  z-index: 2;
  pointer-events: none;
}

.flip-card-inner::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.03) 0%,
    transparent 40%,
    rgba(0, 0, 0, 0.03) 100%
  );
  border-radius: 16px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .flip-card {
    width: 56px;
    height: 80px;
  }

  .flip-card-top span,
  .flip-card-bottom span,
  .flip-card-back-top span,
  .flip-card-back-bottom span {
    font-size: 52px;
  }
}

@media (max-width: 380px) {
  .flip-card {
    width: 48px;
    height: 68px;
  }

  .flip-card-top span,
  .flip-card-bottom span,
  .flip-card-back-top span,
  .flip-card-back-bottom span {
    font-size: 44px;
  }
}

@media (max-height: 568px) {
  .flip-card {
    width: 42px;
    height: 60px;
  }

  .flip-card-top span,
  .flip-card-bottom span,
  .flip-card-back-top span,
  .flip-card-back-bottom span {
    font-size: 38px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip-card.flipping .flip-card-top,
  .flip-card.flipping .flip-card-bottom,
  .flip-card.flipping .flip-card-back-top,
  .flip-card.flipping .flip-card-back-bottom {
    animation: none !important;
  }
}
</style>
