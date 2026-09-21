<template>
  <div class="p-5 space-y-5">
    <!-- Header Card -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            OFFLINE READY
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          >
            ADMINISTRATOR
          </span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
          Dashboard Administrator
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          SMK NU UNGARAN — Sistem Manajemen Akademik & Pengajaran Offline
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="goToReports">
          <i class="ri-file-chart-line mr-1"></i> Laporan Operasional
        </ElButton>
        <ElButton type="default" @click="goToAccounts">
          <i class="ri-user-settings-line mr-1"></i> Manajemen Akun
        </ElButton>
      </div>
    </div>

    <!-- Master Data Stats Grid using ArtStatsCard -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <ArtStatsCard
        title="Total Guru"
        :count="stats.teachers"
        description="Guru Master Terdaftar"
        icon="ri:user-star-line"
        iconStyle="!bg-blue-500"
      />
      <ArtStatsCard
        title="Mata Pelajaran"
        :count="stats.subjects"
        description="Mata Pelajaran Aktif"
        icon="ri:book-open-line"
        iconStyle="!bg-emerald-500"
      />
      <ArtStatsCard
        title="Rombongan Belajar"
        :count="stats.classes"
        description="Kelas (X, XI, XII)"
        icon="ri:team-line"
        iconStyle="!bg-indigo-500"
      />
      <ArtStatsCard
        title="Ruang Belajar"
        :count="stats.rooms"
        description="Teori & Lab Khusus"
        icon="ri:building-4-line"
        iconStyle="!bg-amber-500"
      />
    </div>

    <!-- Operational Progress Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ArtProgressCard
        title="Tingkat Keterisian Presensi Hari Ini"
        :percentage="attendanceRate"
        color="#10B981"
        icon="ri:user-follow-line"
        iconStyle="!bg-emerald-100 !text-emerald-600"
      />
      <ArtProgressCard
        title="Tingkat Keterisian Jurnal Hari Ini"
        :percentage="journalRate"
        color="#3B82F6"
        icon="ri:book-read-line"
        iconStyle="!bg-blue-100 !text-blue-600"
      />
    </div>

    <!-- Daily Operational Metrics Grid -->
    <div class="art-card p-6 space-y-4">
      <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <i class="ri-pulse-line text-emerald-600"></i> Aktivitas Operasional Hari Ini
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          class="p-4 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
        >
          <div class="text-xs font-semibold text-slate-500 dark:text-slate-400"
            >Jadwal Mengajar Hari Ini</div
          >
          <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1"
            >{{ operationalMetrics.todayScheduledSessions }} Sesi</div
          >
        </div>
        <div
          class="p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
        >
          <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400"
            >Presensi Hari Ini Terisi</div
          >
          <div class="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1"
            >{{ operationalMetrics.todayAttendanceSubmitted }} Sesi</div
          >
        </div>
        <div
          class="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800"
        >
          <div class="text-xs font-semibold text-blue-700 dark:text-blue-400"
            >Jurnal Hari Ini Terisi</div
          >
          <div class="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1"
            >{{ operationalMetrics.todayJournalsSubmitted }} Sesi</div
          >
        </div>
        <div
          class="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800"
        >
          <div class="text-xs font-semibold text-amber-700 dark:text-amber-400"
            >Queue Antrean Sync</div
          >
          <div class="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1"
            >{{ operationalMetrics.pendingSyncCount }} Item</div
          >
        </div>
      </div>
    </div>

    <!-- Active Session Info & Activity List -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="art-card p-6">
        <h2
          class="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
        >
          <i class="ri-shield-user-line text-blue-600"></i> Informasi Sesi Administrator
        </h2>
        <div class="grid grid-cols-1 gap-3 text-sm">
          <div
            class="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex justify-between items-center"
          >
            <span class="text-gray-500 dark:text-gray-400 text-xs">Username</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              currentSession?.username || 'admin'
            }}</span>
          </div>
          <div
            class="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex justify-between items-center"
          >
            <span class="text-gray-500 dark:text-gray-400 text-xs">Wewenang / Role</span>
            <span class="font-semibold text-blue-600 dark:text-blue-400">{{
              currentSession?.role || 'ADMIN'
            }}</span>
          </div>
          <div
            class="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex justify-between items-center"
          >
            <span class="text-gray-500 dark:text-gray-400 text-xs">Waktu Login</span>
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{
              formatDate(currentSession?.authenticatedAt)
            }}</span>
          </div>
        </div>
      </div>

      <ArtDataListCard
        title="Log Ringkasan Operasional"
        subtitle="Aktivitas sistem & ketersediaan offline"
        :list="activityLogs"
        :maxCount="3"
        :showMoreButton="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'
  import ArtProgressCard from '@/components/core/cards/art-progress-card/index.vue'
  import ArtDataListCard from '@/components/core/cards/art-data-list-card/index.vue'
  import { authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'
  import { reportService, type AdminDashboardMetrics } from '@/core/services/report/ReportService'
  import type { SessionData } from '@/core/types'

  defineOptions({ name: 'AdminDashboard' })

  const router = useRouter()
  const currentSession = ref<SessionData | null>(null)

  const stats = ref({
    teachers: 73,
    subjects: 70,
    classes: 46,
    rooms: 55,
    assignments: 117
  })

  const operationalMetrics = ref<AdminDashboardMetrics>({
    activeTeachers: 0,
    activeStudents: 0,
    activeClasses: 0,
    todayScheduledSessions: 0,
    todayAttendanceSubmitted: 0,
    todayJournalsSubmitted: 0,
    pendingSyncCount: 0,
    totalAssessmentsCreated: 0
  })

  const attendanceRate = computed(() => {
    const total = operationalMetrics.value.todayScheduledSessions
    if (!total) return 100
    return Math.min(
      100,
      Math.round((operationalMetrics.value.todayAttendanceSubmitted / total) * 100)
    )
  })

  const journalRate = computed(() => {
    const total = operationalMetrics.value.todayScheduledSessions
    if (!total) return 100
    return Math.min(
      100,
      Math.round((operationalMetrics.value.todayJournalsSubmitted / total) * 100)
    )
  })

  const activityLogs = computed(() => [
    {
      title: 'Presensi Terisi Hari Ini',
      status: `${operationalMetrics.value.todayAttendanceSubmitted} dari ${operationalMetrics.value.todayScheduledSessions} sesi pengajaran`,
      time: 'Hari Ini',
      class: '!bg-emerald-100 !text-emerald-600',
      icon: 'ri:user-follow-line'
    },
    {
      title: 'Jurnal Mengajar Terisi',
      status: `${operationalMetrics.value.todayJournalsSubmitted} materi telah terverifikasi`,
      time: 'Hari Ini',
      class: '!bg-blue-100 !text-blue-600',
      icon: 'ri:book-read-line'
    },
    {
      title: 'Sync Queue IndexedDB',
      status: `${operationalMetrics.value.pendingSyncCount} item menunggu siklus sync ke Apps Script`,
      time: 'Sistem',
      class: '!bg-amber-100 !text-amber-600',
      icon: 'ri:sync-line'
    }
  ])

  onMounted(async () => {
    currentSession.value = authService.getCurrentSession()
    try {
      const [t, s, c, r, a, op] = await Promise.all([
        repositories.teachers.count(),
        repositories.subjects.count(),
        repositories.classes.count(),
        repositories.rooms.count(),
        repositories.teacherAssignments.count(),
        reportService.getAdminDashboardMetrics()
      ])
      stats.value = {
        teachers: t || 73,
        subjects: s || 70,
        classes: c || 46,
        rooms: r || 55,
        assignments: a || 117
      }
      operationalMetrics.value = op
    } catch (err) {
      console.warn('[AdminDashboard] Error loading counts:', err)
    }
  })

  const goToAccounts = () => {
    router.push('/admin/accounts')
  }

  const goToReports = () => {
    router.push('/admin/reports')
  }

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-'
    try {
      return new Date(isoStr).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    } catch {
      return isoStr
    }
  }
</script>
