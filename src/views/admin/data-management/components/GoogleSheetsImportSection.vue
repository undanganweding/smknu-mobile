<template>
  <div
    class="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i class="ri-file-excel-2-line text-emerald-600 text-lg"></i>
        <span class="text-sm font-bold text-slate-800 dark:text-slate-100">
          Import Master Data via Google Sheets URL
        </span>
      </div>
      <el-tag type="success" size="small">Cloud Importer</el-tag>
    </div>

    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
      Sesuai arsitektur SMK NU Ungaran, Google Sheets digunakan sebagai sumber data master (bukan
      database transaksi). Masukkan link Google Sheets yang memiliki akses "Siapa saja yang memiliki
      link" untuk diimpor ke Supabase PostgreSQL.
    </p>

    <div class="flex flex-col sm:flex-row gap-2">
      <el-input
        v-model="sheetsUrl"
        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
        clearable
        class="flex-1"
      />
      <el-button
        type="primary"
        :loading="fetching"
        :disabled="!sheetsUrl.trim()"
        @click="handleFetchSheet"
      >
        <i class="ri-download-cloud-line mr-1"></i> Ambil & Validasi Data
      </el-button>
    </div>

    <!-- Preview Results if fetched -->
    <div
      v-if="previewResult"
      class="mt-4 pt-3 border-t border-emerald-200/80 dark:border-emerald-800 space-y-3"
    >
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-slate-700 dark:text-slate-200">
          Hasil Validasi Schema:
          <span class="text-emerald-600 font-bold"
            >{{ previewResult.validRows.length }} Baris Valid</span
          >,
          <span class="text-rose-600 font-bold"
            >{{ previewResult.invalidRows.length }} Baris Invalid</span
          >
        </span>
        <el-button
          type="success"
          size="small"
          :disabled="!previewResult.canCommit || committing"
          :loading="committing"
          @click="handleCommit"
        >
          <i class="ri-check-line mr-1"></i> Simpan ke Supabase & IndexedDB
        </el-button>
      </div>

      <!-- Quick preview table -->
      <div class="max-h-48 overflow-y-auto border rounded-lg dark:border-slate-700 text-xs">
        <table class="w-full text-left divide-y dark:divide-slate-700">
          <thead class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <tr>
              <th class="p-2">No</th>
              <th class="p-2">Nama Guru</th>
              <th class="p-2">NIP</th>
              <th class="p-2">JK</th>
              <th class="p-2">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y dark:divide-slate-800">
            <tr v-for="(row, idx) in previewResult.validRows.slice(0, 10)" :key="idx">
              <td class="p-2 font-mono text-slate-400">{{ idx + 1 }}</td>
              <td class="p-2 font-semibold text-slate-800 dark:text-slate-200">{{ row.name }}</td>
              <td class="p-2 font-mono text-slate-500">{{ row.nip || '-' }}</td>
              <td class="p-2">{{ row.gender === 'P' ? 'Perempuan' : 'Laki-laki' }}</td>
              <td class="p-2"><el-tag size="small" type="success">Siap Simpan</el-tag></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import {
    googleSheetsImportService,
    type SheetImportPreviewResult
  } from '@/core/services/import/GoogleSheetsImportService'
  import type { TeacherEntity } from '@/core/types'
  import { ElMessage } from 'element-plus'

  const sheetsUrl = ref('')
  const fetching = ref(false)
  const committing = ref(false)
  const previewResult = ref<SheetImportPreviewResult<Partial<TeacherEntity>> | null>(null)

  async function handleFetchSheet() {
    if (!sheetsUrl.value.trim()) return
    fetching.value = true
    previewResult.value = null
    try {
      const rows = await googleSheetsImportService.fetchAndParseCsv(sheetsUrl.value)
      const preview = await googleSheetsImportService.previewTeachers(rows)
      previewResult.value = preview
      ElMessage.success(`Berhasil membaca ${preview.totalRows} baris dari Google Sheets!`)
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal mengambil data dari Google Sheets.')
    } finally {
      fetching.value = false
    }
  }

  async function handleCommit() {
    if (!previewResult.value || !previewResult.value.canCommit) return
    committing.value = true
    try {
      const committed = await googleSheetsImportService.commitTeachers(
        previewResult.value.validRows
      )
      ElMessage.success(
        `Berhasil menyimpan ${committed} data master ke Supabase dan IndexedDB cache!`
      )
      previewResult.value = null
      sheetsUrl.value = ''
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan data ke sistem.')
    } finally {
      committing.value = false
    }
  }
</script>
