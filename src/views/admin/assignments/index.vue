<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          SK Pembagian Tugas Mengajar Guru
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master alokasi beban mengajar guru (KODE 01 s/d 117) dan mata pelajaran yang diampu.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ElButton type="danger" plain @click="exportPdf">
          <i class="ri-file-pdf-line mr-1"></i> Export Dokumen 1 (PDF)
        </ElButton>
        <ElButton type="success" plain @click="exportXlsx">
          <i class="ri-file-excel-line mr-1"></i> Export Dokumen 1 (Excel)
        </ElButton>
        <ElButton type="warning" plain @click="openImportModal">
          <i class="ri-upload-2-line mr-1"></i> Import Dokumen 1 (PDF / Excel)
        </ElButton>
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Tambah Penugasan
        </ElButton>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-xl w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari kode tugas, nama guru, atau mapel..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect
            v-model="filterTeacher"
            placeholder="Filter Guru"
            class="!w-52"
            filterable
            clearable
          >
            <ElOption label="Semua Guru" value="" />
            <ElOption v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
          </ElSelect>
        </div>
        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredAssignments.length
          }}</span>
          penugasan &bull; Total Beban:
          <span class="font-semibold text-primary">{{ totalHoursCalculated }} JP</span>
        </div>
      </div>

      <ElTable :data="filteredAssignments" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="code" label="Kode SK" width="130">
          <template #default="{ row }">
            <span class="font-mono font-bold text-primary">{{ row.code }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Nama Guru Pengampu" min-width="220">
          <template #default="{ row }">
            <div class="font-semibold text-gray-900 dark:text-gray-100">{{ row.teacherName }}</div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Mata Pelajaran" min-width="240">
          <template #default="{ row }">
            <div>
              <div class="font-medium text-gray-800 dark:text-gray-200">{{ row.subjectName }}</div>
              <div class="text-xs text-gray-400">Kode Mapel: {{ row.subjectCode }}</div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="hours" label="Beban Jam (JP)" width="140" align="center">
          <template #default="{ row }">
            <ElTag size="small" type="success" effect="plain">{{ row.hours }} Jam / Pekan</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="semester" label="Semester" width="120" align="center">
          <template #default="{ row }">
            <ElTag size="small" type="info">{{ row.semester }}</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="160" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElButton size="small" type="primary" link @click="openEditModal(row as any)">
                Edit
              </ElButton>
              <ElButton size="small" type="danger" link @click="handleDelete(row as any)">
                Hapus
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Create / Edit Modal -->
    <ElDialog
      v-model="modalVisible"
      :title="isEditing ? 'Edit Penugasan Mengajar' : 'Tambah Penugasan Mengajar Baru'"
      width="540px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-position="top">
        <ElFormItem label="Kode SK Penugasan" prop="code">
          <ElInput v-model.trim="form.code" placeholder="Contoh: KODE 01, KODE 24, TUGAS-05" />
        </ElFormItem>

        <ElFormItem label="Guru Pengampu" prop="teacherId">
          <ElSelect
            v-model="form.teacherId"
            class="w-full"
            placeholder="Pilih Guru Pengampu"
            filterable
          >
            <ElOption v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Mata Pelajaran" prop="subjectId">
          <ElSelect
            v-model="form.subjectId"
            class="w-full"
            placeholder="Pilih Mata Pelajaran"
            filterable
          >
            <ElOption
              v-for="s in subjects"
              :key="s.id"
              :label="`${s.code} - ${s.name}`"
              :value="s.id"
            />
          </ElSelect>
        </ElFormItem>

        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Beban Jam (JP)" prop="hours">
            <ElInputNumber v-model="form.hours" :min="1" :max="60" class="!w-full" />
          </ElFormItem>

          <ElFormItem label="Semester" prop="semester">
            <ElSelect v-model="form.semester" class="w-full">
              <ElOption label="Ganjil" value="GANJIL" />
              <ElOption label="Genap" value="GENAP" />
            </ElSelect>
          </ElFormItem>
        </div>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Penugasan' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- Import Dokumen 1 (PDF / Excel) Modal -->
    <ElDialog
      v-model="importModalVisible"
      title="Import Dokumen 1 (Kode Guru & Mata Pelajaran)"
      width="780px"
      destroy-on-close
    >
      <div class="space-y-4">
        <ElAlert
          type="info"
          show-icon
          :closable="false"
          title="Sinkronisasi Dokumen 1 Resmi (PDF & XLSX)"
          description="Unggah file PDF atau Excel (XLSX/XLS) Dokumen 1 SMK NU Ungaran. Sistem akan otomatis menyinkronkan 117 penugasan, kode guru, nama guru, mata pelajaran, dan alokasi JP secara paten."
        />

        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">Pilih file Dokumen 1 dari perangkat Anda:</span>
          <div class="flex items-center gap-2">
            <ElButton size="small" type="primary" plain @click="downloadTemplate('XLSX')">
              <i class="ri-file-excel-line mr-1"></i> Template Excel
            </ElButton>
            <ElButton size="small" type="info" plain @click="downloadTemplate('CSV')">
              <i class="ri-file-text-line mr-1"></i> Template CSV
            </ElButton>
          </div>
        </div>

        <ElUpload
          drag
          action=""
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf, .xlsx, .xls"
          :on-change="handleFileSelected"
        >
          <div class="py-4 text-center">
            <i class="ri-upload-cloud-2-line text-4xl text-primary mb-2"></i>
            <div class="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Klik atau Seret File Dokumen 1 (PDF / XLSX / XLS) ke Sini
            </div>
            <p class="text-xs text-gray-400 mt-1">Mendukung file PDF resmi 2 halaman atau Excel</p>
          </div>
        </ElUpload>

        <!-- Preview Table if Parsed -->
        <div v-if="parsedDokumen1" class="mt-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <i class="ri-checkbox-circle-fill text-emerald-500"></i>
              Hasil Ekstraksi File:
              <span class="text-primary font-mono">{{ parsedDokumen1.filename }}</span>
            </div>
            <div class="text-xs text-gray-500">
              Terdeteksi:
              <span class="font-bold text-emerald-600">{{ parsedDokumen1.rows.length }}</span> baris
              &bull; Total:
              <span class="font-bold text-primary">{{ parsedDokumen1.totalHours }} JP</span>
            </div>
          </div>

          <div class="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
            <ElTable :data="parsedDokumen1.rows" size="small" stripe style="width: 100%">
              <ElTableColumn prop="no" label="No" width="55" align="center" />
              <ElTableColumn prop="code" label="Kode" width="75" align="center">
                <template #default="{ row }">
                  <span class="font-mono font-bold text-primary">{{ row.code }}</span>
                </template>
              </ElTableColumn>
              <ElTableColumn prop="teacherName" label="Nama Guru" min-width="180" />
              <ElTableColumn prop="subjectName" label="Mata Pelajaran" min-width="200" />
              <ElTableColumn prop="hours" label="Jam" width="65" align="center">
                <template #default="{ row }">
                  <span class="font-bold">{{ row.hours }}</span>
                </template>
              </ElTableColumn>
            </ElTable>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="importModalVisible = false">Batal</ElButton>
          <ElButton
            type="primary"
            :disabled="!parsedDokumen1 || parsedDokumen1.rows.length === 0"
            :loading="committingImport"
            @click="handleCommitDokumen1"
          >
            <i class="ri-check-double-line mr-1"></i> Terapkan & Sinkronkan ke Database
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import type { UploadFile } from 'element-plus'
  import {
    assignmentService,
    AssignmentWithDetails
  } from '@/core/services/master/AssignmentService'
  import { teacherService } from '@/core/services/master/TeacherService'
  import { subjectService } from '@/core/services/master/SubjectService'
  import { academicService } from '@/core/services/master/AcademicService'
  import { importService } from '@/core/services/import/ImportService'
  import { dokumen1ExportService } from '@/core/services/export/Dokumen1ExportService'
  import type { TeacherEntity, SubjectEntity, SemesterType } from '@/core/types'
  import type { Dokumen1ParseResult } from '@/core/services/import/PdfDokumen1Parser'
  import type { FormInstance, FormRules } from 'element-plus'

  const assignments = ref<AssignmentWithDetails[]>([])
  const teachers = ref<TeacherEntity[]>([])
  const subjects = ref<SubjectEntity[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterTeacher = ref<string>('')
  const activeAcademicYearId = ref('ay_2026_2027_ganjil')

  // Dokumen 1 Import State
  const importModalVisible = ref(false)
  const committingImport = ref(false)
  const parsedDokumen1 = ref<(Dokumen1ParseResult & { filename: string }) | null>(null)

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const form = ref({
    code: '',
    teacherId: '',
    subjectId: '',
    hours: 4,
    semester: 'GANJIL' as SemesterType
  })

  const formRules: FormRules = {
    code: [{ required: true, message: 'Kode penugasan wajib diisi', trigger: 'blur' }],
    teacherId: [{ required: true, message: 'Guru pengampu wajib dipilih', trigger: 'change' }],
    subjectId: [{ required: true, message: 'Mata pelajaran wajib dipilih', trigger: 'change' }]
  }

  const filteredAssignments = computed(() => {
    let result = assignments.value

    if (filterTeacher.value) {
      result = result.filter((a) => a.teacherId === filterTeacher.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          (a.teacherName && a.teacherName.toLowerCase().includes(q)) ||
          (a.subjectName && a.subjectName.toLowerCase().includes(q))
      )
    }

    return result
  })

  const totalHoursCalculated = computed(() => {
    return filteredAssignments.value.reduce((sum, item) => sum + (item.hours || 0), 0)
  })

  async function loadData() {
    loading.value = true
    try {
      const [asgList, tchList, sbjList, activeAy] = await Promise.all([
        assignmentService.getAssignmentsWithDetails(),
        teacherService.getAllTeachers('ACTIVE'),
        subjectService.getAllSubjects('ACTIVE'),
        academicService.getActiveAcademicYear()
      ])

      assignments.value = asgList
      teachers.value = tchList
      subjects.value = sbjList
      if (activeAy) {
        activeAcademicYearId.value = activeAy.id
      }
    } catch {
      ElMessage.error('Gagal memuat data pembagian tugas guru.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    editingId.value = ''
    form.value = {
      code: `KODE ${String(assignments.value.length + 1).padStart(2, '0')}`,
      teacherId: teachers.value.length > 0 ? teachers.value[0].id : '',
      subjectId: subjects.value.length > 0 ? subjects.value[0].id : '',
      hours: 4,
      semester: 'GANJIL'
    }
    modalVisible.value = true
  }

  function openEditModal(asg: AssignmentWithDetails) {
    isEditing.value = true
    editingId.value = asg.id
    form.value = {
      code: asg.code,
      teacherId: asg.teacherId,
      subjectId: asg.subjectId,
      hours: asg.hours || 4,
      semester: asg.semester || 'GANJIL'
    }
    modalVisible.value = true
  }

  async function handleSave() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      saving.value = true
      try {
        if (isEditing.value) {
          await assignmentService.updateAssignment(editingId.value, { ...form.value })
          ElMessage.success('Penugasan mengajar berhasil diperbarui.')
        } else {
          await assignmentService.createAssignment({
            ...form.value,
            academicYearId: activeAcademicYearId.value
          })
          ElMessage.success('Penugasan mengajar baru berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan penugasan mengajar.')
      } finally {
        saving.value = false
      }
    })
  }

  async function handleDelete(asg: AssignmentWithDetails) {
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin menghapus alokasi penugasan "${asg.code}" (${asg.teacherName} - ${asg.subjectName})?`,
        'Konfirmasi Hapus Penugasan',
        {
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await assignmentService.deleteAssignment(asg.id)
      ElMessage.success('Penugasan mengajar berhasil dihapus.')
      await loadData()
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err.message || 'Gagal menghapus penugasan mengajar.')
      }
    }
  }

  // Export Dokumen 1 PDF
  async function exportPdf() {
    try {
      ElMessage.info('Menyiapkan file PDF Dokumen 1...')
      await dokumen1ExportService.exportToPdf()
      ElMessage.success('Dokumen 1 PDF berhasil diunduh.')
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengekspor Dokumen 1 ke PDF.')
    }
  }

  // Export Dokumen 1 Excel
  async function exportXlsx() {
    try {
      ElMessage.info('Menyiapkan file Excel Dokumen 1...')
      await dokumen1ExportService.exportToXlsx()
      ElMessage.success('Dokumen 1 Excel berhasil diunduh.')
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengekspor Dokumen 1 ke Excel.')
    }
  }

  function openImportModal() {
    parsedDokumen1.value = null
    importModalVisible.value = true
  }

  function downloadTemplate(format: 'XLSX' | 'CSV') {
    dokumen1ExportService.generateTemplate(format)
    ElMessage.success(`Template Dokumen 1 ${format} berhasil diunduh.`)
  }

  async function handleFileSelected(uploadFile: UploadFile) {
    if (!uploadFile.raw) return
    const file = uploadFile.raw
    const filename = file.name
    const isPdf = filename.toLowerCase().endsWith('.pdf')
    const isExcel =
      filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')

    if (!isPdf && !isExcel) {
      ElMessage.error('Format file harus berupa PDF (.pdf) atau Excel (.xlsx/.xls)')
      return
    }

    try {
      ElMessage.info(`Membaca dan memvalidasi file ${filename}...`)
      const buffer = await file.arrayBuffer()
      const result = await importService.parseAndPreviewDokumen1(buffer, filename)

      if (!result.success || result.rows.length === 0) {
        ElMessage.warning('Tidak dapat mendeteksi baris data Dokumen 1 dari file yang diunggah.')
        return
      }

      parsedDokumen1.value = {
        ...result,
        filename
      }
      ElMessage.success(`Berhasil mengekstrak ${result.rows.length} baris Dokumen 1.`)
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memproses file Dokumen 1.')
    }
  }

  async function handleCommitDokumen1() {
    if (!parsedDokumen1.value || parsedDokumen1.value.rows.length === 0) return

    committingImport.value = true
    try {
      const res = await importService.commitDokumen1(
        parsedDokumen1.value.rows,
        parsedDokumen1.value.filename
      )
      ElMessage.success(res.message)
      importModalVisible.value = false
      parsedDokumen1.value = null
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menerapkan import Dokumen 1.')
    } finally {
      committingImport.value = false
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
