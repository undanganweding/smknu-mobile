<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Data Ruang & Fasilitas
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Master 55 ruang kelas teori, laboratorium komputer, bengkel kerja, dan sarana praktik SMK
          NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Tambah Ruang Baru
        </ElButton>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-md w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari kode atau nama ruang..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterType" placeholder="Tipe Ruang" class="!w-44">
            <ElOption label="Semua Tipe" value="" />
            <ElOption label="Kelas Teori" value="THEORY" />
            <ElOption label="Laboratorium" value="LAB" />
            <ElOption label="Bengkel Kerja" value="WORKSHOP" />
            <ElOption label="Lainnya" value="OTHER" />
          </ElSelect>
        </div>
        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-700 dark:text-gray-300">{{
            filteredRooms.length
          }}</span>
          ruangan
        </div>
      </div>

      <ElTable :data="filteredRooms" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="code" label="Kode Ruang" width="140">
          <template #default="{ row }">
            <span class="font-mono font-bold text-primary">{{ row.code }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="name" label="Nama Ruangan / Lab / Bengkel" min-width="260">
          <template #default="{ row }">
            <span class="font-semibold text-gray-900 dark:text-gray-100">{{ row.name }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="type" label="Tipe Fasilitas" width="160">
          <template #default="{ row }">
            <ElTag
              size="small"
              :type="
                row.type === 'LAB'
                  ? 'success'
                  : row.type === 'WORKSHOP'
                    ? 'warning'
                    : row.type === 'THEORY'
                      ? 'primary'
                      : 'info'
              "
            >
              {{
                row.type === 'THEORY'
                  ? 'Ruang Teori'
                  : row.type === 'LAB'
                    ? 'Laboratorium'
                    : row.type === 'WORKSHOP'
                      ? 'Bengkel Praktik'
                      : 'Fasilitas Lain'
              }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="capacity" label="Kapasitas" width="120" align="center">
          <template #default="{ row }">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ row.capacity || 36 }} Siswa
            </span>
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
      :title="isEditing ? 'Edit Data Ruang' : 'Tambah Ruang Baru'"
      width="500px"
      destroy-on-close
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-position="top">
        <ElFormItem label="Kode Ruang" prop="code">
          <ElInput
            v-model.trim="form.code"
            placeholder="Contoh: R-01, LAB-KOMP-1, BKL-TO"
            :disabled="isEditing"
          />
        </ElFormItem>

        <ElFormItem label="Nama Ruangan" prop="name">
          <ElInput v-model="form.name" placeholder="Masukkan nama ruangan lengkap" />
        </ElFormItem>

        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Tipe Ruang" prop="type">
            <ElSelect v-model="form.type" class="w-full">
              <ElOption label="Kelas Teori" value="THEORY" />
              <ElOption label="Laboratorium" value="LAB" />
              <ElOption label="Bengkel Kerja" value="WORKSHOP" />
              <ElOption label="Lainnya" value="OTHER" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="Kapasitas Siswa" prop="capacity">
            <ElInputNumber v-model="form.capacity" :min="1" :max="100" class="!w-full" />
          </ElFormItem>
        </div>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Simpan Perubahan' : 'Tambah Ruang' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { roomService } from '@/core/services/master/RoomService'
  import type { RoomEntity, RoomType } from '@/core/types'
  import type { FormInstance, FormRules } from 'element-plus'

  const rooms = ref<RoomEntity[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const searchQuery = ref('')
  const filterType = ref<string>('')

  const modalVisible = ref(false)
  const isEditing = ref(false)
  const editingId = ref('')
  const formRef = ref<FormInstance>()

  const form = ref({
    code: '',
    name: '',
    type: 'THEORY' as RoomType,
    capacity: 36
  })

  const formRules: FormRules = {
    code: [{ required: true, message: 'Kode ruang wajib diisi', trigger: 'blur' }],
    name: [{ required: true, message: 'Nama ruang wajib diisi', trigger: 'blur' }]
  }

  const filteredRooms = computed(() => {
    let result = rooms.value

    if (filterType.value) {
      result = result.filter((r) => r.type === filterType.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      result = result.filter(
        (r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      )
    }

    return result
  })

  async function loadData() {
    loading.value = true
    try {
      rooms.value = await roomService.getAllRooms()
    } catch {
      ElMessage.error('Gagal memuat data ruang.')
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
      type: 'THEORY',
      capacity: 36
    }
    modalVisible.value = true
  }

  function openEditModal(room: RoomEntity) {
    isEditing.value = true
    editingId.value = room.id
    form.value = {
      code: room.code,
      name: room.name,
      type: room.type || 'THEORY',
      capacity: room.capacity || 36
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
          await roomService.updateRoom(editingId.value, { ...form.value })
          ElMessage.success('Data ruang berhasil diperbarui.')
        } else {
          await roomService.createRoom({ ...form.value })
          ElMessage.success('Ruang baru berhasil ditambahkan.')
        }
        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan data ruang.')
      } finally {
        saving.value = false
      }
    })
  }

  async function toggleStatus(room: RoomEntity) {
    const action = room.status === 'ACTIVE' ? 'menonaktifkan' : 'mengaktifkan'
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin ${action} ruangan "${room.name}"?`,
        'Konfirmasi Status Ruang',
        {
          confirmButtonText: 'Ya, Lanjutkan',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await roomService.toggleRoomStatus(room.id)
      ElMessage.success(`Ruangan berhasil di-${action}.`)
      await loadData()
    } catch {
      // User cancelled
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
