<template>
  <div class="p-5 space-y-5">
    <!-- Teacher Header Card -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            OFFLINE READY
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
          >
            PORTAL GURU
          </span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
          Selamat Datang, {{ teacherName || currentSession?.username }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          SMK NU UNGARAN &bull; TP {{ academicYearName || '2026/2027' }} (Semester
          {{ semesterName || 'Ganjil' }})
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ElButton type="success" plain @click="goToAttendance()">
          <i class="ri-user-follow-line mr-1"></i> Presensi Siswa
        </ElButton>
        <ElButton type="primary" plain @click="goToJournal()">
          <i class="ri-book-read-line mr-1"></i> Jurnal Mengajar
        </ElButton>
        <ElButton type="warning" plain @click="goToAssessment">
          <i class="ri-file-list-3-line mr-1"></i> Penilaian
        </ElButton>
        <ElButton plain @click="goToSchedule">
          <i class="ri-calendar-schedule-line mr-1"></i> Jadwal
        </ElButton>
        <ElButton plain @click="goToProfile">
          <i class="ri-user-settings-line mr-1"></i> Profil
        </ElButton>
      </div>
    </div>

    <!-- Sync Status Bar -->
    <div
      v-if="pendingSyncCount > 0 || !isOnline"
      class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 dark:text-amber-200"
    >
      <div class="flex items-center gap-3">
        <div
          class="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-lg text-amber-700 dark:text-amber-300"
        >
          <i :class="isOnline ? 'ri-cloud-line text-xl' : 'ri-cloud-off-line text-xl'"></i>
        </div>
        <div>
          <div class="font-semibold text-sm flex items-center gap-2">
            <span>
              {{
                pendingSyncCount > 0
                  ? `Terdapat ${pendingSyncCount} data tersimpan lokal`
                  : 'Mode Offline'
              }}
            </span>
            <span
              class="px-2 py-0.5 text-[10px] font-bold rounded-full"
              :class="
                isOnline
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              "
            >
              {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
            </span>
          </div>
          <div class="text-xs text-amber-700 dark:text-amber-400">
            {{
              isOnline
                ? 'Data tersimpan di IndexedDB lokal dan siap disinkronkan ke Google Sheets.'
                : 'Tersimpan lokal — akan disinkronkan ke server saat terhubung internet.'
            }}
          </div>
        </div>
      </div>
      <ElButton v-if="isOnline" type="warning" :loading="syncing" @click="handleSyncNow">
        <i class="ri-sync-line mr-1"></i> Sinkronkan Sekarang
      </ElButton>
    </div>

    <!-- Stats Summary for This Teacher -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="art-card p-5">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jam Mengajar</div>
        <div class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
          {{ totalHours }} <span class="text-base font-normal text-gray-500">Jam/Minggu</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">Alokasi resmi Dokumen 1</div>
      </div>

      <div class="art-card p-5">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Jadwal Hari Ini</div>
        <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
          {{ todayScheduleItems.length }}
          <span class="text-base font-normal text-gray-500">Sesi</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ todayScheduleHours }} JP tatap muka ({{ todayDayName || 'Hari Ini' }})
        </div>
      </div>

      <div class="art-card p-5">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Presensi Hari Ini</div>
        <div class="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-2">
          {{ completedAttendanceCount }} / {{ todayScheduleItems.length }}
          <span class="text-base font-normal text-gray-500">Selesai</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">Progres input kehadiran siswa</div>
      </div>

      <div class="art-card p-5">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Jurnal Hari Ini</div>
        <div class="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
          {{ completedJournalCount }} / {{ todayScheduleItems.length }}
          <span class="text-base font-normal text-gray-500">Selesai</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">Progres input agenda tatap muka</div>
      </div>
    </div>

    <!-- Section: Jadwal Mengajar Hari Ini -->
    <div class="art-card p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <i class="ri-calendar-event-line text-emerald-600"></i> Jadwal Mengajar Hari Ini
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ formattedTodayDate }}
          </p>
        </div>
        <ElButton size="small" type="primary" plain @click="goToSchedule">
          Lihat Semua Jadwal <i class="ri-arrow-right-line ml-1"></i>
        </ElButton>
      </div>

      <div v-if="loading" class="py-8 text-center text-gray-400">
        Memuat data jadwal hari ini...
      </div>

      <div
        v-else-if="todayScheduleItems.length === 0"
        class="py-8 text-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 space-y-1"
      >
        <i class="ri-sun-line text-3xl text-gray-300 dark:text-gray-600"></i>
        <div class="font-medium text-gray-700 dark:text-gray-300 text-sm">
          Tidak ada jadwal tatap muka hari ini ({{ todayDayName || 'Hari Ini' }}).
        </div>
        <p class="text-xs text-gray-400">
          Gunakan waktu untuk persiapan administrasi pembelajaran, bahan ajar, dan rekapitulasi.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="item in todayScheduleItems"
          :key="item.id"
          class="bg-white dark:bg-[#202024] rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between"
          :class="[
            item.timingStatus === 'ONGOING'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/15'
              : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300'
          ]"
          @click="goToSchedule"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-1.5">
                <span
                  class="px-2 py-0.5 text-xs font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono"
                >
                  {{ item.timeStart }} – {{ item.timeEnd }} WIB
                </span>
                <span
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                >
                  Jam {{ item.periodStart }}-{{ item.periodEnd }} ({{ item.totalPeriods }} JP)
                </span>
              </div>
              <span
                v-if="item.timingStatus === 'ONGOING'"
                class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white animate-pulse"
              >
                BERLANGSUNG
              </span>
              <span
                v-else-if="item.timingStatus === 'UPCOMING'"
                class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              >
                BERIKUTNYA
              </span>
            </div>

            <h3 class="text-base font-bold text-gray-900 dark:text-gray-100">
              {{ item.subjectName }}
            </h3>

            <div class="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span
                class="font-bold text-gray-900 dark:text-gray-200 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
              >
                {{ item.className }}
              </span>
              <span class="truncate">{{ item.majorName }}</span>
            </div>

            <!-- Status Badges for Attendance & Journal -->
            <div class="mt-3 flex items-center gap-2 text-[11px] font-bold">
              <span
                class="px-2 py-0.5 rounded-full"
                :class="
                  item.attendanceDone
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                "
              >
                <i :class="item.attendanceDone ? 'ri-checkbox-circle-line' : 'ri-time-line'"></i>
                Presensi: {{ item.attendanceDone ? 'Selesai' : 'Belum' }}
              </span>

              <span
                class="px-2 py-0.5 rounded-full"
                :class="
                  item.journalDone
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                "
              >
                <i :class="item.journalDone ? 'ri-checkbox-circle-line' : 'ri-time-line'"></i>
                Jurnal: {{ item.journalDone ? 'Selesai' : 'Belum' }}
              </span>
            </div>
          </div>

          <div
            class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500"
          >
            <div class="flex items-center gap-1.5">
              <i class="ri-map-pin-2-line text-emerald-600"></i>
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ item.roomName }}</span>
            </div>

            <div class="flex items-center gap-1.5">
              <ElButton
                size="small"
                :type="item.attendanceDone ? 'info' : 'success'"
                plain
                @click.stop="goToAttendance(item.id)"
              >
                <i
                  :class="item.attendanceDone ? 'ri-checkbox-circle-line' : 'ri-user-follow-line'"
                  class="mr-1"
                ></i>
                Presensi
              </ElButton>
              <ElButton
                size="small"
                :type="item.journalDone ? 'info' : 'primary'"
                plain
                @click.stop="goToJournal(item.id)"
              >
                <i
                  :class="item.journalDone ? 'ri-checkbox-circle-line' : 'ri-book-read-line'"
                  class="mr-1"
                ></i>
                Jurnal
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assigned Subjects & Classes List -->
    <div class="art-card p-6">
      <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <i class="ri-book-2-line text-emerald-600"></i> Daftar Penugasan Mengajar (Dokumen 1)
      </h2>

      <div v-if="loading" class="py-8 text-center text-gray-400"> Memuat data penugasan... </div>

      <div v-else-if="teacherAssignments.length === 0" class="py-8 text-center text-gray-400">
        Belum ada data penugasan mengajar yang terdaftar untuk akun ini.
      </div>

      <ElTable v-else :data="teacherAssignments" stripe style="width: 100%">
        <ElTableColumn label="Kode" prop="code" width="100">
          <template #default="{ row }">
            <span class="font-mono font-semibold text-emerald-600">{{ row.code || '-' }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Mata Pelajaran" min-width="220">
          <template #default="{ row }">
            <span class="font-medium text-gray-900 dark:text-gray-100">{{
              getSubjectName(row.subjectId)
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Alokasi Jam" width="140">
          <template #default="{ row }">
            <span class="font-semibold text-gray-800 dark:text-gray-200">{{ row.hours }} Jam</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Status" width="120">
          <template #default="{ row }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
              {{ row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif' }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElButton, ElTable, ElTableColumn, ElTag, ElMessage } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'
  import { syncService } from '@/core/services/sync'
  import {
    scheduleService,
    getTodayDayOfWeek,
    type TeacherResolvedScheduleItem
  } from '@/core/services/master/ScheduleService'
  import type { SessionData, TeacherAssignmentEntity, SubjectEntity } from '@/core/types'

  defineOptions({ name: 'TeacherDashboard' })

  const router = useRouter()
  const currentSession = ref<SessionData | null>(null)
  const teacherName = ref('')
  const academicYearName = ref('')
  const semesterName = ref('')
  const loading = ref(false)
  const syncing = ref(false)
  const pendingSyncCount = ref(0)
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const teacherAssignments = ref<TeacherAssignmentEntity[]>([])
  const subjectMap = ref<Map<string, string>>(new Map())
  const todayScheduleItems = ref<TeacherResolvedScheduleItem[]>([])

  const todayDayName = computed(() => {
    return getTodayDayOfWeek()
  })

  const formattedTodayDate = computed(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date())
  })

  const totalHours = computed(() => {
    return teacherAssignments.value.reduce((acc, curr) => acc + (curr.hours || 0), 0)
  })

  const todayScheduleHours = computed(() => {
    return todayScheduleItems.value.reduce((acc, curr) => acc + curr.totalPeriods, 0)
  })

  const completedAttendanceCount = computed(() => {
    return todayScheduleItems.value.filter((s) => s.attendanceDone).length
  })

  const completedJournalCount = computed(() => {
    return todayScheduleItems.value.filter((s) => s.journalDone).length
  })

  const loadSyncStatus = async () => {
    pendingSyncCount.value = await syncService.getPendingCount()
  }

  const handleSyncNow = async () => {
    syncing.value = true
    try {
      const res = await syncService.syncAll()
      if (res.syncedCount > 0 && res.failedCount === 0) {
        ElMessage.success(`Berhasil menyinkronkan ${res.syncedCount} data lokal ke Google Sheets.`)
      } else if (res.failedCount > 0) {
        const firstErr = res.errors && res.errors.length > 0 ? res.errors[0] : ''
        ElMessage.error(`Gagal menyinkronkan ${res.failedCount} data. ${firstErr}`)
      } else {
        ElMessage.info('Semua data lokal sudah tersinkronisasi.')
      }
      await loadSyncStatus()
    } catch (err: any) {
      ElMessage.error(err?.message || 'Gagal menyinkronkan data.')
    } finally {
      syncing.value = false
    }
  }

  const updateOnlineStatus = () => {
    isOnline.value = typeof navigator !== 'undefined' ? navigator.onLine : true
  }

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  })

  onMounted(async () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)
    }
    await loadSyncStatus()
    currentSession.value = authService.getCurrentSession()
    if (!currentSession.value || currentSession.value.role !== 'GURU') {
      return
    }

    teacherName.value = currentSession.value.teacherName || ''
    const teacherId = currentSession.value.teacherId

    if (teacherId) {
      loading.value = true
      try {
        const [assignments, subjects, teacher, activeAy, schedData] = await Promise.all([
          repositories.teacherAssignments.findByTeacherId(teacherId),
          repositories.subjects.findAll(),
          repositories.teachers.findById(teacherId),
          repositories.academicYears.findActive(),
          scheduleService.getTeacherSchedule(teacherId)
        ])

        teacherAssignments.value = assignments
        if (teacher) {
          teacherName.value = teacher.name
        }

        if (activeAy) {
          academicYearName.value = activeAy.name
          semesterName.value = activeAy.semester
        }

        todayScheduleItems.value = schedData.todaySchedules

        const sMap = new Map<string, string>()
        subjects.forEach((s: SubjectEntity) => sMap.set(s.id, s.name))
        subjectMap.value = sMap
      } catch (err) {
        console.warn('[TeacherDashboard] Error loading dashboard data:', err)
      } finally {
        loading.value = false
      }
    }
  })

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return '-'
    return subjectMap.value.get(subjectId) || subjectId
  }

  const goToSchedule = () => {
    router.push('/teacher/schedule')
  }

  const goToAttendance = (scheduleId?: string) => {
    if (scheduleId) {
      router.push({
        path: '/teacher/attendance',
        query: { scheduleId }
      })
    } else {
      router.push('/teacher/attendance')
    }
  }

  const goToJournal = (scheduleId?: string) => {
    if (scheduleId) {
      router.push({
        path: '/teacher/journal',
        query: { scheduleId }
      })
    } else {
      router.push('/teacher/journal')
    }
  }

  const goToProfile = () => {
    router.push('/teacher/profile')
  }

  const goToAssessment = () => {
    router.push('/teacher/assessment')
  }
</script>
