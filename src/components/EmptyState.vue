<template>
  <div class="empty-state">
    <div class="empty-illustration">
      <svg
        v-if="type === 'today'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="100"
          cy="55"
          r="28"
          :stroke="primaryColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <g :stroke="primaryColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="100" y1="12" x2="100" y2="22" />
          <line x1="100" y1="88" x2="100" y2="98" />
          <line x1="57" y1="55" x2="67" y2="55" />
          <line x1="133" y1="55" x2="143" y2="55" />
          <line x1="70" y1="25" x2="77" y2="32" />
          <line x1="123" y1="78" x2="130" y2="85" />
          <line x1="70" y1="85" x2="77" y2="78" />
          <line x1="123" y1="32" x2="130" y2="25" />
        </g>
        <rect
          x="55"
          y="100"
          width="90"
          height="50"
          rx="6"
          :stroke="secondaryColor"
          stroke-width="2"
          fill="none"
        />
        <line
          x1="70"
          y1="115"
          x2="130"
          y2="115"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"
        />
        <line
          x1="70"
          y1="128"
          x2="115"
          y2="128"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"
        />
        <line
          x1="70"
          y1="141"
          x2="100"
          y2="141"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.3"
        />
      </svg>

      <svg
        v-else-if="type === 'important'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="starGrad"
            x1="100"
            y1="20"
            x2="100"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="var(--state-warning)" stop-opacity="0.15" />
            <stop offset="1" stop-color="var(--state-warning)" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="80" r="55" fill="url(#starGrad)" />
        <path
          d="M100 38L107.5 62L133 66L113 84L120 109L100 96L80 109L87 84L67 66L92.5 62L100 38Z"
          :stroke="accentColor"
          stroke-width="2"
          stroke-linejoin="round"
          :fill="accentColor"
          fill-opacity="0.1"
        />
      </svg>

      <svg
        v-else-if="type === 'planned'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="40"
          y="25"
          width="120"
          height="110"
          rx="8"
          :stroke="primaryColor"
          stroke-width="2.5"
          fill="none"
        />
        <line x1="40" y1="55" x2="160" y2="55" :stroke="primaryColor" stroke-width="2.5" />
        <line
          x1="70"
          y1="25"
          x2="70"
          y2="40"
          :stroke="primaryColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <line
          x1="130"
          y1="25"
          x2="130"
          y2="40"
          :stroke="primaryColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <g :stroke="secondaryColor" stroke-width="2" stroke-linecap="round" opacity="0.4">
          <line x1="60" y1="75" x2="75" y2="75" />
          <line x1="85" y1="75" x2="100" y2="75" />
          <line x1="110" y1="75" x2="125" y2="75" />
          <line x1="135" y1="75" x2="140" y2="75" />
          <line x1="60" y1="95" x2="75" y2="95" />
          <line x1="85" y1="95" x2="100" y2="95" />
          <line x1="110" y1="95" x2="125" y2="95" />
          <line x1="135" y1="95" x2="140" y2="95" />
          <line x1="60" y1="115" x2="75" y2="115" />
          <line x1="85" y1="115" x2="100" y2="115" />
          <line x1="110" y1="115" x2="125" y2="115" />
          <line x1="135" y1="115" x2="140" y2="115" />
        </g>
        <circle
          cx="100"
          cy="105"
          r="18"
          :stroke="primaryColor"
          stroke-width="2"
          fill="none"
          stroke-dasharray="4 3"
        />
      </svg>

      <svg
        v-else-if="type === 'search'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="85" cy="70" r="40" :stroke="primaryColor" stroke-width="2.5" fill="none" />
        <line
          x1="115"
          y1="100"
          x2="150"
          y2="135"
          :stroke="primaryColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <line
          x1="65"
          y1="55"
          x2="105"
          y2="55"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.4"
        />
        <line
          x1="65"
          y1="70"
          x2="95"
          y2="70"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.4"
        />
        <line
          x1="65"
          y1="85"
          x2="100"
          y2="85"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.4"
        />
        <circle cx="100" cy="130" r="3" :fill="secondaryColor" opacity="0.3" />
        <circle cx="120" cy="125" r="2" :fill="secondaryColor" opacity="0.2" />
        <circle cx="80" cy="135" r="2" :fill="secondaryColor" opacity="0.2" />
      </svg>

      <svg
        v-else-if="type === 'completed'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="60" r="40" :stroke="successColor" stroke-width="2.5" fill="none" />
        <path
          d="M82 60L95 73L120 48"
          :stroke="successColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M82 60L95 73L120 48"
          :stroke="successColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.3"
          transform="translate(0 8)"
        />
        <rect
          x="50"
          y="115"
          width="100"
          height="35"
          rx="6"
          :stroke="secondaryColor"
          stroke-width="2"
          fill="none"
        />
        <line
          x1="65"
          y1="128"
          x2="135"
          y2="128"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"
        />
        <line
          x1="65"
          y1="142"
          x2="110"
          y2="142"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.3"
        />
      </svg>

      <svg
        v-else-if="type === 'category'"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M35 45H85L100 60H165V125C165 131.627 159.627 137 153 137H47C40.3726 137 35 131.627 35 125V45Z"
          :stroke="primaryColor"
          stroke-width="2.5"
          fill="none"
          stroke-linejoin="round"
        />
        <path
          d="M35 45H85L100 60H165"
          :stroke="primaryColor"
          stroke-width="2.5"
          fill="none"
          stroke-linejoin="round"
          opacity="0.5"
        />
        <line
          x1="55"
          y1="85"
          x2="90"
          y2="85"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"
        />
        <line
          x1="55"
          y1="102"
          x2="120"
          y2="102"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.4"
        />
        <line
          x1="55"
          y1="119"
          x2="100"
          y2="119"
          :stroke="secondaryColor"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.3"
        />
      </svg>
    </div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-desc">{{ description }}</p>
    <button v-if="actionLabel" class="empty-action-btn" @click="$emit('action')">
      <Plus v-if="actionIcon === 'plus'" :size="18" />
      {{ actionLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Plus } from '@lucide/vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (val) =>
      ['today', 'important', 'planned', 'search', 'completed', 'category', 'default'].includes(val)
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  actionLabel: {
    type: String,
    default: ''
  },
  actionIcon: {
    type: String,
    default: 'plus'
  }
})

defineEmits(['action'])

const primaryColor = 'var(--color-primary)'
const secondaryColor = 'var(--color-text-tertiary)'
const accentColor = 'var(--state-warning)'
const successColor = 'var(--state-success)'
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: emptyFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes emptyFadeIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.empty-illustration {
  width: 200px;
  height: 160px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: emptyFloat 6s ease-in-out infinite;
}

@keyframes emptyFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.empty-illustration svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: var(--font-size-h3);
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0 0 8px 0;
  font-family: var(--font-title);
  letter-spacing: -0.2px;
  animation: emptySlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
}

@keyframes emptySlideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.empty-desc {
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
  margin: 0 0 20px 0;
  font-weight: 400;
  line-height: 1.5;
  max-width: 280px;
  animation: emptySlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
}

.empty-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-size: var(--font-size-body);
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  border: none;
  transition:
    background 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  animation: emptySlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
}

.empty-action-btn:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.empty-action-btn:active {
  background: var(--color-primary-darker);
  transform: translateY(0);
}

.empty-action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-ring);
}

@media (max-width: 767px) {
  .empty-state {
    padding: 40px 16px;
  }

  .empty-illustration {
    width: 160px;
    height: 128px;
    margin-bottom: 20px;
  }
}
</style>
