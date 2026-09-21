<template>
  <div class="p-5 space-y-5">
    <!-- Header -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i class="ri-database-2-line text-emerald-600 text-2xl"></i>
          Manajemen Data Onboarding & Administrasi Massal
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Import file Excel/CSV, ekspor data master, eksekusi pemindahan siswa massal, dan kelola
          status entitas secara aman.
        </p>
      </div>
    </div>

    <!-- Main Tab Navigation -->
    <ElTabs v-model="activeTab" type="border-card" class="art-card">
      <!-- TAB 1: IMPORT DATA -->
      <ElTabPane name="import">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-upload-cloud-line text-lg"></i> Import Data Master
          </span>
        </template>

        <div class="space-y-6">
          <!-- Step 1: Configuration & Upload -->
          <ElCard shadow="never" class="!border-slate-200">
            <template #header>
              <div class="font-semibold text-slate-800 flex items-center gap-2">
                <i class="ri-settings-4-line text-emerald-600"></i> Konfigurasi & Upload File Import
              </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Jenis Data Master</label
                >
                <ElSelect v-model="selectedEntityType" class="w-full" @change="resetPreview">
                  <ElOption label="Guru & Tenaga Pendidik" value="TEACHER" />
                  <ElOption label="Siswa & Peserta Didik" value="STUDENT" />
                  <ElOption label="Rombongan Belajar (Kelas)" value="CLASS" />
                  <ElOption label="Mata Pelajaran" value="SUBJECT" />
                  <ElOption label="Ruangan Pembelajaran" value="ROOM" />
                  <ElOption label="SK Penugasan Guru" value="ASSIGNMENT" />
                  <ElOption label="Jadwal Pelajaran" value="SCHEDULE" />
                </ElSelect>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Mode Validasi Commit</label
                >
                <ElSelect v-model="commitMode" class="w-full">
                  <ElOption label="STRICT (Tolak semua jika ada error)" value="STRICT" />
                  <ElOption
                    label="VALID_ROWS_ONLY (Hanya baris valid yang disimpan)"
                    value="VALID_ROWS_ONLY"
                  />
                </ElSelect>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Penanganan Duplikasi</label
                >
                <ElSelect v-model="duplicateMode" class="w-full">
                  <ElOption label="CREATE_ONLY (Tolak/lewati data duplikat)" value="CREATE_ONLY" />
                  <ElOption label="UPSERT (Perbarui data existing yang cocok)" value="UPSERT" />
                </ElSelect>
              </div>
            </div>

            <!-- Download Official Templates -->
            <div
              class="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4"
            >
              <span class="text-xs text-slate-500">
                Gunakan template resmi untuk memastikan struktur kolom sesuai format sistem.
              </span>
              <div class="flex items-center gap-2">
                <ElButton size="small" type="primary" plain @click="downloadTemplate('CSV')">
                  <i class="ri-file-download-line mr-1"></i> Template CSV
                </ElButton>
                <ElButton size="small" type="success" plain @click="downloadTemplate('XLSX')">
                  <i class="ri-file-excel-line mr-1"></i> Template XLSX
                </ElButton>
              </div>
            </div>

            <!-- Upload Area -->
            <div class="mt-6">
              <ElUpload
                drag
                action=""
                :auto-upload="false"
                :show-file-list="false"
                accept=".csv, .xlsx, .xls"
                @change="handleFileUpload"
              >
                <i class="ri-upload-cloud-2-line text-4xl text-slate-400"></i>
                <div class="el-upload__text text-slate-600 mt-2">
                  Drop file excel / CSV di sini atau <em>klik untuk memilih file</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip text-slate-400">
                    File didukung: .csv, .xlsx (Maksimal 10.000 baris per file)
                  </div>
                </template>
              </ElUpload>
            </div>
          </ElCard>

          <!-- Preview & Validation Results -->
          <div v-if="previewResult" class="space-y-6">
            <!-- Header Metrics -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div
                class="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs text-center"
              >
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >Total Baris Data</div
                >
                <div class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{{
                  previewResult.totalRows
                }}</div>
              </div>
              <div
                class="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs text-center"
              >
                <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                  >Valid</div
                >
                <div class="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{{
                  previewResult.validCount
                }}</div>
              </div>
              <div
                class="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-2xs text-center"
              >
                <div class="text-xs font-semibold text-amber-700 dark:text-amber-400"
                  >Peringatan</div
                >
                <div class="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">{{
                  previewResult.warningCount
                }}</div>
              </div>
              <div
                class="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-2xs text-center"
              >
                <div class="text-xs font-semibold text-blue-700 dark:text-blue-400"
                  >Duplikat (Existing)</div
                >
                <div class="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1">{{
                  previewResult.duplicateCount
                }}</div>
              </div>
              <div
                class="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-800 shadow-2xs text-center"
              >
                <div class="text-xs font-semibold text-rose-700 dark:text-rose-400"
                  >Error (Gagal)</div
                >
                <div class="text-2xl font-bold text-rose-800 dark:text-rose-300 mt-1">{{
                  previewResult.errorCount
                }}</div>
              </div>
            </div>

            <!-- Alerts for Unrecognized or Missing Required Headers -->
            <ElAlert
              v-if="previewResult.missingRequiredHeaders.length > 0"
              type="error"
              title="Kolom Wajib Hilang"
              :description="`File tidak memiliki kolom wajib: ${previewResult.missingRequiredHeaders.join(', ')}`"
              show-icon
              :closable="false"
            />

            <!-- Preview Data Table -->
            <ElCard shadow="never" class="!border-slate-200">
              <template #header>
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span class="font-semibold text-slate-800 flex items-center gap-2">
                    <i class="ri-table-line text-emerald-600"></i> Preview Baris Data ({{
                      previewFilteredRows.length
                    }}
                    Baris)
                  </span>

                  <div class="flex items-center gap-2">
                    <ElSelect v-model="previewFilterStatus" size="small" class="w-40">
                      <ElOption label="Semua Status" value="ALL" />
                      <ElOption label="Hanya Valid" value="VALID" />
                      <ElOption label="Hanya Peringatan" value="WARNING" />
                      <ElOption label="Hanya Duplikat" value="DUPLICATE" />
                      <ElOption label="Hanya Error" value="ERROR" />
                    </ElSelect>

                    <ElInput
                      v-model="previewSearchQuery"
                      size="small"
                      placeholder="Cari dalam preview..."
                      class="w-48"
                      clearable
                    />
                  </div>
                </div>
              </template>

              <ElTable :data="previewFilteredRows" border stripe class="w-full text-xs">
                <ElTableColumn prop="rowNumber" label="Baris" width="70" align="center" />

                <ElTableColumn label="Status Validasi" width="130" align="center">
                  <template #default="{ row }">
                    <ElTag v-if="row.status === 'VALID'" type="success" size="small">VALID</ElTag>
                    <ElTag v-else-if="row.status === 'WARNING'" type="warning" size="small"
                      >WARNING</ElTag
                    >
                    <ElTag v-else-if="row.status === 'DUPLICATE'" type="info" size="small"
                      >DUPLICATE</ElTag
                    >
                    <ElTag v-else type="danger" size="small">ERROR</ElTag>
                  </template>
                </ElTableColumn>

                <ElTableColumn label="Data Normalisasi" min-width="250">
                  <template #default="{ row }">
                    <div class="space-y-1">
                      <div v-for="(v, k) in row.normalizedData" :key="k" class="truncate">
                        <span class="font-semibold text-slate-600">{{ k }}:</span>
                        <span class="text-slate-800 ml-1">{{ v }}</span>
                      </div>
                    </div>
                  </template>
                </ElTableColumn>

                <ElTableColumn label="Pesan & Catatan Validasi" min-width="250">
                  <template #default="{ row }">
                    <div v-if="row.errors.length > 0" class="text-rose-600 space-y-1">
                      <div
                        v-for="(err, idx) in row.errors"
                        :key="idx"
                        class="flex items-center gap-1"
                      >
                        <i class="ri-error-warning-line"></i>
                        <span>[{{ err.field }}]: {{ err.message }}</span>
                      </div>
                    </div>
                    <div v-if="row.warnings.length > 0" class="text-amber-600 space-y-1 mt-1">
                      <div
                        v-for="(warn, idx) in row.warnings"
                        :key="idx"
                        class="flex items-center gap-1"
                      >
                        <i class="ri-alert-line"></i>
                        <span>[{{ warn.field }}]: {{ warn.message }}</span>
                      </div>
                    </div>
                    <div v-if="row.status === 'VALID'" class="text-emerald-600">
                      <i class="ri-checkbox-circle-line"></i> Siap di-import
                    </div>
                    <div v-if="row.status === 'DUPLICATE'" class="text-blue-600">
                      <i class="ri-information-line"></i> Cocok dengan data terdaftar (ID:
                      {{ row.existingEntityId }})
                    </div>
                  </template>
                </ElTableColumn>
              </ElTable>

              <!-- Commit Action Bar -->
              <div
                class="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4"
              >
                <div class="text-xs text-slate-500">
                  Pastikan baris data telah diperiksa secara seksama sebelum menekan tombol commit
                  import.
                </div>
                <div class="flex items-center gap-3">
                  <ElButton
                    v-if="previewResult.errorCount > 0"
                    type="danger"
                    plain
                    @click="downloadErrorReport"
                  >
                    <i class="ri-file-unknow-line mr-1"></i> Unduh Laporan Error (CSV)
                  </ElButton>

                  <ElButton
                    type="primary"
                    size="large"
                    :loading="isSubmittingImport"
                    :disabled="commitMode === 'STRICT' && previewResult.errorCount > 0"
                    @click="executeCommitImport"
                  >
                    <i class="ri-checkbox-circle-fill mr-1"></i> Konfirmasi & Simpan Import
                  </ElButton>
                </div>
              </div>
            </ElCard>
          </div>
        </div>
      </ElTabPane>

      <!-- TAB 2: EXPORT DATA -->
      <ElTabPane name="export">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-download-cloud-line text-lg"></i> Ekspor Data Master
          </span>
        </template>

        <div class="space-y-6">
          <ElCard shadow="never" class="!border-slate-200">
            <template #header>
              <div class="font-semibold text-slate-800 flex items-center gap-2">
                <i class="ri-file-download-line text-emerald-600"></i> Ekspor Data Master Sekolah
              </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Jenis Entitas Master</label
                >
                <ElSelect v-model="exportEntityType" class="w-full">
                  <ElOption label="Guru & Tenaga Pendidik" value="TEACHER" />
                  <ElOption label="Siswa & Peserta Didik" value="STUDENT" />
                  <ElOption label="Rombongan Belajar (Kelas)" value="CLASS" />
                  <ElOption label="Mata Pelajaran" value="SUBJECT" />
                  <ElOption label="Ruangan Pembelajaran" value="ROOM" />
                  <ElOption label="SK Penugasan Guru" value="ASSIGNMENT" />
                  <ElOption label="Jadwal Pelajaran" value="SCHEDULE" />
                </ElSelect>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Filter Rombel / Kelas (Opsional)</label
                >
                <ElSelect
                  v-model="exportFilter.classId"
                  class="w-full"
                  clearable
                  placeholder="Semua Rombel"
                >
                  <ElOption v-for="c in classesList" :key="c.id" :label="c.name" :value="c.id" />
                </ElSelect>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Filter Tahun Akademik (Opsional)</label
                >
                <ElSelect
                  v-model="exportFilter.academicYearId"
                  class="w-full"
                  clearable
                  placeholder="Semua Tahun Ajaran"
                >
                  <ElOption
                    v-for="ay in academicYearsList"
                    :key="ay.id"
                    :label="ay.name"
                    :value="ay.id"
                  />
                </ElSelect>
              </div>
            </div>

            <div class="mt-8 flex justify-end gap-3">
              <ElButton type="primary" plain size="large" @click="handleExportMaster('CSV')">
                <i class="ri-file-download-line mr-1"></i> Ekspor CSV
              </ElButton>
              <ElButton type="success" size="large" @click="handleExportMaster('XLSX')">
                <i class="ri-file-excel-line mr-1"></i> Ekspor XLSX
              </ElButton>
            </div>
          </ElCard>
        </div>
      </ElTabPane>

      <!-- TAB 3: BULK OPERATIONS -->
      <ElTabPane name="bulk">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-user-shared-line text-lg"></i> Operasi Massal
          </span>
        </template>

        <div class="space-y-6">
          <!-- Bulk Class Transfer Workflow for Students -->
          <ElCard shadow="never" class="!border-slate-200">
            <template #header>
              <div class="font-semibold text-slate-800 flex items-center gap-2">
                <i class="ri-community-line text-emerald-600"></i> Pemindahan Rombel Siswa Massal
              </div>
            </template>

            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="text-xs font-semibold text-slate-700 mb-1 block"
                    >1. Rombel Asal</label
                  >
                  <ElSelect
                    v-model="bulkClassSourceId"
                    class="w-full"
                    placeholder="Pilih Rombel Asal"
                    @change="loadSourceStudents"
                  >
                    <ElOption v-for="c in classesList" :key="c.id" :label="c.name" :value="c.id" />
                  </ElSelect>
                </div>

                <div>
                  <label class="text-xs font-semibold text-slate-700 mb-1 block"
                    >2. Rombel Tujuan</label
                  >
                  <ElSelect
                    v-model="bulkClassTargetId"
                    class="w-full"
                    placeholder="Pilih Rombel Tujuan"
                  >
                    <ElOption v-for="c in classesList" :key="c.id" :label="c.name" :value="c.id" />
                  </ElSelect>
                </div>
              </div>

              <!-- Student Selection Table -->
              <div v-if="sourceStudentsList.length > 0" class="space-y-3">
                <div class="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span
                    >3. Pilih Siswa yang Akan Dipindahkan (Terpilih:
                    {{ selectedStudentIds.length }} dari {{ sourceStudentsList.length }})</span
                  >
                  <ElButton size="small" text type="primary" @click="selectAllStudents"
                    >Pilih Semua</ElButton
                  >
                </div>

                <ElTable
                  :data="sourceStudentsList"
                  border
                  stripe
                  class="w-full text-xs"
                  @selection-change="handleStudentSelectionChange"
                >
                  <ElTableColumn type="selection" width="55" align="center" />
                  <ElTableColumn prop="nis" label="NIS" width="120" />
                  <ElTableColumn prop="name" label="Nama Siswa" min-width="200" />
                  <ElTableColumn prop="status" label="Status" width="100" align="center" />
                </ElTable>

                <div class="flex justify-end pt-4">
                  <ElButton
                    type="primary"
                    size="large"
                    :disabled="selectedStudentIds.length === 0 || !bulkClassTargetId"
                    @click="executeBulkClassAssign"
                  >
                    <i class="ri-user-shared-line mr-1"></i> Eksekusi Pemindahan Massal
                  </ElButton>
                </div>
              </div>
              <div v-else-if="bulkClassSourceId" class="text-sm text-slate-500 py-4 text-center">
                Tidak ada siswa aktif ditemukan di rombel asal yang dipilih.
              </div>
            </div>
          </ElCard>

          <!-- Bulk Status Update Card -->
          <ElCard shadow="never" class="!border-slate-200">
            <template #header>
              <div class="font-semibold text-slate-800 flex items-center gap-2">
                <i class="ri-toggle-line text-emerald-600"></i> Pembaruan Status Entitas Massal
              </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block">Tipe Entitas</label>
                <ElSelect v-model="bulkStatusEntityType" class="w-full">
                  <ElOption label="Guru" value="TEACHER" />
                  <ElOption label="Siswa" value="STUDENT" />
                  <ElOption label="Rombel / Kelas" value="CLASS" />
                </ElSelect>
              </div>

              <div>
                <label class="text-xs font-semibold text-slate-700 mb-1 block"
                  >Target Status Baru</label
                >
                <ElSelect v-model="bulkTargetStatus" class="w-full">
                  <ElOption label="ACTIVE" value="ACTIVE" />
                  <ElOption label="INACTIVE" value="INACTIVE" />
                  <ElOption label="MUTATION" value="MUTATION" />
                  <ElOption label="GRADUATED" value="GRADUATED" />
                </ElSelect>
              </div>

              <div class="flex items-end">
                <ElButton type="warning" class="w-full" @click="handleBulkStatusUpdate">
                  <i class="ri-check-double-line mr-1"></i> Terapkan Status Massal
                </ElButton>
              </div>
            </div>
          </ElCard>
        </div>
      </ElTabPane>

      <!-- TAB 4: IMPORT HISTORY -->
      <ElTabPane name="history">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-history-line text-lg"></i> Riwayat Import
          </span>
        </template>

        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm text-slate-600 font-semibold"
              >Riwayat Operasi Import Terakhir</span
            >
            <ElButton size="small" type="primary" plain @click="loadImportHistory">
              <i class="ri-refresh-line mr-1"></i> Refresh
            </ElButton>
          </div>

          <ElTable :data="importHistoryList" border stripe class="w-full text-xs">
            <ElTableColumn prop="timestamp" label="Waktu" width="160" />
            <ElTableColumn prop="actor" label="Pengunggah" width="120" />
            <ElTableColumn prop="entityType" label="Entitas" width="120" />
            <ElTableColumn prop="filename" label="Nama File" min-width="180" />
            <ElTableColumn prop="commitMode" label="Mode Commit" width="120" align="center" />
            <ElTableColumn label="Hasil Rows" width="180">
              <template #default="{ row }">
                <div class="text-xs space-y-0.5">
                  <div
                    >Dibuat:
                    <span class="font-bold text-emerald-600">{{ row.createdCount }}</span></div
                  >
                  <div
                    >Diperbarui:
                    <span class="font-bold text-blue-600">{{ row.updatedCount }}</span></div
                  >
                  <div
                    >Gagal/Batal:
                    <span class="font-bold text-rose-600">{{ row.failedCount }}</span></div
                  >
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="Status" width="110" align="center">
              <template #default="{ row }">
                <ElTag v-if="row.status === 'COMPLETED'" type="success" size="small"
                  >COMPLETED</ElTag
                >
                <ElTag v-else-if="row.status === 'PARTIAL'" type="warning" size="small"
                  >PARTIAL</ElTag
                >
                <ElTag v-else type="danger" size="small">FAILED</ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </ElTabPane>

      <!-- TAB 5: BACKUP & RESTORE -->
      <ElTabPane name="backup">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-folder-zip-line text-lg"></i> Backup & Restore
          </span>
        </template>

        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- BACKUP CARD -->
            <ElCard shadow="never" class="!border-slate-200">
              <template #header>
                <div class="font-semibold text-slate-800 flex items-center gap-2">
                  <i class="ri-save-line text-emerald-600"></i> Cadangkan Database Lokal
                </div>
              </template>
              <div class="space-y-4">
                <p class="text-sm text-slate-600">
                  Unduh seluruh database offline lokal (IndexedDB) dalam format file JSON tunggal
                  yang aman. File ini mencakup data pengguna, guru, siswa, kelas, presensi, jurnal,
                  nilai, dan riwayat sinkronisasi.
                </p>
                <div class="flex justify-start">
                  <ElButton type="primary" size="large" @click="handleCreateBackup">
                    <i class="ri-download-line mr-1"></i> Buat & Unduh Cadangan (Backup)
                  </ElButton>
                </div>
              </div>
            </ElCard>

            <!-- RESTORE CARD -->
            <ElCard shadow="never" class="!border-slate-200">
              <template #header>
                <div class="font-semibold text-slate-800 flex items-center gap-2">
                  <i class="ri-restart-line text-emerald-600"></i> Pulihkan Database Cadangan
                </div>
              </template>
              <div class="space-y-4">
                <p class="text-sm text-slate-600">
                  Pilih file cadangan JSON yang sebelumnya diunduh untuk memulihkan seluruh data
                  database luring lokal.
                  <strong
                    >Tindakan ini bersifat destruktif dan akan menggantikan seluruh data yang ada
                    saat ini!</strong
                  >
                </p>

                <div
                  class="border border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition duration-150 relative cursor-pointer"
                >
                  <input
                    type="file"
                    accept=".json"
                    class="absolute inset-0 opacity-0 cursor-pointer"
                    @change="handleRestoreFileUpload"
                  />
                  <i class="ri-upload-2-line text-2xl text-slate-400 mb-1"></i>
                  <span class="text-xs text-slate-500 font-medium"
                    >Klik untuk memilih file cadangan (.json)</span
                  >
                </div>

                <!-- Preview Restore State -->
                <div
                  v-if="restorePreview"
                  class="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2"
                >
                  <div class="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <i class="ri-alert-line"></i> PREVIEW DATA CADANGAN
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div
                      >Waktu Dibuat:
                      <span class="font-bold text-slate-800">{{
                        restorePreview.createdAt
                      }}</span></div
                    >
                    <div
                      >Versi App:
                      <span class="font-bold text-slate-800">{{
                        restorePreview.appVersion
                      }}</span></div
                    >
                    <div
                      >Versi Skema:
                      <span class="font-bold text-slate-800">{{
                        restorePreview.schemaVersion
                      }}</span></div
                    >
                  </div>
                  <div class="border-t border-amber-200 pt-2">
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                      >Rincian Record:</div
                    >
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div
                        v-for="(count, store) in restorePreview.storesCount"
                        :key="store"
                        class="flex justify-between border-b border-slate-100 pb-1"
                      >
                        <span class="text-slate-500">{{ store }}:</span>
                        <span class="font-bold text-slate-800">{{ count }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-end pt-3 gap-2">
                    <ElButton size="small" type="danger" plain @click="cancelRestore"
                      >Batal</ElButton
                    >
                    <ElButton size="small" type="danger" @click="executeRestore">
                      <i class="ri-check-line mr-1"></i> Ya, Pulihkan Sekarang
                    </ElButton>
                  </div>
                </div>
              </div>
            </ElCard>
          </div>

          <!-- GOOGLE WORKSPACE API INTEGRATION SYSTEM -->
          <div class="border-t border-slate-100 pt-6">
            <h3 class="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <i class="ri-google-fill text-blue-600 text-xl"></i>
              Integrasi Cloud Native Google Workspace (Sheets & Drive)
            </h3>
            <p class="text-xs text-slate-500 mb-6">
              Sambungkan aplikasi Guru Offline ke Google Workspace Anda untuk sinkronisasi cloud
              real-time ke Google Sheets sebagai single source of truth dan pencadangan database
              luring secara otomatis ke Google Drive.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- CONNECTION CARD -->
              <ElCard shadow="never" class="!border-slate-200">
                <template #header>
                  <div class="font-semibold text-slate-800 flex items-center justify-between">
                    <span class="flex items-center gap-2">
                      <i class="ri-key-2-line text-emerald-600"></i> Koneksi Akun Google
                    </span>
                    <ElTag v-if="isWorkspaceConnected" type="success" size="small">CONNECTED</ElTag>
                    <ElTag v-else type="info" size="small">DISCONNECTED</ElTag>
                  </div>
                </template>

                <div class="space-y-4">
                  <!-- IF NOT CONNECTED -->
                  <div v-if="!isWorkspaceConnected" class="space-y-4 py-2">
                    <p class="text-sm text-slate-600">
                      Anda belum mengaktifkan sinkronisasi native Google Workspace. Sambungkan
                      dengan akun Google sekolah Anda untuk mengaktifkan sinkronisasi otomatis.
                    </p>
                    <ElButton
                      type="primary"
                      size="large"
                      :loading="isConnecting"
                      @click="handleWorkspaceConnect"
                      class="w-full"
                    >
                      <i class="ri-google-line mr-2"></i> Sambungkan Akun Google
                    </ElButton>
                  </div>

                  <!-- IF CONNECTED -->
                  <div v-else class="space-y-4">
                    <div
                      class="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-3"
                    >
                      <i class="ri-shield-check-line text-2xl text-emerald-600"></i>
                      <div class="text-xs">
                        <div class="font-bold text-emerald-800">Tersambung Secara Aman</div>
                        <div class="text-slate-600"
                          >{{ workspaceUser?.displayName }} ({{ workspaceUser?.email }})</div
                        >
                      </div>
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-slate-700 block"
                        >ID Spreadsheet Google Sheets (Source of Truth)</label
                      >
                      <div class="flex gap-2">
                        <ElInput
                          v-model="spreadsheetId"
                          placeholder="Mencari atau memasukkan ID spreadsheet..."
                          size="small"
                        />
                        <ElButton
                          type="success"
                          size="small"
                          :loading="isEnsuringSpreadsheet"
                          @click="handleEnsureSpreadsheet"
                        >
                          <i class="ri-refresh-line mr-1"></i> Inisialisasi
                        </ElButton>
                      </div>
                      <span v-if="spreadsheetId" class="text-[11px] text-slate-500 block">
                        Spreadsheet aktif ditemukan! Klik tombol di bawah ini untuk membuka
                        spreadsheet langsung di Google Sheets.
                      </span>
                    </div>

                    <div class="flex gap-2 pt-2">
                      <ElButton
                        v-if="spreadsheetId"
                        type="success"
                        size="small"
                        plain
                        @click="openSpreadsheet"
                        class="flex-1"
                      >
                        <i class="ri-external-link-line mr-1"></i> Buka Spreadsheet
                      </ElButton>
                      <ElButton
                        type="danger"
                        size="small"
                        plain
                        @click="handleWorkspaceDisconnect"
                        :loading="isConnecting"
                      >
                        <i class="ri-logout-box-r-line mr-1"></i> Putuskan Sesi
                      </ElButton>
                    </div>
                  </div>
                </div>
              </ElCard>

              <!-- BACKUP TO DRIVE CARD -->
              <ElCard shadow="never" class="!border-slate-200">
                <template #header>
                  <div class="font-semibold text-slate-800 flex items-center gap-2">
                    <i class="ri-cloud-windy-line text-emerald-600"></i> Cadangkan Ke Google Drive
                  </div>
                </template>
                <div class="space-y-4">
                  <p class="text-sm text-slate-600">
                    Unggah cadangan database offline (JSON) langsung ke penyimpanan cloud Google
                    Drive Anda. Berguna sebagai perlindungan data ganda di luar penyimpanan luring
                    perangkat lokal.
                  </p>
                  <div class="flex justify-start">
                    <ElButton
                      type="primary"
                      size="large"
                      :disabled="!isWorkspaceConnected"
                      :loading="isUploadingBackupToDrive"
                      @click="handleUploadBackupToDrive"
                    >
                      <i class="ri-cloud-upload-line mr-1"></i> Unggah Cadangan ke Google Drive
                    </ElButton>
                  </div>
                </div>
              </ElCard>
            </div>

            <!-- MULTI-API TEST CARD -->
            <ElCard shadow="never" class="!border-slate-200 mt-6">
              <template #header>
                <div class="font-semibold text-slate-800 flex items-center gap-2">
                  <i class="ri-mind-map text-emerald-600"></i> Panel Uji Integrasi Native API
                  Workspace Lainnya
                </div>
              </template>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- GMAIL CARD -->
                <div class="border border-slate-100 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div class="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <i class="ri-mail-send-line text-blue-600"></i> NOTIFIKASI GMAIL
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Kirim email notifikasi otomatis berisi alert sistem SIAKAD kepada wali murid
                    atau guru.
                  </p>
                  <ElInput
                    v-model="gmailTestTo"
                    placeholder="Email tujuan..."
                    size="small"
                    :disabled="!isWorkspaceConnected"
                  />
                  <ElButton
                    type="primary"
                    size="small"
                    class="w-full"
                    :disabled="!isWorkspaceConnected"
                    :loading="isSendingGmailTest"
                    @click="handleSendGmailTest"
                  >
                    <i class="ri-send-plane-line mr-1"></i> Kirim Uji Coba Email
                  </ElButton>
                </div>

                <!-- CALENDAR CARD -->
                <div class="border border-slate-100 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div class="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <i class="ri-calendar-event-line text-red-600"></i> ACARA ACADEMIC CALENDAR
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Jadwalkan agenda sekolah atau ujian langsung ke akun Google Calendar utama Anda.
                  </p>
                  <ElButton
                    type="danger"
                    size="small"
                    class="w-full"
                    :disabled="!isWorkspaceConnected"
                    :loading="isSchedulingCalendar"
                    @click="handleScheduleCalendarEvent"
                  >
                    <i class="ri-add-box-line mr-1"></i> Buat Agenda Jadwal Ujian
                  </ElButton>
                </div>

                <!-- DOCS CARD -->
                <div class="border border-slate-100 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div class="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <i class="ri-file-text-line text-blue-500"></i> LAPORAN GOOGLE DOCS
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Buat template laporan administrasi guru atau sertifikat siswa langsung di Google
                    Docs.
                  </p>
                  <ElButton
                    type="info"
                    size="small"
                    class="w-full"
                    :disabled="!isWorkspaceConnected"
                    :loading="isGeneratingDoc"
                    @click="handleGenerateDocTemplate"
                  >
                    <i class="ri-file-word-line mr-1"></i> Buat Dokumen Laporan
                  </ElButton>
                </div>

                <!-- FORMS CARD -->
                <div class="border border-slate-100 rounded-lg p-4 space-y-3 bg-slate-50">
                  <div class="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                    <i class="ri-survey-line text-purple-600"></i> MAINKAN GOOGLE FORMS
                  </div>
                  <p class="text-[11px] text-slate-500">
                    Ambil feedback keluhan / saran wali kelas yang masuk lewat Google Forms.
                  </p>
                  <ElInput
                    v-model="feedbackFormId"
                    placeholder="ID Google Form..."
                    size="small"
                    :disabled="!isWorkspaceConnected"
                  />
                  <ElButton
                    type="warning"
                    size="small"
                    class="w-full"
                    :disabled="!isWorkspaceConnected"
                    :loading="isRetrievingFeedback"
                    @click="handleRetrieveFormFeedback"
                  >
                    <i class="ri-file-search-line mr-1"></i> Tarik Tanggapan Form
                  </ElButton>
                </div>
              </div>

              <!-- Responses preview list -->
              <div
                v-if="formFeedbackResponses.length > 0"
                class="mt-4 border-t border-slate-100 pt-3"
              >
                <div class="text-xs font-bold text-slate-700 mb-2"
                  >RESPON GOOGLE FORM YANG BERHASIL DITARIK:</div
                >
                <div
                  class="bg-white border border-slate-100 rounded p-3 max-h-32 overflow-y-auto space-y-2 text-xs"
                >
                  <div
                    v-for="(resp, i) in formFeedbackResponses"
                    :key="i"
                    class="pb-1.5 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <span class="font-bold text-slate-700"
                      >Respon #{{ i + 1 }} (ID: {{ resp.responseId }}):</span
                    >
                    <pre class="text-[10px] text-slate-500 bg-slate-50 p-1 rounded mt-1">{{
                      JSON.stringify(resp.answers || resp, null, 2)
                    }}</pre>
                  </div>
                </div>
              </div>
            </ElCard>
          </div>
        </div>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    importService,
    exportService,
    bulkService,
    backupService,
    type MasterEntityType,
    type ExportFormat,
    type ImportPreviewResult,
    type ImportHistoryEntity,
    type ImportCommitMode,
    type ImportDuplicateMode
  } from '@/core/services'
  import { googleWorkspaceService } from '@/core/services/sync/GoogleWorkspaceService'
  import { repositories } from '@/core/repositories'
  import type { ClassEntity, StudentEntity, AcademicYearEntity } from '@/core/types'

  const activeTab = ref('import')

  // Google Workspace Reactive States
  const isWorkspaceConnected = ref(false)
  const workspaceUser = ref<any>(null)
  const spreadsheetId = ref('')
  const isConnecting = ref(false)
  const isEnsuringSpreadsheet = ref(false)
  const isUploadingBackupToDrive = ref(false)
  const gmailTestTo = ref('')
  const isSendingGmailTest = ref(false)
  const isSchedulingCalendar = ref(false)
  const isGeneratingDoc = ref(false)
  const feedbackFormId = ref('')
  const isRetrievingFeedback = ref(false)
  const formFeedbackResponses = ref<any[]>([])

  // Import Tab Reactive State
  const selectedEntityType = ref<MasterEntityType>('TEACHER')
  const commitMode = ref<ImportCommitMode>('STRICT')
  const duplicateMode = ref<ImportDuplicateMode>('CREATE_ONLY')
  const isSubmittingImport = ref(false)
  const previewResult = ref<ImportPreviewResult | null>(null)
  const previewFilterStatus = ref<string>('ALL')
  const previewSearchQuery = ref<string>('')

  // Export Tab Reactive State
  const exportEntityType = ref<MasterEntityType>('TEACHER')
  const exportFilter = ref({ classId: '', academicYearId: '' })
  const classesList = ref<ClassEntity[]>([])
  const academicYearsList = ref<AcademicYearEntity[]>([])

  // Bulk Operations State
  const bulkClassSourceId = ref<string>('')
  const bulkClassTargetId = ref<string>('')
  const sourceStudentsList = ref<StudentEntity[]>([])
  const selectedStudentIds = ref<string[]>([])
  const bulkStatusEntityType = ref<'TEACHER' | 'STUDENT' | 'CLASS'>('STUDENT')
  const bulkTargetStatus = ref<string>('ACTIVE')

  // History State
  const importHistoryList = ref<ImportHistoryEntity[]>([])

  onMounted(async () => {
    await loadMetadata()
    await loadImportHistory()

    // Initialize Google Workspace Authentication Observer
    googleWorkspaceService.initAuthObserver(
      (user) => {
        isWorkspaceConnected.value = true
        workspaceUser.value = {
          email: user.email,
          displayName: user.displayName
        }
        spreadsheetId.value = googleWorkspaceService.getSpreadsheetId() || ''
      },
      () => {
        isWorkspaceConnected.value = false
        workspaceUser.value = null
        spreadsheetId.value = ''
      }
    )
  })

  async function loadMetadata() {
    classesList.value = await repositories.classes.findAll()
    academicYearsList.value = await repositories.academicYears.findAll()
  }

  function resetPreview() {
    previewResult.value = null
  }

  async function downloadTemplate(format: ExportFormat) {
    try {
      const tpl = importService.generateTemplate(selectedEntityType.value, format)
      downloadBlob(tpl.content, tpl.filename, tpl.mimeType)
      ElMessage.success(`Template import ${selectedEntityType.value} berhasil diunduh.`)
    } catch (err: any) {
      ElMessage.error(`Gagal mengunduh template: ${err.message}`)
    }
  }

  async function handleFileUpload(uploadFile: any) {
    try {
      const rawFile = uploadFile.raw
      if (!rawFile) return

      const arrayBuffer = await rawFile.arrayBuffer()
      const rawRows = importService.parseFileContent(arrayBuffer, rawFile.name)

      if (rawRows.length === 0) {
        ElMessage.warning('File import kosong atau tidak memiliki baris data valid.')
        return
      }

      previewResult.value = await importService.previewImport(
        selectedEntityType.value,
        rawFile.name,
        rawRows
      )

      ElMessage.success(`Preview berhasil dimuat (${previewResult.value.totalRows} baris data).`)
    } catch (err: any) {
      ElMessage.error(`Gagal memproses file import: ${err.message}`)
    }
  }

  const previewFilteredRows = computed(() => {
    if (!previewResult.value) return []
    let rows = previewResult.value.rows

    if (previewFilterStatus.value !== 'ALL') {
      rows = rows.filter((r) => r.status === previewFilterStatus.value)
    }

    if (previewSearchQuery.value.trim()) {
      const q = previewSearchQuery.value.trim().toLowerCase()
      rows = rows.filter((r) => JSON.stringify(r.normalizedData).toLowerCase().includes(q))
    }

    return rows
  })

  async function executeCommitImport() {
    if (!previewResult.value) return

    try {
      await ElMessageBox.confirm(
        `Konfirmasi import ${previewResult.value.totalRows} baris data ke database master?`,
        'Konfirmasi Import Data',
        { confirmButtonText: 'Ya, Simpan Import', cancelButtonText: 'Batal', type: 'warning' }
      )

      isSubmittingImport.value = true
      const result = await importService.commitImport({
        preview: previewResult.value,
        commitMode: commitMode.value,
        duplicateMode: duplicateMode.value
      })

      if (result.success) {
        ElMessage.success(result.message)
        previewResult.value = null
        await loadImportHistory()
      } else {
        ElMessage.error(result.message)
      }
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(`Commit import gagal: ${err.message}`)
      }
    } finally {
      isSubmittingImport.value = false
    }
  }

  function downloadErrorReport() {
    if (!previewResult.value) return
    const csv = importService.generateErrorReportCsv(previewResult.value.rows)
    downloadBlob(csv, `import-errors-${Date.now()}.csv`, 'text/csv;charset=utf-8;')
  }

  async function handleExportMaster(format: ExportFormat) {
    try {
      const res = await exportService.exportMasterData(
        exportEntityType.value,
        format,
        exportFilter.value
      )
      downloadBlob(res.content, res.filename, res.mimeType)
      ElMessage.success(`Export ${exportEntityType.value} berhasil.`)
    } catch (err: any) {
      ElMessage.error(`Export gagal: ${err.message}`)
    }
  }

  async function loadSourceStudents() {
    if (!bulkClassSourceId.value) {
      sourceStudentsList.value = []
      return
    }
    sourceStudentsList.value = await repositories.students.findByClassId(bulkClassSourceId.value)
  }

  function handleStudentSelectionChange(val: StudentEntity[]) {
    selectedStudentIds.value = val.map((s) => s.id)
  }

  function selectAllStudents() {
    selectedStudentIds.value = sourceStudentsList.value.map((s) => s.id)
  }

  async function executeBulkClassAssign() {
    try {
      await ElMessageBox.confirm(
        `Pindahkan ${selectedStudentIds.value.length} siswa ke rombel tujuan?`,
        'Konfirmasi Pemindahan Massal',
        { confirmButtonText: 'Ya, Pindahkan', cancelButtonText: 'Batal', type: 'warning' }
      )

      const res = await bulkService.bulkAssignStudentClass(
        selectedStudentIds.value,
        bulkClassTargetId.value
      )

      ElMessage.success(res.message)
      await loadSourceStudents()
      selectedStudentIds.value = []
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(`Gagal melakukan pemindahan: ${err.message}`)
      }
    }
  }

  async function handleBulkStatusUpdate() {
    try {
      await ElMessageBox.confirm(
        `Konfirmasi pembaruan status massal entitas ${bulkStatusEntityType.value} menjadi ${bulkTargetStatus.value}?`,
        'Konfirmasi Status Massal',
        { confirmButtonText: 'Terapkan', cancelButtonText: 'Batal', type: 'warning' }
      )

      if (bulkStatusEntityType.value === 'TEACHER') {
        const teachers = await repositories.teachers.findAll()
        const ids = teachers.map((t) => t.id)
        const res = await bulkService.bulkUpdateTeacherStatus(ids, bulkTargetStatus.value as any)
        ElMessage.success(res.message)
      } else if (bulkStatusEntityType.value === 'STUDENT') {
        const students = await repositories.students.findAll()
        const ids = students.map((s) => s.id)
        const res = await bulkService.bulkUpdateStudentStatus(ids, bulkTargetStatus.value as any)
        ElMessage.success(res.message)
      } else if (bulkStatusEntityType.value === 'CLASS') {
        const classes = await repositories.classes.findAll()
        const ids = classes.map((c) => c.id)
        const res = await bulkService.bulkUpdateClassStatus(ids, bulkTargetStatus.value as any)
        ElMessage.success(res.message)
      }
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(`Pembaruan status gagal: ${err.message}`)
      }
    }
  }

  async function loadImportHistory() {
    try {
      importHistoryList.value = await importService.getImportHistory()
    } catch (err: any) {
      console.error('Failed to load import history:', err)
    }
  }

  // Backup & Restore State
  const restorePreview = ref<any | null>(null)
  const backupPayloadToRestore = ref<any | null>(null)

  async function handleCreateBackup() {
    try {
      const payload = await backupService.createBackup()
      const jsonStr = JSON.stringify(payload, null, 2)
      downloadBlob(jsonStr, `guru-offline-backup-${Date.now()}.json`, 'application/json')
      ElMessage.success('Cadangan database offline lokal berhasil diunduh.')
    } catch (err: any) {
      ElMessage.error(`Gagal membuat cadangan: ${err.message}`)
    }
  }

  async function handleRestoreFileUpload(event: any) {
    try {
      const file = event.target.files?.[0]
      if (!file) return

      const text = await file.text()
      const parsed = JSON.parse(text)

      const validation = await backupService.validateBackup(parsed)
      if (!validation.valid) {
        ElMessage.error(`File cadangan tidak valid: ${validation.reason}`)
        restorePreview.value = null
        backupPayloadToRestore.value = null
        return
      }

      restorePreview.value = validation.preview
      backupPayloadToRestore.value = parsed
      ElMessage.success(
        'Preview cadangan berhasil dimuat. Tinjau kembali rincian data sebelum memulihkan.'
      )
    } catch (err: any) {
      ElMessage.error(`Gagal memuat file cadangan: ${err.message}`)
    }
  }

  function cancelRestore() {
    restorePreview.value = null
    backupPayloadToRestore.value = null
  }

  async function executeRestore() {
    if (!backupPayloadToRestore.value) return

    try {
      await ElMessageBox.confirm(
        'PERINGATAN: Tindakan ini akan menghapus seluruh data yang ada saat ini dan menggantikannya dengan data dari file cadangan. Lanjutkan?',
        'Konfirmasi Pemulihan Cadangan',
        {
          confirmButtonText: 'Ya, Gantikan Seluruh Data',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      const res = await backupService.restoreBackup(backupPayloadToRestore.value)
      if (res.success) {
        ElMessage({
          type: 'success',
          message:
            'Pemulihan cadangan database berhasil diselesaikan. Aplikasi akan dimuat ulang untuk memperbarui tampilan.',
          duration: 3000,
          onClose: () => {
            window.location.reload()
          }
        })
      }
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(`Gagal memulihkan cadangan: ${err.message}`)
      }
    }
  }

  function downloadBlob(content: string | ArrayBuffer, filename: string, mimeType: string) {
    const blob =
      content instanceof ArrayBuffer
        ? new Blob([content], { type: mimeType })
        : new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ==========================================
  // GOOGLE WORKSPACE API HANDLERS
  // ==========================================
  async function handleWorkspaceConnect() {
    isConnecting.value = true
    try {
      const result = await googleWorkspaceService.signIn()
      isWorkspaceConnected.value = true
      workspaceUser.value = {
        email: result.user.email,
        displayName: result.user.displayName
      }
      spreadsheetId.value = googleWorkspaceService.getSpreadsheetId() || ''
      ElMessage.success('Sesi Google Workspace berhasil tersambung secara aman.')
    } catch (err: any) {
      ElMessage.error(`Koneksi Google Workspace gagal: ${err.message}`)
    } finally {
      isConnecting.value = false
    }
  }

  async function handleWorkspaceDisconnect() {
    isConnecting.value = true
    try {
      await googleWorkspaceService.logout()
      isWorkspaceConnected.value = false
      workspaceUser.value = null
      spreadsheetId.value = ''
      ElMessage.success('Sesi Google Workspace berhasil diputuskan.')
    } catch (err: any) {
      ElMessage.error(`Gagal memutuskan sesi: ${err.message}`)
    } finally {
      isConnecting.value = false
    }
  }

  async function handleEnsureSpreadsheet() {
    isEnsuringSpreadsheet.value = true
    try {
      if (spreadsheetId.value && spreadsheetId.value.trim() !== '') {
        googleWorkspaceService.setSpreadsheetId(spreadsheetId.value.trim())
      }
      const actualId = await googleWorkspaceService.ensureSpreadsheet()
      spreadsheetId.value = actualId
      ElMessage.success('Integrasi Google Sheets berhasil diinisialisasi sebagai Source of Truth!')
    } catch (err: any) {
      ElMessage.error(`Gagal inisialisasi spreadsheet: ${err.message}`)
    } finally {
      isEnsuringSpreadsheet.value = false
    }
  }

  function openSpreadsheet() {
    if (spreadsheetId.value) {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId.value}/edit`
      window.open(url, '_blank')
    }
  }

  async function handleUploadBackupToDrive() {
    isUploadingBackupToDrive.value = true
    try {
      const payload = await backupService.createBackup()
      const jsonStr = JSON.stringify(payload, null, 2)
      const fileName = `guru-offline-drive-backup-${Date.now()}.json`

      const fileId = await googleWorkspaceService.uploadBackupToDrive(fileName, jsonStr)
      ElMessage.success(`Backup database berhasil diunggah ke Google Drive! File ID: ${fileId}`)
    } catch (err: any) {
      ElMessage.error(`Gagal mengunggah backup ke Drive: ${err.message}`)
    } finally {
      isUploadingBackupToDrive.value = false
    }
  }

  async function handleSendGmailTest() {
    if (!gmailTestTo.value || gmailTestTo.value.trim() === '') {
      ElMessage.warning('Silakan masukkan alamat email tujuan terlebih dahulu.')
      return
    }
    isSendingGmailTest.value = true
    try {
      await googleWorkspaceService.sendGmailAlert(
        gmailTestTo.value.trim(),
        'Uji Coba Notifikasi SIAKAD SMK NU Ungaran',
        'Halo! Ini adalah email uji coba dari integrasi native Gmail API sistem SIAKAD Guru Offline SMK NU Ungaran. Integrasi berjalan dengan sukses dan aman!'
      )
      ElMessage.success('Uji coba pengiriman email via native Gmail API berhasil dikirim!')
    } catch (err: any) {
      ElMessage.error(`Gagal mengirim email: ${err.message}`)
    } finally {
      isSendingGmailTest.value = false
    }
  }

  async function handleScheduleCalendarEvent() {
    isSchedulingCalendar.value = true
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const startStr = tomorrow.toISOString().split('T')[0] + 'T08:00:00'
      const endStr = tomorrow.toISOString().split('T')[0] + 'T10:00:00'

      const eventId = await googleWorkspaceService.createCalendarEvent({
        summary: 'Ujian Tengah Semester - SIAKAD SMK NU Ungaran',
        description:
          'Jadwal pelaksanaan Ujian Tengah Semester yang sinkron otomatis dari aplikasi Guru Offline.',
        startDateTime: startStr,
        endDateTime: endStr
      })
      ElMessage.success(
        `Jadwal ujian berhasil didaftarkan ke Google Calendar! Event ID: ${eventId}`
      )
    } catch (err: any) {
      ElMessage.error(`Gagal menjadwalkan acara Calendar: ${err.message}`)
    } finally {
      isSchedulingCalendar.value = false
    }
  }

  async function handleGenerateDocTemplate() {
    isGeneratingDoc.value = true
    try {
      const docId = await googleWorkspaceService.createDocTemplate(
        'Laporan Hasil Belajar Siswa - SMK NU Ungaran',
        [
          'LAPORAN RESMI ADMINISTRASI SEKOLAH',
          'Sistem Informasi Akademik Guru Offline - SMK NU Ungaran',
          `Dokumen ini digenerate secara otomatis pada tanggal: ${new Date().toLocaleDateString('id-ID')}`,
          'Semua rincian tugas, presensi siswa, dan jurnal pengajaran kelas telah disinkronkan ke dalam sistem cloud terpadu.'
        ]
      )
      ElMessage.success(`Dokumen laporan berhasil digenerate di Google Docs! Doc ID: ${docId}`)
    } catch (err: any) {
      ElMessage.error(`Gagal membuat dokumen Docs: ${err.message}`)
    } finally {
      isGeneratingDoc.value = false
    }
  }

  async function handleRetrieveFormFeedback() {
    if (!feedbackFormId.value || feedbackFormId.value.trim() === '') {
      ElMessage.warning('Silakan masukkan ID Google Form terlebih dahulu.')
      return
    }
    isRetrievingFeedback.value = true
    formFeedbackResponses.value = []
    try {
      const responses = await googleWorkspaceService.getFormFeedback(feedbackFormId.value.trim())
      formFeedbackResponses.value = responses
      if (responses.length === 0) {
        ElMessage.info(
          'Integrasi sukses, namun belum ada tanggapan yang masuk pada Google Form tersebut.'
        )
      } else {
        ElMessage.success(`Berhasil menarik ${responses.length} tanggapan dari Google Form!`)
      }
    } catch (err: any) {
      ElMessage.error(`Gagal menarik tanggapan Form: ${err.message}`)
    } finally {
      isRetrievingFeedback.value = false
    }
  }
</script>
