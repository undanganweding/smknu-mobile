<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Data Peserta Didik (Siswa)
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master data siswa aktif, mutasi, dan alumni SMK NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-user-add-line mr-1"></i> Tambah Siswa Baru
        </ElButton>
      </div>
    </div>

    <!-- Stats Cards using ArtStatsCard -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ArtStatsCard
        title="Total Terdaftar"
        :count="stats.total"
        description="Semua Anggota Terdata"
        icon="ri:group-line"
        iconStyle="!bg-blue-500"
      />
      <ArtStatsCard
        title="Siswa Aktif"
        :count="stats.active"
        description="Status Belajar Aktif"
        icon="ri:user-follow-line"
        iconStyle="!bg-emerald-500"
      />
      <ArtStatsCard
        title="Siswa Laki-laki"
        :count="stats.male"
        description="Peserta Didik (L)"
        icon="ri:men-line"
        iconStyle="!bg-indigo-500"
      />
      <ArtStatsCard
        title="Siswa Perempuan"
        :count="stats.female"
        description="Peserta Didik (P)"
        icon="ri:women-line"
        iconStyle="!bg-pink-500"
      />
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-lg w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari nama, NIS, atau NISN siswa..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect
            v-model="filterClass"
            placeholder="Pilih Kelas"
            class="!w-44"
            filterable
            clearable
          >
            <ElOption label="Semua Kelas" value="" />
            <ElOption v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
          <ElSelect v-model="filterStatus" placeholder="Status" class="!w-36">
            <ElOption label="Semua" value="" />
            <ElOption label="Aktif" value="ACTIVE" />
            <ElOption label="Mutasi" value="MUTATION" />
            <ElOption label="Lulus" value="GRADUATED" />
            <ElOption label="Nonaktif" value="INACTIVE" />
          </ElSelect>
        </div>
        <div class="text-xs text-gray-500">
          Menampilkan:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredStudents.length
          }}</span>
          siswa
        </div>
      </div>

      <ElTable :data="filteredStudents" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="NIS / NISN" width="160">
          <template #default="{ row }">
            <div class="text-xs">
              <div class="font-mono font-bold text-gray-800 dark:text-gray-200">
                NIS: {{ row.nis }}
              </div>
              <div class="text-gray-400">NISN: {{ row.nisn || '-' }}</div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="name" label="Nama Siswa" min-width="220">
          <template #default="{ row }">
            <div>
              <div class="font-semibold text-gray-900 dark:text-gray-100">{{ row.name }}</div>
              <div class="text-xs text-gray-400">
                {{ row.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)' }}
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Kelas / Rombel" min-width="160">
          <template #default="{ row }">
            <ElTag size="small" type="primary">{{ getClassName(row.classId) }}</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="Status" width="120">
          <template #default="{ row }">
            <ElTag
              size="small"
              :type="
                row.status === 'ACTIVE'
                  ? 'success'
                  : row.status === 'MUTATION'
                    ? 'warning'
                    : row.status === 'GRADUATED'
                      ? 'primary'
                      : 'danger'
              "
            >
              {{
                row.status === 'ACTIVE'
                  ? 'Aktif'
                  : row.status === 'MUTATION'
                    ? 'Mutasi'
                    : row.status === 'GRADUATED'
                      ? 'Lulus'
                      : 'Nonaktif'
              }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="parentPhone" label="Kontak Wali" min-width="150">
          <template #default="{ row }">
            <span class="text-xs text-gray-600 dark:text-gray-400">{{
              row.parentPhone || '-'
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="180" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <ElButton size="small" type="primary" link @click="openEditModal(row as any)">
                Edit
              </ElButton>
              <ElButton size="small" type="warning" link @click="openStatusModal(row as any)">
                Ubah Status
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Create / Edit Modal -->
    <ElDialog
      v-model="modalVisible"
      :title="isEditing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'"
      width="580px"
      destroy-on-close
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
        class="grid grid-cols-1 md:grid-cols-2 gap-x-4"
      >
        <ElFormItem label="NIS Siswa" prop="nis">
          <ElInput v-model.trim="form.nis" placeholder="Nomor Induk Siswa" />
        </ElFormItem>

        <ElFormItem label="NISN (Opsional)" prop="nisn">
          <ElInput v-model.trim="form.nisn" placeholder="Nomor Induk Siswa Nasional" />
        </ElFormItem>

        <ElFormItem label="Nama Lengkap Siswa" prop="name" class="md:col-span-2">
          <ElInput v-model="form.name" placeholder="Nama lengkap sesuai ijazah/akta" />
        </ElFormItem>

        <ElFormItem label="Jenis Kelamin" prop="gender">
          <ElSelect v-model="form.gender" class="w-full">
            <ElOption label="Laki-laki (L)" value="L" />
            <ElOption label="Perempuan (P)" value="P" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Kelas / Rombel" prop="classId">
          <ElSelect v-model="form.classId" class="w-full" placeholder="Pilih Rombel" filterable>
            <ElOption v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Tempat Lahir" prop="birthPlace">
          <ElInput v-model="form.birthPlace" placeholder="Kota / Kabupaten" />
        </ElFormItem>

        <ElFormItem label="Tanggal Lahir" prop="birthDate">
          <ElDatePicker
            v-model="form.birthDate"
            type="date"
            placeholder="Pilih Tanggal"
            value-format="YYYY-MM-DD"
            class="!w-full"
          />
        </ElFormItem>

        <ElFormItem label="No. HP / WhatsApp Orang Tua" prop="parentPhone" class="md:col-span-2">
          <ElInput v-model="form.parentPhone" placeholder="08xxxxxxxxxx" />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Siswa' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- Status Change Modal -->
    <ElDialog v-model="statusModalVisible" title="Ubah Status Siswa" width="400px" destroy-on-close>
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Ubah status untuk siswa
          <strong class="text-gray-900 dark:text-gray-100">{{ selectedStudent?.name }}</strong
          >:
        </p>

        <ElSelect v-model="newStatus" class="w-full">
          <ElOption label="Aktif Belajar" value="ACTIVE" />
          <ElOption label="Mutasi / Pindah Sekolah" value="MUTATION" />
          <ElOption label="Lulus / Alumni" value="GRADUATED" />
          <ElOption label="Nonaktif / Berhenti" value="INACTIVE" />
        </ElSelect>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="statusModalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleUpdateStatus">
            Simpan Status
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'
  import { studentService } from '@/core/services/master/StudentService'
  import { classService } from '@/core/services/master/ClassService'
  import type { StudentEntity, StudentStatus, GenderType, ClassEntity } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const students = ref<StudentEntity[]>([])
  const classes = ref<ClassEntity[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterClass = ref<string>('')
  const filterStatus = ref<string>('')

  const classMap = ref<Map<string, string>>(new Map())

  const stats = ref({
    total: 0,
    active: 0,
    mutation: 0,
    graduated: 0,
    inactive: 0,
    male: 0,
    female: 0
  })

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const statusModalVisible = ref(false)
  const selectedStudent = ref<StudentEntity | null>(null)
  const newStatus = ref<StudentStatus>('ACTIVE')

  const form = ref({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L' as GenderType,
    classId: '',
    birthPlace: '',
    birthDate: '',
    parentPhone: ''
  })

  const formRules: FormRules = {
    nis: [{ required: true, message: 'NIS siswa wajib diisi', trigger: 'blur' }],
    name: [{ required: true, message: 'Nama siswa wajib diisi', trigger: 'blur' }],
    classId: [{ required: true, message: 'Kelas rombel wajib dipilih', trigger: 'change' }]
  }

  const filteredStudents = computed(() => {
    let result = students.value

    if (filterClass.value) {
      result = result.filter((s) => s.classId === filterClass.value)
    }

    if (filterStatus.value) {
      result = result.filter((s) => s.status === filterStatus.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.toLowerCase().includes(q))
      )
    }

    return result
  })

  function getClassName(id: string): string {
    return classMap.value.get(id) || 'Kelas'
  }

  async function loadData() {
    loading.value = true
    try {
      const [stdList, clsList, statData] = await Promise.all([
        studentService.getAllStudents(),
        classService.getAllClasses(),
        studentService.getStudentStats()
      ])

      students.value = stdList
      classes.value = clsList
      stats.value = statData

      const cMap = new Map<string, string>()
      clsList.forEach((c) => cMap.set(c.id, c.name))
      classMap.value = cMap
    } catch {
      ElMessage.error('Gagal memuat data siswa.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    editingId.value = ''
    form.value = {
      nis: '',
      nisn: '',
      name: '',
      gender: 'L',
      classId: classes.value.length > 0 ? classes.value[0].id : '',
      birthPlace: '',
      birthDate: '',
      parentPhone: ''
    }
    modalVisible.value = true
  }

  function openEditModal(student: StudentEntity) {
    isEditing.value = true
    editingId.value = student.id
    form.value = {
      nis: student.nis,
      nisn: student.nisn || '',
      name: student.name,
      gender: student.gender || 'L',
      classId: student.classId,
      birthPlace: student.birthPlace || '',
      birthDate: student.birthDate || '',
      parentPhone: student.parentPhone || ''
    }
    modalVisible.value = true
  }

  function openStatusModal(student: StudentEntity) {
    selectedStudent.value = student
    newStatus.value = student.status || 'ACTIVE'
    statusModalVisible.value = true
  }

  async function handleSave() {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      saving.value = true
      try {
        if (isEditing.value) {
          await studentService.updateStudent(editingId.value, { ...form.value })
          ElMessage.success('Data siswa berhasil diperbarui.')
        } else {
          await studentService.createStudent({ ...form.value })
          ElMessage.success('Siswa baru berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan data siswa.')
      } finally {
        saving.value = false
      }
    })
  }

  async function handleUpdateStatus() {
    if (!selectedStudent.value) return
    saving.value = true
    try {
      await studentService.setStudentStatus(selectedStudent.value.id, newStatus.value)
      ElMessage.success('Status siswa berhasil diperbarui.')
      statusModalVisible.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengubah status siswa.')
    } finally {
      saving.value = false
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
