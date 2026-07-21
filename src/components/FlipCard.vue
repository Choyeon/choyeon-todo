<template>
  <div class="flip-card" :class="{ flip: isFlipping }" :data-value="displayValue">
    <div class="flip-card-inner">
      <div class="flip-card-card1">
        <span>{{ nextValue }}</span>
      </div>
      <div class="flip-card-card2">
        <span>{{ nextValue }}</span>
      </div>
      <div class="flip-card-card3">
        <span>{{ displayValue }}</span>
      </div>
      <div class="flip-card-card4">
        <span>{{ displayValue }}</span>
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
      }, 400)
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
  z-index: 10;
  pointer-events: none;
}

.flip-card-card1,
.flip-card-card2,
.flip-card-card3,
.flip-card-card4 {
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

.flip-card-card1 {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);
  z-index: 1;
}

.flip-card-card2 {
  top: 50%;
  border-radius: 0 0 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  transform-origin: center top;
  transform: rotateX(180deg);
  z-index: 2;
}

.flip-card-card3 {
  top: 0;
  border-radius: 16px 16px 0 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);
  transform-origin: center bottom;
  z-index: 3;
}

.flip-card-card4 {
  top: 50%;
  border-radius: 0 0 16px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 1;
}

.flip-card-card1 span,
.flip-card-card3 span {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 68px;
  font-weight: 200;
  color: var(--color-text-primary);
  line-height: 100px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.flip-card-card2 span,
.flip-card-card4 span {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 68px;
  font-weight: 200;
  color: var(--color-text-primary);
  line-height: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.flip-card.flip .flip-card-card2 {
  animation: flipCard2 0.4s ease-in-out forwards;
}

.flip-card.flip .flip-card-card3 {
  animation: flipCard3 0.4s ease-in-out forwards;
}

@keyframes flipCard2 {
  0% {
    transform: rotateX(180deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}

@keyframes flipCard3 {
  0% {
    transform: rotateX(0deg);
  }
  100% {
    transform: rotateX(-180deg);
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

@media (max-width: 768px) {
  .flip-card {
    width: 56px;
    height: 80px;
  }

  .flip-card-card1 span,
  .flip-card-card2 span,
  .flip-card-card3 span,
  .flip-card-card4 span {
    font-size: 52px;
  }

  .flip-card-card1 span,
  .flip-card-card3 span {
    line-height: 80px;
  }
}

@media (max-width: 380px) {
  .flip-card {
    width: 48px;
    height: 68px;
  }

  .flip-card-card1 span,
  .flip-card-card2 span,
  .flip-card-card3 span,
  .flip-card-card4 span {
    font-size: 44px;
  }

  .flip-card-card1 span,
  .flip-card-card3 span {
    line-height: 68px;
  }
}

@media (max-height: 568px) {
  .flip-card {
    width: 42px;
    height: 60px;
  }

  .flip-card-card1 span,
  .flip-card-card2 span,
  .flip-card-card3 span,
  .flip-card-card4 span {
    font-size: 38px;
  }

  .flip-card-card1 span,
  .flip-card-card3 span {
    line-height: 60px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flip-card.flip .flip-card-card2,
  .flip-card.flip .flip-card-card3 {
    animation: none !important;
  }
}
</style>
