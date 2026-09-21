<template>
  <div class="p-5 space-y-5">
    <!-- Page Header & Action Bar -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i class="ri-file-chart-line text-emerald-600 text-2xl"></i>
          Laporan & Rekapitulasi Operasional
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Rekapitulasi presensi, jurnal mengajar, penilaian, dan aktivitas akademik sekolah berbasis
          data terverifikasi.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <ElButton type="primary" plain @click="handleExportCsv">
          <i class="ri-file-download-line mr-1"></i> Ekspor CSV
        </ElButton>
        <ElButton type="success" plain @click="handleExportXlsx">
          <i class="ri-file-excel-2-line mr-1"></i> Ekspor XLSX
        </ElButton>
        <ElButton type="warning" @click="handlePrintReport">
          <i class="ri-printer-line mr-1"></i> Cetak Laporan
        </ElButton>
      </div>
    </div>

    <!-- Centralized Report Filter Bar -->
    <ElCard shadow="never" class="!border-slate-200">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-700 flex items-center gap-2">
            <i class="ri-filter-3-line text-emerald-600"></i> Filter Data Laporan
          </span>
          <ElButton size="small" text type="primary" @click="resetFilters">
            <i class="ri-refresh-line mr-1"></i> Reset Filter
          </ElButton>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block"
            >Tahun Akademik & Semester</label
          >
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
              :label="`${ay.name} (${ay.status})`"
              :value="ay.id"
            />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Rentang Tanggal</label>
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
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Kelas / Rombel</label>
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
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Guru Pengajar</label>
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
      <!-- TAB 1: PRESENSI SISWA -->
      <ElTabPane name="attendance">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-user-follow-line text-emerald-600"></i> Rekap Presensi Siswa
          </span>
        </template>

        <div class="space-y-6">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
              <span class="text-xs text-slate-500 block font-medium">Total Siswa</span>
              <span class="text-xl font-bold text-slate-800">{{
                attendanceRecap?.totalStudents || 0
              }}</span>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
              <span class="text-xs text-emerald-700 block font-medium">Hadir (H)</span>
              <span class="text-xl font-bold text-emerald-800">{{
                attendanceRecap?.totalHadir || 0
              }}</span>
            </div>
            <div class="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
              <span class="text-xs text-blue-700 block font-medium">Izin (I)</span>
              <span class="text-xl font-bold text-blue-800">{{
                attendanceRecap?.totalIzin || 0
              }}</span>
            </div>
            <div class="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
              <span class="text-xs text-amber-700 block font-medium">Sakit (S)</span>
              <span class="text-xl font-bold text-amber-800">{{
                attendanceRecap?.totalSakit || 0
              }}</span>
            </div>
            <div class="bg-rose-50 border border-rose-200 p-3 rounded-lg text-center">
              <span class="text-xs text-rose-700 block font-medium">Alpa (A)</span>
              <span class="text-xl font-bold text-rose-800">{{
                attendanceRecap?.totalAlpa || 0
              }}</span>
            </div>
            <div class="bg-teal-50 border border-teal-200 p-3 rounded-lg text-center">
              <span class="text-xs text-teal-700 block font-medium">% Kehadiran</span>
              <span class="text-xl font-bold text-teal-800"
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

      <!-- TAB 2: AKTIVITAS GURU -->
      <ElTabPane name="teacher-activity">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-team-line text-blue-600"></i> Rekap Aktivitas Mengajar Guru
          </span>
        </template>

        <ElTable :data="teacherActivityRecap?.teachers || []" stripe border style="width: 100%">
          <ElTableColumn prop="nip" label="NIP" width="140" />
          <ElTableColumn prop="teacherName" label="Nama Guru" min-width="180" sortable />
          <ElTableColumn
            prop="totalTeachingHours"
            label="Total JP/Minggu"
            width="130"
            align="center"
          />
          <ElTableColumn
            prop="totalScheduledSessions"
            label="Jadwal Sesi"
            width="100"
            align="center"
          />
          <ElTableColumn
            prop="totalAttendanceSubmitted"
            label="Presensi Terisi"
            width="110"
            align="center"
          />
          <ElTableColumn
            prop="totalJournalsSubmitted"
            label="Jurnal Terisi"
            width="100"
            align="center"
          />
          <ElTableColumn
            prop="totalAssessmentsCreated"
            label="Tugas/Penilaian"
            width="110"
            align="center"
          />
          <ElTableColumn label="Kepatuhan Presensi" width="140" align="center">
            <template #default="{ row }">
              <span class="text-xs font-bold text-slate-700"
                >{{ row.attendanceComplianceRate }}%</span
              >
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>

      <!-- TAB 3: JURNAL MENGAJAR -->
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
          <ElTableColumn prop="activitySummary" label="Aktivitas Pembelajaran" min-width="220" />
          <ElTableColumn prop="notes" label="Catatan Tambahan" width="150" />
        </ElTable>
      </ElTabPane>

      <!-- TAB 4: PENILAIAN & KKM -->
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
              <span class="text-xs font-semibold text-emerald-700"
                >{{ row.studentsPassingKkm }} siswa ({{ row.passingPercentage }}%)</span
              >
            </template>
          </ElTableColumn>
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
    type TeacherActivityRecapSummary,
    type JournalRecapItem,
    type AssessmentRecapItem
  } from '@/core/services/report/ReportService'
  import { repositories } from '@/core/repositories'

  const activeTab = ref('attendance')
  const filter = ref<ReportFilterInput>({})
  const dateRange = ref<[string, string] | null>(null)

  const academicYears = ref<any[]>([])
  const classes = ref<any[]>([])
  const teachers = ref<any[]>([])

  const attendanceRecap = ref<AttendanceRecapSummary | null>(null)
  const teacherActivityRecap = ref<TeacherActivityRecapSummary | null>(null)
  const journals = ref<JournalRecapItem[]>([])
  const assessments = ref<AssessmentRecapItem[]>([])

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
      } else if (activeTab.value === 'teacher-activity') {
        teacherActivityRecap.value = await reportService.getTeacherActivityRecap(filter.value)
      } else if (activeTab.value === 'journal') {
        journals.value = await reportService.getJournalRecap(filter.value)
      } else if (activeTab.value === 'assessment') {
        assessments.value = await reportService.getAssessmentRecap(filter.value)
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
    } else {
      ElMessage.info('Ekspor CSV untuk tab ini siap.')
    }
  }

  const handleExportXlsx = () => {
    handleExportCsv()
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
    } else if (activeTab.value === 'journal') {
      title = 'LAPORAN JURNAL MENGAJAR GURU'
      headers = ['Tanggal', 'Guru Pengajar', 'Kelas', 'Mata Pelajaran', 'Materi/Topik']
      rows = journals.value.map((j) => [j.date, j.teacherName, j.className, j.subjectName, j.topic])
    }

    const html = await reportService.generatePrintHtml(
      title,
      'Sistem Informasi Manajemen Sekolah Guru Offline',
      headers,
      rows
    )

    const printWin = window.open('', '_blank')
    if (printWin) {
      printWin.document.write(html)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
      }, 500)
    } else {
      ElMessage.warning(
        'Pop-up cetak terblokir oleh browser Anda. Silakan izinkan pop-up atau buka aplikasi di tab baru.'
      )
    }
  }

  onMounted(async () => {
    await loadMasterOptions()
    await loadReports()
  })
</script>
