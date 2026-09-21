<template>
  <div class="p-5 space-y-5">
    <!-- Header Card -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i class="ri-article-line text-emerald-600 text-2xl"></i>
          Generator Lembar Rapor Siswa
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Cetak Lembar Laporan Hasil Belajar (Rapor) Kurikulum Merdeka SMK NU Ungaran — format A4
          resmi.
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <ElButton
          type="primary"
          :disabled="!selectedStudentId || isPreviewLoading"
          :loading="isIndividualPrinting"
          @click="handlePrintIndividual"
        >
          <i class="ri-printer-line mr-1"></i> Cetak Rapor Siswa
        </ElButton>
        <ElButton
          type="success"
          plain
          :disabled="!selectedClassId || students.length === 0 || isPreviewLoading"
          :loading="isBatchPrinting"
          @click="handlePrintBatchClass"
        >
          <i class="ri-printer-cloud-line mr-1"></i> Cetak 1 Kelas (Batch)
        </ElButton>
      </div>
    </div>

    <!-- Filter Control Card -->
    <ElCard shadow="never" class="!border-slate-200">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Tahun Ajaran</label>
          <ElSelect
            v-model="selectedAcademicYearId"
            placeholder="Pilih Tahun Ajaran"
            class="w-full"
            @change="handleFilterChange"
          >
            <ElOption v-for="ay in academicYears" :key="ay.id" :label="ay.name" :value="ay.id" />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Semester</label>
          <ElSelect
            v-model="selectedSemester"
            placeholder="Pilih Semester"
            class="w-full"
            @change="handleFilterChange"
          >
            <ElOption label="Semester 1 (Ganjil)" value="GANJIL" />
            <ElOption label="Semester 2 (Genap)" value="GENAP" />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block"
            >Rombongan Belajar (Kelas)</label
          >
          <ElSelect
            v-model="selectedClassId"
            placeholder="Pilih Rombel / Kelas"
            class="w-full"
            @change="handleClassChange"
          >
            <ElOption v-for="c in authorizedClasses" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 mb-1 block">Pilih Siswa</label>
          <ElSelect
            v-model="selectedStudentId"
            placeholder="Pilih Siswa"
            class="w-full"
            :disabled="!selectedClassId || students.length === 0"
            @change="loadReportPreview"
          >
            <ElOption
              v-for="s in students"
              :key="s.id"
              :label="`${s.nis} - ${s.name}`"
              :value="s.id"
            />
          </ElSelect>
        </div>
      </div>
    </ElCard>

    <!-- Loading State -->
    <div v-if="isPreviewLoading" class="art-card p-12 text-center text-slate-500 space-y-3">
      <ElIcon class="is-loading text-3xl text-emerald-600"><i class="ri-loader-4-line"></i></ElIcon>
      <p class="text-sm">Mengagregasi data capaian nilai, asesmen, dan presensi siswa...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!reportData"
      class="art-card p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-300 rounded-lg"
    >
      <i class="ri-file-search-line text-4xl text-slate-300"></i>
      <p class="text-sm font-medium text-slate-600"
        >Belum ada siswa yang dipilih untuk preview rapor.</p
      >
      <p class="text-xs text-slate-400"
        >Silakan tentukan filter Kelas dan Siswa di panel atas untuk melihat lembar rapor.</p
      >
    </div>

    <!-- Printable Report Card Preview Frame (Paper Layout) -->
    <div v-else class="space-y-4">
      <div
        class="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs text-emerald-800"
      >
        <span class="flex items-center gap-1.5 font-medium">
          <i class="ri-information-line text-emerald-600 text-sm"></i>
          Preview Lembar Rapor Kurikulum Merdeka (Standar Cetak A4 Portrait)
        </span>
        <span>Terakhir diperbarui: {{ reportData.printDate }}</span>
      </div>

      <div
        class="art-card p-8 bg-white border border-slate-300 shadow-sm max-w-4xl mx-auto text-slate-800 space-y-6"
      >
        <!-- School Header -->
        <div class="text-center border-b-2 border-slate-900 pb-3">
          <h2 class="text-lg font-black tracking-wider uppercase text-slate-900">{{
            reportData.school.name
          }}</h2>
          <p class="text-xs text-slate-700 mt-1"
            >{{ reportData.school.address }} • Telp: {{ reportData.school.contact }}</p
          >
          <p class="text-[11px] italic text-slate-500"
            >NPSN: {{ reportData.school.npsn }} • Kode Dokumen:
            {{ reportData.school.isoDocCode || 'FM.02.03.76.KUR.01.05' }}</p
          >
        </div>

        <!-- Title -->
        <div class="text-center">
          <h3 class="text-sm font-bold uppercase tracking-wide underline text-slate-900">
            LAPORAN HASIL BELAJAR (RAPOR)
          </h3>
        </div>

        <!-- Student Identity Grid -->
        <div class="grid grid-cols-2 gap-x-8 gap-y-1 text-xs border-b border-slate-200 pb-4">
          <div class="grid grid-cols-3 gap-1">
            <span class="text-slate-500">Nama Siswa</span>
            <span class="col-span-2 font-bold text-slate-900">: {{ reportData.student.name }}</span>
          </div>
          <div class="grid grid-cols-3 gap-1">
            <span class="text-slate-500">Kelas / Fase</span>
            <span class="col-span-2 font-semibold text-slate-900"
              >: {{ reportData.classInfo.name }} / {{ reportData.classInfo.phase }}</span
            >
          </div>

          <div class="grid grid-cols-3 gap-1">
            <span class="text-slate-500">NIS / NISN</span>
            <span class="col-span-2 text-slate-800"
              >: {{ reportData.student.nis }} / {{ reportData.student.nisn || '-' }}</span
            >
          </div>
          <div class="grid grid-cols-3 gap-1">
            <span class="text-slate-500">Semester</span>
            <span class="col-span-2 text-slate-800"
              >: {{ reportData.classInfo.semester === 'GANJIL' ? '1 (Ganjil)' : '2 (Genap)' }}</span
            >
          </div>

          <div class="grid grid-cols-3 gap-1">
            <span class="text-slate-500">Program Keahlian</span>
            <span class="col-span-2 text-slate-800">: {{ reportData.classInfo.majorName }}</span>
          </div>
          <div class="grid grid-cols-3 gap-1">
            <span class="text-slate-500">Tahun Ajaran</span>
            <span class="col-span-2 text-slate-800"
              >: {{ reportData.classInfo.academicYearName }}</span
            >
          </div>
        </div>

        <!-- Subjects & Scores Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse border border-slate-900 text-xs">
            <thead>
              <tr class="bg-slate-100 text-slate-900">
                <th class="border border-slate-900 px-2 py-2 text-center w-8">No</th>
                <th class="border border-slate-900 px-3 py-2 w-56">Mata Pelajaran</th>
                <th class="border border-slate-900 px-2 py-2 text-center w-16">Nilai Akhir</th>
                <th class="border border-slate-900 px-3 py-2">Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="reportData.subjects.length === 0">
                <td
                  colspan="4"
                  class="border border-slate-900 p-4 text-center text-slate-400 italic"
                >
                  Belum ada data mata pelajaran atau penilaian pada semester ini.
                </td>
              </tr>
              <tr
                v-for="(subj, idx) in reportData.subjects"
                :key="subj.subjectId"
                class="hover:bg-slate-50"
              >
                <td class="border border-slate-900 px-2 py-2 text-center align-top">{{
                  idx + 1
                }}</td>
                <td class="border border-slate-900 px-3 py-2 align-top">
                  <div class="font-bold text-slate-900">{{ subj.subjectName }}</div>
                  <div class="text-[10px] text-slate-500">Pengampu: {{ subj.teacherName }}</div>
                </td>
                <td
                  class="border border-slate-900 px-2 py-2 text-center font-bold text-slate-900 align-top text-sm"
                >
                  {{ subj.finalScore !== null ? Math.round(subj.finalScore) : '-' }}
                </td>
                <td
                  class="border border-slate-900 px-3 py-2 text-[11px] leading-relaxed align-top text-slate-700"
                >
                  {{ subj.competencyDescription }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Lower Section: Attendance & Class Note -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <!-- Attendance Box -->
          <div class="border border-slate-900 p-3 rounded">
            <h4
              class="font-bold uppercase text-[11px] border-b border-slate-300 pb-1 mb-2 text-slate-900"
            >
              Ketidakhadiran
            </h4>
            <div class="space-y-1 text-slate-700">
              <div class="flex justify-between">
                <span>1. Sakit</span>
                <span class="font-bold">{{ reportData.attendance.sakit }} hari</span>
              </div>
              <div class="flex justify-between">
                <span>2. Izin</span>
                <span class="font-bold">{{ reportData.attendance.izin }} hari</span>
              </div>
              <div class="flex justify-between">
                <span>3. Tanpa Keterangan</span>
                <span class="font-bold">{{ reportData.attendance.alpa }} hari</span>
              </div>
            </div>
          </div>

          <!-- Homeroom Note -->
          <div
            class="md:col-span-2 border border-slate-900 p-3 rounded flex flex-col justify-between"
          >
            <div>
              <h4
                class="font-bold uppercase text-[11px] border-b border-slate-300 pb-1 mb-1 text-slate-900"
              >
                Catatan Wali Kelas
              </h4>
              <p class="text-slate-700 text-xs leading-relaxed mt-1">
                Tingkatkan terus prestasi akademik dan kedisiplinan belajar untuk menyongsong
                kompetensi kejuruan yang unggul.
              </p>
            </div>
            <div class="text-[10px] text-slate-400 text-right mt-2">
              Sistem Generator Rapor Guru Offline
            </div>
          </div>
        </div>

        <!-- Discipline / Character Summary if available -->
        <div
          v-if="reportData.disciplineSummary"
          class="border border-slate-900 p-3 rounded bg-slate-50 text-xs"
        >
          <div class="font-bold text-slate-900 uppercase text-[10.5px] mb-1">
            Catatan Perkembangan Karakter & Kedisiplinan:
          </div>
          <p class="text-slate-700 leading-relaxed">
            {{ reportData.disciplineSummary.characterNote }}
            <span class="text-[10px] text-slate-500 ml-1">
              (Total Poin: {{ reportData.disciplineSummary.totalPoints > 0 ? '+' : ''
              }}{{ reportData.disciplineSummary.totalPoints }} •
              {{ reportData.disciplineSummary.praiseCount }} Prestasi •
              {{ reportData.disciplineSummary.violationCount }} Pelanggaran)
            </span>
          </p>
        </div>

        <!-- 3-Column Signatures -->
        <div class="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p>Mengetahui,</p>
            <p class="font-bold">Orang Tua / Wali Siswa</p>
            <div class="h-14"></div>
            <p class="border-b border-dotted border-slate-600 w-36 mx-auto"></p>
          </div>

          <div>
            <p>{{ reportData.printLocation }}, {{ reportData.printDate }}</p>
            <p class="font-bold">Wali Kelas</p>
            <div class="h-14"></div>
            <p class="font-bold underline text-slate-900">{{ reportData.homeroomTeacher.name }}</p>
            <p class="text-[10px] text-slate-500"
              >NIP: {{ reportData.homeroomTeacher.nip || '-' }}</p
            >
          </div>
        </div>

        <!-- Principal Signature Centered -->
        <div class="pt-2 text-center text-xs">
          <p>Mengetahui,</p>
          <p class="font-bold">Kepala SMK NU Ungaran</p>
          <div class="h-14"></div>
          <p class="font-bold underline text-slate-900">{{ reportData.principal.name }}</p>
          <p class="text-[10px] text-slate-500">NIP: {{ reportData.principal.nip || '-' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { repositories } from '@/core/repositories'
  import { authService } from '@/core/services/auth'
  import { reportService, type StudentReportCardData } from '@/core/services/report/ReportService'
  import type { AcademicYearEntity, ClassEntity, StudentEntity, SemesterType } from '@/core/types'

  const academicYears = ref<AcademicYearEntity[]>([])
  const authorizedClasses = ref<ClassEntity[]>([])
  const students = ref<StudentEntity[]>([])

  const selectedAcademicYearId = ref('')
  const selectedSemester = ref<SemesterType>('GANJIL')
  const selectedClassId = ref('')
  const selectedStudentId = ref('')

  const reportData = ref<StudentReportCardData | null>(null)
  const isPreviewLoading = ref(false)
  const isIndividualPrinting = ref(false)
  const isBatchPrinting = ref(false)

  onMounted(async () => {
    await loadInitialOptions()
  })

  async function loadInitialOptions() {
    try {
      const ays = await repositories.academicYears.findAll()
      academicYears.value = ays.filter((ay) => ay.isActive)
      if (academicYears.value.length > 0) {
        selectedAcademicYearId.value = academicYears.value[0].id
      }

      const session = authService.getCurrentSession()
      const allClasses = await repositories.classes.findAll()
      const activeClasses = allClasses.filter((c) => c.status === 'ACTIVE')

      if (session?.role === 'GURU' && session.teacherId) {
        // Find homeroom classes or scheduled classes
        const assignments = await repositories.teacherAssignments.findByTeacherId(session.teacherId)
        const asgIds = new Set(assignments.map((a) => a.id))
        const schedules = await repositories.schedules.findAll()
        const scheduledClassIds = new Set(
          schedules.filter((s) => asgIds.has(s.teacherAssignmentId)).map((s) => s.classId)
        )
        authorizedClasses.value = activeClasses.filter(
          (c) => c.homeroomTeacherId === session.teacherId || scheduledClassIds.has(c.id)
        )
      } else {
        // ADMIN
        authorizedClasses.value = activeClasses
      }

      if (authorizedClasses.value.length > 0) {
        selectedClassId.value = authorizedClasses.value[0].id
        await handleClassChange()
      }
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat master data kelas/tahun ajaran.')
    }
  }

  async function handleClassChange() {
    if (!selectedClassId.value) {
      students.value = []
      selectedStudentId.value = ''
      reportData.value = null
      return
    }

    try {
      const classStudents = await repositories.students.findByClassId(selectedClassId.value)
      students.value = classStudents.filter((s) => s.status === 'ACTIVE')
      if (students.value.length > 0) {
        selectedStudentId.value = students.value[0].id
        await loadReportPreview()
      } else {
        selectedStudentId.value = ''
        reportData.value = null
      }
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat daftar siswa kelas.')
    }
  }

  async function handleFilterChange() {
    if (selectedStudentId.value) {
      await loadReportPreview()
    }
  }

  async function loadReportPreview() {
    if (!selectedStudentId.value || !selectedClassId.value || !selectedAcademicYearId.value) {
      reportData.value = null
      return
    }

    isPreviewLoading.value = true
    try {
      const data = await reportService.getStudentReportCardData({
        studentId: selectedStudentId.value,
        classId: selectedClassId.value,
        academicYearId: selectedAcademicYearId.value,
        semester: selectedSemester.value
      })
      reportData.value = data
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyusun lembar rapor siswa.')
      reportData.value = null
    } finally {
      isPreviewLoading.value = false
    }
  }

  function openPrintWindow(htmlContent: string) {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 300)
    } else {
      ElMessage.warning('Popup diblokir oleh browser. Silakan izinkan popup untuk mencetak rapor.')
    }
  }

  async function handlePrintIndividual() {
    if (!reportData.value) return
    isIndividualPrinting.value = true
    try {
      const html = reportService.generateStudentReportCardHtml(reportData.value)
      openPrintWindow(html)
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mencetak rapor siswa.')
    } finally {
      isIndividualPrinting.value = false
    }
  }

  async function handlePrintBatchClass() {
    if (!selectedClassId.value || students.value.length === 0) return
    isBatchPrinting.value = true
    try {
      const reports: StudentReportCardData[] = []
      for (const s of students.value) {
        const data = await reportService.getStudentReportCardData({
          studentId: s.id,
          classId: selectedClassId.value,
          academicYearId: selectedAcademicYearId.value,
          semester: selectedSemester.value
        })
        reports.push(data)
      }

      const html = reportService.generateStudentReportCardHtml(reports)
      openPrintWindow(html)
      ElMessage.success(`Berhasil menyiapkan lembar rapor untuk ${reports.length} siswa.`)
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal melakukan cetak batch satu kelas.')
    } finally {
      isBatchPrinting.value = false
    }
  }
</script>

<style scoped>
  .art-card {
    border-radius: 8px;
  }
</style>
