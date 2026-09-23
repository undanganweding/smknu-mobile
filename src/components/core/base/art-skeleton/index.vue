<!-- 
  ArtSkeleton: Reusable skeleton loader for Data Tables, List Views, and Card Grids.
  Provides instant visual feedback during async data fetching with smooth shimmer animation and zero layout shift.
-->
<template>
  <!-- When loading is finished and default slot is present, render actual content -->
  <div v-if="!loading && $slots.default" class="art-skeleton-loaded">
    <slot />
  </div>

  <!-- Skeleton Placeholder View -->
  <div
    v-else
    class="art-skeleton-wrapper"
    :class="[
      `art-skeleton-${type}`,
      { 'is-animated': animated, 'is-compact': compact },
      customClass
    ]"
    role="status"
    aria-busy="true"
    aria-label="Memuat data..."
  >
    <!-- 1. DATA TABLE SKELETON -->
    <template v-if="type === 'table'">
      <div class="art-skeleton-table-container">
        <!-- Optional Top Search & Filter Toolbar -->
        <div v-if="showToolbar" class="art-skeleton-toolbar">
          <div class="toolbar-left">
            <div class="skeleton-bone bone-input"></div>
            <div class="skeleton-bone bone-select"></div>
            <div class="skeleton-bone bone-select hidden md:block"></div>
          </div>
          <div class="toolbar-right">
            <div class="skeleton-bone bone-btn"></div>
          </div>
        </div>

        <!-- Table Structure -->
        <div class="art-skeleton-table">
          <!-- Table Header -->
          <div v-if="showHeader" class="art-skeleton-thead">
            <div class="art-skeleton-tr thead-tr">
              <div
                v-for="colIdx in normalizedColumns"
                :key="`th-${colIdx}`"
                class="art-skeleton-th"
                :style="getColumnStyle(colIdx - 1)"
              >
                <div
                  class="skeleton-bone bone-th"
                  :style="{ width: getHeaderBoneWidth(colIdx - 1) }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Table Body Rows -->
          <div class="art-skeleton-tbody">
            <div
              v-for="rowIdx in rows"
              :key="`tr-${rowIdx}`"
              class="art-skeleton-tr tbody-tr"
              :class="{ 'is-stripe': stripe && rowIdx % 2 === 0 }"
            >
              <div
                v-for="colIdx in normalizedColumns"
                :key="`td-${rowIdx}-${colIdx}`"
                class="art-skeleton-td"
                :style="getColumnStyle(colIdx - 1)"
              >
                <!-- Index Column -->
                <template v-if="colIdx === 1 && showIndexColumn">
                  <div class="skeleton-bone bone-index"></div>
                </template>

                <!-- Action Buttons Column -->
                <template v-else-if="colIdx === normalizedColumns && showActionColumn">
                  <div class="flex items-center gap-2 justify-end">
                    <div class="skeleton-bone bone-btn-sm"></div>
                    <div class="skeleton-bone bone-btn-sm"></div>
                  </div>
                </template>

                <!-- Avatar with Text Column -->
                <template v-else-if="isAvatarColumn(colIdx)">
                  <div class="flex items-center gap-3 w-full">
                    <div
                      class="skeleton-bone bone-avatar-sm flex-shrink-0"
                      :class="`shape-${avatarShape}`"
                    ></div>
                    <div class="flex-1 space-y-1.5 min-w-0">
                      <div
                        class="skeleton-bone bone-text-sm"
                        :style="{ width: `${55 + (rowIdx % 4) * 10}%` }"
                      ></div>
                      <div
                        class="skeleton-bone bone-text-xs"
                        :style="{ width: `${35 + (rowIdx % 3) * 10}%` }"
                      ></div>
                    </div>
                  </div>
                </template>

                <!-- Badge / Status Pill Column -->
                <template v-else-if="isBadgeColumn(colIdx)">
                  <div class="skeleton-bone bone-badge"></div>
                </template>

                <!-- Default Text Line Column -->
                <template v-else>
                  <div
                    class="skeleton-bone bone-text"
                    :style="{ width: getCellBoneWidth(rowIdx, colIdx - 1) }"
                  ></div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Table Footer / Pagination Placeholder -->
        <div v-if="showPagination" class="art-skeleton-pagination">
          <div class="pagination-left">
            <div class="skeleton-bone bone-text-sm" style="width: 140px"></div>
          </div>
          <div class="pagination-right">
            <div class="skeleton-bone bone-select-sm hidden sm:block"></div>
            <div class="flex items-center gap-1.5">
              <div class="skeleton-bone bone-page-btn"></div>
              <div class="skeleton-bone bone-page-btn"></div>
              <div class="skeleton-bone bone-page-btn active"></div>
              <div class="skeleton-bone bone-page-btn"></div>
              <div class="skeleton-bone bone-page-btn"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 2. LIST VIEW SKELETON -->
    <template v-else-if="type === 'list'">
      <div class="art-skeleton-list">
        <div v-for="rowIdx in rows" :key="`list-${rowIdx}`" class="art-skeleton-list-item">
          <!-- Left Avatar / Icon Placeholder -->
          <div v-if="avatar" class="list-item-avatar flex-shrink-0">
            <div
              class="skeleton-bone bone-avatar"
              :class="`shape-${avatarShape}`"
              :style="{ width: avatarSizePx, height: avatarSizePx }"
            ></div>
          </div>

          <!-- Main Content Area -->
          <div class="list-item-content flex-1 min-w-0">
            <div
              class="skeleton-bone bone-title"
              :style="{ width: getListTitleWidth(rowIdx) }"
            ></div>
            <div
              class="skeleton-bone bone-desc mt-2"
              :style="{ width: getListDescWidth(rowIdx) }"
            ></div>
          </div>

          <!-- Right Meta & Actions -->
          <div class="list-item-meta flex items-center gap-3 flex-shrink-0">
            <div class="skeleton-bone bone-badge hidden sm:block"></div>
            <div class="skeleton-bone bone-btn-sm"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- 3. CARD GRID SKELETON -->
    <template v-else-if="type === 'card-list'">
      <div class="art-skeleton-card-grid" :class="gridColsClass">
        <div
          v-for="cardIdx in cardCount || rows"
          :key="`card-${cardIdx}`"
          class="art-skeleton-card"
        >
          <div class="card-header flex items-center justify-between mb-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div
                v-if="avatar"
                class="skeleton-bone bone-avatar-sm flex-shrink-0"
                :class="`shape-${avatarShape}`"
              ></div>
              <div class="flex-1 space-y-1.5 min-w-0">
                <div class="skeleton-bone bone-title" style="width: 70%"></div>
                <div class="skeleton-bone bone-desc" style="width: 45%"></div>
              </div>
            </div>
            <div class="skeleton-bone bone-badge-sm flex-shrink-0"></div>
          </div>
          <div class="card-body space-y-2 my-4">
            <div class="skeleton-bone bone-text" style="width: 96%"></div>
            <div class="skeleton-bone bone-text" style="width: 82%"></div>
            <div class="skeleton-bone bone-text" style="width: 60%"></div>
          </div>
          <div
            class="card-footer flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800"
          >
            <div class="skeleton-bone bone-text-xs" style="width: 90px"></div>
            <div class="skeleton-bone bone-btn-sm"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- 4. STATS METRICS SKELETON -->
    <template v-else-if="type === 'stats'">
      <div class="art-skeleton-stats-grid" :class="gridColsClass">
        <div
          v-for="statIdx in cardCount || 4"
          :key="`stat-${statIdx}`"
          class="art-skeleton-stat-card"
        >
          <div class="skeleton-bone bone-stat-icon mr-4 flex-shrink-0"></div>
          <div class="flex-1 space-y-2 min-w-0">
            <div class="skeleton-bone bone-text-sm" style="width: 50%"></div>
            <div class="skeleton-bone bone-stat-count" style="width: 70%"></div>
            <div class="skeleton-bone bone-text-xs" style="width: 85%"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- 5. GENERIC / CUSTOM SKELETON -->
    <template v-else>
      <div class="art-skeleton-custom space-y-3">
        <div v-for="n in rows" :key="`custom-${n}`" class="skeleton-bone bone-block"></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({ name: 'ArtSkeleton' })

  interface SkeletonProps {
    /** Apakah sedang memuat (default: true) */
    loading?: boolean
    /** Tipe layout skeleton: 'table' | 'list' | 'card-list' | 'stats' | 'custom' */
    type?: 'table' | 'list' | 'card-list' | 'stats' | 'custom'
    /** Jumlah baris data yang ditampilkan */
    rows?: number
    /** Jumlah kolom untuk tipe table */
    columns?: number
    /** Lebar custom untuk tiap kolom (contoh: ['60px', '25%', '35%', '20%', '15%']) */
    columnWidths?: (string | number)[]
    /** Tampilkan header table */
    showHeader?: boolean
    /** Tampilkan toolbar pencarian & filter di atas table */
    showToolbar?: boolean
    /** Tampilkan pagination footer */
    showPagination?: boolean
    /** Tampilkan nomor urut di kolom pertama */
    showIndexColumn?: boolean
    /** Tampilkan tombol aksi di kolom terakhir */
    showActionColumn?: boolean
    /** Kolom yang menampilkan avatar + teks (1-indexed, e.g. [2]) */
    avatarColumns?: number[]
    /** Kolom yang menampilkan badge status pill (1-indexed, e.g. [4]) */
    badgeColumns?: number[]
    /** Tampilkan avatar pada list / card */
    avatar?: boolean
    /** Bentuk avatar: 'circle' | 'square' | 'rounded' */
    avatarShape?: 'circle' | 'square' | 'rounded'
    /** Ukuran avatar (angka atau string CSS, default: '40px') */
    avatarSize?: number | string
    /** Efek animasi shimmer gelombang */
    animated?: boolean
    /** Garis belang zebra stripe pada table */
    stripe?: boolean
    /** Ukuran baris ringkas / compact */
    compact?: boolean
    /** Jumlah kartu untuk tipe 'card-list' atau 'stats' */
    cardCount?: number
    /** Jumlah kolom grid untuk tipe 'card-list' atau 'stats' (2, 3, 4) */
    gridCols?: 2 | 3 | 4
    /** Custom class untuk wrapper */
    customClass?: string
  }

  const props = withDefaults(defineProps<SkeletonProps>(), {
    loading: true,
    type: 'table',
    rows: 5,
    columns: 5,
    showHeader: true,
    showToolbar: false,
    showPagination: true,
    showIndexColumn: true,
    showActionColumn: true,
    avatarColumns: () => [2],
    badgeColumns: () => [4],
    avatar: true,
    avatarShape: 'circle',
    avatarSize: '40px',
    animated: true,
    stripe: true,
    compact: false,
    cardCount: 4,
    gridCols: 4,
    customClass: ''
  })

  // Format avatar size
  const avatarSizePx = computed(() => {
    if (typeof props.avatarSize === 'number') {
      return `${props.avatarSize}px`
    }
    return props.avatarSize || '40px'
  })

  // Normalize column count
  const normalizedColumns = computed(() => {
    if (props.columnWidths && props.columnWidths.length > 0) {
      return props.columnWidths.length
    }
    return Math.max(2, props.columns)
  })

  // Helper to check badge column
  const isBadgeColumn = (colIdx: number): boolean => {
    return props.badgeColumns?.includes(colIdx) || false
  }

  // Helper to check avatar column
  const isAvatarColumn = (colIdx: number): boolean => {
    return props.avatarColumns?.includes(colIdx) || false
  }

  // Column width style generator
  const getColumnStyle = (index: number) => {
    if (props.columnWidths && props.columnWidths[index]) {
      const w = props.columnWidths[index]
      const widthVal = typeof w === 'number' ? `${w}px` : w
      return { width: widthVal, flex: `0 0 ${widthVal}` }
    }

    if (index === 0 && props.showIndexColumn) {
      return { width: '60px', flex: '0 0 60px' }
    }

    if (index === normalizedColumns.value - 1 && props.showActionColumn) {
      return { width: '130px', flex: '0 0 130px' }
    }

    return { flex: '1 1 0%' }
  }

  // Header bone width
  const getHeaderBoneWidth = (colIdx: number): string => {
    if (colIdx === 0 && props.showIndexColumn) return '28px'
    if (colIdx === normalizedColumns.value - 1 && props.showActionColumn) return '65px'
    const variations = ['70px', '95px', '80px', '110px', '85px']
    return variations[colIdx % variations.length]
  }

  // Body cell bone width realistic distribution
  const getCellBoneWidth = (rowIdx: number, colIdx: number): string => {
    const matrix = [
      ['85%', '72%', '60%', '90%', '78%'],
      ['65%', '88%', '75%', '50%', '82%'],
      ['92%', '58%', '80%', '68%', '70%'],
      ['78%', '82%', '65%', '85%', '60%'],
      ['55%', '70%', '90%', '75%', '84%']
    ]
    const rowList = matrix[(rowIdx - 1) % matrix.length]
    return rowList[colIdx % rowList.length]
  }

  // List view width helpers
  const getListTitleWidth = (rowIdx: number): string => {
    const titles = ['65%', '50%', '72%', '58%', '62%']
    return titles[(rowIdx - 1) % titles.length]
  }

  const getListDescWidth = (rowIdx: number): string => {
    const descs = ['88%', '75%', '92%', '80%', '84%']
    return descs[(rowIdx - 1) % descs.length]
  }

  // Grid columns class
  const gridColsClass = computed(() => {
    if (props.gridCols === 2) return 'grid-cols-1 sm:grid-cols-2'
    if (props.gridCols === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  })
</script>

<style lang="scss" scoped>
  @use './style.scss';
</style>
