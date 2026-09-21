<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pengaturan Akademik & Sekolah
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Konfigurasi identitas resmi sekolah, pejabat penandatangan, dan tahun pelajaran aktif.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <ElButton type="primary" :loading="savingIdentity" @click="handleSaveIdentity">
          <i class="ri-save-line mr-1"></i> Simpan Identitas Sekolah
        </ElButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- School Identity Form -->
      <div class="lg:col-span-2 art-card p-6 space-y-4">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">
            Identitas Resmi Satuan Pendidikan
          </h2>
          <p class="text-xs text-gray-500">
            Data ini digunakan sebagai header kop surat resmi dan dokumen cetak kurikulum.
          </p>
        </div>

        <ElForm
          ref="identityFormRef"
          :model="identityForm"
          label-position="top"
          class="grid grid-cols-1 md:grid-cols-2 gap-x-4"
        >
          <ElFormItem label="Nama Satuan Pendidikan" prop="name" class="md:col-span-2">
            <ElInput v-model="identityForm.name" />
          </ElFormItem>

          <ElFormItem label="Nomor Pokok Sekolah Nasional (NPSN)" prop="npsn">
            <ElInput v-model="identityForm.npsn" />
          </ElFormItem>

          <ElFormItem label="Kontak / No. Telepon" prop="contact">
            <ElInput v-model="identityForm.contact" />
          </ElFormItem>

          <ElFormItem label="Alamat Lengkap Sekolah" prop="address" class="md:col-span-2">
            <ElInput v-model="identityForm.address" />
          </ElFormItem>

          <ElFormItem label="Nama Kepala Sekolah" prop="principalName">
            <ElInput v-model="identityForm.principalName" />
          </ElFormItem>

          <ElFormItem label="NIP Kepala Sekolah" prop="principalNip">
            <ElInput v-model="identityForm.principalNip" />
          </ElFormItem>

          <ElFormItem label="Nama WKS 1 (Bidang Kurikulum)" prop="wks1Name">
            <ElInput v-model="identityForm.wks1Name" />
          </ElFormItem>

          <ElFormItem label="NIP WKS 1 Kurikulum" prop="wks1Nip">
            <ElInput v-model="identityForm.wks1Nip" />
          </ElFormItem>

          <ElFormItem label="Kode Dokumen Standar ISO" prop="isoDocCode" class="md:col-span-2">
            <ElInput v-model="identityForm.isoDocCode" />
          </ElFormItem>
        </ElForm>
      </div>

      <!-- Academic Years List -->
      <div class="art-card p-6 space-y-4">
        <div
          class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3"
        >
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Tahun Pelajaran</h2>
            <p class="text-xs text-gray-500">Pilih tahun ajaran aktif.</p>
          </div>
          <ElButton size="small" type="primary" @click="openCreateYearModal"> + Tambah </ElButton>
        </div>

        <div class="space-y-3">
          <div
            v-for="ay in academicYears"
            :key="ay.id"
            class="p-4 rounded-lg border transition-all flex items-center justify-between"
            :class="
              ay.isActive
                ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                : 'border-gray-100 dark:border-gray-800'
            "
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-gray-100">{{ ay.name }}</span>
                <ElTag size="small" :type="ay.semester === 'GANJIL' ? 'primary' : 'warning'">
                  {{ ay.semester }}
                </ElTag>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                {{ ay.startDate }} s/d {{ ay.endDate }}
              </div>
            </div>

            <div>
              <ElTag v-if="ay.isActive" type="success" size="small">Aktif</ElTag>
              <ElButton v-else size="small" type="primary" link @click="handleSetActiveYear(ay.id)">
                Aktifkan
              </ElButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Academic Year Modal -->
    <ElDialog
      v-model="yearModalVisible"
      title="Tambah Tahun Pelajaran Baru"
      width="480px"
      destroy-on-close
    >
      <ElForm ref="yearFormRef" :model="yearForm" label-position="top">
        <ElFormItem label="Tahun Pelajaran" prop="name">
          <ElInput v-model="yearForm.name" placeholder="Contoh: 2026/2027" />
        </ElFormItem>

        <ElFormItem label="Semester" prop="semester">
          <ElSelect v-model="yearForm.semester" class="w-full">
            <ElOption label="Semester Ganjil" value="GANJIL" />
            <ElOption label="Semester Genap" value="GENAP" />
          </ElSelect>
        </ElFormItem>

        <div class="grid grid-cols-2 gap-4">
          <ElFormItem label="Tanggal Mulai" prop="startDate">
            <ElDatePicker
              v-model="yearForm.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
          <ElFormItem label="Tanggal Selesai" prop="endDate">
            <ElDatePicker
              v-model="yearForm.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>
        </div>

        <ElFormItem>
          <ElCheckbox v-model="yearForm.isActive">
            Jadikan sebagai tahun pelajaran aktif sekarang
          </ElCheckbox>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="yearModalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="savingYear" @click="handleSaveYear">
            Tambah Tahun
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { academicService } from '@/core/services/master/AcademicService'
  import type { AcademicYearEntity, SemesterType } from '@/core/types'
  import type { FormInstance } from 'element-plus'

  const identityForm = ref({
    name: 'SMK NU UNGARAN',
    npsn: '20320256',
    address: 'Jalan Kaligarang No. 9 Ungaran',
    contact: 'Telp./Fax. (024) 6924034-6922708',
    principalName: 'Dr. H. Ahmad Hanik, M.Pd.',
    principalNip: '-',
    wks1Name: 'Budi Setiarjo, S.Pd.',
    wks1Nip: '-',
    isoDocCode: 'FM.02.03.76.KUR.01.05'
  })

  const academicYears = ref<AcademicYearEntity[]>([])
  const savingIdentity = ref(false)
  const savingYear = ref(false)
  const identityFormRef = ref<FormInstance>()

  const yearModalVisible = ref(false)
  const yearFormRef = ref<FormInstance>()
  const yearForm = ref({
    name: '2026/2027',
    semester: 'GANJIL' as SemesterType,
    startDate: '2026-07-13',
    endDate: '2026-12-19',
    isActive: false
  })

  async function loadData() {
    try {
      const [identity, years] = await Promise.all([
        academicService.getSchoolIdentity(),
        academicService.getAllAcademicYears()
      ])

      if (identity) {
        identityForm.value = {
          name: identity.name,
          npsn: identity.npsn,
          address: identity.address,
          contact: identity.contact,
          principalName: identity.principalName,
          principalNip: identity.principalNip || '-',
          wks1Name: identity.wks1Name,
          wks1Nip: identity.wks1Nip || '-',
          isoDocCode: identity.isoDocCode || 'FM.02.03.76.KUR.01.05'
        }
      }

      academicYears.value = years
    } catch {
      ElMessage.error('Gagal memuat pengaturan akademik.')
    }
  }

  async function handleSaveIdentity() {
    savingIdentity.value = true
    try {
      await academicService.updateSchoolIdentity({ ...identityForm.value })
      ElMessage.success('Identitas resmi sekolah berhasil diperbarui.')
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan identitas sekolah.')
    } finally {
      savingIdentity.value = false
    }
  }

  async function handleSetActiveYear(id: string) {
    try {
      await academicService.setActiveAcademicYear(id)
      ElMessage.success('Tahun pelajaran aktif berhasil diubah.')
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengubah tahun pelajaran.')
    }
  }

  function openCreateYearModal() {
    yearForm.value = {
      name: '2027/2028',
      semester: 'GANJIL',
      startDate: '2027-07-12',
      endDate: '2027-12-18',
      isActive: false
    }
    yearModalVisible.value = true
  }

  async function handleSaveYear() {
    savingYear.value = true
    try {
      await academicService.createAcademicYear({ ...yearForm.value })
      ElMessage.success('Tahun pelajaran baru berhasil ditambahkan.')
      yearModalVisible.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menambahkan tahun pelajaran.')
    } finally {
      savingYear.value = false
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
