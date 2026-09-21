<!-- 一个让 SVG 图片跟随主题的组件，只对特定 svg 图片生效，不建议开发者使用 -->
<!-- 图片地址 https://iconpark.oceanengine.com/illustrations/13 -->
<template>
  <div class="theme-svg" :style="sizeStyle">
    <div v-if="src" class="svg-container" v-html="svgContent"></div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watchEffect } from 'vue'

  interface Props {
    size?: string | number
    themeColor?: string
    src?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 500,
    themeColor: 'var(--el-color-primary)'
  })

  // Eagerly bundle local SVGs at build time for 100% offline support
  const rawSvgModules = import.meta.glob('@imgs/svg/*.svg', {
    query: '?raw',
    eager: true,
    import: 'default'
  }) as Record<string, string>

  const svgStringMap = new Map<string, string>()
  Object.entries(rawSvgModules).forEach(([path, content]) => {
    svgStringMap.set(path, content)
    const fileName = path.split('/').pop()
    if (fileName) {
      svgStringMap.set(fileName, content)
    }
  })

  const svgContent = ref('')

  // 计算样式
  const sizeStyle = computed(() => {
    const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size
    return {
      width: sizeValue,
      height: sizeValue
    }
  })

  // 颜色映射配置
  const COLOR_MAPPINGS = {
    '#C7DEFF': 'var(--el-color-primary-light-6)',
    '#071F4D': 'var(--el-color-primary-dark-2)',
    '#00E4E5': 'var(--el-color-primary-light-1)',
    '#006EFF': 'var(--el-color-primary)',
    '#fff': 'var(--default-box-color)',
    '#ffffff': 'var(--default-box-color)',
    '#DEEBFC': 'var(--el-color-primary-light-7)'
  } as const

  // 将主题色应用到 SVG 内容
  const applyThemeToSvg = (content: string): string => {
    return Object.entries(COLOR_MAPPINGS).reduce(
      (processedContent, [originalColor, themeColor]) => {
        const fillRegex = new RegExp(`fill="${originalColor}"`, 'gi')
        const strokeRegex = new RegExp(`stroke="${originalColor}"`, 'gi')

        return processedContent
          .replace(fillRegex, `fill="${themeColor}"`)
          .replace(strokeRegex, `stroke="${themeColor}"`)
      },
      content
    )
  }

  // 加载 SVG 文件内容
  const loadSvgContent = async () => {
    if (!props.src) {
      svgContent.value = ''
      return
    }

    // 1. Direct raw SVG markup
    if (props.src.trim().startsWith('<svg')) {
      svgContent.value = applyThemeToSvg(props.src)
      return
    }

    // 2. Check offline pre-bundled raw SVG map
    const matchedKey = Array.from(svgStringMap.keys()).find((k) => props.src?.includes(k))
    if (matchedKey && svgStringMap.has(matchedKey)) {
      const rawContent = svgStringMap.get(matchedKey)!
      svgContent.value = applyThemeToSvg(rawContent)
      return
    }

    // 3. Fallback to fetch for dynamic/external URLs
    try {
      const response = await fetch(props.src)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const content = await response.text()
      svgContent.value = applyThemeToSvg(content)
    } catch {
      // Graceful offline fallback without throwing unhandled console errors
      svgContent.value = ''
    }
  }

  watchEffect(() => {
    loadSvgContent()
  })
</script>

<style lang="scss" scoped>
  .theme-svg {
    display: inline-block;

    .svg-container {
      width: 100%;
      height: 100%;

      :deep(svg) {
        width: 100%;
        height: 100%;
      }
    }
  }
</style>
