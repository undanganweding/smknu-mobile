<!-- 布局内容 -->
<template>
  <div class="layout-content" :class="{ 'overflow-auto': isFullPage }" :style="containerStyle">
    <div id="app-content-header">
      <!-- 节日滚动 -->
      <ArtFestivalTextScroll v-if="!isFullPage" />

      <!-- 路由信息调试 -->
      <div
        v-if="isOpenRouteInfo === 'true'"
        class="px-2 py-1.5 mb-3 text-sm text-g-500 bg-g-200 border-full-d rounded-md"
      >
        router meta：{{ route.meta }}
      </div>
    </div>

    <div
      v-if="hasPageError"
      class="p-8 text-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 my-6 mx-4"
    >
      <div class="text-amber-500 text-4xl mb-3">⚠️</div>
      <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
        Gagal Memuat Tampilan Halaman
      </h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
        {{ pageErrorMessage || 'Terjadi kesalahan tidak terduga saat menampilkan komponen ini.' }}
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          @click="resetPageError"
          class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          Muat Ulang Halaman Ini
        </button>
      </div>
    </div>

    <RouterView v-else-if="isRefresh" v-slot="{ Component, route }" :style="contentStyle">
      <Transition :name="showTransitionMask ? '' : actualTransition" mode="out-in" appear>
        <KeepAlive v-if="route.meta?.keepAlive" :max="60" :exclude="keepAliveExclude">
          <div :key="route.fullPath" class="w-full h-full">
            <component class="art-page-view" :is="Component" v-if="Component" />
          </div>
        </KeepAlive>
        <div v-else :key="route.fullPath" class="w-full h-full">
          <component class="art-page-view" :is="Component" v-if="Component" />
        </div>
      </Transition>
    </RouterView>

    <!-- 全屏页面切换过渡遮罩（用于提升页面切换视觉体验） -->
    <Teleport to="body">
      <div
        v-show="showTransitionMask"
        class="fixed top-0 left-0 z-[2000] w-screen h-screen pointer-events-none bg-box"
      />
    </Teleport>
  </div>
</template>
<script setup lang="ts">
  import { ref, shallowRef, computed, watch, onMounted, nextTick, onErrorCaptured } from 'vue'
  import type { CSSProperties } from 'vue'
  import { useRoute } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useAutoLayoutHeight } from '@/hooks/core/useLayoutHeight'
  import { useSettingStore } from '@/store/modules/setting'
  import { useWorktabStore } from '@/store/modules/worktab'

  defineOptions({ name: 'ArtPageContent' })

  const route = useRoute()
  const { containerMinHeight } = useAutoLayoutHeight()
  const { pageTransition, containerWidth, refresh } = storeToRefs(useSettingStore())
  const { keepAliveExclude } = storeToRefs(useWorktabStore())

  const isRefresh = shallowRef(true)
  const isOpenRouteInfo = import.meta.env.VITE_OPEN_ROUTE_INFO
  const showTransitionMask = ref(false)

  // 错误边界状态
  const hasPageError = ref(false)
  const pageErrorMessage = ref('')

  onErrorCaptured((err: any, _instance, info) => {
    console.error('[ArtPageContent] Captured component error:', err, info)
    hasPageError.value = true
    pageErrorMessage.value =
      err?.message || 'Terjadi kesalahan tidak terduga saat memuat halaman ini.'
    return false // Prevent error from bubbling up and causing blank layout
  })

  const resetPageError = () => {
    hasPageError.value = false
    pageErrorMessage.value = ''
    reload()
  }

  // Clear page error on route navigation
  watch(
    () => route.fullPath,
    () => {
      hasPageError.value = false
      pageErrorMessage.value = ''
    }
  )

  // 标记是否是首次加载（浏览器刷新）
  const isFirstLoad = ref(true)

  // 检查当前路由是否需要使用无基础布局模式
  const isFullPage = computed(() => route.matched.some((r) => r.meta?.isFullPage))
  const prevIsFullPage = ref(isFullPage.value)

  // 切换动画名称：首次加载、从全屏返回时不使用动画
  const actualTransition = computed(() => {
    if (isFirstLoad.value) return ''
    if (prevIsFullPage.value && !isFullPage.value) return ''
    return pageTransition.value
  })

  // 监听全屏状态变化，显示过渡遮罩
  watch(isFullPage, (val, oldVal) => {
    if (val !== oldVal) {
      showTransitionMask.value = true
      // 延迟隐藏遮罩，给足时间让页面完成切换
      setTimeout(() => {
        showTransitionMask.value = false
      }, 50)
    }

    nextTick(() => {
      prevIsFullPage.value = val
    })
  })

  const containerStyle = computed((): CSSProperties =>
    isFullPage.value
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 2500,
          background: 'var(--default-bg-color)'
        }
      : {
          maxWidth: containerWidth.value
        }
  )

  const contentStyle = computed((): CSSProperties => ({
    minHeight: containerMinHeight.value
  }))

  const reload = () => {
    isRefresh.value = false
    nextTick(() => {
      isRefresh.value = true
    })
  }

  watch(refresh, reload, { flush: 'post' })

  // 组件挂载后标记首次加载完成
  onMounted(() => {
    // 延迟一帧，确保首次渲染完成
    nextTick(() => {
      isFirstLoad.value = false
    })
  })
</script>
