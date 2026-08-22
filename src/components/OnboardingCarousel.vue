<template>
  <Teleport to="body">
    <Transition name="ob-overlay">
      <div
        v-if="visible"
        class="ob-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('onboarding.step1Title')"
        @mousedown.self="skip"
      >
        <Transition appear name="ob-panel" @after-enter="afterEnter">
          <div
            v-if="visible"
            class="ob-panel"
            ref="panelRef"
            role="document"
          >
            <!-- 关闭按钮 -->
            <button
              class="ob-close"
              @click="skip"
              :aria-label="t('onboarding.skip')"
              type="button"
            >
              <X :size="18" />
            </button>

            <!-- 装饰 SVG 插图区 -->
            <div class="ob-stage">
              <div class="ob-stage-inner" :class="`stage-${step}`">
                <!-- 欢迎：五彩图形 -->
                <svg
                  v-if="step === 0"
                  viewBox="0 0 420 220"
                  class="ob-svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0%" stop-color="#60a5fa" />
                      <stop offset="100%" stop-color="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" x2="1">
                      <stop offset="0%" stop-color="#34d399" />
                      <stop offset="100%" stop-color="#22d3ee" />
                    </linearGradient>
                  </defs>
                  <rect x="40" y="50" width="140" height="110" rx="18" fill="url(#g1)" opacity="0.9"/>
                  <rect x="200" y="30" width="170" height="70" rx="14" fill="url(#g2)" opacity="0.85"/>
                  <rect x="200" y="110" width="170" height="56" rx="14" fill="#fbbf24" opacity="0.78"/>
                  <circle cx="90" cy="180" r="12" fill="#f87171"/>
                  <circle cx="130" cy="190" r="8" fill="#22c55e"/>
                  <circle cx="170" cy="182" r="10" fill="#38bdf8"/>
                </svg>

                <!-- 智能输入 -->
                <svg
                  v-if="step === 1"
                  viewBox="0 0 420 220"
                  class="ob-svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="ob-input-g" x1="0" x2="1">
                      <stop offset="0%" stop-color="#38bdf8" />
                      <stop offset="100%" stop-color="#818cf8" />
                    </linearGradient>
                  </defs>
                  <rect x="40" y="60" width="340" height="48" rx="14" fill="white" stroke="url(#ob-input-g)" stroke-width="2"/>
                  <text x="60" y="92" font-family="ui-sans-serif" font-size="15" fill="#334155">明天下午3点 开会 重要</text>
                  <g transform="translate(40,130)">
                    <rect width="110" height="38" rx="10" fill="#bae6fd"/>
                    <text x="12" y="24" font-family="ui-sans-serif" font-size="12" fill="#0369a1">📅 明天</text>
                  </g>
                  <g transform="translate(160,130)">
                    <rect width="110" height="38" rx="10" fill="#ddd6fe"/>
                    <text x="12" y="24" font-family="ui-sans-serif" font-size="12" fill="#5b21b6">⏰ 15:00</text>
                  </g>
                  <g transform="translate(280,130)">
                    <rect width="100" height="38" rx="10" fill="#fecaca"/>
                    <text x="12" y="24" font-family="ui-sans-serif" font-size="12" fill="#991b1b">⭐ 重要</text>
                  </g>
                </svg>

                <!-- 番茄钟 -->
                <svg
                  v-if="step === 2"
                  viewBox="0 0 420 220"
                  class="ob-svg"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="pom-g" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stop-color="#ef4444" />
                      <stop offset="100%" stop-color="#b91c1c" />
                    </radialGradient>
                  </defs>
                  <circle cx="210" cy="115" r="86" fill="url(#pom-g)"/>
                  <circle cx="210" cy="115" r="72" fill="#fff7ed" stroke="#fecaca" stroke-width="3"/>
                  <text x="210" y="130" text-anchor="middle" font-family="ui-monospace" font-size="40" font-weight="700" fill="#991b1b">25:00</text>
                  <g transform="translate(60, 60)">
                    <rect width="32" height="8" rx="3" fill="#fca5a5"/>
                    <rect y="14" width="40" height="8" rx="3" fill="#fca5a5" opacity="0.7"/>
                    <rect y="28" width="26" height="8" rx="3" fill="#fca5a5" opacity="0.5"/>
                  </g>
                  <g transform="translate(340, 60)">
                    <rect width="32" height="8" rx="3" fill="#86efac"/>
                    <rect y="14" width="40" height="8" rx="3" fill="#86efac" opacity="0.7"/>
                    <rect y="28" width="26" height="8" rx="3" fill="#86efac" opacity="0.5"/>
                  </g>
                  <!-- 番茄叶 -->
                  <path d="M210 28 q-8 -10 8 -14 q2 14 -8 14 z" fill="#16a34a"/>
                  <path d="M210 28 q8 -10 -8 -14 q-2 14 8 14 z" fill="#22c55e"/>
                </svg>

                <!-- 快捷键 -->
                <svg
                  v-if="step === 3"
                  viewBox="0 0 420 220"
                  class="ob-svg"
                  aria-hidden="true"
                >
                  <g>
                    <g transform="translate(40, 40)">
                      <rect width="80" height="32" rx="8" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1"/>
                      <text x="40" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#3730a3">Ctrl</text>
                    </g>
                    <g transform="translate(130, 40)">
                      <rect width="60" height="32" rx="8" fill="#dbeafe" stroke="#93c5fd" stroke-width="1"/>
                      <text x="30" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#1d4ed8">N</text>
                    </g>
                    <g transform="translate(200, 46)">
                      <text font-family="ui-sans-serif" font-size="13" fill="#334155">新建任务</text>
                    </g>
                  </g>
                  <g>
                    <g transform="translate(40, 86)">
                      <rect width="80" height="32" rx="8" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1"/>
                      <text x="40" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#3730a3">Ctrl</text>
                    </g>
                    <g transform="translate(130, 86)">
                      <rect width="60" height="32" rx="8" fill="#dcfce7" stroke="#86efac" stroke-width="1"/>
                      <text x="30" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#166534">K</text>
                    </g>
                    <g transform="translate(200, 92)">
                      <text font-family="ui-sans-serif" font-size="13" fill="#334155">命令面板</text>
                    </g>
                  </g>
                  <g>
                    <g transform="translate(40, 132)">
                      <rect width="32" height="32" rx="8" fill="#fee2e2" stroke="#fca5a5" stroke-width="1"/>
                      <text x="16" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#991b1b">J</text>
                    </g>
                    <g transform="translate(80, 132)">
                      <rect width="32" height="32" rx="8" fill="#dcfce7" stroke="#86efac" stroke-width="1"/>
                      <text x="16" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#166534">K</text>
                    </g>
                    <g transform="translate(122, 132)">
                      <rect width="60" height="32" rx="8" fill="#fef3c7" stroke="#fcd34d" stroke-width="1"/>
                      <text x="30" y="21" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#92400e">Space</text>
                    </g>
                    <g transform="translate(192, 138)">
                      <text font-family="ui-sans-serif" font-size="13" fill="#334155">上下移动 / 完成</text>
                    </g>
                  </g>
                  <g>
                    <g transform="translate(40, 178)">
                      <rect width="80" height="32" rx="8" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="1"/>
                      <text x="40" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#3730a3">Ctrl</text>
                    </g>
                    <g transform="translate(130, 178)">
                      <rect width="40" height="32" rx="8" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1"/>
                      <text x="20" y="21" text-anchor="middle" font-family="ui-monospace" font-size="12" font-weight="700" fill="#9d174d">/</text>
                    </g>
                    <g transform="translate(180, 184)">
                      <text font-family="ui-sans-serif" font-size="13" fill="#334155">查看全部快捷键</text>
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            <!-- 文字内容 -->
            <div class="ob-body">
              <h2 class="ob-title" :key="`t-${step}`">
                {{ stepTitle }}
              </h2>
              <p class="ob-desc" :key="`d-${step}`">
                {{ stepDesc }}
              </p>
            </div>

            <!-- 进度指示器 -->
            <div class="ob-dots" role="tablist" :aria-label="t('onboarding.title')">
              <button
                v-for="(d, i) in totalSteps"
                :key="i"
                type="button"
                class="ob-dot"
                :class="{ active: i === step }"
                :aria-label="`Step ${i + 1}`"
                role="tab"
                :aria-selected="i === step"
                @click="goto(i)"
              />
            </div>

            <!-- 底部按钮 -->
            <div class="ob-footer">
              <button
                v-if="step < totalSteps - 1"
                type="button"
                class="ob-btn ob-btn-ghost"
                @click="skip"
              >
                {{ t('onboarding.skip') }}
              </button>
              <div v-else style="flex:1" />

              <button
                v-if="step > 0"
                type="button"
                class="ob-btn ob-btn-secondary"
                @click="prev"
                :aria-label="t('onboarding.prev')"
              >
                <ChevronLeft :size="16" />
                <span>{{ t('onboarding.prev') }}</span>
              </button>

              <button
                v-if="step < totalSteps - 1"
                type="button"
                class="ob-btn ob-btn-primary"
                @click="next"
                :aria-label="t('onboarding.next')"
              >
                <span>{{ t('onboarding.next') }}</span>
                <ChevronRight :size="16" />
              </button>
              <button
                v-else
                type="button"
                class="ob-btn ob-btn-primary"
                @click="finish"
                :aria-label="t('onboarding.finish')"
              >
                <Rocket :size="16" />
                <span>{{ t('onboarding.finish') }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineExpose } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, ChevronLeft, ChevronRight, Rocket } from '@lucide/vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useCommandPalette } from '../composables/useCommandPalette'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const { open: openPalette } = useCommandPalette({ registerGlobalShortcut: false })

