<template>
  <div class="p-5 space-y-5" id="admin-academic-ledger">
    <!-- Header Block -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
          >
            ADMINISTRATOR
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
          >
            LEDGER EKSPOR
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-file-excel-2-line text-emerald-600"></i> Ledger Akademik Administratif
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Konsolidasikan seluruh rekap nilai, presensi, buku kedisiplinan, dan beban guru dalam file
          Excel multi-sheet terintegrasi.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton
          type="success"
          :disabled="!filter.academicYearId || previewRows.length === 0"
          :loading="exporting"
          @click="handleExportXlsx"
          id="btn-export-ledger"
        >
          <i class="ri-download-cloud-line mr-1"></i> Unduh Ledger (.XLSX)
        </ElButton>
      </div>
    </div>

    <!-- Filter Block -->
    <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <i class="ri-filter-3-line text-emerald-600"></i> Parameter Filter Ledger
          </span>
          <ElButton size="small" text type="primary" @click="resetFilters" id="btn-reset-filters">
            <i class="ri-refresh-line mr-1"></i> Reset Filter
          </ElButton>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block"
            >Tahun Akademik</label
          >
          <ElSelect
            v-model="filter.academicYearId"
            placeholder="Pilih Tahun Akademik"
            class="w-full"
            @change="handleFilterChange"
            id="select-academic-year"
          >
            <ElOption
              v-for="ay in academicYears"
              :key="ay.id"
              :label="`${ay.name} ${ay.isActive ? '(Aktif)' : ''}`"
              :value="ay.id"
            />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block"
            >Semester</label
          >
          <ElSelect
            v-model="filter.semester"
            placeholder="Pilih Semester"
            class="w-full"
            @change="handleFilterChange"
            id="select-semester"
          >
            <ElOption label="Ganjil" value="GANJIL" />
            <ElOption label="Genap" value="GENAP" />
          </ElSelect>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block"
            >Kelas (Opsional)</label
          >
          <ElSelect
            v-model="filter.classId"
            placeholder="Semua Kelas"
            class="w-full"
            clearable
            @change="handleFilterChange"
            id="select-class"
          >
            <ElOption v-for="c in filteredClasses" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </div>
      </div>
    </ElCard>

    <!-- Preview Block -->
    <div class="art-card p-5 space-y-4 shadow-sm border border-gray-100 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <i class="ri-eye-line text-blue-500"></i> Preview Ledger Nilai Akhir (NA)
        </h3>
        <span class="text-xs text-slate-400 dark:text-slate-500">
          Daftar Siswa Terdeteksi: <strong>{{ previewRows.length }} siswa</strong>
        </span>
      </div>

      <ElTable
        :data="previewRows"
        stripe
        border
        style="width: 100%"
        v-loading="loading"
        empty-text="Pilih parameter filter untuk menampilkan preview ledger akademik"
      >
        <ElTableColumn prop="no" label="No" width="60" align="center" />
        <ElTableColumn prop="nis" label="NIS" width="125" />
        <ElTableColumn prop="name" label="Nama Siswa" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="className" label="Kelas" width="110" align="center" />

        <!-- Dynamic Subject Grades -->
        <ElTableColumn
          v-for="sub in activeSubjects"
          :key="sub.code"
          :prop="sub.code"
          width="100"
          align="center"
        >
          <template #header>
            <ElTooltip :content="sub.name" placement="top">
              <span
                class="cursor-help font-semibold text-xs border-b border-dotted border-slate-400"
              >
                {{ sub.code }}
              </span>
            </ElTooltip>
          </template>
          <template #default="{ row }">
            <span
              :class="[
                'text-xs font-semibold',
                row[sub.code] === '-'
                  ? 'text-slate-400 font-normal'
                  : Number(row[sub.code]) < (sub.defaultKkm ?? 75)
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-700 dark:text-emerald-400'
              ]"
            >
              {{ row[sub.code] }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="average" label="Rata-rata" width="100" align="center">
          <template #default="{ row }">
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ row.average }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Di Bawah KKM" width="130" align="center">
          <template #default="{ row }">
            <span
              :class="[
                'px-2 py-0.5 text-xs font-semibold rounded-full',
                row.belowKkm > 0
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
              ]"
            >
              {{ row.belowKkm }} Mapel
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="Status" width="150" align="center">
          <template #default="{ row }">
            <ElTag
              :type="
                row.status === 'TUNTAS'
                  ? 'success'
                  : row.status === 'PERLU REMEDIAL'
                    ? 'warning'
                    : 'info'
              "
              size="small"
              effect="dark"
            >
              {{ row.status }}
            </ElTag>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { repositories } from '@/core/repositories'
  import { academicLedgerService } from '@/core/services/report/AcademicLedgerService'
  import type { AcademicYearEntity, ClassEntity, SubjectEntity } from '@/core/types'

  defineOptions({ name: 'AdminAcademicLedger' })

  const loading = ref(false)
  const exporting = ref(false)

  const academicYears = ref<AcademicYearEntity[]>([])
  const allClasses = ref<ClassEntity[]>([])
  const filteredClasses = ref<ClassEntity[]>([])

  const filter = reactive({
    academicYearId: '',
    semester: 'GANJIL' as any,
    classId: ''
  })

  const activeSubjects = ref<SubjectEntity[]>([])
  const previewRows = ref<any[]>([])

  // Load initial options
  const fetchFilterOptions = async () => {
    try {
      const listYears = await repositories.academicYears.findAll()
      academicYears.value = listYears.sort((a, b) => b.name.localeCompare(a.name))

      const listClasses = await repositories.classes.findAll()
      allClasses.value = listClasses

      // Auto select active year
      const activeY = listYears.find((y) => y.isActive)
      if (activeY) {
        filter.academicYearId = activeY.id
        filter.semester = activeY.semester
      } else if (listYears.length > 0) {
        filter.academicYearId = listYears[0].id
        filter.semester = listYears[0].semester
      }

      updateFilteredClasses()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat parameter filter.')
    }
  }

  // Update class choices depending on selected academic year
  const updateFilteredClasses = () => {
    if (filter.academicYearId) {
      filteredClasses.value = allClasses.value.filter(
        (c) => c.academicYearId === filter.academicYearId
      )
    } else {
      filteredClasses.value = []
    }
  }

  // Reload preview on filter changes
  const handleFilterChange = async () => {
    updateFilteredClasses()
    if (filter.classId && !filteredClasses.value.some((c) => c.id === filter.classId)) {
      filter.classId = ''
    }
    await fetchPreview()
  }

  // Fetch preview rows & dynamic subject column metadata
  const fetchPreview = async () => {
    if (!filter.academicYearId) {
      previewRows.value = []
      activeSubjects.value = []
      return
    }

    loading.value = true
    try {
      // 1. Fetch Grade Ledger details to render preview matrix
      const data = await academicLedgerService.getGradeLedgerData(
        filter.academicYearId,
        filter.semester,
        filter.classId || undefined
      )
      activeSubjects.value = data.subjects

      // 2. Map preview rows
      const preview = await academicLedgerService.getLedgerPreview(
        filter.academicYearId,
        filter.semester,
        filter.classId || undefined
      )
      previewRows.value = preview.rows
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengambil data preview ledger.')
    } finally {
      loading.value = false
    }
  }

  // Reset filters to default state
  const resetFilters = async () => {
    const activeY = academicYears.value.find((y) => y.isActive)
    if (activeY) {
      filter.academicYearId = activeY.id
      filter.semester = activeY.semester
    }
    filter.classId = ''
    await handleFilterChange()
    ElMessage.success('Filter berhasil di-reset.')
  }

  // Export XLSX File download handler
  const handleExportXlsx = async () => {
    if (!filter.academicYearId) return

    exporting.value = true
    ElMessage.info('Menyiapkan file ledger akademik...')

    try {
      const res = await academicLedgerService.generateLedgerXlsx(
        filter.academicYearId,
        filter.semester,
        filter.classId || undefined
      )

      const blob = new Blob([res.content], { type: res.mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', res.filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      ElMessage.success('Ledger Akademik berhasil diekspor!')
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengekspor ledger.')
    } finally {
      exporting.value = false
    }
  }

  onMounted(async () => {
    await fetchFilterOptions()
    await fetchPreview()
  })
</script>
