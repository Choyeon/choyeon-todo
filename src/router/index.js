import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import(/* webpackChunkName: "home" */ '../views/HomeView.vue')
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import(/* webpackChunkName: "calendar" */ '../views/CalendarView.vue')
  },
  {
    path: '/completed',
    name: 'Completed',
    component: () => import(/* webpackChunkName: "completed" */ '../views/CompletedView.vue')
  },
  {
    path: '/stats',
    name: 'Stats',
    component: () => import(/* webpackChunkName: "stats" */ '../views/StatsView.vue')
  },
  {
    path: '/pomodoro',
    name: 'Pomodoro',
    component: () => import(/* webpackChunkName: "pomodoro" */ '../views/PomodoroView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import(/* webpackChunkName: "settings" */ '../views/SettingsView.vue')
  },
  {
    path: '/pomodoro-fullscreen',
    name: 'PomodoroFullscreen',
    component: () =>
      import(/* webpackChunkName: "pomodoro-fullscreen" */ '../views/PomodoroFullscreenView.vue')
  },
  {
    path: '/pomodoro-fab',
    name: 'PomodoroFab',
    component: () => import(/* webpackChunkName: "pomodoro-fab" */ '../views/PomodoroFabView.vue')
  },
  {
    path: '/debug',
    name: 'Debug',
    component: () => import(/* webpackChunkName: "debug" */ '../views/DebugView.vue')
  },
  {
    path: '/error-monitor',
    name: 'ErrorMonitor',
    component: () => import(/* webpackChunkName: "error-monitor" */ '../views/ErrorMonitorView.vue')
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
