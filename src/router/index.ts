import type { App } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { staticRoutes } from './routes/staticRoutes'
import { configureNProgress } from '@/utils/router'
import { setupBeforeEachGuard } from './guards/beforeEach'
import { setupAfterEachGuard } from './guards/afterEach'

// 创建路由实例
export const router = createRouter({
  history: createWebHashHistory(),
  routes: staticRoutes // 静态路由
})

// 监听动态导入模块错误并优雅恢复
router.onError((error, to) => {
  const errorMessage = error?.message || ''
  if (
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    errorMessage.includes('Importing a module script failed') ||
    errorMessage.includes('error loading dynamically imported module')
  ) {
    console.warn('[Router] Dynamic import failed, recovering gracefully...', error)
    if (to?.fullPath) {
      const targetHash = '#' + to.fullPath
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash
      }
      window.location.reload()
    } else {
      window.location.reload()
    }
  }
})

// 初始化路由
export function initRouter(app: App<Element>): void {
  configureNProgress() // 顶部进度条
  setupBeforeEachGuard(router) // 路由前置守卫
  setupAfterEachGuard(router) // 路由后置守卫
  app.use(router)
}

// 主页路径，默认使用菜单第一个有效路径，配置后使用此路径
export const HOME_PAGE_PATH = ''
