/**
 * 组件加载器
 *
 * 负责动态加载 Vue 组件
 *
 * @module router/core/ComponentLoader
 * @author Art Design Pro Team
 */

import { h } from 'vue'
import AppLayout from '@/views/index/index.vue'

export class ComponentLoader {
  private modules: Record<string, () => Promise<any>>
  private prefetchedPaths: Set<string> = new Set()

  constructor() {
    // 动态导入生产视图组件，避免打包未引用的模板/演示组件
    this.modules = import.meta.glob([
      '../../views/admin/**/*.vue',
      '../../views/teacher/**/*.vue',
      '../../views/auth/**/*.vue',
      '../../views/exception/**/*.vue',
      '../../views/index/**/*.vue',
      '../../views/outside/**/*.vue'
    ])
  }

  /**
   * 预加载指定组件或路由模块（零延迟秒开）
   */
  prefetch(componentPath?: string | null): Promise<any> {
    if (!componentPath || typeof componentPath !== 'string') {
      return Promise.resolve()
    }

    if (this.prefetchedPaths.has(componentPath)) {
      return Promise.resolve()
    }

    this.prefetchedPaths.add(componentPath)

    if (componentPath === '/index/index') {
      return Promise.resolve(AppLayout)
    }

    const fullPath = `../../views${componentPath}.vue`
    const fullPathWithIndex = `../../views${componentPath}/index.vue`
    const loader = this.modules[fullPath] || this.modules[fullPathWithIndex]

    if (loader) {
      return loader().catch((err) => {
        console.warn(`[ComponentLoader] Prefetch failed for ${componentPath}:`, err)
      })
    }

    return Promise.resolve()
  }

  /**
   * 在后台闲时（Idle）平滑预热所有路由组件，实现侧边栏与页面零等待
   */
  prefetchAll(): void {
    const keys = Object.keys(this.modules)
    if (keys.length === 0 || typeof window === 'undefined') return

    let currentIndex = 0

    const scheduleNext = () => {
      if (currentIndex >= keys.length) return

      const key = keys[currentIndex++]
      const loader = this.modules[key]
      if (loader) {
        loader()
          .catch(() => {})
          .finally(() => {
            if ('requestIdleCallback' in window) {
              ;(window as any).requestIdleCallback(() => scheduleNext(), { timeout: 1200 })
            } else {
              setTimeout(scheduleNext, 25)
            }
          })
      } else {
        scheduleNext()
      }
    }

    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(() => scheduleNext(), { timeout: 1500 })
    } else {
      setTimeout(scheduleNext, 60)
    }
  }

  /**
   * 加载组件
   */
  load(componentPath: string | (() => Promise<any>)): () => Promise<any> {
    if (typeof componentPath === 'function') {
      return componentPath
    }

    if (!componentPath) {
      return this.createEmptyComponent()
    }

    if (componentPath === '/index/index') {
      return this.loadLayout()
    }

    // 构建可能的路径
    const fullPath = `../../views${componentPath}.vue`
    const fullPathWithIndex = `../../views${componentPath}/index.vue`

    // 先尝试直接路径，再尝试添加/index的路径
    const module = this.modules[fullPath] || this.modules[fullPathWithIndex]

    if (!module) {
      console.error(
        `[ComponentLoader] 未找到组件: ${componentPath}，尝试过的路径: ${fullPath} 和 ${fullPathWithIndex}`
      )
      return this.createErrorComponent(componentPath)
    }

    // 封装重试逻辑，防止网络瞬断或 HMR 刷新导致的动态模块加载失败
    return () => this.executeWithRetry(module, componentPath)
  }

  /**
   * 带重试机制的异步组件加载
   */
  private async executeWithRetry(
    loader: () => Promise<any>,
    componentPath: string,
    retries = 3,
    delay = 200
  ): Promise<any> {
    try {
      return await loader()
    } catch (err: any) {
      if (retries > 0) {
        console.warn(
          `[ComponentLoader] 加载组件 ${componentPath} 失败，剩余重试次数: ${retries}，${delay}ms 后重试...`,
          err
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.executeWithRetry(loader, componentPath, retries - 1, delay * 1.5)
      }
      console.error(`[ComponentLoader] 组件 ${componentPath} 加载最终失败:`, err)
      throw err
    }
  }

  /**
   * 加载布局组件
   */
  loadLayout(): () => Promise<any> {
    return () => Promise.resolve(AppLayout)
  }

  /**
   * 加载 iframe 组件
   */
  loadIframe(): () => Promise<any> {
    return () => import('@/views/outside/Iframe.vue')
  }

  /**
   * 创建空组件
   */
  private createEmptyComponent(): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', {})
        }
      })
  }

  /**
   * 创建错误提示组件
   */
  private createErrorComponent(componentPath: string): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', { class: 'route-error' }, `组件未找到: ${componentPath}`)
        }
      })
  }
}

export const componentLoader = new ComponentLoader()
