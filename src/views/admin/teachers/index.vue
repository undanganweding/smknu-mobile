<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Data Guru & Tenaga Pendidik
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master data guru dan staf pengajar SMK NU Ungaran tahun pelajaran 2026/2027.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-user-add-line mr-1"></i> Tambah Guru Baru
        </ElButton>
      </div>
    </div>

    <!-- Stats Cards using ArtStatsCard -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ArtStatsCard
        title="Total Guru"
        :count="stats.total"
        description="Terdaftar di Database"
        icon="ri:group-line"
        iconStyle="!bg-blue-500"
      />
      <ArtStatsCard
        title="Guru Aktif"
        :count="stats.active"
        description="Status Penugasan Aktif"
        icon="ri:user-follow-line"
        iconStyle="!bg-emerald-500"
      />
      <ArtStatsCard
        title="PNS / Yayasan"
        :count="stats.pns"
        description="Kepegawaian Tetap"
        icon="ri:award-line"
        iconStyle="!bg-indigo-500"
      />
      <ArtStatsCard
        title="Guru Nonaktif"
        :count="stats.inactive"
        description="Staf Mengajar Nonaktif"
        icon="ri:user-unfollow-line"
        iconStyle="!bg-gray-500"
      />
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-md w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari nama guru, NIP, atau jabatan..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterStatus" placeholder="Status" class="!w-36">
            <ElOption label="Semua Status" value="" />
            <ElOption label="Aktif" value="ACTIVE" />
            <ElOption label="Nonaktif" value="INACTIVE" />
          </ElSelect>
        </div>
        <div class="text-xs text-gray-500">
          Menampilkan:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredTeachers.length
          }}</span>
          dari {{ teachers.length }} guru
        </div>
      </div>

      <ElTable :data="filteredTeachers" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="name" label="Nama Guru & Gelar" min-width="220">
          <template #default="{ row }">
            <div>
              <div class="font-semibold text-gray-900 dark:text-gray-100">{{ row.name }}</div>
              <div class="text-xs text-gray-400">
                {{ row.gender === 'L' ? 'Laki-laki' : 'Perempuan' }} &bull;
                {{ row.education || 'S1' }}
              </div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn label="NIP / NUPTK" min-width="170">
          <template #default="{ row }">
            <div class="text-xs space-y-0.5">
              <div><span class="text-gray-400">NIP:</span> {{ row.nip || '-' }}</div>
              <div><span class="text-gray-400">NUPTK:</span> {{ row.nuptk || '-' }}</div>
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="position" label="Jabatan & Tugas" min-width="180">
          <template #default="{ row }">
            <span class="text-sm text-gray-700 dark:text-gray-300">{{
              row.position || 'Guru Mata Pelajaran'
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="employmentStatus" label="Status Kepegawaian" width="160">
          <template #default="{ row }">
            <ElTag size="small" :type="row.employmentStatus === 'PNS' ? 'primary' : 'info'">
              {{ row.employmentStatus || 'GTT/PTY' }}
            </ElTag>
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

    <!-- Create / Edit Teacher Modal -->
    <ElDialog
      v-model="modalVisible"
      :title="isEditing ? 'Edit Data Guru' : 'Tambah Guru Baru'"
      width="640px"
      destroy-on-close
    >
      <ElForm
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
        class="grid grid-cols-1 md:grid-cols-2 gap-x-4"
      >
        <ElFormItem label="Nama Lengkap & Gelar" prop="name" class="md:col-span-2">
          <ElInput v-model="form.name" placeholder="Contoh: Drs. H. Ahmad Hanik, M.Pd." />
        </ElFormItem>

        <ElFormItem label="NIP" prop="nip">
          <ElInput v-model="form.nip" placeholder="NIP (isi - jika belum ada)" />
        </ElFormItem>

        <ElFormItem label="NUPTK" prop="nuptk">
          <ElInput v-model="form.nuptk" placeholder="NUPTK (isi - jika belum ada)" />
        </ElFormItem>

        <ElFormItem label="Jenis Kelamin" prop="gender">
          <ElSelect v-model="form.gender" class="w-full">
            <ElOption label="Laki-laki (L)" value="L" />
            <ElOption label="Perempuan (P)" value="P" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Pendidikan Terakhir" prop="education">
          <ElSelect v-model="form.education" class="w-full">
            <ElOption label="D3" value="D3" />
            <ElOption label="S1 / D4" value="S1" />
            <ElOption label="S2" value="S2" />
            <ElOption label="S3" value="S3" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Jabatan / Tugas Tambahan" prop="position" class="md:col-span-2">
          <ElInput
            v-model="form.position"
            placeholder="Contoh: Kepala Sekolah, WKS 1 Kurikulum, Guru Mapel"
          />
        </ElFormItem>

        <ElFormItem label="Status Kepegawaian" prop="employmentStatus">
          <ElSelect v-model="form.employmentStatus" class="w-full">
            <ElOption label="GTT / PTY" value="GTT/PTY" />
            <ElOption label="Guru Tetap Yayasan" value="GTY" />
            <ElOption label="PNS DPK / PPPK" value="PNS" />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="Nomor Telepon / WhatsApp" prop="phone">
          <ElInput v-model="form.phone" placeholder="08xxxxxxxxxx" />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Guru' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import ArtStatsCard from '@/components/core/cards/art-stats-card/index.vue'
  import { teacherService } from '@/core/services/master/TeacherService'
  import type { TeacherEntity, GenderType } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const teachers = ref<TeacherEntity[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterStatus = ref<string>('')

  const stats = ref({
    total: 0,
    active: 0,
    inactive: 0,
    pns: 0,
    nonPns: 0
  })

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const form = ref({
    name: '',
    nip: '-',
    nuptk: '-',
    gender: 'L' as GenderType,
    education: 'S1',
    position: 'Guru Mata Pelajaran',
    employmentStatus: 'GTT/PTY',
    phone: ''
  })

  const formRules: FormRules = {
    name: [{ required: true, message: 'Nama guru wajib diisi', trigger: 'blur' }]
  }

  const filteredTeachers = computed(() => {
    let result = teachers.value

    if (filterStatus.value) {
      result = result.filter((t) => t.status === filterStatus.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.nip && t.nip.toLowerCase().includes(q)) ||
          (t.position && t.position.toLowerCase().includes(q))
      )
    }

    return result
  })

  async function loadData() {
    loading.value = true
    try {
      teachers.value = await teacherService.getAllTeachers()
      stats.value = await teacherService.getTeacherStats()
    } catch {
      ElMessage.error('Gagal memuat data guru.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    editingId.value = ''
    form.value = {
      name: '',
      nip: '-',
      nuptk: '-',
      gender: 'L',
      education: 'S1',
      position: 'Guru Mata Pelajaran',
      employmentStatus: 'GTT/PTY',
      phone: ''
    }
    modalVisible.value = true
  }

  function openEditModal(teacher: TeacherEntity) {
    isEditing.value = true
    editingId.value = teacher.id
    form.value = {
      name: teacher.name,
      nip: teacher.nip || '-',
      nuptk: teacher.nuptk || '-',
      gender: teacher.gender || 'L',
      education: teacher.education || 'S1',
      position: teacher.position || 'Guru Mata Pelajaran',
      employmentStatus: teacher.employmentStatus || 'GTT/PTY',
      phone: teacher.phone || ''
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
          await teacherService.updateTeacher(editingId.value, { ...form.value })
          ElMessage.success('Data guru berhasil diperbarui.')
        } else {
          await teacherService.createTeacher({ ...form.value })
          ElMessage.success('Guru baru berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan data guru.')
      } finally {
        saving.value = false
      }
    })
  }

  async function toggleStatus(teacher: TeacherEntity) {
    const action = teacher.status === 'ACTIVE' ? 'menonaktifkan' : 'mengaktifkan'
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin ${action} guru "${teacher.name}"? Data historis pengajaran akan tetap tersimpan secara aman.`,
        'Konfirmasi Status Guru',
        {
          confirmButtonText: 'Ya, Lanjutkan',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await teacherService.toggleTeacherStatus(teacher.id)
      ElMessage.success(`Guru berhasil di-${action}.`)
      await loadData()
    } catch {
      // User cancelled
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
