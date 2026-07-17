import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/CalendarView.vue')
  },
  {
    path: '/completed',
    name: 'Completed',
    component: () => import('../views/CompletedView.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import('../views/StatsView.vue')
  },
  {
    path: '/pomodoro',
    name: 'Pomodoro',
    component: () => import('../views/PomodoroView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue')
  },
  {
    path: '/pomodoro-fullscreen',
    name: 'PomodoroFullscreen',
    component: () => import('../views/PomodoroFullscreenView.vue')
  },
  {
    path: '/pomodoro-fab',
    name: 'PomodoroFab',
    component: () => import('../views/PomodoroFabView.vue')
  },
  {
    path: '/debug',
    name: 'Debug',
    component: () => import('../views/DebugView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

export default router
