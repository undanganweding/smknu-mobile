import App from './App.vue'
import { createApp } from 'vue'
import { initStore } from './store'                 // Store
import { initRouter } from './router'               // Router
import language from './locales'                    // 国际化
import '@styles/core/tailwind.css'                  // tailwind
import '@styles/index.scss'                         // 样式
import '@utils/sys/console.ts'                      // 控制台输出内容
import { setupGlobDirectives } from './directives'
import { setupErrorHandle } from './utils/sys/error-handle'
import { seedDatabase } from './core/db/seedData'
import { reloadProtection } from './core/services/sync/ReloadProtection'
import { realtimeManager } from './core/services/realtime/RealtimeManager'
import { syncEngine } from './core/services/sync/SyncEngine'

document.addEventListener(
  'touchstart',
  function () {},
  { passive: true }
)

const app = createApp(App)
initStore(app)
initRouter(app)
setupGlobDirectives(app)
setupErrorHandle(app)

// Initialize Guru Offline Core Database (IndexedDB)
seedDatabase()
  .then(() => {
    // Install reload & tab close protection for unsynced mutations
    reloadProtection.install()
    // Initialize Supabase Realtime subscriptions
    realtimeManager.init()
    // Process initial pending mutations if online
    syncEngine.processQueue().catch(() => {})
  })
  .catch((err) => {
    console.error('[GuruOffline] Database bootstrap error:', err)
  })

app.use(language)
app.mount('#app')

// Register Service Worker for PWA Offline Hardening
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered successfully:', reg.scope)
      })
      .catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err)
      })
  })
}
