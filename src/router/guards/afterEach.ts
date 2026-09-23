import { Router } from 'vue-router'
import NProgress from 'nprogress'
import { useCommon } from '@/hooks/core/useCommon'
import { loadingService } from '@/utils/ui'
import { getPendingLoading, resetPendingLoading } from './beforeEach'

/** 路由全局后置守卫 */
export function setupAfterEachGuard(router: Router) {
  const { scrollToTop } = useCommon()

  router.afterEach(() => {
    scrollToTop()

    // 完成顶部进度条动画
    NProgress.done()

    // 关闭 loading 效果
    loadingService.hideLoading()
    if (getPendingLoading()) {
      resetPendingLoading()
    }
  })
}
