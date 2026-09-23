<template>
  <div class="p-5 space-y-5">
    <!-- Page Header & Action Bar -->
    <div
      class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"
    >
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
          >
            OFFLINE READY
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
          >
            GOVERNANCE & REPORTING
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-2"
        >
          <i class="ri-file-chart-line text-emerald-600 text-2xl"></i>
          Laporan & Rekapitulasi Akademik
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Rekapitulasi presensi, jurnal mengajar, penilaian, kedisiplinan, dan kelengkapan guru SMK
          NU Ungaran.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ElButton type="primary" plain @click="handleExportCsv">
          <i class="ri-file-download-line mr-1"></i> Ekspor CSV
        </ElButton>
        <ElButton type="success" @click="handleExportXlsx">
          <i class="ri-file-excel-2-line mr-1"></i> Ekspor XLSX (Multi-Sheet)
        </ElButton>
        <ElButton type="warning" @click="handlePrintReport">
          <i class="ri-printer-line mr-1"></i> Cetak Dokumen A4
        </ElButton>
      </div>
    </div>

    <!-- Centralized Report Filter Bar -->
    <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <i class="ri-filter-3-line text-emerald-600"></i> Filter Data Laporan
          </span>
          <ElButton size="small" text type="primary" @click="resetFilters">
            <i class="ri-refresh-line mr-1"></i> Reset Filter
          </ElButton>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
            Tahun Akademik & Semester
          </label>
          <ElSelect
            v-model="filter.academicYearId"
            placeholder="Pilih Tahun Akademik"
            class="w-full"
            clearable
            @change="loadReports"
          >
            <ElOption
              v-for="ay in academicYears"
              :key="ay.id"
              :label="`${ay.name} - ${ay.semester} ${ay.isLocked ? '[LOCKED]' : ay.isActive ? '(Aktif)' : ''}`"
              :value="ay.id"
            />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
            Rentang Tanggal
          </label>
          <ElDatePicker
            v-model="dateRange"
            type="daterange"
            range-separator="s/d"
            start-placeholder="Tgl Mulai"
            end-placeholder="Tgl Selesai"
            value-format="YYYY-MM-DD"
            class="w-full"
            @change="handleDateRangeChange"
          />
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
            Kelas / Rombel
          </label>
          <ElSelect
            v-model="filter.classId"
            placeholder="Semua Kelas"
            class="w-full"
            clearable
            @change="loadReports"
          >
            <ElOption v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
            Guru Pengajar
          </label>
          <ElSelect
            v-model="filter.teacherId"
            placeholder="Semua Guru"
            class="w-full"
            clearable
            @change="loadReports"
          >
            <ElOption v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
          </ElSelect>
        </div>
      </div>
    </ElCard>

    <!-- Report View Tabs -->
    <ElTabs v-model="activeTab" type="border-card" class="art-card" @tab-change="loadReports">
      <!-- TAB 1: PRESENSI SISWA (SEMESTER / RANGE) -->
      <ElTabPane name="attendance">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-user-follow-line text-emerald-600"></i> Rekap Presensi Siswa
          </span>
        </template>

        <div class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div
              class="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-center"
            >
              <span class="text-xs text-slate-500 block font-medium">Total Siswa</span>
              <span class="text-xl font-bold text-slate-800 dark:text-slate-100">{{
                attendanceRecap?.totalStudents || 0
              }}</span>
            </div>
            <div
              class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg text-center"
            >
              <span class="text-xs text-emerald-700 dark:text-emerald-400 block font-medium"
                >Hadir (H)</span
              >
              <span class="text-xl font-bold text-emerald-800 dark:text-emerald-300">{{
                attendanceRecap?.totalHadir || 0
              }}</span>
            </div>
            <div
              class="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-center"
            >
              <span class="text-xs text-blue-700 dark:text-blue-400 block font-medium"
                >Izin (I)</span
              >
              <span class="text-xl font-bold text-blue-800 dark:text-blue-300">{{
                attendanceRecap?.totalIzin || 0
              }}</span>
            </div>
            <div
              class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-lg text-center"
            >
              <span class="text-xs text-amber-700 dark:text-amber-400 block font-medium"
                >Sakit (S)</span
              >
              <span class="text-xl font-bold text-amber-800 dark:text-amber-300">{{
                attendanceRecap?.totalSakit || 0
              }}</span>
            </div>
            <div
              class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-lg text-center"
            >
              <span class="text-xs text-rose-700 dark:text-rose-400 block font-medium"
                >Alpa (A)</span
              >
              <span class="text-xl font-bold text-rose-800 dark:text-rose-300">{{
                attendanceRecap?.totalAlpa || 0
              }}</span>
            </div>
            <div
              class="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 p-3 rounded-lg text-center"
            >
              <span class="text-xs text-teal-700 dark:text-teal-400 block font-medium"
                >% Kehadiran</span
              >
              <span class="text-xl font-bold text-teal-800 dark:text-teal-300"
                >{{ attendanceRecap?.overallPresencePercentage || 0 }}%</span
              >
            </div>
          </div>

          <!-- Attendance Table -->
          <ElTable :data="attendanceRecap?.students || []" stripe border style="width: 100%">
            <ElTableColumn prop="nis" label="NIS" width="110" />
            <ElTableColumn prop="name" label="Nama Siswa" min-width="180" sortable />
            <ElTableColumn prop="className" label="Kelas" width="130" />
            <ElTableColumn prop="hadir" label="H" width="60" align="center" />
            <ElTableColumn prop="izin" label="I" width="60" align="center" />
            <ElTableColumn prop="sakit" label="S" width="60" align="center" />
            <ElTableColumn prop="alpa" label="A" width="60" align="center" />
            <ElTableColumn prop="terlambat" label="T" width="60" align="center" />
            <ElTableColumn prop="dispensasi" label="D" width="60" align="center" />
            <ElTableColumn prop="totalRecorded" label="Total Jam" width="90" align="center" />
            <ElTableColumn
              label="% Kehadiran"
              width="130"
              align="center"
              sortable
              prop="presencePercentage"
            >
              <template #default="{ row }">
                <span
                  class="px-2 py-0.5 rounded text-xs font-semibold"
                  :class="
                    row.presencePercentage >= 85
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  "
                >
                  {{ row.presencePercentage }}%
                </span>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </ElTabPane>

      <!-- TAB 2: PRESENSI HARIAN -->
      <ElTabPane name="daily-attendance">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-calendar-check-line text-teal-600"></i> Presensi Harian & Sesi
          </span>
        </template>

        <ElTable :data="dailyAttendances" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
          <ElTableColumn prop="timeSlot" label="Jam / Sesi" width="120" />
          <ElTableColumn prop="teacherName" label="Guru Pengampu" width="170" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="160" />
          <ElTableColumn prop="className" label="Kelas" width="120" />
          <ElTableColumn prop="totalStudents" label="Siswa" width="75" align="center" />
          <ElTableColumn prop="hadir" label="H" width="55" align="center" />
          <ElTableColumn prop="izin" label="I" width="55" align="center" />
          <ElTableColumn prop="sakit" label="S" width="55" align="center" />
          <ElTableColumn prop="alpa" label="A" width="55" align="center" />
          <ElTableColumn prop="terlambat" label="T" width="55" align="center" />
          <ElTableColumn prop="dispensasi" label="D" width="55" align="center" />
        </ElTable>
      </ElTabPane>

      <!-- TAB 3: KELENGKAPAN GURU (COMPLETENESS GOVERNANCE) -->
      <ElTabPane name="completeness">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-shield-check-line text-indigo-600"></i> Kelengkapan Berkas Guru
          </span>
        </template>

        <ElTable :data="teacherCompletenessList" stripe border style="width: 100%">
          <ElTableColumn prop="nip" label="NIP" width="140" />
          <ElTableColumn prop="name" label="Nama Guru" min-width="180" sortable />
          <ElTableColumn label="Presensi" width="110" align="center">
            <template #default="{ row }">
              <span class="text-xs font-semibold">{{ row.attendanceCompleteness }}%</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Jurnal" width="110" align="center">
            <template #default="{ row }">
              <span class="text-xs font-semibold">{{ row.journalCompleteness }}%</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Penilaian" width="110" align="center">
            <template #default="{ row }">
              <span class="text-xs font-semibold">{{ row.assessmentCompleteness }}%</span>
            </template>
          </ElTableColumn>
          <ElTableColumn
            label="Total Kelengkapan"
            width="150"
            align="center"
            sortable
            prop="overallCompleteness"
          >
            <template #default="{ row }">
              <span
                class="px-2.5 py-0.5 rounded text-xs font-bold"
                :class="
                  row.overallCompleteness >= 75
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                "
              >
                {{ row.overallCompleteness }}%
              </span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="Status Pengajuan" width="140" align="center">
            <template #default="{ row }">
              <span
                class="px-2 py-0.5 rounded text-xs font-semibold"
                :class="
                  row.submissionStatus === 'APPROVED' || row.submissionStatus === 'LOCKED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : row.submissionStatus === 'SUBMITTED'
                      ? 'bg-blue-100 text-blue-800'
                      : row.submissionStatus === 'RETURNED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                "
              >
                {{ row.submissionStatus }}
              </span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>

      <!-- TAB 4: JURNAL MENGAJAR -->
      <ElTabPane name="journal">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-book-read-line text-amber-600"></i> Laporan Jurnal Mengajar
          </span>
        </template>

        <ElTable :data="journals" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
          <ElTableColumn prop="teacherName" label="Guru Pengajar" width="160" />
          <ElTableColumn prop="className" label="Kelas" width="110" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="160" />
          <ElTableColumn prop="topic" label="Materi / Topik" min-width="180" />
          <ElTableColumn prop="activitySummary" label="Aktivitas Pembelajaran" min-width="200" />
          <ElTableColumn prop="learningObjectives" label="TP / Capaian" min-width="150" />
          <ElTableColumn prop="notes" label="Catatan" width="130" />
        </ElTable>
      </ElTabPane>

      <!-- TAB 5: PENILAIAN & KKM -->
      <ElTabPane name="assessment">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-file-list-3-line text-purple-600"></i> Laporan Penilaian & KKM
          </span>
        </template>

        <ElTable :data="assessments" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
          <ElTableColumn prop="title" label="Judul Penilaian" min-width="160" />
          <ElTableColumn prop="type" label="Jenis" width="100" align="center" />
          <ElTableColumn prop="className" label="Kelas" width="110" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="150" />
          <ElTableColumn
            prop="totalStudentsGraded"
            label="Siswa Dinilai"
            width="100"
            align="center"
          />
          <ElTableColumn
            prop="averageScore"
            label="Rata-rata"
            width="100"
            align="center"
            sortable
          />
          <ElTableColumn prop="highestScore" label="Nilai Max" width="90" align="center" />
          <ElTableColumn prop="lowestScore" label="Nilai Min" width="90" align="center" />
          <ElTableColumn label="Tuntas KKM (>=75)" width="130" align="center">
            <template #default="{ row }">
              <span class="text-xs font-semibold text-emerald-700">
                {{ row.studentsPassingKkm }} siswa ({{ row.passingPercentage }}%)
              </span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>

      <!-- TAB 6: REKAP KEDISIPLINAN -->
      <ElTabPane name="discipline">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-alarm-warning-line text-rose-600"></i> Rekap Kedisiplinan & Karakter
          </span>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              class="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded text-center"
            >
              <span class="text-xs text-slate-500 block">Total Insiden</span>
              <span class="text-xl font-bold text-slate-800 dark:text-slate-100">{{
                disciplineRecap?.totalIncidents || 0
              }}</span>
            </div>
            <div
              class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded text-center"
            >
              <span class="text-xs text-rose-700 dark:text-rose-400 block">Pelanggaran</span>
              <span class="text-xl font-bold text-rose-800 dark:text-rose-300">{{
                disciplineRecap?.totalViolations || 0
              }}</span>
            </div>
            <div
              class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded text-center"
            >
              <span class="text-xs text-emerald-700 dark:text-emerald-400 block"
                >Apresiasi / Prestasi</span
              >
              <span class="text-xl font-bold text-emerald-800 dark:text-emerald-300">{{
                disciplineRecap?.totalPraise || 0
              }}</span>
            </div>
            <div
              class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded text-center"
            >
              <span class="text-xs text-amber-700 dark:text-amber-400 block">Akumulasi Poin</span>
              <span class="text-xl font-bold text-amber-800 dark:text-amber-300">{{
                disciplineRecap?.totalPoints || 0
              }}</span>
            </div>
          </div>

          <ElTable :data="disciplineRecap?.records || []" stripe border style="width: 100%">
            <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
            <ElTableColumn prop="studentNis" label="NIS" width="100" />
            <ElTableColumn prop="studentName" label="Nama Siswa" min-width="160" />
            <ElTableColumn prop="className" label="Kelas" width="110" />
            <ElTableColumn prop="category" label="Kategori" width="130" />
            <ElTableColumn prop="type" label="Tipe" width="100" align="center">
              <template #default="{ row }">
                <span
                  class="px-2 py-0.5 rounded text-xs font-semibold"
                  :class="
                    row.type === 'PRAISE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  "
                >
                  {{ row.type === 'PRAISE' ? 'Apresiasi' : 'Pelanggaran' }}
                </span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="points" label="Poin" width="70" align="center" />
            <ElTableColumn prop="description" label="Deskripsi Kejadian" min-width="200" />
            <ElTableColumn prop="followUp" label="Tindak Lanjut" min-width="150" />
          </ElTable>
        </div>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    reportService,
    type ReportFilterInput,
    type AttendanceRecapSummary,
    type JournalRecapItem,
    type AssessmentRecapItem,
    type DailyAttendanceRecapItem,
    type DisciplineRecapSummary,
    type TeacherCompletenessRecapItem
  } from '@/core/services/report/ReportService'
  import { repositories } from '@/core/repositories'

  defineOptions({ name: 'AdminReports' })

  const activeTab = ref('attendance')
  const filter = ref<ReportFilterInput>({})
  const dateRange = ref<[string, string] | null>(null)

  const academicYears = ref<any[]>([])
  const classes = ref<any[]>([])
  const teachers = ref<any[]>([])

  const attendanceRecap = ref<AttendanceRecapSummary | null>(null)
  const dailyAttendances = ref<DailyAttendanceRecapItem[]>([])
  const teacherCompletenessList = ref<TeacherCompletenessRecapItem[]>([])
  const journals = ref<JournalRecapItem[]>([])
  const assessments = ref<AssessmentRecapItem[]>([])
  const disciplineRecap = ref<DisciplineRecapSummary | null>(null)

  const handleDateRangeChange = (val: [string, string] | null) => {
    if (val && val.length === 2) {
      filter.value.startDate = val[0]
      filter.value.endDate = val[1]
    } else {
      filter.value.startDate = undefined
      filter.value.endDate = undefined
    }
    loadReports()
  }

  const resetFilters = () => {
    filter.value = {}
    dateRange.value = null
    loadReports()
  }

  const loadMasterOptions = async () => {
    academicYears.value = await repositories.academicYears.findAll()
    classes.value = await repositories.classes.findAll()
    teachers.value = await repositories.teachers.findAll()
  }

  const loadReports = async () => {
    try {
      if (activeTab.value === 'attendance') {
        attendanceRecap.value = await reportService.getStudentAttendanceRecap(filter.value)
      } else if (activeTab.value === 'daily-attendance') {
        dailyAttendances.value = await reportService.getDailyAttendanceRecap(filter.value)
      } else if (activeTab.value === 'completeness') {
        teacherCompletenessList.value = await reportService.getTeacherCompletenessRecap(
          filter.value.academicYearId
        )
      } else if (activeTab.value === 'journal') {
        journals.value = await reportService.getJournalRecap(filter.value)
      } else if (activeTab.value === 'assessment') {
        assessments.value = await reportService.getAssessmentRecap(filter.value)
      } else if (activeTab.value === 'discipline') {
        disciplineRecap.value = await reportService.getDisciplineRecap(filter.value)
      }
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat data laporan.')
    }
  }

  const handleExportCsv = () => {
    const title = `Laporan_${activeTab.value}_${new Date().toISOString().split('T')[0]}`
    if (activeTab.value === 'attendance' && attendanceRecap.value) {
      const headers = [
        'NIS',
        'Nama Siswa',
        'Kelas',
        'Hadir',
        'Izin',
        'Sakit',
        'Alpa',
        '% Kehadiran'
      ]
      const rows = attendanceRecap.value.students.map((s) => [
        s.nis,
        s.name,
        s.className,
        s.hadir,
        s.izin,
        s.sakit,
        s.alpa,
        `${s.presencePercentage}%`
      ])
      reportService.exportToCsv(title, headers, rows)
    } else if (activeTab.value === 'daily-attendance') {
      const headers = [
        'Tanggal',
        'Sesi',
        'Guru',
        'Mata Pelajaran',
        'Kelas',
        'Siswa',
        'H',
        'I',
        'S',
        'A',
        'T',
        'D'
      ]
      const rows = dailyAttendances.value.map((d) => [
        d.date,
        d.timeSlot,
        d.teacherName,
        d.subjectName,
        d.className,
        d.totalStudents,
        d.hadir,
        d.izin,
        d.sakit,
        d.alpa,
        d.terlambat,
        d.dispensasi
      ])
      reportService.exportToCsv(title, headers, rows)
    } else if (activeTab.value === 'journal') {
      const headers = ['Tanggal', 'Guru', 'Kelas', 'Mata Pelajaran', 'Topik', 'Aktivitas']
      const rows = journals.value.map((j) => [
        j.date,
        j.teacherName,
        j.className,
        j.subjectName,
        j.topic,
        j.activitySummary
      ])
      reportService.exportToCsv(title, headers, rows)
    } else if (activeTab.value === 'discipline' && disciplineRecap.value) {
      const headers = [
        'Tanggal',
        'NIS',
        'Nama Siswa',
        'Kelas',
        'Kategori',
        'Tipe',
        'Poin',
        'Deskripsi'
      ]
      const rows = disciplineRecap.value.records.map((r) => [
        r.date,
        r.studentNis,
        r.studentName,
        r.className,
        r.category,
        r.type,
        r.points,
        r.description
      ])
      reportService.exportToCsv(title, headers, rows)
    } else {
      ElMessage.info('Ekspor CSV untuk tab ini siap.')
    }
  }

  const handleExportXlsx = () => {
    const filename = `Laporan_${activeTab.value}_${new Date().toISOString().split('T')[0]}`
    if (activeTab.value === 'attendance' && attendanceRecap.value) {
      reportService.exportToXlsx(filename, [
        {
          name: 'Summary',
          headers: ['Metrik', 'Nilai'],
          rows: [
            ['Total Siswa', attendanceRecap.value.totalStudents],
            ['Total Hadir (H)', attendanceRecap.value.totalHadir],
            ['Total Izin (I)', attendanceRecap.value.totalIzin],
            ['Total Sakit (S)', attendanceRecap.value.totalSakit],
            ['Total Alpa (A)', attendanceRecap.value.totalAlpa],
            ['% Kehadiran', `${attendanceRecap.value.overallPresencePercentage}%`]
          ]
        },
        {
          name: 'Detail Presensi',
          headers: ['NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', '% Kehadiran'],
          rows: attendanceRecap.value.students.map((s) => [
            s.nis,
            s.name,
            s.className,
            s.hadir,
            s.izin,
            s.sakit,
            s.alpa,
            `${s.presencePercentage}%`
          ])
        }
      ])
      ElMessage.success('Berkas XLSX berhasil diunduh.')
    } else if (activeTab.value === 'daily-attendance') {
      reportService.exportToXlsx(filename, [
        {
          name: 'Summary',
          headers: ['Metrik', 'Nilai'],
          rows: [['Total Catatan Presensi Harian', dailyAttendances.value.length]]
        },
        {
          name: 'Detail Presensi Harian',
          headers: [
            'Tanggal',
            'Sesi',
            'Guru',
            'Mata Pelajaran',
            'Kelas',
            'Siswa',
            'H',
            'I',
            'S',
            'A',
            'T',
            'D'
          ],
          rows: dailyAttendances.value.map((d) => [
            d.date,
            d.timeSlot,
            d.teacherName,
            d.subjectName,
            d.className,
            d.totalStudents,
            d.hadir,
            d.izin,
            d.sakit,
            d.alpa,
            d.terlambat,
            d.dispensasi
          ])
        }
      ])
      ElMessage.success('Berkas XLSX berhasil diunduh.')
    } else if (activeTab.value === 'discipline' && disciplineRecap.value) {
      reportService.exportToXlsx(filename, [
        {
          name: 'Summary',
          headers: ['Metrik', 'Nilai'],
          rows: [
            ['Total Kejadian', disciplineRecap.value.totalIncidents],
            ['Total Pelanggaran', disciplineRecap.value.totalViolations],
            ['Total Apresiasi', disciplineRecap.value.totalPraise],
            ['Akumulasi Poin', disciplineRecap.value.totalPoints]
          ]
        },
        {
          name: 'Detail Kedisiplinan',
          headers: [
            'Tanggal',
            'NIS',
            'Nama Siswa',
            'Kelas',
            'Kategori',
            'Tipe',
            'Poin',
            'Deskripsi',
            'Tindak Lanjut'
          ],
          rows: disciplineRecap.value.records.map((r) => [
            r.date,
            r.studentNis,
            r.studentName,
            r.className,
            r.category,
            r.type,
            r.points,
            r.description,
            r.followUp
          ])
        }
      ])
      ElMessage.success('Berkas XLSX berhasil diunduh.')
    } else {
      handleExportCsv()
    }
  }

  const handlePrintReport = async () => {
    let title = 'LAPORAN REKAPITULASI SEKOLAH'
    let headers: string[] = []
    let rows: (string | number)[][] = []

    if (activeTab.value === 'attendance' && attendanceRecap.value) {
      title = 'LAPORAN REKAPITULASI PRESENSI SISWA'
      headers = ['NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', '% Kehadiran']
      rows = attendanceRecap.value.students.map((s) => [
        s.nis,
        s.name,
        s.className,
        s.hadir,
        s.izin,
        s.sakit,
        s.alpa,
        `${s.presencePercentage}%`
      ])
    } else if (activeTab.value === 'daily-attendance') {
      title = 'LAPORAN PRESENSI HARIAN & SESI MENGAJAR'
      headers = ['Tanggal', 'Sesi', 'Guru Pengampu', 'Mata Pelajaran', 'Kelas', 'H', 'I', 'S', 'A']
      rows = dailyAttendances.value.map((d) => [
        d.date,
        d.timeSlot,
        d.teacherName,
        d.subjectName,
        d.className,
        d.hadir,
        d.izin,
        d.sakit,
        d.alpa
      ])
    } else if (activeTab.value === 'journal') {
      title = 'LAPORAN JURNAL MENGAJAR GURU'
      headers = ['Tanggal', 'Guru Pengajar', 'Kelas', 'Mata Pelajaran', 'Materi/Topik']
      rows = journals.value.map((j) => [j.date, j.teacherName, j.className, j.subjectName, j.topic])
    } else if (activeTab.value === 'discipline' && disciplineRecap.value) {
      title = 'LAPORAN KEDISIPLINAN & PRESTASI SISWA'
      headers = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Kategori', 'Tipe', 'Poin', 'Deskripsi']
      rows = disciplineRecap.value.records.map((r) => [
        r.date,
        r.studentNis,
        r.studentName,
        r.className,
        r.category,
        r.type,
        r.points,
        r.description
      ])
    }

    const html = await reportService.generatePrintHtml(
      title,
      'Sistem Informasi Manajemen Sekolah Guru Offline — SMK NU Ungaran',
      headers,
      rows
    )

    reportService.printHtmlDocument(html)
  }

  onMounted(async () => {
    await loadMasterOptions()
    await loadReports()
  })
</script>

<style scoped>
  .art-card {
    background-color: var(--el-bg-color);
  }
</style>
