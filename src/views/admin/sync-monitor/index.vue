<template>
  <div class="p-5 space-y-5" id="admin-sync-monitor">
    <!-- Header Block -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            :class="[
              'px-2.5 py-0.5 text-xs font-semibold rounded-full border',
              summary.isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
            ]"
          >
            {{ summary.isOnline ? 'TERHUBUNG (ONLINE)' : 'TERPUTUS (OFFLINE)' }}
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
          >
            DASHBOARD MONITOR
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-refresh-line"></i> Monitor Sinkronisasi Offline
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Lacak kondisi antrean lokal, kegagalan transmisi, dan sinkronisasi real-time ke Google
          Workspace.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" :loading="isSyncing" @click="handleSyncAll" id="btn-sync-all">
          <i class="ri-sync-line mr-1"></i> Sinkronkan Semua
        </ElButton>
        <ElButton
          type="warning"
          :disabled="summary.failed === 0"
          @click="handleRetryAllFailed"
          id="btn-retry-failed"
        >
          <i class="ri-play-line mr-1"></i> Ulangi Semua Gagal
        </ElButton>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        class="art-card p-5 flex items-center gap-4 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500 text-white">
          <i class="ri-time-line text-2xl"></i>
        </div>
        <div>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Antrean Pending</span>
          <h2 class="text-2xl font-bold text-gray-950 dark:text-gray-50 mt-1">{{
            summary.totalPending
          }}</h2>
        </div>
      </div>

      <div
        class="art-card p-5 flex items-center gap-4 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-500 text-white"
        >
          <i class="ri-checkbox-circle-line text-2xl"></i>
        </div>
        <div>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400"
            >Berhasil Hari Ini</span
          >
          <h2 class="text-2xl font-bold text-gray-950 dark:text-gray-50 mt-1">{{
            summary.successToday
          }}</h2>
        </div>
      </div>

      <div
        class="art-card p-5 flex items-center gap-4 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-rose-500 text-white">
          <i class="ri-error-warning-line text-2xl"></i>
        </div>
        <div>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400"
            >Gagal Sinkronisasi</span
          >
          <h2
            class="text-2xl font-bold text-gray-950 dark:text-gray-50 mt-1 text-rose-600 dark:text-rose-400"
            >{{ summary.failed }}</h2
          >
        </div>
      </div>

      <div
        class="art-card p-5 flex items-center gap-4 border border-gray-100 dark:border-gray-800 shadow-sm"
      >
        <div class="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-500 text-white">
          <i class="ri-git-merge-line text-2xl"></i>
        </div>
        <div>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Konflik Data</span>
          <h2
            class="text-2xl font-bold text-gray-950 dark:text-gray-50 mt-1 text-amber-600 dark:text-amber-400"
            >{{ summary.conflict }}</h2
          >
        </div>
      </div>
    </div>

    <!-- Filter & Filter Block -->
    <div class="art-card p-5 space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Status Filter -->
          <ElSelect v-model="filter.status" placeholder="Semua Status" clearable class="w-40">
            <ElOption label="Pending" value="PENDING" />
            <ElOption label="Syncing" value="SYNCING" />
            <ElOption label="Synced" value="SYNCED" />
            <ElOption label="Failed" value="FAILED" />
          </ElSelect>

          <!-- Module Filter -->
          <ElSelect v-model="filter.entityType" placeholder="Semua Modul" clearable class="w-44">
            <ElOption label="Presensi Siswa" value="ATTENDANCE" />
            <ElOption label="Jurnal Mengajar" value="JOURNAL" />
            <ElOption label="Penilaian Siswa" value="ASSESSMENT" />
            <ElOption label="Buku Kedisiplinan" value="DISCIPLINE" />
            <ElOption label="Master Data" value="MASTER" />
          </ElSelect>

          <!-- Search Input -->
          <ElInput
            v-model="filter.search"
            placeholder="Cari ID, operasi, error..."
            clearable
            class="w-64"
          >
            <template #prefix>
              <i class="ri-search-line"></i>
            </template>
          </ElInput>
        </div>

        <div class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <i class="ri-time-line"></i>
          Terakhir Sinkron:
          <strong>{{
            summary.lastSyncAt ? formatDateTime(summary.lastSyncAt) : 'Belum Pernah'
          }}</strong>
        </div>
      </div>

      <!-- Queue Items Table -->
      <ElTable :data="queueItems" stripe border style="width: 100%" v-loading="loading">
        <ElTableColumn prop="queuedAt" label="Waktu Masuk" width="170">
          <template #default="{ row }">
            <span class="text-xs text-gray-600 dark:text-gray-300">{{
              formatDateTime(row.queuedAt)
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="entityType" label="Modul" width="130">
          <template #default="{ row }">
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {{ formatEntityType(row.entityType) }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="operation" label="Operasi" width="110">
          <template #default="{ row }">
            <ElTag :type="getOperationTagType(row.operation)" size="small">
              {{ row.operation }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="entityId" label="Target ID" width="180">
          <template #default="{ row }">
            <code
              class="text-[11px] px-1 py-0.5 rounded bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-gray-700 dark:text-gray-300"
            >
              {{ row.entityId }}
            </code>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="Status" width="120">
          <template #default="{ row }">
            <ElTag :type="getStatusTagType(row.status)" effect="dark" size="small">
              {{ row.status }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Detail Kesalahan">
          <template #default="{ row }">
            <div
              v-if="row.lastError"
              class="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-1.5 font-medium leading-relaxed"
            >
              <i class="ri-error-warning-line mt-0.5 flex-shrink-0"></i>
              <span>{{ row.lastError }}</span>
            </div>
            <span
              v-else-if="row.status === 'SYNCED'"
              class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
            >
              <i class="ri-checkbox-circle-line"></i> Sukses Sinkron
            </span>
            <span v-else class="text-xs text-gray-400">-</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <div class="flex justify-center gap-2">
              <ElButton
                type="primary"
                size="small"
                :disabled="row.status === 'SYNCED' || isSyncing"
                @click="handleRetrySingle(row.id)"
              >
                Ulangi
              </ElButton>
              <ElButton type="default" size="small" @click="viewPayload(row as any)">
                Detail
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Detail Payload Drawer -->
    <ElDrawer
      v-model="drawerVisible"
      title="Detail Transaksi Sinkronisasi"
      size="500px"
      direction="rtl"
    >
      <div v-if="selectedItem" class="space-y-4 text-sm leading-relaxed">
        <div
          class="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg"
        >
          <div>
            <span class="text-xs text-gray-400 block">ID Antrean</span>
            <span class="font-bold text-xs">{{ selectedItem.id }}</span>
          </div>
          <div>
            <span class="text-xs text-gray-400 block">Status Terakhir</span>
            <ElTag :type="getStatusTagType(selectedItem.status)" size="small" effect="dark">
              {{ selectedItem.status }}
            </ElTag>
          </div>
          <div>
            <span class="text-xs text-gray-400 block">Jumlah Percobaan</span>
            <span class="font-semibold text-xs">{{ selectedItem.attempts }} kali</span>
          </div>
          <div>
            <span class="text-xs text-gray-400 block">Waktu Enqueue</span>
            <span class="font-semibold text-xs">{{ formatDateTime(selectedItem.queuedAt) }}</span>
          </div>
        </div>

        <div
          v-if="selectedItem.lastError"
          class="p-3.5 rounded-lg border border-rose-100 bg-rose-50/50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300"
        >
          <div class="font-bold flex items-center gap-1.5 text-xs mb-1">
            <i class="ri-error-warning-line"></i> KETERANGAN ERROR
          </div>
          <p class="text-xs font-mono font-medium leading-relaxed">{{ selectedItem.lastError }}</p>
        </div>

        <div>
          <span class="font-bold text-gray-900 dark:text-gray-100 block mb-2"
            >Payload Data (JSON):</span
          >
          <pre
            class="p-4 rounded-lg bg-gray-900 text-emerald-400 font-mono text-xs overflow-auto max-h-[400px] border border-gray-800"
            >{{ JSON.stringify(selectedItem.payload, null, 2) }}</pre>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { syncTransparencyService } from '@/core/services/sync/SyncTransparencyService'
  import { syncService } from '@/core/services/sync/SyncService'
  import type { SyncQueueEntity } from '@/core/types'

  defineOptions({ name: 'AdminSyncMonitor' })

  const loading = ref(false)
  const isSyncing = ref(false)
  const drawerVisible = ref(false)
  const selectedItem = ref<SyncQueueEntity | null>(null)

  const summary = reactive({
    totalPending: 0,
    processing: 0,
    successToday: 0,
    failed: 0,
    conflict: 0,
    lastSyncAt: null as string | null,
    isOnline: true
  })

  const filter = reactive({
    status: undefined,
    entityType: undefined,
    search: ''
  })

  const queueItems = ref<SyncQueueEntity[]>([])

  const fetchStatsAndQueue = async () => {
    loading.value = true
    try {
      const stats = await syncTransparencyService.getSummary()
      Object.assign(summary, stats)
      summary.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      const list = await syncTransparencyService.getQueueItems({
        status: filter.status,
        entityType: filter.entityType,
        search: filter.search
      })
      queueItems.value = list
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat monitor sinkronisasi.')
    } finally {
      loading.value = false
    }
  }

  // Sync entire queue
  const handleSyncAll = async () => {
    if (isSyncing.value) return
    isSyncing.value = true
    ElMessage.info('Memulai sinkronisasi cloud untuk semua antrean...')

    try {
      const res = await syncService.syncAll()
      ElMessage.success(
        `Sinkronisasi selesai. Berhasil: ${res.syncedCount}, Gagal: ${res.failedCount}`
      )
      await fetchStatsAndQueue()
    } catch (err: any) {
      ElMessage.error(err.message || 'Kesalahan saat menjalankan sinkronisasi.')
    } finally {
      isSyncing.value = false
    }
  }

  // Retry all failed
  const handleRetryAllFailed = async () => {
    if (isSyncing.value) return
    isSyncing.value = true
    ElMessage.info('Mencoba menyinkronkan ulang semua item yang gagal...')

    try {
      const res = await syncTransparencyService.retryAllFailed()
      ElMessage.success(
        `Percobaan selesai. Berhasil: ${res.successCount}, Gagal: ${res.failedCount}`
      )
      await fetchStatsAndQueue()
    } catch (err: any) {
      ElMessage.error(err.message || 'Kesalahan saat melakukan retry massal.')
    } finally {
      isSyncing.value = false
    }
  }

  // Retry single item
  const handleRetrySingle = async (itemId: string) => {
    loading.value = true
    try {
      const res = await syncTransparencyService.retryItem(itemId)
      if (res.success) {
        ElMessage.success(res.message)
      } else {
        ElMessage.error(res.message)
      }
      await fetchStatsAndQueue()
    } catch (err: any) {
      ElMessage.error(err.message || 'Kesalahan saat mengulangi sinkronisasi item.')
    } finally {
      loading.value = false
    }
  }

  // View raw payload
  const viewPayload = (row: SyncQueueEntity) => {
    selectedItem.value = row
    drawerVisible.value = true
  }

  // Formatting helpers
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatEntityType = (type: string) => {
    const map: Record<string, string> = {
      ATTENDANCE: 'Presensi Siswa',
      JOURNAL: 'Jurnal Kelas',
      ASSESSMENT: 'Penilaian',
      DISCIPLINE: 'Kedisiplinan',
      MASTER: 'Master Data'
    }
    return map[type] || type
  }

  const getOperationTagType = (op: string) => {
    if (op === 'CREATE') return 'success'
    if (op === 'UPDATE') return 'primary'
    return 'danger'
  }

  const getStatusTagType = (status: string) => {
    if (status === 'SYNCED') return 'success'
    if (status === 'PENDING') return 'info'
    if (status === 'SYNCING') return 'warning'
    return 'danger'
  }

  // Watch filters to fetch on change
  watch([() => filter.status, () => filter.entityType, () => filter.search], () => {
    fetchStatsAndQueue()
  })

  onMounted(() => {
    fetchStatsAndQueue()
  })
</script>
