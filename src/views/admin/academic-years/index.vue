<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Tahun Pelajaran & Periode Akademik
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kelola tahun ajaran aktif, batas pengumpulan nilai, dan periode akademik SMK NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateYearModal">
          <i class="ri-add-line mr-1"></i> Tambah Tahun Pelajaran
        </ElButton>
        <ElButton type="success" @click="openCreatePeriodModal">
          <i class="ri-calendar-event-line mr-1"></i> Tambah Periode
        </ElButton>
      </div>
    </div>

    <!-- Active Academic Year Banner -->
    <div
      v-if="activeYear"
      class="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl"
        >
          <i class="ri-calendar-check-line"></i>
        </div>
        <div>
          <div class="text-xs font-semibold text-primary uppercase tracking-wider"
            >Tahun Pelajaran Aktif</div
          >
          <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
            {{ activeYear.name }} — Semester {{ activeYear.semester }}
          </div>
          <div class="text-xs text-gray-500">
            {{ activeYear.startDate }} s/d {{ activeYear.endDate }}
          </div>
        </div>
      </div>
      <ElTag type="success" effect="dark" size="small">AKTIF SISTEM</ElTag>
    </div>

    <!-- Tabs: Tahun Pelajaran & Periode -->
    <div class="art-card p-6">
      <ElTabs v-model="activeTab">
        <!-- Tab 1: Tahun Pelajaran -->
        <ElTabPane label="Daftar Tahun Pelajaran" name="years">
          <ElTable :data="academicYears" v-loading="loading" stripe style="width: 100%">
            <ElTableColumn label="No" width="60" align="center">
              <template #default="{ $index }">
                <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
              </template>
            </ElTableColumn>

            <ElTableColumn prop="name" label="Tahun Pelajaran" min-width="160">
              <template #default="{ row }">
                <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.name }}</span>
              </template>
            </ElTableColumn>

            <ElTableColumn prop="semester" label="Semester" width="130">
              <template #default="{ row }">
                <ElTag size="small" :type="row.semester === 'GANJIL' ? 'primary' : 'warning'">
                  Semester {{ row.semester }}
                </ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Rentang Waktu" min-width="200">
              <template #default="{ row }">
                <span class="text-xs font-mono text-gray-600 dark:text-gray-300">
                  {{ row.startDate }} s/d {{ row.endDate }}
                </span>
              </template>
            </ElTableColumn>

            <ElTableColumn prop="isActive" label="Status Aktif" width="140" align="center">
              <template #default="{ row }">
                <ElTag v-if="row.isActive" type="success" size="small">AKTIF</ElTag>
                <ElButton
                  v-else
                  size="small"
                  type="info"
                  plain
                  @click="handleSetActiveYear(row.id)"
                >
                  Jadikan Aktif
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- Tab 2: Periode Akademik -->
        <ElTabPane label="Periode Pengumpulan & Evaluasi" name="periods">
          <ElTable :data="periods" v-loading="loading" stripe style="width: 100%">
            <ElTableColumn label="No" width="60" align="center">
              <template #default="{ $index }">
                <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
              </template>
            </ElTableColumn>

            <ElTableColumn prop="name" label="Nama Periode" min-width="200">
              <template #default="{ row }">
                <div class="font-semibold text-gray-900 dark:text-gray-100">{{ row.name }}</div>
                <div class="text-xs text-gray-400 font-mono">{{ row.periodType }}</div>
              </template>
            </ElTableColumn>

            <ElTableColumn prop="semester" label="Semester" width="110">
              <template #default="{ row }">
                <ElTag size="small">{{ row.semester }}</ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Batas Akhir (Deadline)" min-width="170">
              <template #default="{ row }">
                <div class="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
                  <i class="ri-time-line mr-1"></i>{{ row.submissionDeadline || row.endDate }}
                </div>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Status Kunci" width="140" align="center">
              <template #default="{ row }">
                <ElTag v-if="row.isLocked" type="danger" size="small">TERKUNCI / ARSIP</ElTag>
                <ElTag v-else type="success" size="small">TERBUKA</ElTag>
              </template>
            </ElTableColumn>

            <ElTableColumn label="Aksi" width="160" align="center">
              <template #default="{ row }">
                <div class="flex items-center justify-center gap-2">
                  <ElButton
                    v-if="!row.isLocked"
                    size="small"
                    type="warning"
                    plain
                    @click="handleToggleLock(row as any)"
                  >
                    <i class="ri-lock-line mr-1"></i> Kunci
                  </ElButton>
                  <ElButton
                    v-else
                    size="small"
                    type="info"
                    plain
                    @click="handleToggleLock(row as any)"
                  >
                    <i class="ri-lock-unlock-line mr-1"></i> Buka Kunci
                  </ElButton>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </div>

    <!-- Modal Form Tahun Pelajaran -->
    <ElDialog
      v-model="yearModalVisible"
      title="Tambah Tahun Pelajaran"
      width="500px"
      destroy-on-close
    >
      <ElForm :model="yearForm" label-position="top">
        <ElFormItem label="Nama Tahun Pelajaran (contoh: 2026/2027)" required>
          <ElInput v-model="yearForm.name" placeholder="2026/2027" />
        </ElFormItem>
        <ElFormItem label="Semester" required>
          <ElSelect v-model="yearForm.semester" class="w-full">
            <ElOption label="Ganjil" value="GANJIL" />
            <ElOption label="Genap" value="GENAP" />
          </ElSelect>
        </ElFormItem>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Tanggal Mulai" required>
            <ElDatePicker
              v-model="yearForm.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="Tanggal Selesai" required>
            <ElDatePicker
              v-model="yearForm.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>
        <ElFormItem>
          <ElCheckbox v-model="yearForm.isActive">Langsung jadikan tahun ajaran aktif</ElCheckbox>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="yearModalVisible = false">Batal</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSaveYear">Simpan</ElButton>
      </template>
    </ElDialog>

    <!-- Modal Form Periode -->
    <ElDialog
      v-model="periodModalVisible"
      title="Tambah Periode Akademik"
      width="520px"
      destroy-on-close
    >
      <ElForm :model="periodForm" label-position="top">
        <ElFormItem label="Nama Periode" required>
          <ElInput v-model="periodForm.name" placeholder="Misal: Penilaian Akhir Semester Ganjil" />
        </ElFormItem>
        <ElFormItem label="Jenis Periode" required>
          <ElSelect v-model="periodForm.periodType" class="w-full">
            <ElOption label="Semester" value="SEMESTER" />
            <ElOption label="Mid Semester (PTS)" value="MID_SEMESTER" />
            <ElOption label="Bulanan" value="MONTHLY" />
            <ElOption label="Final Submission" value="FINAL_SUBMISSION" />
          </ElSelect>
        </ElFormItem>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Tanggal Mulai" required>
            <ElDatePicker
              v-model="periodForm.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="Tanggal Selesai" required>
            <ElDatePicker
              v-model="periodForm.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>
        <ElFormItem label="Batas Waktu Pengumpulan (Deadline)" required>
          <ElDatePicker
            v-model="periodForm.submissionDeadline"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="!w-full"
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="periodModalVisible = false">Batal</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSavePeriod">Simpan</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { academicService, academicPeriodService } from '@/core/services'
  import type { AcademicYearEntity, AcademicPeriodEntity } from '@/core/types'

  const activeTab = ref('years')
  const loading = ref(false)
  const saving = ref(false)
  const academicYears = ref<AcademicYearEntity[]>([])
  const activeYear = ref<AcademicYearEntity | null>(null)
  const periods = ref<AcademicPeriodEntity[]>([])

  const yearModalVisible = ref(false)
  const yearForm = ref({
    name: '',
    semester: 'GANJIL' as const,
    startDate: '',
    endDate: '',
    isActive: false
  })

  const periodModalVisible = ref(false)
  const periodForm = ref({
    name: '',
    periodType: 'SEMESTER' as const,
    startDate: '',
    endDate: '',
    submissionDeadline: ''
  })

  async function loadData() {
    loading.value = true
    try {
      academicYears.value = await academicService.getAllAcademicYears()
      activeYear.value = await academicService.getActiveAcademicYear()
      periods.value = await academicPeriodService.getAllPeriods()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat data akademik.')
    } finally {
      loading.value = false
    }
  }

  function openCreateYearModal() {
    yearForm.value = {
      name: '2026/2027',
      semester: 'GANJIL',
      startDate: '2026-07-15',
      endDate: '2026-12-20',
      isActive: false
    }
    yearModalVisible.value = true
  }

  function openCreatePeriodModal() {
    periodForm.value = {
      name: '',
      periodType: 'SEMESTER',
      startDate: '',
      endDate: '',
      submissionDeadline: ''
    }
    periodModalVisible.value = true
  }

  async function handleSaveYear() {
    if (!yearForm.value.name) {
      ElMessage.warning('Nama tahun pelajaran wajib diisi.')
      return
    }
    saving.value = true
    try {
      await academicService.createAcademicYear(yearForm.value)
      ElMessage.success('Tahun pelajaran berhasil ditambahkan.')
      yearModalVisible.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan tahun pelajaran.')
    } finally {
      saving.value = false
    }
  }

  async function handleSetActiveYear(id: string) {
    try {
      await academicService.setActiveAcademicYear(id)
      ElMessage.success('Tahun pelajaran aktif berhasil diperbarui.')
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengubah tahun pelajaran aktif.')
    }
  }

  async function handleSavePeriod() {
    if (!periodForm.value.name || !periodForm.value.startDate || !periodForm.value.endDate) {
      ElMessage.warning('Semua field wajib diisi.')
      return
    }
    if (!activeYear.value) {
      ElMessage.warning('Belum ada tahun pelajaran aktif.')
      return
    }
    saving.value = true
    try {
      await academicPeriodService.createPeriod({
        academicYearId: activeYear.value.id,
        name: periodForm.value.name,
        periodType: periodForm.value.periodType,
        semester: activeYear.value.semester,
        year: new Date(periodForm.value.startDate).getFullYear(),
        startDate: periodForm.value.startDate,
        endDate: periodForm.value.endDate,
        submissionDeadline: periodForm.value.submissionDeadline || periodForm.value.endDate
      })
      ElMessage.success('Periode akademik berhasil disimpan.')
      periodModalVisible.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan periode.')
    } finally {
      saving.value = false
    }
  }

  async function handleToggleLock(period: AcademicPeriodEntity) {
    try {
      if (period.isLocked) {
        await academicPeriodService.unlockPeriod(period.id)
        ElMessage.success(`Periode '${period.name}' berhasil dibuka.`)
      } else {
        await academicPeriodService.lockPeriod(period.id)
        ElMessage.success(`Periode '${period.name}' berhasil dikunci.`)
      }
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengubah status kunci periode.')
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
