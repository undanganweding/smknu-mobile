<template>
  <div class="p-5 space-y-5">
    <!-- Top Header Card -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            OFFLINE DATABASE
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
          >
            JURNAL MENGAJAR
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-book-read-line text-emerald-600"></i> Jurnal Agenda Pembelajaran
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ teacherName }}</span>
          <span v-if="journalSession?.schedule">
            &bull; {{ journalSession.schedule.className }} &bull;
            {{ journalSession.schedule.subjectName }}
          </span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton plain @click="goToAttendance">
          <i class="ri-user-follow-line mr-1"></i> Presensi Siswa
        </ElButton>
        <ElButton plain @click="goToSchedule">
          <i class="ri-calendar-schedule-line mr-1"></i> Jadwal Mengajar
        </ElButton>
      </div>
    </div>

    <!-- Error / Access Denied Alert -->
    <div
      v-if="errorMessage"
      class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 text-center text-rose-700 dark:text-rose-300 space-y-2"
    >
      <i class="ri-error-warning-line text-3xl"></i>
      <div class="font-semibold text-base">{{ errorMessage }}</div>
      <p class="text-sm text-rose-600/80 dark:text-rose-400/80">
        Silakan pilih sesi jadwal mengajar yang valid melalui portal jadwal mengajar Anda.
      </p>
      <div class="pt-2">
        <ElButton type="primary" @click="goToSchedule"> Buka Jadwal Mengajar </ElButton>
      </div>
    </div>

    <template v-else>
      <!-- Session Selector & Context Bar -->
      <div class="art-card p-5 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <!-- Schedule Selection -->
          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label
                class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
              >
                Pilih Jadwal Mengajar
              </label>
              <ElSelect
                v-model="selectedScheduleId"
                placeholder="Pilih sesi jadwal..."
                class="w-full"
                :loading="loadingSchedules"
                @change="onScheduleChange"
              >
                <ElOption
                  v-for="s in availableSchedules"
                  :key="s.id"
                  :label="`${s.dayOfWeek} (${s.timeStart}-${s.timeEnd}) - ${s.className} (${s.subjectName})`"
                  :value="s.id"
                />
              </ElSelect>
            </div>

            <div>
              <label
                class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
              >
                Tanggal Jurnal
              </label>
              <ElDatePicker
                v-model="selectedDate"
                type="date"
                placeholder="Pilih tanggal"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                class="w-full!"
                :clearable="false"
                @change="onDateChange"
              />
            </div>

            <div class="flex items-end">
              <ElButton
                type="primary"
                plain
                :loading="loadingSession"
                class="w-full"
                @click="loadJournalSession"
              >
                <i class="ri-refresh-line mr-1"></i> Muat Jurnal
              </ElButton>
            </div>
          </div>
        </div>

        <!-- Resolved Context Details -->
        <div
          v-if="journalSession?.schedule"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs"
        >
          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Kelas / Rombel</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              {{ journalSession.schedule.className }}
            </div>
            <div class="text-[11px] text-gray-500 truncate">{{
              journalSession.schedule.majorName
            }}</div>
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Mata Pelajaran</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5 truncate">
              {{ journalSession.schedule.subjectName }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Kode SK: {{ journalSession.schedule.teacherAssignmentCode }}</div
            >
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Waktu Tatap Muka</div>
            <div class="font-bold font-mono text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              {{ journalSession.schedule.timeStart }}–{{ journalSession.schedule.timeEnd }}
            </div>
            <div class="text-[11px] text-gray-500">
              Jam ke-{{ journalSession.schedule.periodStart }} s.d
              {{ journalSession.schedule.periodEnd }} ({{ journalSession.schedule.totalPeriods }}
              JP)
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Ruang Belajar</div>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
              {{ journalSession.schedule.roomName }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Kode: {{ journalSession.schedule.roomCode }}</div
            >
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Tahun Pelajaran</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              TP {{ journalSession.schedule.academicYearName }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Semester {{ journalSession.schedule.semester }}</div
            >
          </div>

          <div
            class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 flex flex-col justify-between"
          >
            <div class="text-gray-400 font-medium">Status Jurnal</div>
            <div class="mt-0.5">
              <span
                v-if="journalSession.isExisting"
                class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <i class="ri-checkbox-circle-line"></i> Tersimpan (Edit)
              </span>
              <span
                v-else
                class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                <i class="ri-time-line"></i> Belum Diisi
              </span>
            </div>
            <div class="text-[10px] text-gray-400 truncate">1 Sesi = 1 Jurnal</div>
          </div>
        </div>
      </div>

      <!-- Attendance Integration Notice Bar -->
      <div
        v-if="journalSession"
        class="art-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold"
            :class="
              journalSession.attendanceDone
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            "
          >
            <i
              :class="
                journalSession.attendanceDone
                  ? 'ri-checkbox-circle-line text-xl'
                  : 'ri-information-line text-xl'
              "
            ></i>
          </div>
          <div>
            <div class="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              Presensi Siswa Sesi Ini:
              <span v-if="journalSession.attendanceDone" class="text-emerald-600 font-semibold">
                ✓ Sudah Tersimpan
              </span>
              <span v-else class="text-amber-600 font-semibold"> ○ Belum Disimpan </span>
            </div>
            <div
              v-if="journalSession.studentAttendanceSummary"
              class="text-xs text-gray-500 mt-0.5 flex items-center gap-3 font-mono"
            >
              <span class="text-emerald-600"
                >H: {{ journalSession.studentAttendanceSummary.hadir }}</span
              >
              <span class="text-blue-600"
                >I: {{ journalSession.studentAttendanceSummary.izin }}</span
              >
              <span class="text-amber-600"
                >S: {{ journalSession.studentAttendanceSummary.sakit }}</span
              >
              <span class="text-rose-600"
                >A: {{ journalSession.studentAttendanceSummary.alpa }}</span
              >
              <span class="text-purple-600"
                >T: {{ journalSession.studentAttendanceSummary.terlambat }}</span
              >
              <span class="text-cyan-600"
                >D: {{ journalSession.studentAttendanceSummary.dispensasi }}</span
              >
            </div>
            <div v-else class="text-xs text-gray-400 mt-0.5">
              Presensi siswa dapat diisi sebelum atau sesudah pengisian jurnal agenda mengajar.
            </div>
          </div>
        </div>

        <div>
          <ElButton size="small" plain @click="goToAttendance">
            <i class="ri-user-follow-line mr-1"></i>
            {{ journalSession.attendanceDone ? 'Lihat / Edit Presensi' : 'Isi Presensi Sekarang' }}
          </ElButton>
        </div>
      </div>

      <!-- Journal Form Card -->
      <div class="art-card p-6 space-y-5">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <i class="ri-edit-2-line text-emerald-600"></i> Form Agenda Pembelajaran
          </h2>
          <p class="text-xs text-gray-500 mt-0.5">
            Lengkapi data materi pokok dan ringkasan aktivitas tatap muka pembelajaran hari ini.
          </p>
        </div>

        <div v-if="loadingSession" class="py-12 text-center text-gray-400 space-y-2">
          <i class="ri-loader-4-line text-3xl animate-spin text-emerald-600"></i>
          <div>Memuat data formulir jurnal...</div>
        </div>

        <div v-else class="space-y-4">
          <!-- Field 1: Materi / Topik Pembelajaran -->
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Materi / Topik Pembelajaran <span class="text-rose-500">*</span>
            </label>
            <ElInput
              v-model="form.topic"
              placeholder="Contoh: Konfigurasi Routing Dinamis OSPF pada MikroTik RouterBoard..."
              clearable
              maxlength="200"
              show-word-limit
            />
            <div class="text-[11px] text-gray-400 mt-1">
              Tuliskan pokok bahasan atau materi pokok yang diajarkan pada sesi ini.
            </div>
          </div>

          <!-- Field 2: Capaian / Tujuan Pembelajaran (Phase 3) -->
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Tujuan / Capaian Pembelajaran (TP)
            </label>
            <ElInput
              v-model="form.learningOutcome"
              placeholder="Contoh: Siswa mampu mengkonfigurasi dan memverifikasi routing protokol OSPF..."
              clearable
              maxlength="300"
              show-word-limit
            />
            <div class="text-[11px] text-gray-400 mt-1">
              Target kompetensi atau tujuan pembelajaran yang dicapai pada pertemuan ini (opsional).
            </div>
          </div>

          <!-- Field 3: Kegiatan Pembelajaran -->
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Kegiatan / Ringkasan Aktivitas Pembelajaran <span class="text-rose-500">*</span>
            </label>
            <ElInput
              v-model="form.activitySummary"
              type="textarea"
              :rows="4"
              placeholder="Tuliskan urutan aktivitas pembelajaran: apersepsi, penyampaian teori, praktikum mandiri, tanya jawab, atau evaluasi penutup..."
              maxlength="1000"
              show-word-limit
            />
            <div class="text-[11px] text-gray-400 mt-1">
              Deskripsi kegiatan aktual pembelajaran di kelas / lab / bengkel kerja.
            </div>
          </div>

          <!-- Field 4: Catatan / Keterangan Tambahan -->
          <div>
            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Catatan Pembelajaran / Keterangan Tambahan
            </label>
            <ElInput
              v-model="form.notes"
              type="textarea"
              :rows="2"
              placeholder="Catatan kendala praktikum, pekerjaan rumah, atau siswa yang perlu bimbingan khusus (opsional)..."
              maxlength="500"
              show-word-limit
            />
          </div>

          <!-- Actions -->
          <div
            class="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3"
          >
            <ElButton plain @click="goToSchedule"> Kembali ke Jadwal </ElButton>

            <div class="flex items-center gap-3">
              <ElButton plain :loading="saving" @click="handleSaveJournal('DRAFT')">
                <i class="ri-draft-line mr-1"></i> Simpan Draf
              </ElButton>
              <ElButton
                type="primary"
                :loading="saving"
                class="bg-emerald-600 hover:bg-emerald-700 border-none"
                @click="handleSaveJournal('COMPLETED')"
              >
                <i class="ri-checkbox-circle-line mr-1"></i> Simpan Selesai
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage, ElButton, ElSelect, ElOption, ElDatePicker, ElInput } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import {
    scheduleService,
    type TeacherResolvedScheduleItem
  } from '@/core/services/master/ScheduleService'
  import {
    journalService,
    type TeacherJournalSessionData
  } from '@/core/services/journal/JournalService'
  import type { SessionData } from '@/core/types'

  defineOptions({ name: 'TeacherJournal' })

  const route = useRoute()
  const router = useRouter()

  const currentSession = ref<SessionData | null>(null)
  const teacherName = ref('')
  const errorMessage = ref('')
  const loadingSchedules = ref(false)
  const loadingSession = ref(false)
  const saving = ref(false)

  const availableSchedules = ref<TeacherResolvedScheduleItem[]>([])
  const selectedScheduleId = ref<string>('')
  const selectedDate = ref<string>(journalService.getLocalDateString())
  const journalSession = ref<TeacherJournalSessionData | null>(null)

  const form = ref({
    topic: '',
    learningOutcome: '',
    activitySummary: '',
    notes: ''
  })

  const loadTeacherSchedules = async () => {
    const teacherId = currentSession.value?.teacherId
    if (!teacherId) {
      errorMessage.value = 'Akun Anda tidak terhubung dengan data Guru terverifikasi.'
      return
    }

    loadingSchedules.value = true
    try {
      const data = await scheduleService.getTeacherSchedule(teacherId)
      availableSchedules.value = data.schedules
      if (data.teacher) {
        teacherName.value = data.teacher.name
      }

      // Query params
      const queryScheduleId = route.query.scheduleId as string
      const queryDate = route.query.date as string

      if (queryDate) {
        selectedDate.value = queryDate
      }

      if (queryScheduleId) {
        const found = availableSchedules.value.find((s) => s.id === queryScheduleId)
        if (found) {
          selectedScheduleId.value = found.id
        } else {
          errorMessage.value = 'Akses ditolak. Anda tidak memiliki hak akses ke jurnal jadwal ini.'
          return
        }
      } else if (availableSchedules.value.length > 0) {
        const todaySched = data.todaySchedules[0]
        selectedScheduleId.value = todaySched ? todaySched.id : availableSchedules.value[0].id
      }

      if (selectedScheduleId.value) {
        await loadJournalSession()
      }
    } catch (err: any) {
      console.warn('[TeacherJournal] Error loading schedules:', err)
      errorMessage.value = err?.message || 'Gagal memuat jadwal mengajar.'
    } finally {
      loadingSchedules.value = false
    }
  }

  const loadJournalSession = async () => {
    if (!selectedScheduleId.value) return
    loadingSession.value = true
    errorMessage.value = ''

    try {
      const data = await journalService.getJournalSession(
        selectedScheduleId.value,
        selectedDate.value
      )
      journalSession.value = data
      form.value.topic = data.topic
      form.value.learningOutcome = data.learningOutcome || ''
      form.value.activitySummary = data.activitySummary
      form.value.notes = data.notes
    } catch (err: any) {
      console.warn('[TeacherJournal] Error loading journal session:', err)
      errorMessage.value = err?.message || 'Gagal memuat sesi jurnal.'
      journalSession.value = null
    } finally {
      loadingSession.value = false
    }
  }

  const onScheduleChange = () => {
    loadJournalSession()
  }

  const onDateChange = () => {
    loadJournalSession()
  }

  const handleSaveJournal = async (targetStatus: 'DRAFT' | 'COMPLETED' = 'COMPLETED') => {
    if (!selectedScheduleId.value) return

    const topic = form.value.topic.trim()
    const activity = form.value.activitySummary.trim()
    const outcome = form.value.learningOutcome.trim()

    if (!topic) {
      ElMessage.warning('Materi / Topik pembelajaran wajib diisi.')
      return
    }
    if (!activity) {
      ElMessage.warning('Kegiatan pembelajaran wajib diisi.')
      return
    }

    saving.value = true
    try {
      const res = await journalService.saveJournal({
        scheduleId: selectedScheduleId.value,
        date: selectedDate.value,
        topic,
        activitySummary: activity,
        learningOutcome: outcome,
        status: targetStatus,
        notes: form.value.notes
      })

      if (journalSession.value) {
        journalSession.value.journalId = res.journal.id
        journalSession.value.isExisting = true
        journalSession.value.topic = res.journal.topic
        journalSession.value.learningOutcome = res.journal.learningOutcome || ''
        journalSession.value.activitySummary = res.journal.activitySummary
        journalSession.value.notes = res.journal.notes || ''
      }

      ElMessage.success(
        targetStatus === 'DRAFT'
          ? 'Draf jurnal berhasil disimpan.'
          : 'Jurnal Agenda Pembelajaran berhasil disimpan.'
      )
    } catch (err: any) {
      console.warn('[TeacherJournal] Error saving journal:', err)
      ElMessage.error(err?.message || 'Gagal menyimpan jurnal pembelajaran.')
    } finally {
      saving.value = false
    }
  }

  const goToAttendance = () => {
    if (!selectedScheduleId.value) {
      router.push('/teacher/attendance')
      return
    }
    router.push({
      path: '/teacher/attendance',
      query: {
        scheduleId: selectedScheduleId.value,
        date: selectedDate.value
      }
    })
  }

  const goToSchedule = () => {
    router.push('/teacher/schedule')
  }

  onMounted(() => {
    currentSession.value = authService.getCurrentSession()
    if (!currentSession.value || currentSession.value.role !== 'GURU') {
      errorMessage.value = 'Akses ditolak. Halaman ini hanya untuk Guru terverifikasi.'
      return
    }
    loadTeacherSchedules()
  })
</script>
