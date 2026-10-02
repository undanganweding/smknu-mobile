<template>
  <div class="relative flex items-center">
    <!-- Main Interactive Badge -->
    <button
      type="button"
      @click="dialogVisible = true"
      class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border cursor-pointer select-none"
      :class="statusBadgeClasses"
      title="Klik untuk melihat status koneksi & antrean sinkronisasi cloud"
    >
      <!-- Status Dot -->
      <span class="relative flex h-2.5 w-2.5">
        <span
          v-if="statusDotPing"
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          :class="statusDotBg"
        ></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5" :class="statusDotBg"></span>
      </span>

      <!-- Label -->
      <span class="tracking-tight whitespace-nowrap">{{ statusText }}</span>

      <!-- Pending Badge Count -->
      <span
        v-if="pendingCount > 0"
        class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold"
        :class="pendingCountBadgeClasses"
      >
        {{ pendingCount }}
      </span>
    </button>

    <!-- Detailed Sync & Cloud Status Modal -->
    <el-dialog
      v-model="dialogVisible"
      title="Status Sinkronisasi Cloud & Offline"
      width="540px"
      append-to-body
      destroy-on-close
    >
      <div class="space-y-4 text-sm">
        <!-- Current Architecture Banner -->
        <div
          class="p-3.5 rounded-lg border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base font-semibold text-slate-800 dark:text-slate-100">
                Arsitektur: Online-First + Offline
              </span>
            </div>
            <el-tag :type="isOnline ? 'success' : 'danger'" size="small">
              {{ isOnline ? 'TERHUBUNG CLOUD' : 'MODE OFFLINE' }}
            </el-tag>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Data tersimpan aman di IndexedDB perangkat ini dan disinkronkan otomatis ke server
            Supabase PostgreSQL SMK NU Ungaran ketika online.
          </p>
        </div>

        <!-- Metric Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div
            class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <span class="text-xs text-slate-400 block mb-0.5">Antrean Mutasi Offline</span>
            <span class="text-xl font-bold text-slate-700 dark:text-slate-200"
              >{{ pendingCount }} perubahan</span
            >
            <span class="text-[11px] text-slate-400 block mt-0.5">Tersimpan di IndexedDB</span>
          </div>

          <div
            class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <span class="text-xs text-slate-400 block mb-0.5">Terakhir Sinkron</span>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 block truncate">
              {{ formattedLastSync }}
            </span>
            <span class="text-[11px] text-emerald-500 block mt-0.5">Server Confirmation</span>
          </div>
        </div>

        <!-- Sync Error Warning if any -->
        <div
          v-if="lastError"
          class="p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300"
        >
          <div class="font-medium mb-1">Catatan Sinkronisasi:</div>
          <div>{{ lastError }}</div>
        </div>

        <!-- Pending Items List -->
        <div
          v-if="pendingItems.length > 0"
          class="border rounded-lg dark:border-slate-700 overflow-hidden"
        >
          <div
            class="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between items-center"
          >
            <span>Daftar Mutasi Belum Terkirim ({{ pendingItems.length }})</span>
            <span class="text-[10px] text-slate-400">FIFO Persistent</span>
          </div>
          <div class="max-h-48 overflow-y-auto divide-y dark:divide-slate-800">
            <div
              v-for="item in pendingItems"
              :key="item.id"
              class="px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div>
                <span class="font-mono font-bold text-slate-700 dark:text-slate-200 mr-2">{{
                  item.operation
                }}</span>
                <span class="text-slate-500 uppercase">{{ item.entity }}</span>
                <span class="text-slate-400 ml-1 text-[11px] font-mono"
                  >({{ item.entityId.substring(0, 8) }}...)</span
                >
              </div>
              <el-tag size="small" :type="item.status === 'SYNCING' ? 'warning' : 'info'">
                {{ item.status }}
              </el-tag>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-4 text-xs text-slate-400">
          Semua perubahan lokal telah tersinkronisasi 100% ke server cloud.
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <span class="text-[11px] text-slate-400"> Proteksi tab close & reload aktif </span>
          <div class="flex gap-2">
            <el-button
              v-if="pendingCount > 0"
              type="danger"
              plain
              size="default"
              @click="clearPendingQueue"
            >
              Bersihkan Antrean
            </el-button>
            <el-button @click="dialogVisible = false">Tutup</el-button>
            <el-button
              type="primary"
              :loading="isSyncing"
              :disabled="!isOnline || pendingCount === 0"
              @click="triggerManualSync"
            >
              Sinkronkan Sekarang
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import {
    connectivityManager,
    type ConnectivityState
  } from '@/core/services/sync/ConnectivityManager'
  import { syncEngine } from '@/core/services/sync/SyncEngine'
  import { pendingMutationQueue } from '@/core/services/sync/PendingMutationQueue'
  import type { PendingMutationEntity } from '@/core/types/cloud'
  import { ElMessage } from 'element-plus'

  const dialogVisible = ref(false)
  const isSyncing = ref(false)
  const pendingItems = ref<PendingMutationEntity[]>([])

  // Reactive state mirroring manager
  const isOnline = ref(connectivityManager.isOnline.value)
  const syncStatus = ref(connectivityManager.syncStatus.value)
  const pendingCount = ref(connectivityManager.pendingCount.value)
  const lastSyncedAt = ref(connectivityManager.lastSyncedAt.value)
  const lastError = ref(connectivityManager.lastError.value)

  let unsubscribe: (() => void) | null = null

  onMounted(async () => {
    unsubscribe = connectivityManager.subscribe((state: ConnectivityState) => {
      isOnline.value = state.isOnline
      syncStatus.value = state.syncStatus
      pendingCount.value = state.pendingCount
      lastSyncedAt.value = state.lastSyncedAt
      lastError.value = state.lastError
    })
    await loadPendingDetails()
  })

  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
  })

  async function loadPendingDetails() {
    try {
      pendingItems.value = await pendingMutationQueue.getPending()
    } catch {
      pendingItems.value = []
    }
  }

  const statusText = computed(() => {
    if (!isOnline.value) {
      return pendingCount.value > 0 ? `Offline — ${pendingCount.value} pending` : 'Offline'
    }
    if (syncStatus.value === 'ONLINE_SYNCING') {
      return `Menyinkronkan ${pendingCount.value} perubahan...`
    }
    if (syncStatus.value === 'CONFLICT') {
      return 'Konflik sinkronisasi'
    }
    if (syncStatus.value === 'SYNC_ERROR') {
      return 'Koneksi lambat / Error sync'
    }
    if (pendingCount.value > 0) {
      return `Online — ${pendingCount.value} perubahan`
    }
    return 'Online — Tersinkron'
  })

  const statusBadgeClasses = computed(() => {
    if (!isOnline.value) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 hover:bg-rose-100'
    }
    if (syncStatus.value === 'ONLINE_SYNCING') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 hover:bg-amber-100'
    }
    if (syncStatus.value === 'CONFLICT') {
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60 hover:bg-orange-100'
    }
    if (syncStatus.value === 'SYNC_ERROR') {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 hover:bg-amber-100'
    }
    if (pendingCount.value > 0) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 hover:bg-amber-100'
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 hover:bg-emerald-100'
  })

  const statusDotBg = computed(() => {
    if (!isOnline.value) return 'bg-rose-500'
    if (syncStatus.value === 'ONLINE_SYNCING') return 'bg-amber-500'
    if (syncStatus.value === 'CONFLICT') return 'bg-orange-500'
    if (syncStatus.value === 'SYNC_ERROR') return 'bg-amber-500'
    if (pendingCount.value > 0) return 'bg-amber-500'
    return 'bg-emerald-500'
  })

  const statusDotPing = computed(() => {
    return syncStatus.value === 'ONLINE_SYNCING' || (isOnline.value && pendingCount.value > 0)
  })

  const pendingCountBadgeClasses = computed(() => {
    if (!isOnline.value) return 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100'
    return 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-100'
  })

  const formattedLastSync = computed(() => {
    if (!lastSyncedAt.value) return 'Belum pernah'
    try {
      const d = new Date(lastSyncedAt.value)
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return lastSyncedAt.value
    }
  })

  async function clearPendingQueue() {
    try {
      await pendingMutationQueue.clear()
      await connectivityManager.refreshPendingCount()
      await loadPendingDetails()
      ElMessage.success('Antrean mutasi offline berhasil dibersihkan.')
    } catch (err: any) {
      ElMessage.error('Gagal membersihkan antrean: ' + err.message)
    }
  }

  async function triggerManualSync() {
    if (isSyncing.value) return
    isSyncing.value = true
    try {
      const res = await syncEngine.processQueue()
      await loadPendingDetails()
      if (res.failed === 0 && res.conflicts === 0) {
        ElMessage.success(`Sinkronisasi selesai! ${res.succeeded} perubahan berhasil dikirim.`)
      } else {
        ElMessage.warning(
          `Sinkronisasi selesai: ${res.succeeded} berhasil, ${res.failed} gagal, ${res.conflicts} konflik.`
        )
      }
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyinkronkan data.')
    } finally {
      isSyncing.value = false
    }
  }
</script>
