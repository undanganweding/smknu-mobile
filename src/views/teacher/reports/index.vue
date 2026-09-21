<template>
  <div class="p-5 space-y-5">
    <!-- Page Header -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i class="ri-file-chart-line text-emerald-600 text-2xl"></i>
          Rekap & Laporan Mengajar Saya
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Ringkasan presensi siswa, jurnal kelas, dan rekapitulasi penilaian pada kelas ampu Anda.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <ElButton type="primary" plain @click="handlePrintReport">
          <i class="ri-printer-line mr-1"></i> Cetak Rekap
        </ElButton>
        <RouterLink to="/teacher/report-card">
          <ElButton type="success">
            <i class="ri-article-line mr-1"></i> Cetak Rapor Siswa
          </ElButton>
        </RouterLink>
      </div>
    </div>

    <!-- Filter Controls -->
    <ElCard shadow="never" class="!border-slate-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Kelas Ampu</label>
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
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Rentang Tanggal</label>
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
      <ElTabPane name="attendance">
        <template #label>
          <span class="flex items-center gap-2"
            ><i class="ri-user-follow-line text-emerald-600"></i> Presensi Kelas</span
          >
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
                >{{ row.presencePercentage }}%</span
              >
            </template>
          </ElTableColumn>
        </ElTable>
      </ElTabPane>

      <ElTabPane name="journal">
        <template #label>
          <span class="flex items-center gap-2"
            ><i class="ri-book-read-line text-amber-600"></i> Jurnal Saya</span
          >
        </template>
        <ElTable :data="journals" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" />
          <ElTableColumn prop="className" label="Kelas" width="120" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="160" />
          <ElTableColumn prop="topic" label="Materi / Topik" min-width="200" />
          <ElTableColumn prop="activitySummary" label="Aktivitas" min-width="220" />
        </ElTable>
      </ElTabPane>

      <ElTabPane name="assessment">
        <template #label>
          <span class="flex items-center gap-2"
            ><i class="ri-file-list-3-line text-purple-600"></i> Penilaian Saya</span
          >
        </template>
        <ElTable :data="assessments" stripe border style="width: 100%">
          <ElTableColumn prop="date" label="Tanggal" width="110" />
          <ElTableColumn prop="title" label="Judul" min-width="160" />
          <ElTableColumn prop="className" label="Kelas" width="120" />
          <ElTableColumn prop="subjectName" label="Mata Pelajaran" width="160" />
          <ElTableColumn
            prop="totalStudentsGraded"
            label="Siswa Dinilai"
            width="110"
            align="center"
          />
          <ElTableColumn prop="averageScore" label="Rata-rata" width="100" align="center" />
          <ElTableColumn prop="passingPercentage" label="% Tuntas KKM" width="130" align="center" />
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
    type AssessmentRecapItem
  } from '@/core/services/report/ReportService'
  import { authService } from '@/core/services/auth'
  import { repositories } from '@/core/repositories'

  const activeTab = ref('attendance')
  const filter = ref<ReportFilterInput>({})
  const dateRange = ref<[string, string] | null>(null)

  const teacherClasses = ref<any[]>([])
  const attendanceRecap = ref<AttendanceRecapSummary | null>(null)
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
      } else if (activeTab.value === 'journal') {
        journals.value = await reportService.getJournalRecap(filter.value)
      } else if (activeTab.value === 'assessment') {
        assessments.value = await reportService.getAssessmentRecap(filter.value)
      }
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat rekap data guru.')
    }
  }

  const handlePrintReport = async () => {
    const html = await reportService.generatePrintHtml(
      'LAPORAN REKAP MENGAJAR GURU',
      'Guru Offline Portal Mandiri',
      ['NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', '% Kehadiran'],
      (attendanceRecap.value?.students || []).map((s) => [
        s.nis,
        s.name,
        s.className,
        s.hadir,
        s.izin,
        s.sakit,
        s.alpa,
        `${s.presencePercentage}%`
      ])
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
    await loadTeacherClasses()
    await loadReports()
  })
</script>
