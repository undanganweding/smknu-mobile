<template>
  <div class="space-y-6" id="class-legger-view">
    <!-- Action & Level Header Banner -->
    <div
      class="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-2xl shadow-xl border border-slate-700/60 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
    >
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-black tracking-wider uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
          >
            DOKUMEN 3 & 4
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40"
          >
            SMK NU UNGARAN
          </span>
        </div>
        <h2
          class="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2"
        >
          <i class="ri-file-list-3-line text-emerald-400"></i>
          Template Legger & Presensi Per Kelas
        </h2>
        <p class="text-xs md:text-sm text-slate-300 max-w-2xl">
          Standar baku format legger nilai dan daftar siswa per rombel untuk Kelas X, XI, dan XII
          lengkap dengan rekapitulasi Putra/Putri, NIS baku, dan tanda tangan Guru Mapel.
        </p>
      </div>

      <!-- Level & Action Buttons -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Grade Level Switcher -->
        <div
          class="flex items-center bg-slate-800/90 p-1.5 rounded-xl border border-slate-600/60 shadow-inner"
        >
          <button
            v-for="lvl in gradeLevels"
            :key="lvl"
            @click="onSelectLevel(lvl)"
            :class="[
              'px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer',
              selectedLevel === lvl
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            ]"
          >
            Kelas {{ lvl }}
          </button>
        </div>

        <ElButton
          type="primary"
          :loading="syncing"
          @click="handleSyncStudents"
          class="!font-bold !rounded-xl !shadow-md"
        >
          <i class="ri-refresh-line mr-1.5"></i>
          Sinkronkan Data Siswa Resmi Kelas X
        </ElButton>
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div
        class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 block"
          >Tingkat Terpilih</span
        >
        <div class="text-xl font-bold text-slate-900 dark:text-white mt-1">
          Kelas {{ selectedLevel }}
        </div>
        <span class="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block font-medium"
          >{{ currentClasses.length }} Rombel Aktif</span
        >
      </div>

      <div
        class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 block"
          >Siswa Putra (L)</span
        >
        <div class="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
          {{ levelTotalMale }} Siswa
        </div>
        <span class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block"
          >Tingkat {{ selectedLevel }}</span
        >
      </div>

      <div
        class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 block"
          >Siswa Putri (P)</span
        >
        <div class="text-xl font-bold text-pink-600 dark:text-pink-400 mt-1">
          {{ levelTotalFemale }} Siswa
        </div>
        <span class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block"
          >Tingkat {{ selectedLevel }}</span
        >
      </div>

      <div
        class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 block"
          >Total Siswa Tingkat</span
        >
        <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
          {{ levelTotalStudents }} Siswa
        </div>
        <span class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">100% Terpetakan</span>
      </div>
    </div>

    <!-- Main Content Area: Class Selector Tabs & Active Legger Card -->
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6"
    >
      <!-- Class Selector Pills -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <label
            class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
          >
            Pilih Rombel / Kelas ({{ selectedLevel }}):
          </label>
          <div class="flex items-center gap-2">
            <ElButton
              size="small"
              type="info"
              plain
              @click="showSchoolSummaryDialog = true"
              class="!rounded-lg"
            >
              <i class="ri-pie-chart-2-line mr-1"></i> Rekapitulasi Sekolah (Hlm. 17)
            </ElButton>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="cls in currentClasses"
            :key="cls.classKey"
            @click="selectedClassKey = cls.classKey"
            :class="[
              'px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer border flex items-center gap-1.5',
              selectedClassKey === cls.classKey
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent shadow-md'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
            ]"
          >
            <span>{{ cls.className }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full"
              :class="
                selectedClassKey === cls.classKey
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              "
            >
              {{ cls.totalCount }}
            </span>
          </button>
        </div>
      </div>

      <!-- Active Class Legger Container -->
      <div v-if="activeLegger" class="space-y-6">
        <!-- Control Bar for Active Class -->
        <div
          class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
        >
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
              {{ activeLegger.className }} - {{ activeLegger.majorName }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Wali Kelas:
              <strong class="text-slate-700 dark:text-slate-200">{{
                activeLegger.homeroomTeacherName
              }}</strong>
              &bull; Putra: <strong>{{ activeLegger.maleCount }}</strong> &bull; Putri:
              <strong>{{ activeLegger.femaleCount }}</strong> &bull; Total:
              <strong>{{ activeLegger.totalCount }}</strong> Siswa
            </p>
          </div>

          <!-- Export Actions -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- PDF Export Dropdown -->
            <ElDropdown @command="handlePdfExportCommand">
              <ElButton type="danger" :loading="exportingPdf" class="!rounded-lg !font-bold">
                <i class="ri-file-pdf-2-line mr-1"></i> Cetak PDF
                <i class="ri-arrow-down-s-line ml-1"></i>
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="DUAL_SLIP_CURRENT">
                    <i class="ri-layout-column-line text-emerald-600 mr-2"></i> Cetak Slip Ganda 2
                    Kolom (Dokumen 3 & 4 Asli)
                  </ElDropdownItem>
                  <ElDropdownItem command="FULL_ASSESSMENT_CURRENT">
                    <i class="ri-table-line text-blue-600 mr-2"></i> Cetak Lembar Nilai & Presensi
                    Penuh (Format Guru Mapel)
                  </ElDropdownItem>
                  <ElDropdownItem command="DUAL_SLIP_ALL_LEVEL" divided>
                    <i class="ri-file-copy-2-line text-purple-600 mr-2"></i> Cetak Seluruh Kelas
                    Tingkat {{ selectedLevel }} (Batch PDF)
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>

            <ElButton
              type="success"
              :loading="exportingXlsx"
              @click="handleExportXlsx"
              class="!rounded-lg !font-bold"
            >
              <i class="ri-file-excel-2-line mr-1"></i> Ekspor Excel
            </ElButton>

            <!-- Template Download Dropdown -->
            <ElDropdown @command="handleTemplateDownload">
              <ElButton plain class="!rounded-lg">
                <i class="ri-download-2-line mr-1"></i> Template Legger
                <i class="ri-arrow-down-s-line ml-1"></i>
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem command="XLSX">
                    <i class="ri-file-excel-line text-emerald-600 mr-2"></i> Download Template Excel
                    (.xlsx)
                  </ElDropdownItem>
                  <ElDropdownItem command="CSV">
                    <i class="ri-file-text-line text-blue-600 mr-2"></i> Download Template CSV
                    (.csv)
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
        </div>

        <!-- Official Legger Sheet Preview (Exact Match to Physical Slip) -->
        <div
          class="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-6 md:p-8 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-sm max-w-4xl mx-auto font-sans"
        >
          <!-- Kop Surat -->
          <div class="text-center border-b-2 border-slate-900 dark:border-slate-600 pb-3 mb-4">
            <h4 class="text-xs font-bold tracking-wider uppercase">
              Sekolah Menengah Kejuruan Nahdlatul Ulama
            </h4>
            <h3 class="text-base font-black tracking-wide mt-0.5">SMK NU UNGARAN</h3>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Jalan Kaligarang No.9 Ungaran Telp./Fax. (024) 6924034-6922708
            </p>
          </div>

          <!-- Metadata -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-y-1 text-xs mb-3">
            <div class="flex items-center">
              <span class="w-20 font-bold">Kelas</span>
              <span>: {{ activeLegger.className }}</span>
            </div>
            <div class="flex items-center">
              <span class="w-24 font-bold">Wali Kelas</span>
              <span>: {{ activeLegger.homeroomTeacherName }}</span>
            </div>
            <div class="flex items-center md:col-span-2">
              <span class="w-20 font-bold">Jurusan</span>
              <span>: {{ activeLegger.majorName }}</span>
            </div>
          </div>

          <!-- Table Preview -->
          <div class="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-lg">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr
                  class="bg-slate-100 dark:bg-slate-800/80 font-bold border-b border-slate-300 dark:border-slate-700 text-center"
                >
                  <th class="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-10"
                    >No</th
                  >
                  <th
                    class="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 w-32 text-left"
                    >NIS</th
                  >
                  <th class="py-1.5 px-3 border-r border-slate-300 dark:border-slate-700 text-left"
                    >Nama Siswa</th
                  >
                  <th class="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-12"
                    >L/P</th
                  >
                  <th class="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-14"
                    >Nilai 1</th
                  >
                  <th class="py-1.5 px-2 border-r border-slate-300 dark:border-slate-700 w-14"
                    >Nilai 2</th
                  >
                  <th class="py-1.5 px-2 w-16">Presensi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="rowNum in 40"
                  :key="rowNum"
                  :class="[
                    'border-b border-slate-200 dark:border-slate-800 transition-colors',
                    rowNum % 2 === 0
                      ? 'bg-slate-50/50 dark:bg-slate-900/40'
                      : 'bg-white dark:bg-slate-950'
                  ]"
                >
                  <td
                    class="py-1 px-2 text-center font-semibold text-slate-500 border-r border-slate-200 dark:border-slate-800"
                  >
                    {{ rowNum }}
                  </td>
                  <td
                    class="py-1 px-3 font-mono text-[11px] font-semibold border-r border-slate-200 dark:border-slate-800"
                  >
                    {{ getStudentAt(rowNum)?.nis || '-' }}
                  </td>
                  <td class="py-1 px-3 font-medium border-r border-slate-200 dark:border-slate-800">
                    {{ getStudentAt(rowNum)?.name || '' }}
                  </td>
                  <td
                    class="py-1 px-2 text-center font-bold border-r border-slate-200 dark:border-slate-800"
                    :class="
                      getStudentAt(rowNum)?.gender === 'L' ? 'text-blue-600' : 'text-pink-600'
                    "
                  >
                    {{ getStudentAt(rowNum)?.gender || '' }}
                  </td>
                  <td
                    class="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/30"
                  ></td>
                  <td
                    class="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/30"
                  ></td>
                  <td class="py-1 px-2 text-center bg-slate-50/30"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer Summary Box & Signature -->
          <div class="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <!-- Box Putra / Putri / Jumlah -->
            <div
              class="w-full sm:w-64 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden text-xs"
            >
              <div
                class="flex justify-between py-1 px-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
              >
                <span class="font-bold">Putra</span>
                <span class="font-bold text-blue-600 dark:text-blue-400">{{
                  activeLegger.maleCount
                }}</span>
              </div>
              <div
                class="flex justify-between py-1 px-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
              >
                <span class="font-bold">Putri</span>
                <span class="font-bold text-pink-600 dark:text-pink-400">{{
                  activeLegger.femaleCount
                }}</span>
              </div>
              <div
                class="flex justify-between py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-black"
              >
                <span>Jumlah</span>
                <span>{{ activeLegger.totalCount }}</span>
              </div>
            </div>

            <!-- Signature -->
            <div class="text-center pr-6 pt-2">
              <span class="text-xs font-semibold block">Guru Mapel</span>
              <div class="h-12"></div>
              <span class="text-xs font-bold text-slate-500">…………………………</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- School Summary Dialog (Page 17) -->
    <ElDialog
      v-model="showSchoolSummaryDialog"
      title="Rekapitulasi Siswa & Rombel SMK NU Ungaran"
      width="800px"
      class="!rounded-2xl"
    >
      <div v-if="schoolStats" class="space-y-4">
        <p class="text-xs text-slate-500">
          Statistik lengkap siswa per jurusan dan tingkat untuk Tahun Pelajaran
          {{ schoolStats.academicYear }} (Format Halaman 17 Dokumen Resmi):
        </p>

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-900 text-white font-bold">
              <tr>
                <th class="py-2.5 px-3">Jurusan</th>
                <th class="py-2.5 px-3 text-center">Kelas X</th>
                <th class="py-2.5 px-3 text-center">Kelas XI</th>
                <th class="py-2.5 px-3 text-center">Kelas XII</th>
                <th class="py-2.5 px-3 text-center">Total Siswa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
              <tr v-for="m in schoolStats.byMajor" :key="m.majorCode">
                <td class="py-2 px-3 font-bold">{{ m.majorName }} ({{ m.majorCode }})</td>
                <td class="py-2 px-3 text-center">
                  {{ m.gradeX.male }} L / {{ m.gradeX.female }} P
                  <span class="font-bold text-emerald-600 block"
                    >({{ m.gradeX.total }}) [{{ m.gradeX.classes }} Rombel]</span
                  >
                </td>
                <td class="py-2 px-3 text-center">
                  {{ m.gradeXI.male }} L / {{ m.gradeXI.female }} P
                  <span class="font-bold text-blue-600 block"
                    >({{ m.gradeXI.total }}) [{{ m.gradeXI.classes }} Rombel]</span
                  >
                </td>
                <td class="py-2 px-3 text-center">
                  {{ m.gradeXII.male }} L / {{ m.gradeXII.female }} P
                  <span class="font-bold text-purple-600 block"
                    >({{ m.gradeXII.total }}) [{{ m.gradeXII.classes }} Rombel]</span
                  >
                </td>
                <td class="py-2 px-3 text-center font-black text-slate-900 dark:text-white">
                  {{ m.total }} Siswa
                </td>
              </tr>
              <tr
                class="bg-emerald-50 dark:bg-emerald-950/60 font-black text-emerald-900 dark:text-emerald-200"
              >
                <td class="py-2.5 px-3">TOTAL SEKOLAH</td>
                <td class="py-2.5 px-3 text-center">{{ schoolStats.gradeX.total }} Siswa</td>
                <td class="py-2.5 px-3 text-center">{{ schoolStats.gradeXI.total }} Siswa</td>
                <td class="py-2.5 px-3 text-center">{{ schoolStats.gradeXII.total }} Siswa</td>
                <td class="py-2.5 px-3 text-center text-emerald-600 text-sm">
                  {{ schoolStats.grandTotal.total }} Siswa
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="showSchoolSummaryDialog = false">Tutup</ElButton>
          <ElButton type="primary" @click="handleExportSchoolSummaryPdf">
            <i class="ri-file-pdf-line mr-1"></i> Cetak Rekap PDF
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    classLeggerService,
    type ClassLeggerSummary,
    type SchoolLeggerStatistics
  } from '@/core/services/master/ClassLeggerService'
  import { classLeggerExportService } from '@/core/services/export/ClassLeggerExportService'

  const gradeLevels: Array<'X' | 'XI' | 'XII'> = ['X', 'XI', 'XII']
  const selectedLevel = ref<'X' | 'XI' | 'XII'>('X')
  const selectedClassKey = ref<string>('X-TJKT-1')

  const currentClasses = ref<ClassLeggerSummary[]>([])
  const schoolStats = ref<SchoolLeggerStatistics | null>(null)
  const showSchoolSummaryDialog = ref(false)

  const loading = ref(false)
  const syncing = ref(false)
  const exportingPdf = ref(false)
  const exportingXlsx = ref(false)

  const activeLegger = computed(() => {
    return (
      currentClasses.value.find((c) => c.classKey === selectedClassKey.value) ||
      currentClasses.value[0] ||
      null
    )
  })

  const levelTotalMale = computed(() => {
    return currentClasses.value.reduce((sum, c) => sum + c.maleCount, 0)
  })

  const levelTotalFemale = computed(() => {
    return currentClasses.value.reduce((sum, c) => sum + c.femaleCount, 0)
  })

  const levelTotalStudents = computed(() => {
    return currentClasses.value.reduce((sum, c) => sum + c.totalCount, 0)
  })

  function getStudentAt(rowNum: number) {
    if (!activeLegger.value) return null
    return activeLegger.value.students.find((s) => s.no === rowNum) || null
  }

  function onSelectLevel(lvl: 'X' | 'XI' | 'XII') {
    selectedLevel.value = lvl
    loadClassesForLevel()
  }

  async function loadClassesForLevel() {
    loading.value = true
    try {
      currentClasses.value = await classLeggerService.getLeggersByLevel(selectedLevel.value)
      if (currentClasses.value.length > 0) {
        // preserve or set first
        const exists = currentClasses.value.some((c) => c.classKey === selectedClassKey.value)
        if (!exists) {
          selectedClassKey.value = currentClasses.value[0].classKey
        }
      }
      schoolStats.value = await classLeggerService.getSchoolStatistics()
    } catch {
      ElMessage.error('Gagal memuat legger kelas.')
    } finally {
      loading.value = false
    }
  }

  async function handleSyncStudents() {
    syncing.value = true
    try {
      const res = await classLeggerService.syncAllGradeXStudents()
      ElMessage.success(res.message)
      await loadClassesForLevel()
    } catch (err: any) {
      ElMessage.error(`Gagal sinkronisasi siswa: ${err.message}`)
    } finally {
      syncing.value = false
    }
  }

  async function handlePdfExportCommand(command: string) {
    if (!activeLegger.value) return
    exportingPdf.value = true

    try {
      if (command === 'DUAL_SLIP_CURRENT') {
        await classLeggerExportService.exportLeggerPdf([activeLegger.value], {
          mode: 'DUAL_SLIP',
          level: selectedLevel.value
        })
        ElMessage.success(`Cetak PDF Legger ${activeLegger.value.className} (Dual Slip) berhasil.`)
      } else if (command === 'FULL_ASSESSMENT_CURRENT') {
        await classLeggerExportService.exportLeggerPdf([activeLegger.value], {
          mode: 'FULL_ASSESSMENT',
          level: selectedLevel.value
        })
        ElMessage.success(
          `Cetak PDF Lembar Nilai ${activeLegger.value.className} (Full Sheet) berhasil.`
        )
      } else if (command === 'DUAL_SLIP_ALL_LEVEL') {
        await classLeggerExportService.exportLeggerPdf(currentClasses.value, {
          mode: 'DUAL_SLIP',
          level: selectedLevel.value
        })
        ElMessage.success(
          `Cetak PDF Batch Seluruh Kelas ${selectedLevel.value} (${currentClasses.value.length} Rombel) berhasil.`
        )
      }
    } catch (err: any) {
      ElMessage.error(`Gagal cetak PDF: ${err.message}`)
    } finally {
      exportingPdf.value = false
    }
  }

  async function handleExportXlsx() {
    if (!activeLegger.value) return
    exportingXlsx.value = true
    try {
      await classLeggerExportService.exportLeggerXlsx(currentClasses.value, selectedLevel.value)
      ElMessage.success(
        `Ekspor Excel Legger Seluruh Kelas ${selectedLevel.value} berhasil diunduh.`
      )
    } catch (err: any) {
      ElMessage.error(`Gagal ekspor Excel: ${err.message}`)
    } finally {
      exportingXlsx.value = false
    }
  }

  function handleTemplateDownload(format: string) {
    try {
      classLeggerExportService.generateTemplate(format as 'XLSX' | 'CSV', selectedLevel.value)
      ElMessage.success(`Template Legger (${format}) berhasil diunduh.`)
    } catch (err: any) {
      ElMessage.error(`Gagal mengunduh template: ${err.message}`)
    }
  }

  async function handleExportSchoolSummaryPdf() {
    try {
      await classLeggerExportService.exportSchoolSummaryPdf()
      ElMessage.success('Rekapitulasi Statistik Sekolah berhasil diekspor.')
    } catch (err: any) {
      ElMessage.error(`Gagal ekspor rekap: ${err.message}`)
    }
  }

  onMounted(() => {
    loadClassesForLevel()
  })
</script>
