<template>
  <div class="space-y-6">
    <!-- Top Bar Controls -->
    <div
      class="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <!-- Grade Level & Day Selection -->
      <div class="flex flex-wrap items-center gap-3">
        <div
          class="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700"
        >
          <button
            v-for="lvl in gradeLevels"
            :key="lvl"
            @click="onSelectLevel(lvl)"
            :class="[
              'px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer',
              selectedLevel === lvl
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
            ]"
          >
            Kelas {{ lvl }}
          </button>
        </div>

        <ElSelect v-model="selectedDay" placeholder="Filter Hari" class="!w-40" size="default">
          <ElOption label="Semua Hari (Senin - Sabtu)" value="ALL" />
          <ElOption label="Senin" value="SENIN" />
          <ElOption label="Selasa" value="SELASA" />
          <ElOption label="Rabu" value="RABU" />
          <ElOption label="Kamis" value="KAMIS" />
          <ElOption label="Jum'at" value="JUMAT" />
          <ElOption label="Sabtu" value="SABTU" />
        </ElSelect>

        <div class="text-xs text-slate-500 dark:text-slate-400 pl-2">
          Format Baku Dokumen:
          <span class="font-mono font-bold text-emerald-600 dark:text-emerald-400"
            >FM.02.03.76.KUR.01.05</span
          >
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <ElButton
          v-if="selectedLevel === 'X'"
          size="small"
          type="primary"
          plain
          :loading="syncing"
          @click="handleSyncGradeX"
        >
          <i class="ri-refresh-line mr-1"></i> Sinkronkan Jadwal Resmi Kelas X
        </ElButton>

        <ElDropdown @command="handleTemplateDownload">
          <ElButton size="small" type="info" plain>
            <i class="ri-download-cloud-line mr-1"></i> Download Template
            <i class="ri-arrow-down-s-line ml-1"></i>
          </ElButton>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="XLSX">Template Excel (.xlsx)</ElDropdownItem>
              <ElDropdownItem command="CSV">Template CSV (.csv)</ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>

        <ElButton size="small" type="success" @click="handleExportXlsx" :loading="exportingXlsx">
          <i class="ri-file-excel-2-line mr-1"></i> Export Excel
        </ElButton>

        <ElButton size="small" type="danger" @click="handleExportPdf" :loading="exportingPdf">
          <i class="ri-file-pdf-line mr-1"></i> Export PDF Resmi
        </ElButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center">
      <i class="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      <p class="mt-2 text-sm text-slate-500">Memuat matriks jadwal pelajaran...</p>
    </div>

    <!-- Matrix Tables Container -->
    <div v-else class="space-y-8">
      <div
        v-for="dayKey in displayedDays"
        :key="dayKey"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm"
      >
        <!-- Day Section Header -->
        <div
          class="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-5 py-3 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
            <h3 class="font-bold text-base tracking-wide">
              HARI {{ getDayLabel(dayKey) }} — KELAS {{ selectedLevel }}
            </h3>
          </div>
          <div class="text-xs text-slate-300 font-mono">
            TAHUN PELAJARAN {{ matrixData?.academicYearName || '2026/2027' }}
          </div>
        </div>

        <!-- Scrollable Grid Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-center border-collapse text-xs">
            <thead>
              <!-- Majors Super Header -->
              <tr
                class="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-300 dark:border-slate-700"
              >
                <th
                  rowspan="2"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-2 w-14 bg-slate-200/70 dark:bg-slate-800"
                >
                  Jam Ke
                </th>
                <th
                  rowspan="2"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-2 w-24 bg-slate-200/70 dark:bg-slate-800"
                >
                  Pukul
                </th>
                <th
                  colspan="8"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-1.5 bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300"
                >
                  TJKT
                </th>
                <th
                  colspan="6"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-1.5 bg-purple-50/70 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300"
                >
                  BP
                </th>
                <th
                  colspan="6"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-1.5 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                >
                  DKV
                </th>
                <th
                  colspan="6"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                >
                  TE
                </th>
                <th
                  colspan="6"
                  class="border border-slate-300 dark:border-slate-700 px-2 py-1.5 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300"
                >
                  TO
                </th>
              </tr>

              <!-- Class Names & Ruang Subheader -->
              <tr
                class="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-300 dark:border-slate-700"
              >
                <template v-for="c in matrixData?.classes || []" :key="c.classKey">
                  <th
                    class="border border-slate-300 dark:border-slate-700 px-1 py-1 min-w-[55px] bg-slate-100/60 dark:bg-slate-800/60"
                  >
                    {{ c.className }}
                  </th>
                  <th
                    class="border border-slate-300 dark:border-slate-700 px-1 py-1 min-w-[60px] text-slate-400 dark:text-slate-500 font-normal text-[10px]"
                  >
                    Ruang
                  </th>
                </template>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(row, rIdx) in matrixData?.days[dayKey] || []"
                :key="rIdx"
                class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <!-- Jam Ke -->
                <td
                  class="border border-slate-200 dark:border-slate-700 px-2 py-1.5 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-900/40"
                >
                  {{ row.period }}
                </td>

                <!-- Pukul -->
                <td
                  class="border border-slate-200 dark:border-slate-700 px-2 py-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/40"
                >
                  {{ row.timeLabel }}
                </td>

                <!-- Banner Row (Sholat Dhuha, Upacara, Istirahat, Dhuhur, Mujahadah, dll) -->
                <td
                  v-if="row.type !== 'LESSON'"
                  :colspan="(matrixData?.classes.length || 16) * 2"
                  :class="[
                    'border border-slate-200 dark:border-slate-700 px-4 py-2 font-bold tracking-wide text-xs uppercase',
                    row.type === 'DHUHA' || row.type === 'DHUHUR' || row.type === 'MUJAHADAH'
                      ? 'bg-sky-100/70 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300'
                      : row.type === 'BREAK'
                        ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : row.type === 'UPACARA' || row.type === 'PRAMUKA' || row.type === 'EKSTRA'
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  ]"
                >
                  <div class="flex items-center justify-center gap-2">
                    <i
                      v-if="row.type === 'DHUHA' || row.type === 'DHUHUR'"
                      class="ri-sparkling-fill text-sky-600"
                    ></i>
                    <i v-else-if="row.type === 'BREAK'" class="ri-cup-line text-amber-600"></i>
                    <i v-else-if="row.type === 'UPACARA'" class="ri-flag-line text-emerald-600"></i>
                    <span>{{ row.title || row.type }}</span>
                  </div>
                </td>

                <!-- Lesson Cells (Kode Guru & Ruang) -->
                <template v-else>
                  <template v-for="c in matrixData?.classes || []" :key="c.classKey">
                    <!-- Teacher Code Cell -->
                    <td
                      class="border border-slate-200 dark:border-slate-700 px-1 py-1 text-center font-bold text-[11px] min-w-[50px]"
                    >
                      <span
                        v-if="row.cells[c.classKey]?.teacherCode"
                        class="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 shadow-2xs font-mono font-bold hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                        :title="`${row.cells[c.classKey]?.teacherName || 'Guru'} (${row.cells[c.classKey]?.subjectName || 'Mapel'})`"
                      >
                        {{ row.cells[c.classKey]?.teacherCode }}
                      </span>
                      <span v-else class="text-slate-300 dark:text-slate-600">-</span>
                    </td>

                    <!-- Room Cell -->
                    <td
                      class="border border-slate-200 dark:border-slate-700 px-1 py-1 text-center text-[10px] min-w-[55px]"
                    >
                      <span
                        v-if="row.cells[c.classKey]?.roomCode"
                        class="text-slate-500 dark:text-slate-400 font-mono truncate max-w-[65px] inline-block"
                        :title="`Ruangan: ${row.cells[c.classKey]?.roomCode}`"
                      >
                        {{ row.cells[c.classKey]?.roomCode }}
                      </span>
                      <span v-else class="text-slate-300 dark:text-slate-600">-</span>
                    </td>
                  </template>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    timetableMatrixExportService,
    type DayMatrixRow
  } from '@/core/services/export/TimetableMatrixExportService'
  import { timetableMatrixSyncService } from '@/core/services/master/TimetableMatrixSyncService'
  import type { ClassColumnDef } from '@/core/services/master/ScheduleTemplateService'

  const gradeLevels: Array<'X' | 'XI' | 'XII'> = ['X', 'XI', 'XII']
  const selectedLevel = ref<'X' | 'XI' | 'XII'>('X')
  const selectedDay = ref<string>('ALL')
  const loading = ref(false)
  const syncing = ref(false)
  const exportingPdf = ref(false)
  const exportingXlsx = ref(false)

  function onSelectLevel(lvl: 'X' | 'XI' | 'XII') {
    selectedLevel.value = lvl
    loadMatrix()
  }

  const matrixData = ref<{
    classes: ClassColumnDef[]
    days: Record<string, DayMatrixRow[]>
    academicYearName: string
  } | null>(null)

  const displayedDays = computed(() => {
    if (selectedDay.value === 'ALL') {
      return ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
    }
    return [selectedDay.value]
  })

  function getDayLabel(dayKey: string): string {
    switch (dayKey) {
      case 'SENIN':
        return 'SENIN'
      case 'SELASA':
        return 'SELASA'
      case 'RABU':
        return 'RABU'
      case 'KAMIS':
        return 'KAMIS'
      case 'JUMAT':
        return "JUM'AT"
      case 'SABTU':
        return 'SABTU'
      default:
        return dayKey
    }
  }

  async function loadMatrix() {
    loading.value = true
    try {
      matrixData.value = await timetableMatrixExportService.getResolvedMatrixData(
        selectedLevel.value
      )
    } catch {
      ElMessage.error('Gagal memuat matriks jadwal pelajaran.')
    } finally {
      loading.value = false
    }
  }

  async function handleSyncGradeX() {
    syncing.value = true
    try {
      const res = await timetableMatrixSyncService.syncGradeXTimetable()
      ElMessage.success(res.message)
      await loadMatrix()
    } catch (err: any) {
      ElMessage.error(`Gagal sinkronisasi: ${err.message}`)
    } finally {
      syncing.value = false
    }
  }

  async function handleExportPdf() {
    exportingPdf.value = true
    try {
      await timetableMatrixExportService.exportToPdf(selectedLevel.value)
      ElMessage.success(`Jadwal Matriks Kelas ${selectedLevel.value} berhasil diekspor ke PDF.`)
    } catch (err: any) {
      ElMessage.error(`Gagal ekspor PDF: ${err.message}`)
    } finally {
      exportingPdf.value = false
    }
  }

  async function handleExportXlsx() {
    exportingXlsx.value = true
    try {
      await timetableMatrixExportService.exportToXlsx(selectedLevel.value)
      ElMessage.success(`Jadwal Matriks Kelas ${selectedLevel.value} berhasil diekspor ke Excel.`)
    } catch (err: any) {
      ElMessage.error(`Gagal ekspor Excel: ${err.message}`)
    } finally {
      exportingXlsx.value = false
    }
  }

  function handleTemplateDownload(format: string) {
    try {
      timetableMatrixExportService.generateTemplate(format as 'XLSX' | 'CSV', selectedLevel.value)
      ElMessage.success(`Template Matriks Jadwal (${format}) berhasil diunduh.`)
    } catch (err: any) {
      ElMessage.error(`Gagal mengunduh template: ${err.message}`)
    }
  }

  onMounted(() => {
    loadMatrix()
  })
</script>