const panelRef = ref(null)
const visible = ref(false)
const step = ref(0)
const totalSteps = 4

const stepTitle = computed(() => t(`onboarding.step${step.value + 1}Title`))
const stepDesc = computed(() => t(`onboarding.step${step.value + 1}Desc`))

const showIfFirstRun = () => {
  // 必须等 settingsStore 加载完（由外部在 onMounted 后触发）
  if (settingsStore.isFirstRun) {
    visible.value = true
    step.value = 0
  }
}

const hide = () => (visible.value = false)

const next = () => {
  if (step.value < totalSteps - 1) step.value++
}
const prev = () => {
  if (step.value > 0) step.value--
}
const goto = (i) => {
  if (i >= 0 && i < totalSteps) step.value = i
}
const skip = async () => {
  hide()
  await flushSafe()
  settingsStore.finishFirstRun()
}
const finish = async () => {
  hide()
  await flushSafe()
  settingsStore.finishFirstRun()
  // 贴心展示一次命令面板
  try { openPalette() } catch (_e) { /* ignore */ }
}
const flushSafe = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

const afterEnter = () => {
  // 焦点管理：让用户可直接键盘翻页
  panelRef.value?.focus?.()
}

const onKeydown = (e) => {
  if (!visible.value) return
  switch (e.key) {
    case 'ArrowRight': case 'PageDown':
      e.preventDefault(); next(); break
    case 'ArrowLeft': case 'PageUp':
      e.preventDefault(); prev(); break
    case 'Escape':
      e.preventDefault(); skip(); break
    case 'Enter': case ' ':
      if (e.target?.tagName === 'BUTTON') return // 交给按钮默认行为
      e.preventDefault()
      if (step.value < totalSteps - 1) next()
      else finish()
      break
  }
}

