<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Data Rombongan Belajar (Kelas)
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master 46 rombel SMK NU Ungaran tingkat X, XI, dan XII beserta penetapan Wali Kelas.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Tambah Rombel Baru
        </ElButton>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-lg w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari nama rombel..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterLevel" placeholder="Tingkat" class="!w-32">
            <ElOption label="Semua" value="" />
            <ElOption label="Kelas X" value="X" />
            <ElOption label="Kelas XI" value="XI" />
            <ElOption label="Kelas XII" value="XII" />
          </ElSelect>
          <ElSelect v-model="filterMajor" placeholder="Jurusan" class="!w-44">
            <ElOption label="Semua Jurusan" value="" />
            <ElOption v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
          </ElSelect>
        </div>
        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredClasses.length
          }}</span>
          rombel
        </div>
      </div>

      <ElTable :data="filteredClasses" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="name" label="Nama Rombel" min-width="160">
          <template #default="{ row }">
            <span class="font-bold text-gray-900 dark:text-gray-100">{{ row.name }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="level" label="Tingkat" width="100" align="center">
          <template #default="{ row }">
            <ElTag
              size="small"
              :type="row.level === 'X' ? 'info' : row.level === 'XI' ? 'primary' : 'success'"
            >
              Kelas {{ row.level }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Konsentrasi Keahlian (Jurusan)" min-width="220">
          <template #default="{ row }">
            <span class="text-sm text-gray-700 dark:text-gray-300">{{
              getMajorName(row.majorId)
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Wali Kelas" min-width="220">
          <template #default="{ row }">
            <span
              v-if="row.homeroomTeacherId"
              class="font-medium text-emerald-600 dark:text-emerald-400"
            >
              {{ getTeacherName(row.homeroomTeacherId) }}
            </span>
            <span v-else class="text-gray-400 italic">Belum Ditentukan</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="Status" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif' }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="180" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElButton size="small" type="primary" link @click="openEditModal(row as any)">
                Edit
              </ElButton>
              <ElButton
                size="small"
                :type="row.status === 'ACTIVE' ? 'warning' : 'success'"
                link
                @click="toggleStatus(row as any)"
              >
                {{ row.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan' }}
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Create / Edit Modal -->
    <ElDialog
      v-model="modalVisible"
      :title="isEditing ? 'Edit Data Rombel' : 'Tambah Rombel Baru'"
      width="540px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-position="top">
        <ElFormItem label="Nama Rombel" prop="name">
          <ElInput v-model="form.name" placeholder="Contoh: X PPLG 1, XI TO 2, XII TB 1" />
        </ElFormItem>

        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Tingkat Kelas" prop="level">
            <ElSelect v-model="form.level" class="w-full">
              <ElOption label="Kelas X" value="X" />
              <ElOption label="Kelas XI" value="XI" />
              <ElOption label="Kelas XII" value="XII" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="Nomor Rombel" prop="rombel">
            <ElInputNumber v-model="form.rombel" :min="1" :max="10" class="!w-full" />
          </ElFormItem>
        </div>

        <ElFormItem label="Konsentrasi Keahlian (Jurusan)" prop="majorId">
          <ElSelect v-model="form.majorId" class="w-full" placeholder="Pilih Jurusan">
            <ElOption v-for="m in majors" :key="m.id" :label="m.name" :value="m.id" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Wali Kelas" prop="homeroomTeacherId">
          <ElSelect
            v-model="form.homeroomTeacherId"
            class="w-full"
            placeholder="Pilih Guru Wali Kelas"
            filterable
            clearable
          >
            <ElOption v-for="t in teachers" :key="t.id" :label="t.name" :value="t.id" />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Rombel' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { classService } from '@/core/services/master/ClassService'
  import { teacherService } from '@/core/services/master/TeacherService'
  import { academicService } from '@/core/services/master/AcademicService'
  import type { ClassEntity, ClassLevel, MajorEntity, TeacherEntity } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const classes = ref<ClassEntity[]>([])
  const majors = ref<MajorEntity[]>([])
  const teachers = ref<TeacherEntity[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterLevel = ref<string>('')
  const filterMajor = ref<string>('')
  const activeAcademicYearId = ref('')

  const majorMap = ref<Map<string, string>>(new Map())
  const teacherMap = ref<Map<string, string>>(new Map())

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const form = ref({
    name: '',
    level: 'X' as ClassLevel,
    rombel: 1,
    majorId: '',
    homeroomTeacherId: ''
  })

  const formRules: FormRules = {
    name: [{ required: true, message: 'Nama rombel wajib diisi', trigger: 'blur' }],
    level: [{ required: true, message: 'Tingkat kelas wajib dipilih', trigger: 'change' }],
    majorId: [{ required: true, message: 'Jurusan wajib dipilih', trigger: 'change' }]
  }

  const filteredClasses = computed(() => {
    let result = classes.value

    if (filterLevel.value) {
      result = result.filter((c) => c.level === filterLevel.value)
    }

    if (filterMajor.value) {
      result = result.filter((c) => c.majorId === filterMajor.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q))
    }

    return result
  })

  function getMajorName(id: string): string {
    return majorMap.value.get(id) || 'Jurusan'
  }

  function getTeacherName(id: string): string {
    return teacherMap.value.get(id) || 'Guru'
  }

  async function loadData() {
    loading.value = true
    try {
      const [clsList, majorList, tchList, activeAy] = await Promise.all([
        classService.getAllClasses(),
        classService.getAllMajors(),
        teacherService.getAllTeachers('ACTIVE'),
        academicService.getActiveAcademicYear()
      ])

      classes.value = clsList
      majors.value = majorList
      teachers.value = tchList
      activeAcademicYearId.value = activeAy?.id || 'ay_2026_2027_ganjil'

      const mMap = new Map<string, string>()
      majorList.forEach((m) => mMap.set(m.id, m.name))
      majorMap.value = mMap

      const tMap = new Map<string, string>()
      tchList.forEach((t) => tMap.set(t.id, t.name))
      teacherMap.value = tMap
    } catch {
      ElMessage.error('Gagal memuat data rombel.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    editingId.value = ''
    form.value = {
      name: '',
      level: 'X',
      rombel: 1,
      majorId: majors.value.length > 0 ? majors.value[0].id : '',
      homeroomTeacherId: ''
    }
    modalVisible.value = true
  }

  function openEditModal(cls: ClassEntity) {
    isEditing.value = true
    editingId.value = cls.id
    form.value = {
      name: cls.name,
      level: cls.level,
      rombel: Number(cls.rombel) || 1,
      majorId: cls.majorId,
      homeroomTeacherId: cls.homeroomTeacherId || ''
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
          await classService.updateClass(editingId.value, {
            name: form.value.name,
            level: form.value.level,
            rombel: form.value.rombel,
            majorId: form.value.majorId,
            homeroomTeacherId: form.value.homeroomTeacherId || undefined
          })
          ElMessage.success('Data rombel berhasil diperbarui.')
        } else {
          await classService.createClass({
            name: form.value.name,
            level: form.value.level,
            rombel: form.value.rombel,
            majorId: form.value.majorId,
            homeroomTeacherId: form.value.homeroomTeacherId || undefined,
            academicYearId: activeAcademicYearId.value
          })
          ElMessage.success('Rombel baru berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan data rombel.')
      } finally {
        saving.value = false
      }
    })
  }

  async function toggleStatus(cls: ClassEntity) {
    const action = cls.status === 'ACTIVE' ? 'menonaktifkan' : 'mengaktifkan'
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin ${action} rombel "${cls.name}"?`,
        'Konfirmasi Status Rombel',
        {
          confirmButtonText: 'Ya, Lanjutkan',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await classService.toggleClassStatus(cls.id)
      ElMessage.success(`Rombel berhasil di-${action}.`)
      await loadData()
    } catch {
      // User cancelled
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
