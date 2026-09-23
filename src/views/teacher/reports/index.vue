<template>
  <div class="p-5 space-y-5">
    <!-- Page Header -->
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
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800"
          >
            PORTAL GURU
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mt-2"
        >
          <i class="ri-file-chart-line text-emerald-600 text-2xl"></i>
          Rekap & Laporan Mengajar Guru
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ringkasan presensi siswa, jurnal mengajar, rekapitulasi penilaian, dan catatan
          kedisiplinan kelas ampu Anda.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ElButton type="primary" plain @click="handleExportCsv">
          <i class="ri-file-download-line mr-1"></i> CSV
        </ElButton>
        <ElButton type="success" @click="handleExportXlsx">
          <i class="ri-file-excel-2-line mr-1"></i> Unduh XLSX
        </ElButton>
        <ElButton type="warning" @click="handlePrintReport">
          <i class="ri-printer-line mr-1"></i> Cetak A4
        </ElButton>
        <RouterLink to="/teacher/report-card">
          <ElButton type="primary">
            <i class="ri-article-line mr-1"></i> Cetak Rapor Siswa
          </ElButton>
        </RouterLink>
      </div>
    </div>

    <!-- Filter Controls -->
    <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block"
            >Kelas Ampu</label
          >
          <ElSelect
            v-model="filter.classId"
            placeholder="Semua Kelas Ampu"
            class="w-full"
            clearable
            @change="loadReports"
          >
            <ElOption v-for="c in teacherClasses" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block"
            >Rentang Tanggal</label
          >
          <ElDatePicker
            v-model="dateRange"
            type="daterange"
            range-separator="s/d"
            start-placeholder="Mulai"
            end-placeholder="Selesai"
            value-format="YYYY-MM-DD"
            class="w-full"
            @change="handleDateRangeChange"
          />
        </div>
      </div>
    </ElCard>

    <!-- Teacher Reports Tabs -->
    <ElTabs v-model="activeTab" type="border-card" class="art-card" @tab-change="loadReports">
      <!-- TAB 1: PRESENSI KELAS -->
      <ElTabPane name="attendance">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-user-follow-line text-emerald-600"></i> Presensi Kelas
          </span>
        </template>
        <ElTable :data="attendanceRecap?.students || []" stripe border style="width: 100%">
          <ElTableColumn prop="nis" label="NIS" width="110" />
          <ElTableColumn prop="name" label="Nama Siswa" min-width="180" />
          <ElTableColumn prop="className" label="Kelas" width="120" />
          <ElTableColumn prop="hadir" label="H" width="60" align="center" />
          <ElTableColumn prop="izin" label="I" width="60" align="center" />
          <ElTableColumn prop="sakit" label="S" width="60" align="center" />
          <ElTableColumn prop="alpa" label="A" width="60" align="center" />
          <ElTableColumn prop="presencePercentage" label="% Kehadiran" width="120" align="center">
            <template #default="{ row }">
              <span
                class="font-bold"
                :class="row.presencePercentage >= 85 ? 'text-emerald-700' : 'text-rose-700'"
              >
                {{ row.presencePercentage }}%
              </span>
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>

      <!-- TAB 2: PRESENSI HARIAN -->
      <ElTabPane name="daily-attendance">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-calendar-check-line text-teal-600"></i> Presensi Harian Sesi
          </span>
        </template>
        <ElTable :data="dailyAttendances" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
          <ElTableColumn prop="timeSlot" label="Jam / Sesi" width="120" />
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

      <!-- TAB 3: JURNAL SAYA -->
      <ElTabPane name="journal">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-book-read-line text-amber-600"></i> Jurnal Mengajar
          </span>
        </template>
        <ElTable :data="journals" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
          <ElTableColumn prop="className" label="Kelas" width="120" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="160" />
          <ElTableColumn prop="topic" label="Materi / Topik" min-width="200" />
          <ElTableColumn prop="learningObjectives" label="TP / Capaian" min-width="150" />
          <ElTableColumn prop="activitySummary" label="Aktivitas" min-width="220" />
          <ElTableColumn prop="notes" label="Catatan" width="130" />
        </ElTable>
      </ElTabPane>

      <!-- TAB 4: PENILAIAN SAYA -->
      <ElTabPane name="assessment">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-file-list-3-line text-purple-600"></i> Penilaian & KKM
          </span>
        </template>
        <ElTable :data="assessments" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" sortable />
          <ElTableColumn prop="title" label="Judul Penilaian" min-width="160" />
          <ElTableColumn prop="type" label="Jenis" width="100" align="center" />
          <ElTableColumn prop="className" label="Kelas" width="120" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="160" />
          <ElTableColumn
            prop="totalStudentsGraded"
            label="Siswa Dinilai"
            width="110"
            align="center"
          />
          <ElTableColumn
            prop="averageScore"
            label="Rata-rata"
            width="100"
            align="center"
            sortable
          />
          <ElTableColumn prop="passingPercentage" label="% Tuntas KKM" width="130" align="center" />
        </ElTable>
      </ElTabPane>

      <!-- TAB 5: KEDISIPLINAN -->
      <ElTabPane name="discipline">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-alarm-warning-line text-rose-600"></i> Kedisiplinan Siswa
          </span>
        </template>
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
          <ElTableColumn prop="description" label="Deskripsi" min-width="180" />
          <ElTableColumn prop="followUp" label="Tindak Lanjut" min-width="150" />
        </ElTable>
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
    type DisciplineRecapSummary
  } from '@/core/services/report/ReportService'
  import { authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'

  defineOptions({ name: 'TeacherReports' })

  const activeTab = ref('attendance')
  const filter = ref<ReportFilterInput>({})
  const dateRange = ref<[string, string] | null>(null)

  const teacherClasses = ref<any[]>([])
  const attendanceRecap = ref<AttendanceRecapSummary | null>(null)
  const dailyAttendances = ref<DailyAttendanceRecapItem[]>([])
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

  const loadTeacherClasses = async () => {
    const session = authService.getCurrentSession()
    if (session?.teacherId) {
      const assignments = await repositories.teacherAssignments.findByTeacherId(session.teacherId)
      const assignmentIds = new Set(assignments.map((a) => a.id))
      const schedules = await repositories.schedules.findAll()
      const teacherSchedules = schedules.filter((s) => assignmentIds.has(s.teacherAssignmentId))
      const classIds = new Set(teacherSchedules.map((s) => s.classId))
      const allClasses = await repositories.classes.findAll()
      teacherClasses.value = allClasses.filter(
        (c) => classIds.has(c.id) || c.homeroomTeacherId === session.teacherId
      )
    }
  }

  const loadReports = async () => {
    try {
      if (activeTab.value === 'attendance') {
        attendanceRecap.value = await reportService.getStudentAttendanceRecap(filter.value)
      } else if (activeTab.value === 'daily-attendance') {
        dailyAttendances.value = await reportService.getDailyAttendanceRecap(filter.value)
      } else if (activeTab.value === 'journal') {
        journals.value = await reportService.getJournalRecap(filter.value)
      } else if (activeTab.value === 'assessment') {
        assessments.value = await reportService.getAssessmentRecap(filter.value)
      } else if (activeTab.value === 'discipline') {
        disciplineRecap.value = await reportService.getDisciplineRecap(filter.value)
      }
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat rekap data guru.')
    }
  }

  const handleExportCsv = () => {
    const title = `Laporan_Guru_${activeTab.value}_${new Date().toISOString().split('T')[0]}`
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
      const headers = ['Tanggal', 'Sesi', 'Mata Pelajaran', 'Kelas', 'Siswa', 'H', 'I', 'S', 'A']
      const rows = dailyAttendances.value.map((d) => [
        d.date,
        d.timeSlot,
        d.subjectName,
        d.className,
        d.totalStudents,
        d.hadir,
        d.izin,
        d.sakit,
        d.alpa
      ])
      reportService.exportToCsv(title, headers, rows)
    } else if (activeTab.value === 'journal') {
      const headers = ['Tanggal', 'Kelas', 'Mata Pelajaran', 'Topik', 'Aktivitas']
      const rows = journals.value.map((j) => [
        j.date,
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
    }
  }

  const handleExportXlsx = () => {
    const filename = `Laporan_Guru_${activeTab.value}_${new Date().toISOString().split('T')[0]}`
    if (activeTab.value === 'attendance' && attendanceRecap.value) {
      reportService.exportToXlsx(filename, [
        {
          name: 'Summary Presensi',
          headers: ['Metrik', 'Nilai'],
          rows: [
            ['Total Siswa', attendanceRecap.value.totalStudents],
            ['Total Hadir', attendanceRecap.value.totalHadir],
            ['Total Izin', attendanceRecap.value.totalIzin],
            ['Total Sakit', attendanceRecap.value.totalSakit],
            ['Total Alpa', attendanceRecap.value.totalAlpa],
            ['% Kehadiran', `${attendanceRecap.value.overallPresencePercentage}%`]
          ]
        },
        {
          name: 'Detail Siswa',
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
    } else {
      handleExportCsv()
    }
  }

  const handlePrintReport = async () => {
    let title = 'LAPORAN REKAP MENGAJAR GURU'
    let headers: string[] = []
    let rows: (string | number)[][] = []

    if (activeTab.value === 'attendance' && attendanceRecap.value) {
      title = 'LAPORAN REKAPITULASI PRESENSI KELAS'
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
    } else if (activeTab.value === 'journal') {
      title = 'LAPORAN JURNAL MENGAJAR GURU'
      headers = ['Tanggal', 'Kelas', 'Mata Pelajaran', 'Materi/Topik', 'Aktivitas']
      rows = journals.value.map((j) => [
        j.date,
        j.className,
        j.subjectName,
        j.topic,
        j.activitySummary
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
    await loadTeacherClasses()
    await loadReports()
  })
</script>

<style scoped>
  .art-card {
    background-color: var(--el-bg-color);
  }
</style>
