<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pengumuman & Siaran Informasi
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Kelola informasi resmi, edaran dinas, dan pengumuman internal SMK NU Ungaran.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Buat Pengumuman
        </ElButton>
      </div>
    </div>

    <!-- Main Table -->
    <div class="art-card p-6">
      <div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3 max-w-xl w-full">
          <ElInput
            v-model="searchQuery"
            placeholder="Cari judul atau isi pengumuman..."
            clearable
            prefix-icon="ri-search-line"
          />
          <ElSelect v-model="filterTarget" placeholder="Sasaran" class="!w-44">
            <ElOption label="Semua Sasaran" value="" />
            <ElOption label="Semua Pengguna" value="ALL" />
            <ElOption label="Hanya Guru" value="GURU" />
            <ElOption label="Hanya Admin" value="ADMIN" />
          </ElSelect>
        </div>

        <div class="text-xs text-gray-500">
          Total:
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{
            filteredAnnouncements.length
          }}</span>
          pengumuman
        </div>
      </div>

      <ElTable :data="filteredAnnouncements" v-loading="loading" stripe style="width: 100%">
        <ElTableColumn label="No" width="60" align="center">
          <template #default="{ $index }">
            <span class="text-xs text-gray-500">{{ $index + 1 }}</span>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="title" label="Judul Pengumuman" min-width="260">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <i
                v-if="row.isPinned"
                class="ri-pushpin-fill text-amber-500 text-sm"
                title="Disematkan (Pinned)"
              ></i>
              <span class="font-semibold text-gray-900 dark:text-gray-100">{{ row.title }}</span>
            </div>
            <div class="text-xs text-gray-400 line-clamp-1 mt-0.5">{{ row.content }}</div>
          </template>
        </ElTableColumn>

        <ElTableColumn prop="targetRole" label="Sasaran" width="130">
          <template #default="{ row }">
            <ElTag size="small" effect="plain">{{ row.targetRole || 'ALL' }}</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Tanggal Terbit" width="160">
          <template #default="{ row }">
            <span class="text-xs text-gray-500 font-mono">
              {{ row.publishedAt ? new Date(row.publishedAt).toLocaleDateString('id-ID') : '-' }}
            </span>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Status Publikasi" width="150" align="center">
          <template #default="{ row }">
            <ElTag v-if="row.isPublished" type="success" size="small">TERBIT</ElTag>
            <ElTag v-else type="info" size="small">DRAFT</ElTag>
          </template>
        </ElTableColumn>

        <ElTableColumn label="Aksi" width="160" align="center">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-2">
              <ElButton
                size="small"
                :type="row.isPinned ? 'warning' : 'info'"
                link
                @click="handleTogglePin(row as any)"
                :title="row.isPinned ? 'Lepas Sematan' : 'Sematkan Pengumuman'"
              >
                <i :class="row.isPinned ? 'ri-pushpin-fill text-amber-500' : 'ri-pushpin-line'"></i>
              </ElButton>
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

    <!-- Modal Form Pengumuman -->
    <ElDialog
      v-model="modalVisible"
      :title="isEdit ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'"
      width="600px"
      destroy-on-close
    >
      <ElForm :model="form" label-position="top">
        <ElFormItem label="Judul Pengumuman" required>
          <ElInput v-model="form.title" placeholder="Misal: Edaran Pelaksanaan Ujian Sekolah" />
        </ElFormItem>
        <ElFormItem label="Isi Pesan / Pengumuman" required>
          <ElInput
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="Tuliskan isi pengumuman secara rinci..."
          />
        </ElFormItem>
        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Sasaran Pengguna" required>
            <ElSelect v-model="form.targetRole" class="w-full">
              <ElOption label="Semua Pengguna" value="ALL" />
              <ElOption label="Hanya Guru" value="GURU" />
              <ElOption label="Hanya Admin" value="ADMIN" />
            </ElSelect>
          </ElFormItem>
          <ElFormItem label="Batas Tayang (Opsional)">
            <ElDatePicker
              v-model="form.expiresAt"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>
        <div class="flex items-center gap-6 pt-2">
          <ElCheckbox v-model="form.isPinned">Sematkan di bagian atas (Pinned)</ElCheckbox>
          <ElCheckbox v-model="form.isPublished">Langsung Terbitkan</ElCheckbox>
        </div>
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
  import { announcementService } from '@/core/services'
  import type { AnnouncementEntity } from '@/core/types'

  const loading = ref(false)
  const saving = ref(false)
  const announcements = ref<AnnouncementEntity[]>([])
  const searchQuery = ref('')
  const filterTarget = ref('')

  const modalVisible = ref(false)
  const isEdit = ref(false)
  const selectedId = ref('')

  const form = ref({
    title: '',
    content: '',
    targetRole: 'ALL' as const,
    isPinned: false,
    isPublished: true,
    expiresAt: ''
  })

  const filteredAnnouncements = computed(() => {
    return announcements.value.filter((a) => {
      const matchTarget = !filterTarget.value || a.targetRole === filterTarget.value
      const matchSearch =
        !searchQuery.value ||
        a.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchTarget && matchSearch
    })
  })

  async function loadData() {
    loading.value = true
    try {
      announcements.value = await announcementService.getAllAnnouncements()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat pengumuman.')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEdit.value = false
    selectedId.value = ''
    form.value = {
      title: '',
      content: '',
      targetRole: 'ALL',
      isPinned: false,
      isPublished: true,
      expiresAt: ''
    }
    modalVisible.value = true
  }

  function openEditModal(row: AnnouncementEntity) {
    isEdit.value = true
    selectedId.value = row.id
    form.value = {
      title: row.title,
      content: row.content,
      targetRole: (row.targetRole as any) || 'ALL',
      isPinned: Boolean(row.pinned ?? row.isPinned),
      isPublished: Boolean(row.published ?? row.isPublished ?? true),
      expiresAt: row.expiresAt || ''
    }
    modalVisible.value = true
  }

  async function handleSave() {
    if (!form.value.title || !form.value.content) {
      ElMessage.warning('Judul dan isi pengumuman wajib diisi.')
      return
    }

    saving.value = true
    try {
      if (isEdit.value && selectedId.value) {
        await announcementService.updateAnnouncement(selectedId.value, {
          title: form.value.title,
          content: form.value.content,
          targetRole: form.value.targetRole as any,
          isPinned: form.value.isPinned,
          isPublished: form.value.isPublished,
          expiresAt: form.value.expiresAt || undefined
        })
        ElMessage.success('Pengumuman berhasil diperbarui.')
      } else {
        await announcementService.createAnnouncement({
          title: form.value.title,
          content: form.value.content,
          authorId: 'admin',
          targetRole: form.value.targetRole as any,
          isPinned: form.value.isPinned,
          isPublished: form.value.isPublished,
          expiresAt: form.value.expiresAt || undefined
        })
        ElMessage.success('Pengumuman berhasil diterbitkan.')
      }
      modalVisible.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan pengumuman.')
    } finally {
      saving.value = false
    }
  }

  async function handleTogglePin(row: AnnouncementEntity) {
    try {
      await announcementService.togglePin(row.id)
      ElMessage.success(row.isPinned ? 'Sematan pengumuman dilepas.' : 'Pengumuman disematkan.')
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memperbarui sematan.')
    }
  }

  async function handleDelete(row: AnnouncementEntity) {
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin menghapus pengumuman "${row.title}"?`,
        'Konfirmasi Hapus',
        {
          confirmButtonText: 'Hapus',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      await announcementService.deleteAnnouncement(row.id)
      ElMessage.success('Pengumuman berhasil dihapus.')
      await loadData()
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err.message || 'Gagal menghapus pengumuman.')
      }
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