// 全局监听：仅在组件挂载时注册一次
onMounted(() => {
  // 监听 isFirstRun（异步加载后再显示）
  watch(
    () => settingsStore.isFirstRun,
    (v) => {
      if (v === true && !visible.value) showIfFirstRun()
    },
    { immediate: true }
  )
  window.addEventListener('keydown', onKeydown)
})

// 不做组件卸载清理：作为全局组件保持常驻

defineExpose({
  show: () => { visible.value = true; step.value = 0 },
  hide,
  skip,
  finish
})
</script>

<style scoped>
.ob-overlay {
  position: fixed;
  inset: 0;
  background: radial-gradient(
    ellipse at top,
    rgba(37, 99, 235, 0.18),
    rgba(15, 23, 42, 0.55)
  );
  backdrop-filter: blur(8px) saturate(1.1);
  -webkit-backdrop-filter: blur(8px) saturate(1.1);
  z-index: 9996;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ob-panel {
  width: min(520px, 96vw);
  max-height: 92vh;
  overflow: hidden;
  position: relative;
  border-radius: 22px;
  background: var(--ob-bg, #ffffff);
  color: var(--ob-text, #0f172a);
  border: 1px solid var(--ob-border, rgba(15, 23, 42, 0.06));
  box-shadow:
    0 30px 80px -20px rgba(15, 23, 42, 0.4),
    0 10px 24px -12px rgba(15, 23, 42, 0.2);
  font-family: var(--font-body, system-ui, -apple-system, sans-serif);
}
html[data-theme='dark'] .ob-panel {
  --ob-bg: #141820;
  --ob-text: #e5e7eb;
  --ob-border: rgba(255, 255, 255, 0.08);
  --ob-muted: #94a3b8;
}
:not(html[data-theme='dark']) .ob-panel {
  --ob-muted: #64748b;
}

.ob-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: none;
  background: rgba(127, 127, 127, 0.08);
  color: var(--ob-muted);
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
  z-index: 2;
}
.ob-close:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  transform: rotate(90deg);
}
.ob-close:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

/* ---- Stage / SVG ---- */
.ob-stage {
  padding: 32px 24px 8px 24px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.06), transparent 70%);
}
.ob-stage-inner {
  border-radius: 18px;
  background:
    radial-gradient(circle at 20% 10%, rgba(59, 130, 246, 0.08), transparent 60%),
    radial-gradient(circle at 80% 90%, rgba(139, 92, 246, 0.08), transparent 60%);
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ob-svg {
  width: 100%;
  height: 100%;
  display: block;
}
html[data-theme='dark'] .ob-svg text { fill: #cbd5e1; }

/* stage entrance animations per step */
.stage-0 .ob-svg rect, .stage-0 .ob-svg circle { animation: ob-pop 520ms both; transform-origin: center; }
.stage-0 .ob-svg rect:nth-child(1) { animation-delay: 40ms; }
.stage-0 .ob-svg rect:nth-child(2) { animation-delay: 160ms; }
.stage-0 .ob-svg rect:nth-child(3) { animation-delay: 280ms; }
.stage-0 .ob-svg circle:nth-child(4) { animation-delay: 400ms; }
.stage-0 .ob-svg circle:nth-child(5) { animation-delay: 460ms; }
.stage-0 .ob-svg circle:nth-child(6) { animation-delay: 520ms; }

.stage-1 .ob-svg > *:not(defs) { animation: ob-rise 520ms both; }
.stage-1 .ob-svg rect[fill="white"] { animation-delay: 30ms; }
.stage-1 .ob-svg text { animation-delay: 120ms; }
.stage-1 .ob-svg g:nth-of-type(1) rect { animation-delay: 220ms; }
.stage-1 .ob-svg g:nth-of-type(2) rect { animation-delay: 300ms; }
.stage-1 .ob-svg g:nth-of-type(3) rect { animation-delay: 380ms; }

.stage-2 .ob-svg circle, .stage-2 .ob-svg path { animation: ob-pop 520ms both; transform-origin: center; }
.stage-2 .ob-svg text { animation: ob-pop 480ms 200ms both; }

.stage-3 .ob-svg g { animation: ob-rise 520ms both; }
.stage-3 .ob-svg > g:nth-of-type(1) { animation-delay: 20ms; }
.stage-3 .ob-svg > g:nth-of-type(2) { animation-delay: 120ms; }
.stage-3 .ob-svg > g:nth-of-type(3) { animation-delay: 220ms; }
.stage-3 .ob-svg > g:nth-of-type(4) { animation-delay: 320ms; }

@keyframes ob-pop {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ob-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Body text ---- */
.ob-body {
  padding: 20px 32px 8px 32px;
  text-align: center;
}
.ob-title {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  animation: ob-rise 380ms ease;
}
.ob-desc {
  margin: 0;
  color: var(--ob-muted);
  font-size: 14px;
  line-height: 1.6;
  animation: ob-rise 480ms 60ms ease both;
}

/* ---- Dots ---- */
.ob-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 0 6px 0;
}
.ob-dot {
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.22);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: width 0.28s ease, background 0.2s ease;
}
.ob-dot:hover { background: rgba(59, 130, 246, 0.4); }
.ob-dot.active {
  width: 26px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

/* ---- Footer buttons ---- */
.ob-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 24px 20px;
}
.ob-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.1s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  font-family: inherit;
  white-space: nowrap;
}
.ob-btn:active { transform: translateY(1px); }
.ob-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
}
.ob-btn-ghost {
  background: transparent;
  color: var(--ob-muted);
  border-color: transparent;
}
.ob-btn-ghost:hover {
  color: var(--ob-text);
  background: rgba(127, 127, 127, 0.08);
}
.ob-btn-secondary {
  background: rgba(127, 127, 127, 0.06);
  color: var(--ob-text);
  border-color: rgba(127, 127, 127, 0.18);
}
.ob-btn-secondary:hover {
  background: rgba(127, 127, 127, 0.12);
}
.ob-btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 10px 20px -12px rgba(59, 130, 246, 0.6);
}
.ob-btn-primary:hover {
  box-shadow: 0 14px 26px -12px rgba(59, 130, 246, 0.72);
  transform: translateY(-1px);
}

/* ---- Transitions ---- */
.ob-overlay-enter-active,
.ob-overlay-leave-active {
  transition: opacity 220ms ease;
}
.ob-overlay-enter-from,
.ob-overlay-leave-to { opacity: 0; }

.ob-panel-enter-active {
  transition:
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 280ms ease;
}
.ob-panel-leave-active {
  transition:
    transform 180ms ease-in,
    opacity 200ms ease;
}
.ob-panel-enter-from {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}
.ob-panel-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.98);
}

/* ---- mobile ---- */
@media (max-width: 560px) {
  .ob-stage-inner { height: 180px; }
  .ob-body { padding: 16px 20px 4px; }
  .ob-title { font-size: 20px; }
  .ob-footer { padding: 12px 14px 18px; flex-wrap: wrap; }
  .ob-btn { padding: 9px 12px; font-size: 13px; }
}
</style>
