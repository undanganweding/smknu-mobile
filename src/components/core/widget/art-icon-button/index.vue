<!-- 按钮组件 -->
<template>
  <button
    type="button"
    :aria-label="ariaLabel || title || 'Tombol aksi'"
    :title="title"
    class="size-8.5 inline-flex flex-cc c-p text-g-600 dark:text-g-800 text-xl rounded-md transition-all duration-150 transform-gpu active:scale-95 hover:bg-hover-color focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-1 select-none border-none bg-transparent cursor-pointer p-0"
    :class="{ 'rounded-full': circle }"
  >
    <ArtSvgIcon :icon="icon" aria-hidden="true" />
    <slot></slot>
  </button>
</template>

<script lang="ts" setup>
  defineOptions({ name: 'ArtIconButton' })

  interface Props {
    /** 图标名称 */
    icon: string
    /** 圆角按钮 */
    circle?: boolean
    /** Aksesibilitas: Label pembaca layar */
    ariaLabel?: string
    /** Tooltip teks */
    title?: string
  }

  withDefaults(defineProps<Props>(), {
    ariaLabel: '',
    title: ''
  })
</script>
