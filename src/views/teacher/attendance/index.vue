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
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          >
            PRESENSI SISWA
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-user-follow-line text-emerald-600"></i> Presensi Kehadiran Siswa
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ teacherName }}</span>
          <span v-if="sessionData?.schedule">
            &bull; {{ sessionData.schedule.className }} &bull;
            {{ sessionData.schedule.subjectName }}
          </span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton plain @click="goToSchedule">
          <i class="ri-calendar-schedule-line mr-1"></i> Jadwal Mengajar
        </ElButton>
        <ElButton plain @click="goToDashboard">
          <i class="ri-dashboard-line mr-1"></i> Dashboard
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
                Tanggal Presensi
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
                @click="loadAttendanceSession"
              >
                <i class="ri-refresh-line mr-1"></i> Muat Presensi
              </ElButton>
            </div>
          </div>
        </div>

        <!-- Resolved Context Details -->
        <div
          v-if="sessionData?.schedule"
          class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs"
        >
          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Kelas / Rombel</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              {{ sessionData.schedule.className }}
            </div>
            <div class="text-[11px] text-gray-500 truncate">{{
              sessionData.schedule.majorName
            }}</div>
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Mata Pelajaran</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5 truncate">
              {{ sessionData.schedule.subjectName }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Kode SK: {{ sessionData.schedule.teacherAssignmentCode }}</div
            >
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Waktu Tatap Muka</div>
            <div class="font-bold font-mono text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              {{ sessionData.schedule.timeStart }}–{{ sessionData.schedule.timeEnd }}
            </div>
            <div class="text-[11px] text-gray-500">
              Jam ke-{{ sessionData.schedule.periodStart }} s.d
              {{ sessionData.schedule.periodEnd }} ({{ sessionData.schedule.totalPeriods }} JP)
            </div>
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Ruang Belajar</div>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
              {{ sessionData.schedule.roomName }}
            </div>
            <div class="text-[11px] text-gray-500">Kode: {{ sessionData.schedule.roomCode }}</div>
          </div>

          <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <div class="text-gray-400 font-medium">Tahun Pelajaran</div>
            <div class="font-bold text-gray-900 dark:text-gray-100 text-sm mt-0.5">
              TP {{ sessionData.schedule.academicYearName }}
            </div>
            <div class="text-[11px] text-gray-500"
              >Semester {{ sessionData.schedule.semester }}</div
            >
          </div>

          <div
            class="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 flex flex-col justify-between"
          >
            <div class="text-gray-400 font-medium">Status Data</div>
            <div class="mt-0.5">
              <span
                v-if="sessionData.isExisting"
                class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <i class="ri-checkbox-circle-line"></i> Tersimpan (Edit)
              </span>
              <span
                v-else
                class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                <i class="ri-time-line"></i> Belum Disimpan
              </span>
            </div>
            <div class="text-[10px] text-gray-400 truncate">1 Sesi = 1 Presensi</div>
          </div>
        </div>
      </div>

      <!-- Success Action Banner (After Save) -->
      <div
        v-if="saveSuccess"
        class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0"
          >
            <i class="ri-check-line text-2xl"></i>
          </div>
          <div>
            <h3 class="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
              Presensi Siswa Berhasil Disimpan
            </h3>
            <p class="text-xs text-emerald-700 dark:text-emerald-300">
              Data presensi untuk kelas {{ sessionData?.schedule.className }} pada
              {{ selectedDate }} telah tersimpan aman di database lokal.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <ElButton
            type="primary"
            class="bg-emerald-600 hover:bg-emerald-700 border-none"
            @click="goToJournal"
          >
            Lanjut ke Jurnal Mengajar <i class="ri-arrow-right-line ml-1"></i>
          </ElButton>
        </div>
      </div>

      <!-- Quick Summary Cards -->
      <div v-if="sessionData" class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <!-- Total -->
        <div class="art-card p-3.5">
          <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider"
            >Total Siswa</div
          >
          <div class="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-1">
            {{ sessionData.records.length }}
          </div>
        </div>

        <!-- Hadir (H) -->
        <div
          class="bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-200 dark:border-emerald-900/60 shadow-xs"
        >
          <div
            class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider"
          >
            Hadir (H)
          </div>
          <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {{ currentSummary.hadir }}
          </div>
        </div>

        <!-- Izin (I) -->
        <div
          class="bg-blue-50/40 dark:bg-blue-950/20 rounded-xl p-3.5 border border-blue-200 dark:border-blue-900/60 shadow-xs"
        >
          <div
            class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider"
          >
            Izin (I)
          </div>
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {{ currentSummary.izin }}
          </div>
        </div>

        <!-- Sakit (S) -->
        <div
          class="bg-amber-50/40 dark:bg-amber-950/20 rounded-xl p-3.5 border border-amber-200 dark:border-amber-900/60 shadow-xs"
        >
          <div
            class="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider"
          >
            Sakit (S)
          </div>
          <div class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {{ currentSummary.sakit }}
          </div>
        </div>

        <!-- Alpa (A) -->
        <div
          class="bg-rose-50/40 dark:bg-rose-950/20 rounded-xl p-3.5 border border-rose-200 dark:border-rose-900/60 shadow-xs"
        >
          <div
            class="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider"
          >
            Alpa (A)
          </div>
          <div class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {{ currentSummary.alpa }}
          </div>
        </div>

        <!-- Terlambat (T) -->
        <div
          class="bg-purple-50/40 dark:bg-purple-950/20 rounded-xl p-3.5 border border-purple-200 dark:border-purple-900/60 shadow-xs"
        >
          <div
            class="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider"
          >
            Terlambat (T)
          </div>
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {{ currentSummary.terlambat }}
          </div>
        </div>

        <!-- Dispensasi (D) -->
        <div
          class="bg-cyan-50/40 dark:bg-cyan-950/20 rounded-xl p-3.5 border border-cyan-200 dark:border-cyan-900/60 shadow-xs"
        >
          <div
            class="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider"
          >
            Dispensasi (D)
          </div>
          <div class="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
            {{ currentSummary.dispensasi }}
          </div>
        </div>
      </div>

      <!-- Student Roster Table Card -->
      <div class="art-card p-5 space-y-4">
        <!-- Table Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <h2
              class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
            >
              <i class="ri-team-line text-emerald-600"></i> Daftar Siswa Kelas
            </h2>
            <span
              v-if="sessionData?.records"
              class="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            >
              {{ sessionData.records.length }} Siswa
            </span>
          </div>

          <div class="flex items-center gap-2">
            <!-- Search Filter -->
            <ElInput
              v-model="searchQuery"
              placeholder="Cari siswa / NIS..."
              clearable
              size="small"
              class="w-48 sm:w-56"
            >
              <template #prefix>
                <i class="ri-search-line text-gray-400"></i>
              </template>
            </ElInput>

            <!-- Quick Action: Semua Hadir -->
            <ElButton
              type="success"
              plain
              size="small"
              :disabled="!sessionData || sessionData.records.length === 0"
              @click="setAllPresent"
            >
              <i class="ri-check-double-line mr-1"></i> Semua Hadir
            </ElButton>
          </div>
        </div>

        <!-- Empty Roster State -->
        <div v-if="loadingSession" class="py-12 text-center text-gray-400 space-y-2">
          <i class="ri-loader-4-line text-3xl animate-spin text-emerald-600"></i>
          <div>Memuat data presensi dan daftar siswa...</div>
        </div>

        <div
          v-else-if="!sessionData || sessionData.records.length === 0"
          class="py-12 text-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 space-y-2"
        >
          <i class="ri-user-unfollow-line text-4xl text-gray-300 dark:text-gray-600"></i>
          <div class="font-medium text-gray-700 dark:text-gray-300">
            Belum ada data siswa pada rombel ini.
          </div>
          <p class="text-xs text-gray-400">
            Pastikan rombongan belajar telah memiliki data siswa aktif di master data.
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr
                class="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider"
              >
                <th class="p-3 w-12 text-center font-bold">No</th>
                <th class="p-3 w-32 font-bold">NIS</th>
                <th class="p-3 font-bold">Nama Lengkap Siswa</th>
                <th class="p-3 w-16 text-center font-bold">L/P</th>
                <th class="p-3 w-96 font-bold text-center">Status Kehadiran</th>
                <th class="p-3 font-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(student, index) in filteredStudents"
                :key="student.studentId"
                class="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                :class="{
                  'bg-rose-50/20 dark:bg-rose-950/10': student.status === 'A',
                  'bg-amber-50/20 dark:bg-amber-950/10': student.status === 'S',
                  'bg-blue-50/20 dark:bg-blue-950/10': student.status === 'I'
                }"
              >
                <td class="p-3 text-center text-xs text-gray-400 font-mono">
                  {{ index + 1 }}
                </td>

                <td class="p-3 font-mono text-xs text-gray-700 dark:text-gray-300 font-semibold">
                  {{ student.nis }}
                </td>

                <td class="p-3">
                  <div class="font-bold text-gray-900 dark:text-gray-100">
                    {{ student.name }}
                  </div>
                </td>

                <td class="p-3 text-center">
                  <span
                    class="px-1.5 py-0.5 text-xs font-bold rounded font-mono"
                    :class="
                      student.gender === 'L'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                    "
                  >
                    {{ student.gender }}
                  </span>
                </td>

                <td class="p-3 text-center">
                  <div class="inline-flex rounded-lg p-1 bg-gray-100 dark:bg-gray-800/80 gap-1">
                    <!-- H: Hadir -->
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer"
                      :class="
                        student.status === 'H'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      "
                      title="Hadir"
                      @click="setStudentStatus(student, 'H')"
                    >
                      H
                    </button>

                    <!-- I: Izin -->
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer"
                      :class="
                        student.status === 'I'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      "
                      title="Izin"
                      @click="setStudentStatus(student, 'I')"
                    >
                      I
                    </button>

                    <!-- S: Sakit -->
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer"
                      :class="
                        student.status === 'S'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      "
                      title="Sakit"
                      @click="setStudentStatus(student, 'S')"
                    >
                      S
                    </button>

                    <!-- A: Alpa -->
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer"
                      :class="
                        student.status === 'A'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      "
                      title="Alpa / Tanpa Keterangan"
                      @click="setStudentStatus(student, 'A')"
                    >
                      A
                    </button>

                    <!-- T: Terlambat -->
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer"
                      :class="
                        student.status === 'T'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      "
                      title="Terlambat"
                      @click="setStudentStatus(student, 'T')"
                    >
                      T
                    </button>

                    <!-- D: Dispensasi -->
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer"
                      :class="
                        student.status === 'D'
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      "
                      title="Dispensasi"
                      @click="setStudentStatus(student, 'D')"
                    >
                      D
                    </button>
                  </div>
                </td>

                <td class="p-3">
                  <ElInput
                    v-model="student.note"
                    size="small"
                    placeholder="Catatan / keterangan..."
                    class="w-full"
                    :disabled="student.status === 'H'"
                    @input="isDirty = true"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Sticky Bottom Save Bar -->
        <div
          v-if="sessionData && sessionData.records.length > 0"
          class="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div class="text-xs text-gray-500">
            Total Siswa:
            <span class="font-bold text-gray-800 dark:text-gray-200">{{
              sessionData.records.length
            }}</span>
            &bull; Hadir:
            <span class="font-bold text-emerald-600">{{ currentSummary.hadir }}</span> &bull; Tidak
            Hadir:
            <span class="font-bold text-rose-600">{{
              currentSummary.izin + currentSummary.sakit + currentSummary.alpa
            }}</span>
          </div>

          <div class="flex items-center gap-3">
            <ElButton plain @click="goToSchedule"> Batal </ElButton>
            <ElButton
              type="primary"
              :loading="saving"
              class="bg-emerald-600 hover:bg-emerald-700 border-none"
              @click="handleSaveAttendance"
            >
              <i class="ri-save-line mr-1"></i> Simpan Presensi
            </ElButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
  import {
    ElMessage,
    ElMessageBox,
    ElButton,
    ElSelect,
    ElOption,
    ElDatePicker,
    ElInput
  } from 'element-plus'
  import { authService } from '@/core/services/auth'
  import {
    scheduleService,
    type TeacherResolvedScheduleItem
  } from '@/core/services/master/ScheduleService'
  import {
    attendanceService,
    type TeacherAttendanceSessionData,
    type StudentRosterAttendanceItem
  } from '@/core/services/attendance/AttendanceService'
  import type { AttendanceStatus, SessionData } from '@/core/types'

  defineOptions({ name: 'TeacherAttendance' })

  const route = useRoute()
  const router = useRouter()

  const currentSession = ref<SessionData | null>(null)
  const teacherName = ref('')
  const errorMessage = ref('')
  const loadingSchedules = ref(false)
  const loadingSession = ref(false)
  const saving = ref(false)
  const saveSuccess = ref(false)
  const isDirty = ref(false)

  const availableSchedules = ref<TeacherResolvedScheduleItem[]>([])
  const selectedScheduleId = ref<string>('')
  const selectedDate = ref<string>(attendanceService.getLocalDateString())
  const searchQuery = ref('')
  const sessionData = ref<TeacherAttendanceSessionData | null>(null)

  const currentSummary = computed(() => {
    if (!sessionData.value) {
      return { hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0, dispensasi: 0 }
    }
    return attendanceService.calculateSummary(sessionData.value.records)
  })

  const filteredStudents = computed(() => {
    if (!sessionData.value) return []
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return sessionData.value.records
    return sessionData.value.records.filter(
      (s) => s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
    )
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

      // Check query parameter
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
          errorMessage.value = 'Akses ditolak. Anda tidak memiliki hak akses ke jadwal kelas ini.'
          return
        }
      } else if (availableSchedules.value.length > 0) {
        // Pick first or today's session
        const todaySched = data.todaySchedules[0]
        selectedScheduleId.value = todaySched ? todaySched.id : availableSchedules.value[0].id
      }

      if (selectedScheduleId.value) {
        await loadAttendanceSession()
      }
    } catch (err: any) {
      console.warn('[TeacherAttendance] Error loading teacher schedules:', err)
      errorMessage.value = err?.message || 'Gagal memuat jadwal mengajar.'
    } finally {
      loadingSchedules.value = false
    }
  }

  const loadAttendanceSession = async () => {
    if (!selectedScheduleId.value) return
    loadingSession.value = true
    saveSuccess.value = false
    errorMessage.value = ''
    isDirty.value = false

    try {
      const data = await attendanceService.getAttendanceSession(
        selectedScheduleId.value,
        selectedDate.value
      )
      sessionData.value = data
    } catch (err: any) {
      console.warn('[TeacherAttendance] Error loading attendance session:', err)
      errorMessage.value = err?.message || 'Gagal memuat sesi presensi.'
      sessionData.value = null
    } finally {
      loadingSession.value = false
    }
  }

  const onScheduleChange = () => {
    loadAttendanceSession()
  }

  const onDateChange = () => {
    loadAttendanceSession()
  }

  const setStudentStatus = (student: StudentRosterAttendanceItem, status: AttendanceStatus) => {
    if (student.status !== status) {
      student.status = status
      isDirty.value = true
    }
    if (status === 'H') {
      student.note = ''
    }
  }

  const setAllPresent = () => {
    if (!sessionData.value) return
    sessionData.value.records.forEach((s) => {
      s.status = 'H'
      s.note = ''
    })
    isDirty.value = true
    ElMessage.success('Semua siswa disetel Hadir (H)')
  }

  const handleSaveAttendance = async () => {
    if (!sessionData.value || !selectedScheduleId.value) return
    saving.value = true
    try {
      const res = await attendanceService.saveAttendance({
        scheduleId: selectedScheduleId.value,
        date: selectedDate.value,
        records: sessionData.value.records.map((r) => ({
          studentId: r.studentId,
          status: r.status,
          note: r.note
        }))
      })

      sessionData.value.attendanceId = res.attendance.id
      sessionData.value.isExisting = true
      saveSuccess.value = true
      isDirty.value = false
      ElMessage.success('Presensi siswa berhasil disimpan.')
    } catch (err: any) {
      console.warn('[TeacherAttendance] Error saving attendance:', err)
      ElMessage.error(err?.message || 'Gagal menyimpan presensi siswa.')
    } finally {
      saving.value = false
    }
  }

  onBeforeRouteLeave(async (to, from, next) => {
    if (isDirty.value) {
      try {
        await ElMessageBox.confirm(
          'Anda memiliki perubahan presensi yang belum disimpan. Yakin ingin meninggalkan halaman ini?',
          'Konfirmasi Keluar',
          {
            confirmButtonText: 'Ya, Tinggalkan',
            cancelButtonText: 'Batal',
            type: 'warning'
          }
        )
        next()
      } catch {
        next(false)
      }
    } else {
      next()
    }
  })

  const goToJournal = () => {
    if (!selectedScheduleId.value) return
    router.push({
      path: '/teacher/journal',
      query: {
        scheduleId: selectedScheduleId.value,
        date: selectedDate.value
      }
    })
  }

  const goToSchedule = () => {
    router.push('/teacher/schedule')
  }

  const goToDashboard = () => {
    router.push('/teacher/dashboard')
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
