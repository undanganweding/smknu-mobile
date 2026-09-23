<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Agenda & Kalender Sekolah
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kelola agenda akademik, rapat, libur, dan jadwal kegiatan resmi SMK NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Tambah Agenda
        </ElButton>
      </div>
    </div>

    <!-- Filters & Main Table -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-xl w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari judul atau lokasi kegiatan..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterCategory" placeholder="Kategori" class="!w-44">
            <ElOption label="Semua Kategori" value="" />
            <ElOption label="Akademik" value="AKADEMIK" />
            <ElOption label="Ujian" value="UJIAN" />
            <ElOption label="Libur" value="LIBUR" />
            <ElOption label="Rapat" value="RAPAT" />
            <ElOption label="Kegiatan" value="KEGIATAN" />
          </ElSelect>
        </div>

        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{
            filteredAgendas.length
          }}</span>
          agenda
        </div>
      </div>

      <ElTable :data="filteredAgendas" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="title" label="Nama Kegiatan / Agenda" min-width="240">
          <template #default="{ row }">
            <div class="font-semibold text-gray-900 dark:text-gray-100">{{ row.title }}</div>
            <div v-if="row.description" class="text-xs text-gray-400 line-clamp-1">{{
              row.description
            }}</div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="category" label="Kategori" width="130">
          <template #default="{ row }">
            <ElTag
              size="small"
              :type="
                row.category === 'AKADEMIK'
                  ? 'primary'
                  : row.category === 'UJIAN'
                    ? 'danger'
                    : row.category === 'LIBUR'
                      ? 'warning'
                      : row.category === 'RAPAT'
                        ? 'info'
                        : 'success'
              "
            >
              {{ row.category }}
            </ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Rentang Waktu" min-width="190">
          <template #default="{ row }">
            <div class="text-xs font-mono text-gray-700 dark:text-gray-300">
              <i class="ri-calendar-line mr-1 text-primary"></i>
              {{ row.startDate }} {{ row.startDate !== row.endDate ? 's/d ' + row.endDate : '' }}
            </div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="location" label="Lokasi" min-width="150">
          <template #default="{ row }">
            <span class="text-xs text-gray-600 dark:text-gray-300">
              <i class="ri-map-pin-line mr-1 text-rose-500"></i
              >{{ row.location || 'SMK NU Ungaran' }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="targetRole" label="Sasaran" width="110">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ row.targetRole }}</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="130" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <ElButton size="small" type="primary" link @click="openEditModal(row as any)">
                <i class="ri-edit-line"></i>
              </ElButton>
              <ElButton size="small" type="danger" link @click="handleDelete(row as any)">
                <i class="ri-delete-bin-line"></i>
              </ElButton>
            </div>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- Modal Form Agenda -->
    <ElDialog
      v-model="modalVisible"
      :title="isEdit ? 'Edit Agenda Sekolah' : 'Tambah Agenda Sekolah'"
      width="550px"
      destroy-on-close
    >
      <ElForm :model="form" label-position="top">
        <ElFormItem label="Nama Kegiatan / Judul Agenda" required>
          <ElInput v-model="form.title" placeholder="Misal: Penilaian Akhir Semester Ganjil" />
        </ElFormItem>
        <ElFormItem label="Deskripsi Kegiatan">
          <ElInput
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="Keterangan singkat pelaksanaan kegiatan..."
          />
        </ElFormItem>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Tanggal Mulai" required>
            <ElDatePicker
              v-model="form.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="Tanggal Selesai" required>
            <ElDatePicker
              v-model="form.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Kategori" required>
            <ElSelect v-model="form.category" class="w-full">
              <ElOption label="Akademik" value="AKADEMIK" />
              <ElOption label="Ujian" value="UJIAN" />
              <ElOption label="Libur" value="LIBUR" />
              <ElOption label="Rapat" value="RAPAT" />
              <ElOption label="Kegiatan" value="KEGIATAN" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Sasaran Peserta" required>
            <ElSelect v-model="form.targetRole" class="w-full">
              <ElOption label="Semua (ALL)" value="ALL" />
              <ElOption label="Hanya Guru" value="GURU" />
              <ElOption label="Hanya Admin" value="ADMIN" />
            </ElSelect>
          </ElFormItem>
        </div>
        <ElFormItem label="Lokasi">
          <ElInput v-model="form.location" placeholder="Aula SMK NU Ungaran / Ruang Rapat" />
        </ElFormItem>
        <ElFormItem>
          <ElCheckbox v-model="form.isMandatory">Wajib Dihadiri / Diikuti</ElCheckbox>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="modalVisible = false">Batal</ElButton>
        <ElButton type="primary" :loading="saving" @click="handleSave">Simpan</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { schoolAgendaService } from '@/core/services'
  import type { SchoolAgendaEntity } from '@/core/types'

  const loading = ref(false)
  const saving = ref(false)
  const agendas = ref<SchoolAgendaEntity[]>([])
  const searchQuery = ref('')
  const filterCategory = ref('')

  const modalVisible = ref(false)
  const isEdit = ref(false)
  const selectedId = ref('')

  const form = ref({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: 'SMK NU Ungaran',
    category: 'AKADEMIK' as const,
    targetRole: 'ALL' as const,
    isMandatory: true
  })

  const filteredAgendas = computed(() => {
    return agendas.value.filter((a) => {
      const matchCat = !filterCategory.value || a.category === filterCategory.value
      const matchSearch =
        !searchQuery.value ||
        a.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (a.location && a.location.toLowerCase().includes(searchQuery.value.toLowerCase()))
      return matchCat && matchSearch
    })
  })

  async function loadData() {
    loading.value = true
    try {
      agendas.value = await schoolAgendaService.getAllAgendas()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat agenda sekolah.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEdit.value = false
    selectedId.value = ''
    form.value = {
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      location: 'SMK NU Ungaran',
      category: 'AKADEMIK',
      targetRole: 'ALL',
      isMandatory: true
    }
    modalVisible.value = true
  }

  function openEditModal(row: SchoolAgendaEntity) {
    isEdit.value = true
    selectedId.value = row.id
    form.value = {
      title: row.title,
      description: row.description || '',
      startDate: row.startDate,
      endDate: row.endDate,
      location: row.location || 'SMK NU Ungaran',
      category: row.category as any,
      targetRole: row.targetRole as any,
      isMandatory: row.isMandatory
    }
    modalVisible.value = true
  }

  async function handleSave() {
    if (!form.value.title || !form.value.startDate || !form.value.endDate) {
      ElMessage.warning('Judul dan rentang tanggal kegiatan wajib diisi.')
      return
    }

    saving.value = true
    try {
      if (isEdit.value && selectedId.value) {
        await schoolAgendaService.updateAgenda(selectedId.value, form.value)
        ElMessage.success('Agenda sekolah berhasil diperbarui.')
      } else {
        await schoolAgendaService.createAgenda(form.value)
        ElMessage.success('Agenda sekolah berhasil ditambahkan.')
      }
      modalVisible.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan agenda.')
    } finally {
      saving.value = false
    }
  }

  async function handleDelete(row: SchoolAgendaEntity) {
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin menghapus agenda "${row.title}"?`,
        'Konfirmasi Hapus',
        {
          confirmButtonText: 'Hapus',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await schoolAgendaService.deleteAgenda(row.id)
      ElMessage.success('Agenda berhasil dihapus.')
      await loadData()
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err.message || 'Gagal menghapus agenda.')
      }
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
