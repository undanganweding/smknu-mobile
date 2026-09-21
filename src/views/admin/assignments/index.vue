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

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Tambah Penugasan Baru
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
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    assignmentService,
    AssignmentWithDetails
  } from '@/core/services/master/AssignmentService'
  import { teacherService } from '@/core/services/master/TeacherService'
  import { subjectService } from '@/core/services/master/SubjectService'
  import { academicService } from '@/core/services/master/AcademicService'
  import type { TeacherEntity, SubjectEntity, SemesterType } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const assignments = ref<AssignmentWithDetails[]>([])
  const teachers = ref<TeacherEntity[]>([])
  const subjects = ref<SubjectEntity[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterTeacher = ref<string>('')
  const activeAcademicYearId = ref('ay_2026_2027_ganjil')

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

  onMounted(() => {
    loadData()
  })
</script>
