<template>
  <div class="p-5 space-y-5">
    <!-- Header Card -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ArtSvgIcon
            icon="ri:notification-3-line"
            class="text-emerald-600 dark:text-emerald-400 text-2xl"
          />
          Pemberitahuan & Pengumuman
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pusat informasi resmi, edaran kurikulum, dan pembaruan sistem SMK NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" plain @click="markAllAsRead" :disabled="unreadCount === 0">
          <ArtSvgIcon icon="ri:check-double-line" class="mr-1.5 text-base" /> Tandai Semua Dibaca
          ({{ unreadCount }})
        </ElButton>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="art-card p-6">
      <!-- Search & Filters -->
      <div class="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-xl w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari judul atau kata kunci..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterType" placeholder="Kategori" class="!w-48">
            <ElOption label="Semua Kategori" value="" />
            <ElOption label="Pengumuman Resmi" value="notice" />
            <ElOption label="Pesan Sistem" value="message" />
            <ElOption label="Tugas & Kedisiplinan" value="todo" />
          </ElSelect>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Menampilkan
          <span class="font-bold text-slate-900 dark:text-slate-100">{{
            filteredItems.length
          }}</span>
          pemberitahuan
        </div>
      </div>

      <!-- Notification List -->
      <div v-loading="loading" class="space-y-3.5">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="p-4 rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
          :class="[
            item.isRead
              ? 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-xs'
          ]"
        >
          <div class="flex items-start gap-4 flex-1 min-w-0">
            <!-- Icon Box -->
            <div
              class="size-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5"
              :class="getTypeBadgeClass(item.type)"
            >
              <ArtSvgIcon :icon="getTypeIcon(item.type)" class="text-xl" />
            </div>

            <!-- Content -->
            <div class="space-y-1.5 min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  v-if="!item.isRead"
                  class="inline-block size-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0"
                  title="Belum dibaca"
                ></span>
                <h3
                  class="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  @click="openDetail(item)"
                >
                  {{ item.title }}
                </h3>
              </div>

              <p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {{ item.content }}
              </p>

              <!-- Clean Metadata (Unboxed) -->
              <div
                class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono pt-1 flex-wrap"
              >
                <span class="flex items-center gap-1">
                  <ArtSvgIcon icon="ri:time-line" class="text-xs" />
                  {{ item.time }}
                </span>
                <span aria-hidden="true" class="text-slate-300 dark:text-slate-700">·</span>
                <span class="flex items-center gap-1">
                  <ArtSvgIcon icon="ri:user-3-line" class="text-xs" />
                  {{ item.author || 'Pengirim Resmi' }}
                </span>
                <template v-if="item.isPinned">
                  <span aria-hidden="true" class="text-slate-300 dark:text-slate-700">·</span>
                  <span
                    class="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1"
                  >
                    <ArtSvgIcon icon="ri:pushpin-fill" class="text-xs" /> Disematkan
                  </span>
                </template>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div
            class="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 w-full md:w-auto justify-end"
          >
            <button
              class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              @click="openDetail(item)"
            >
              <ArtSvgIcon icon="ri:eye-line" class="text-sm" />
              <span>Baca Detail</span>
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              @click="toggleReadStatus(item)"
            >
              <ArtSvgIcon
                :icon="item.isRead ? 'ri:mail-open-line' : 'ri:mail-unread-line'"
                class="text-sm"
              />
              <span>{{ item.isRead ? 'Tandai Belum Dibaca' : 'Tandai Dibaca' }}</span>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredItems.length === 0"
          class="py-12 text-center text-slate-400 dark:text-slate-500 space-y-3"
        >
          <ArtSvgIcon
            icon="system-uicons:inbox"
            class="text-5xl mx-auto text-slate-300 dark:text-slate-600"
          />
          <p class="text-sm">Tidak ada pemberitahuan atau pengumuman ditemukan.</p>
        </div>
      </div>
    </div>

    <!-- Modal Detail Pengumuman -->
    <ElDialog v-model="detailVisible" title="Detail Pemberitahuan" width="640px" destroy-on-close>
      <div v-if="selectedItem" class="space-y-4">
        <div class="flex items-center gap-2">
          <span
            :class="getTypeBadgeClass(selectedItem.type)"
            class="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <ArtSvgIcon :icon="getTypeIcon(selectedItem.type)" class="text-sm" />
            {{ getTypeName(selectedItem.type) }}
          </span>
          <span class="text-xs text-slate-400 font-mono">{{ selectedItem.time }}</span>
        </div>

        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {{ selectedItem.title }}
        </h2>

        <div
          class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed border border-slate-200/80 dark:border-slate-700"
        >
          {{ selectedItem.content }}
        </div>

        <div
          class="text-xs text-slate-500 flex items-center justify-between pt-2 border-t dark:border-slate-700 font-mono"
        >
          <span
            >Pengirim:
            <strong class="text-slate-800 dark:text-slate-200">{{
              selectedItem.author || 'Pengirim Resmi SMK NU Ungaran'
            }}</strong></span
          >
          <span
            >Status:
            <strong class="text-emerald-600 dark:text-emerald-400">{{
              selectedItem.isRead ? 'Sudah Dibaca' : 'Baru'
            }}</strong></span
          >
        </div>
      </div>

      <template #footer>
        <ElButton type="primary" @click="detailVisible = false">Tutup</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { announcementService } from '@/core/services'

  interface NotificationItem {
    id: string
    title: string
    content: string
    time: string
    type: 'notice' | 'message' | 'todo'
    isRead: boolean
    isPinned?: boolean
    author?: string
  }

  const loading = ref(false)
  const searchQuery = ref('')
  const filterType = ref('')
  const detailVisible = ref(false)
  const selectedItem = ref<NotificationItem | null>(null)

  const items = ref<NotificationItem[]>([
    {
      id: '1',
      title: 'Pengumuman Jadwal Ujian Tengah Semester Ganjil 2026/2027',
      content:
        'Diberitahukan kepada seluruh Bapak/Ibu Guru SMK NU Ungaran bahwa Ujian Tengah Semester Ganjil akan dilaksanakan mulai tanggal 5 Oktober 2026. Harap melengkapi kisi-kisi dan kuesioner penilaian.',
      time: '2026-09-23 07:00',
      type: 'notice',
      isRead: false,
      isPinned: true,
      author: 'Waka Kurikulum'
    },
    {
      id: '2',
      title: 'Penetapan Sinkronisasi Otomatis Supabase Cloud SMK NU Ungaran',
      content:
        'Koneksi Supabase Cloud DB telah terhubung dan aktif secara offline-first. Data presensi dan jurnal mengajar akan tersinkronisasi otomatis saat terhubung jaringan internet.',
      time: '2026-09-23 07:10',
      type: 'message',
      isRead: false,
      isPinned: true,
      author: 'Tim IT & Sistem'
    },
    {
      id: '3',
      title: 'Batas Akhir Penginputan Jurnal Mengajar Bulanan',
      content:
        'Mengingatkan kembali batas pengisian Jurnal KBM bulanan untuk rekapitulasi kehadiran adalah setiap akhir minggu ke-4 pukul 23:59 WIB.',
      time: '2026-09-22 15:30',
      type: 'todo',
      isRead: true,
      author: 'Staf Kurikulum'
    },
    {
      id: '4',
      title: 'Verifikasi Data Presensi Siswa Kelas X RPL 1 Lengkap',
      content:
        'Data presensi harian untuk siswa kelas X RPL 1 telah lengkap diverifikasi oleh Wali Kelas.',
      time: '2026-09-22 11:15',
      type: 'notice',
      isRead: true,
      author: 'Sistem Otomatis'
    }
  ])

  const filteredItems = computed(() => {
    return items.value.filter((item) => {
      const matchType = !filterType.value || item.type === filterType.value
      const matchSearch =
        !searchQuery.value ||
        item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchType && matchSearch
    })
  })

  const unreadCount = computed(() => {
    return items.value.filter((i) => !i.isRead).length
  })

  async function loadAnnouncements() {
    loading.value = true
    try {
      const dbAnnouncements = await announcementService.getAllAnnouncements()
      if (dbAnnouncements && dbAnnouncements.length > 0) {
        const mapped = dbAnnouncements.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          time: a.publishedAt ? new Date(a.publishedAt).toLocaleString('id-ID') : 'Terbaru',
          type: 'notice' as const,
          isRead: false,
          isPinned: Boolean(a.isPinned),
          author: 'Kurikulum SMK NU Ungaran'
        }))
        // Merge with system alerts
        items.value = [...mapped, ...items.value.filter((i) => i.type !== 'notice')]
      }
    } catch {
      // Keep static items if DB load falls back
    } finally {
      loading.value = false
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'notice':
        return 'ri:notification-3-line'
      case 'message':
        return 'ri:chat-3-line'
      case 'todo':
        return 'ri:task-line'
      default:
        return 'ri:information-line'
    }
  }

  function getTypeBadgeClass(type: string) {
    switch (type) {
      case 'notice':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
      case 'message':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
      case 'todo':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
    }
  }

  function getTypeName(type: string) {
    switch (type) {
      case 'notice':
        return 'Pengumuman Resmi'
      case 'message':
        return 'Pesan Sistem'
      case 'todo':
        return 'Tugas & Kedisiplinan'
      default:
        return 'Informasi'
    }
  }

  function openDetail(item: NotificationItem) {
    selectedItem.value = item
    item.isRead = true
    detailVisible.value = true
  }

  function toggleReadStatus(item: NotificationItem) {
    item.isRead = !item.isRead
    ElMessage.success(item.isRead ? 'Ditandai sudah dibaca' : 'Ditandai belum dibaca')
  }

  function markAllAsRead() {
    items.value.forEach((i) => (i.isRead = true))
    ElMessage.success('Semua pemberitahuan ditandai sudah dibaca')
  }

  onMounted(() => {
    loadAnnouncements()
  })
</script>
