<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Data Mata Pelajaran (Mapel)
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kelola master kurikulum dan mata pelajaran SMK NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Tambah Mata Pelajaran
        </ElButton>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-md w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari kode atau nama mata pelajaran..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterCategory" placeholder="Kategori" class="!w-44">
            <ElOption label="Semua Kategori" value="" />
            <ElOption label="Umum" value="UMUM" />
            <ElOption label="Kejuruan" value="KEJURUAN" />
            <ElOption label="Muatan Lokal" value="MUATAN_LOKAL" />
            <ElOption label="Pilihan" value="PILIHAN" />
          </ElSelect>
        </div>
        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredSubjects.length
          }}</span>
          mata pelajaran
        </div>
      </div>

      <ElTable :data="filteredSubjects" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="code" label="Kode Mapel" width="140">
          <template #default="{ row }">
            <span class="font-mono font-bold text-primary">{{ row.code }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="name" label="Nama Mata Pelajaran" min-width="260">
          <template #default="{ row }">
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{ row.name }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="category" label="Kategori" width="160">
          <template #default="{ row }">
            <ElTag
              size="small"
              :type="
                row.category === 'KEJURUAN'
                  ? 'success'
                  : row.category === 'UMUM'
                    ? 'primary'
                    : 'warning'
              "
            >
              {{
                row.category === 'KEJURUAN'
                  ? 'Kejuruan'
                  : row.category === 'UMUM'
                    ? 'Umum'
                    : row.category === 'MUATAN_LOKAL'
                      ? 'Muatan Lokal'
                      : 'Pilihan'
              }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="defaultKkm" label="Standar KKM" width="120" align="center">
          <template #default="{ row }">
            <span class="font-semibold text-gray-700 dark:text-gray-300">{{
              row.defaultKkm || 75
            }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="status" label="Status" width="110">
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
      :title="isEditing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'"
      width="500px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-position="top">
        <ElFormItem label="Kode Mapel" prop="code">
          <ElInput
            v-model.trim="form.code"
            placeholder="Contoh: MP-01, PPLG-01"
            :disabled="isEditing"
          />
        </ElFormItem>

        <ElFormItem label="Nama Mata Pelajaran" prop="name">
          <ElInput v-model="form.name" placeholder="Masukkan nama mata pelajaran lengkap" />
        </ElFormItem>

        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Kategori" prop="category">
            <ElSelect v-model="form.category" class="w-full">
              <ElOption label="Kejuruan" value="KEJURUAN" />
              <ElOption label="Umum" value="UMUM" />
              <ElOption label="Muatan Lokal" value="MUATAN_LOKAL" />
              <ElOption label="Pilihan" value="PILIHAN" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="Standar KKM" prop="defaultKkm">
            <ElInputNumber v-model="form.defaultKkm" :min="50" :max="100" class="!w-full" />
          </ElFormItem>
        </div>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Mapel' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { subjectService } from '@/core/services/master/SubjectService'
  import type { SubjectEntity, SubjectCategory } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const subjects = ref<SubjectEntity[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterCategory = ref<string>('')

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const form = ref({
    code: '',
    name: '',
    category: 'KEJURUAN' as SubjectCategory,
    defaultKkm: 75
  })

  const formRules: FormRules = {
    code: [{ required: true, message: 'Kode mata pelajaran wajib diisi', trigger: 'blur' }],
    name: [{ required: true, message: 'Nama mata pelajaran wajib diisi', trigger: 'blur' }]
  }

  const filteredSubjects = computed(() => {
    let result = subjects.value

    if (filterCategory.value) {
      result = result.filter((s) => s.category === filterCategory.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      )
    }

    return result
  })

  async function loadData() {
    loading.value = true
    try {
      subjects.value = await subjectService.getAllSubjects()
    } catch {
      ElMessage.error('Gagal memuat data mata pelajaran.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    editingId.value = ''
    form.value = {
      code: '',
      name: '',
      category: 'KEJURUAN',
      defaultKkm: 75
    }
    modalVisible.value = true
  }

  function openEditModal(subject: SubjectEntity) {
    isEditing.value = true
    editingId.value = subject.id
    form.value = {
      code: subject.code,
      name: subject.name,
      category: subject.category || 'KEJURUAN',
      defaultKkm: subject.defaultKkm || 75
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
          await subjectService.updateSubject(editingId.value, { ...form.value })
          ElMessage.success('Mata pelajaran berhasil diperbarui.')
        } else {
          await subjectService.createSubject({ ...form.value })
          ElMessage.success('Mata pelajaran berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan mata pelajaran.')
      } finally {
        saving.value = false
      }
    })
  }

  async function toggleStatus(subject: SubjectEntity) {
    const action = subject.status === 'ACTIVE' ? 'menonaktifkan' : 'mengaktifkan'
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin ${action} mata pelajaran "${subject.name}"?`,
        'Konfirmasi Status Mapel',
        {
          confirmButtonText: 'Ya, Lanjutkan',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await subjectService.toggleSubjectStatus(subject.id)
      ElMessage.success(`Mata pelajaran berhasil di-${action}.`)
      await loadData()
    } catch {
      // User cancelled
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
