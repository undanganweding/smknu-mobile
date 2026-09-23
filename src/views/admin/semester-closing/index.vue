<template>
  <div class="p-5 space-y-5" id="admin-semester-closing">
    <!-- Header Block -->
    <div
      class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"
    >
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800"
          >
            ADMINISTRATOR
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
          >
            SEMESTER CLOSING ENGINE
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-lock-line text-rose-600"></i> Penutupan Semester & Tata Kelola Akademik
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Review pengajuan berkas guru, verifikasi kelengkapan, dan bekukan seluruh data
          transaksional semester (Nilai, Presensi, dan Jurnal).
        </p>
      </div>
    </div>

    <!-- Main Navigation Tabs -->
    <ElTabs v-model="activeMainTab" type="border-card" class="art-card">
      <ElTabPane name="review" label="Review & Persetujuan Berkas Guru">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-user-star-line text-emerald-600"></i> Review Berkas Pengajuan Guru
          </span>
        </template>
        <AdminSubmissionReviewView />
      </ElTabPane>

      <ElTabPane name="closing" label="Pembekuan & Kunci Semester">
        <template #label>
          <span class="flex items-center gap-2">
            <i class="ri-lock-line text-rose-600"></i> Pembekuan & Kunci Semester
          </span>
        </template>
        <div class="space-y-5 pt-2">
          <!-- Filter Block -->
          <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800">
            <template #header>
              <div class="flex items-center justify-between">
                <span
                  class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <i class="ri-filter-3-line text-rose-600"></i> Pilih Target Akademik
                </span>
              </div>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block"
                  >Tahun Pelajaran & Semester</label
                >
                <ElSelect
                  v-model="selectedAcademicYearId"
                  placeholder="Pilih Tahun Akademik"
                  class="w-full"
                  @change="handleYearChange"
                  id="select-academic-year-closing"
                >
                  <ElOption
                    v-for="ay in academicYears"
                    :key="ay.id"
                    :label="`${ay.name} - ${ay.semester} ${ay.isLocked ? '[TERKUNCI]' : ay.isActive ? '(Aktif Saat Ini)' : ''}`"
                    :value="ay.id"
                  />
                </ElSelect>
              </div>

              <div class="flex items-end">
                <div
                  v-if="selectedYearEntity"
                  :class="[
                    'w-full p-3 rounded border text-sm flex items-center gap-2 font-semibold',
                    selectedYearEntity.isLocked
                      ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900'
                  ]"
                >
                  <i
                    :class="
                      selectedYearEntity.isLocked
                        ? 'ri-lock-fill text-lg'
                        : 'ri-lock-unlock-line text-lg'
                    "
                  ></i>
                  <span>
                    Status Semester:
                    {{
                      selectedYearEntity.isLocked
                        ? 'TERKUNCI (Seluruh Penulisan Data Dibekukan)'
                        : 'AKTIF & OPERASIONAL'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </ElCard>

          <!-- Loading State -->
          <div
            v-if="loading"
            class="text-center p-10 card shadow-sm border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900"
          >
            <ElIcon class="is-loading text-rose-600 text-3xl"
              ><i class="ri-loader-4-line"></i
            ></ElIcon>
            <p class="text-sm text-slate-500 mt-2">Menganalisis kepatuhan data pengajaran...</p>
          </div>

          <!-- Compliance Dashboard & Action Panel -->
          <div
            v-else-if="selectedAcademicYearId && complianceReport"
            class="grid grid-cols-1 lg:grid-cols-3 gap-5"
          >
            <!-- Compliance Metrics -->
            <div class="lg:col-span-2 space-y-5">
              <!-- Blockers Banner if any -->
              <div
                v-if="complianceReport.blockers && complianceReport.blockers.length > 0"
                class="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
              >
                <div class="flex items-center gap-2 font-bold mb-2">
                  <i class="ri-error-warning-fill text-amber-600 text-lg"></i>
                  <span>Faktor Penghalang Penutupan Semester (Blockers):</span>
                </div>
                <ul class="list-disc list-inside space-y-1 text-xs">
                  <li v-for="(b, idx) in complianceReport.blockers" :key="idx">{{ b }}</li>
                </ul>
                <p class="text-xs mt-3 text-amber-700 dark:text-amber-400">
                  Selesaikan item di atas atau gunakan opsi Force Close dengan persetujuan audit.
                </p>
              </div>

              <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800">
                <template #header>
                  <span
                    class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <i class="ri-checkbox-circle-line text-rose-600"></i> Metrik Kepatuhan Data
                    Pengajaran
                  </span>
                </template>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    class="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-900 text-center"
                  >
                    <span class="text-xs text-slate-500 block">Total Kelas</span>
                    <span class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                      {{ complianceReport.totalClasses }}
                    </span>
                  </div>
                  <div
                    class="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-900 text-center"
                  >
                    <span class="text-xs text-slate-500 block">Total Guru Aktif</span>
                    <span class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                      {{ complianceReport.totalTeachers }}
                    </span>
                  </div>
                  <div
                    class="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-900 text-center"
                  >
                    <span class="text-xs text-slate-500 block">Penilaian Tercatat</span>
                    <span class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                      {{ complianceReport.totalAssessments }}
                    </span>
                  </div>
                  <div
                    class="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-900 text-center"
                  >
                    <span class="text-xs text-slate-500 block">Jurnal Mengajar</span>
                    <span class="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">
                      {{ complianceReport.totalJournals }}
                    </span>
                  </div>
                </div>

                <div class="mt-6 space-y-4">
                  <div>
                    <div
                      class="flex justify-between text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400"
                    >
                      <span>Tingkat Kepatuhan Presensi Siswa</span>
                      <span>{{ complianceReport.attendanceComplianceRate }}%</span>
                    </div>
                    <ElProgress
                      :percentage="complianceReport.attendanceComplianceRate"
                      :status="
                        complianceReport.attendanceComplianceRate >= 90
                          ? 'success'
                          : complianceReport.attendanceComplianceRate >= 70
                            ? 'warning'
                            : 'exception'
                      "
                      :stroke-width="12"
                    />
                  </div>

                  <div>
                    <div
                      class="flex justify-between text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400"
                    >
                      <span>Tingkat Kepatuhan Jurnal Mengajar Guru</span>
                      <span>{{ complianceReport.journalComplianceRate }}%</span>
                    </div>
                    <ElProgress
                      :percentage="complianceReport.journalComplianceRate"
                      :status="
                        complianceReport.journalComplianceRate >= 90
                          ? 'success'
                          : complianceReport.journalComplianceRate >= 70
                            ? 'warning'
                            : 'exception'
                      "
                      :stroke-width="12"
                    />
                  </div>
                </div>
              </ElCard>

              <!-- Compliance List Items -->
              <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800">
                <template #header>
                  <span
                    class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <i class="ri-list-check text-rose-600"></i> Checklist Validasi Sebelum Penutupan
                  </span>
                </template>

                <div class="space-y-4">
                  <div
                    class="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30"
                  >
                    <i class="ri-checkbox-circle-fill text-emerald-600 text-lg mt-0.5"></i>
                    <div>
                      <h4 class="font-semibold text-sm text-emerald-900 dark:text-emerald-400"
                        >Master Data Terverifikasi</h4
                      >
                      <p class="text-xs text-slate-500 mt-0.5"
                        >Seluruh kelas rombongan belajar dan data master guru telah divalidasi
                        silang.</p
                      >
                    </div>
                  </div>

                  <div
                    :class="[
                      'flex items-start gap-3 p-3 rounded-lg border',
                      complianceReport.totalAssessments > 0
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30'
                    ]"
                  >
                    <i
                      :class="[
                        complianceReport.totalAssessments > 0
                          ? 'ri-checkbox-circle-fill text-emerald-600'
                          : 'ri-error-warning-fill text-rose-600',
                        'text-lg mt-0.5'
                      ]"
                    ></i>
                    <div>
                      <h4
                        :class="[
                          'font-semibold text-sm',
                          complianceReport.totalAssessments > 0
                            ? 'text-emerald-900 dark:text-emerald-400'
                            : 'text-rose-900 dark:text-rose-400'
                        ]"
                      >
                        Pencatatan Nilai Formatif & Sumatif
                      </h4>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {{
                          complianceReport.totalAssessments > 0
                            ? `Sebanyak ${complianceReport.totalAssessments} instrumen nilai berhasil direkap.`
                            : 'Belum ada data nilai sama sekali yang diisi oleh guru.'
                        }}
                      </p>
                    </div>
                  </div>

                  <div
                    :class="[
                      'flex items-start gap-3 p-3 rounded-lg border',
                      complianceReport.unsubmittedAttendanceCount === 0
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30'
                    ]"
                  >
                    <i
                      :class="[
                        complianceReport.unsubmittedAttendanceCount === 0
                          ? 'ri-checkbox-circle-fill text-emerald-600'
                          : 'ri-error-warning-fill text-amber-600',
                        'text-lg mt-0.5'
                      ]"
                    ></i>
                    <div>
                      <h4
                        :class="[
                          'font-semibold text-sm',
                          complianceReport.unsubmittedAttendanceCount === 0
                            ? 'text-emerald-900 dark:text-emerald-400'
                            : 'text-amber-900 dark:text-amber-400'
                        ]"
                      >
                        Ketersediaan Buku Presensi
                      </h4>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {{
                          complianceReport.unsubmittedAttendanceCount === 0
                            ? 'Semua sesi pengajaran memiliki entri presensi lengkap.'
                            : `Terdapat ${complianceReport.unsubmittedAttendanceCount} jadwal pelajaran tanpa pengisian presensi siswa.`
                        }}
                      </p>
                    </div>
                  </div>
                </div>
              </ElCard>
            </div>

            <!-- Action Panel / Lock Widget -->
            <div>
              <ElCard shadow="never" class="!border-slate-200 dark:!border-slate-800 h-full">
                <template #header>
                  <span
                    class="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"
                  >
                    <i class="ri-shield-keyhole-line text-rose-600"></i> Pengunci Data Semester
                  </span>
                </template>

                <div
                  v-if="selectedYearEntity && selectedYearEntity.isLocked"
                  class="space-y-4 text-center py-6"
                >
                  <div
                    class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border-2 border-slate-200 dark:border-slate-700 mb-2"
                  >
                    <i class="ri-lock-fill text-3xl"></i>
                  </div>
                  <h3 class="font-bold text-lg text-slate-800 dark:text-slate-200"
                    >Semester Telah Ditutup</h3
                  >
                  <p class="text-xs text-slate-500 leading-relaxed px-2">
                    Arsip data transaksional (nilai, presensi, dan log) untuk semester ini telah
                    dibekukan. Guru tidak dapat menambah, mengubah, atau menghapus entri kembali.
                  </p>
                  <div
                    class="text-left bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 p-3 rounded text-xs space-y-1 mt-4"
                  >
                    <div class="flex justify-between text-slate-400">
                      <span>Nama Semester:</span>
                      <span class="font-semibold text-slate-700 dark:text-slate-300">{{
                        selectedYearEntity.name
                      }}</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>Status Lock:</span>
                      <span class="font-bold text-rose-600">TERKUNCI PERMANEN</span>
                    </div>
                    <div
                      class="flex justify-between text-slate-400"
                      v-if="selectedYearEntity.lockedAt"
                    >
                      <span>Waktu Penutupan:</span>
                      <span class="font-semibold text-slate-700 dark:text-slate-300">{{
                        formatDate(selectedYearEntity.lockedAt)
                      }}</span>
                    </div>
                  </div>

                  <!-- Unlock Action with explicit Audit Reason -->
                  <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <ElButton
                      type="warning"
                      plain
                      class="w-full"
                      @click="handleUnlockSemester"
                      :loading="processing"
                    >
                      <i class="ri-lock-unlock-line mr-1"></i> Buka Kunci untuk Koreksi
                      Administratif
                    </ElButton>
                  </div>
                </div>

                <div v-else class="space-y-5">
                  <p class="text-xs text-slate-500 leading-relaxed">
                    Tindakan penutupan semester akan membekukan seluruh modifikasi data oleh guru
                    pada tahun pelajaran
                    <strong
                      >{{ selectedYearEntity?.name }} ({{ selectedYearEntity?.semester }})</strong
                    >.
                  </p>

                  <div
                    class="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-lg text-xs text-rose-800 dark:text-rose-400 space-y-1.5 leading-relaxed"
                  >
                    <div class="font-bold flex items-center gap-1">
                      <i class="ri-alarm-warning-line text-sm"></i> PERINGATAN PENTING:
                    </div>
                    <p
                      >1. Seluruh login GURU akan dicegah melakukan operasi tulis pada data semester
                      ini.</p
                    >
                    <p
                      >2. SyncQueue safety engine akan menolak sinkronisasi perubahan yang datang
                      dari klien offline untuk semester ini.</p
                    >
                    <p
                      >3. Status ini hanya dapat dibuka kembali dengan pencatatan audit log alasan
                      pembukaan.</p
                    >
                  </div>

                  <div class="flex items-start gap-2 mt-4">
                    <ElCheckbox v-model="confirmChecked" id="cb-confirm-closing" />
                    <span
                      class="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer"
                      @click="confirmChecked = !confirmChecked"
                    >
                      Saya memahami konsekuensi ini dan mengonfirmasi untuk membekukan data semester
                      akademik ini.
                    </span>
                  </div>

                  <ElButton
                    type="danger"
                    class="w-full mt-4"
                    :disabled="!confirmChecked || processing"
                    :loading="processing"
                    @click="handleCloseSemester"
                    id="btn-execute-semester-closing"
                  >
                    <i class="ri-lock-line mr-1"></i> Tutup & Bekukan Semester Sekarang
                  </ElButton>
                </div>
              </ElCard>
            </div>
          </div>
        </div>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { repositories } from '@/core/repositories'
  import {
    semesterClosingService,
    type SemesterComplianceReport
  } from '@/core/services/academic/SemesterClosingService'
  import type { AcademicYearEntity } from '@/core/types'
  import AdminSubmissionReviewView from './components/AdminSubmissionReviewView.vue'

  defineOptions({ name: 'AdminSemesterClosing' })

  const activeMainTab = ref('review')
  const loading = ref(true)
  const processing = ref(false)
  const confirmChecked = ref(false)

  const academicYears = ref<AcademicYearEntity[]>([])
  const selectedAcademicYearId = ref('')
  const complianceReport = ref<SemesterComplianceReport | null>(null)

  const selectedYearEntity = computed(() => {
    return academicYears.value.find((y) => y.id === selectedAcademicYearId.value) || null
  })

  // Load active and historical years
  const fetchYears = async () => {
    try {
      const all = await repositories.academicYears.findAll()
      academicYears.value = all.sort((a, b) => b.name.localeCompare(a.name))

      const active = all.find((y) => y.isActive)
      if (active) {
        selectedAcademicYearId.value = active.id
        await handleYearChange(active.id)
      } else if (all.length > 0) {
        selectedAcademicYearId.value = all[0].id
        await handleYearChange(all[0].id)
      }
    } catch (err: any) {
      ElMessage.error('Gagal memuat daftar tahun pelajaran: ' + err.message)
    }
  }

  // Handle selected academic year selection change
  const handleYearChange = async (id: string) => {
    if (!id) {
      complianceReport.value = null
      return
    }
    loading.value = true
    confirmChecked.value = false
    try {
      const report = await semesterClosingService.getSemesterCompliance(id)
      complianceReport.value = report
    } catch (err: any) {
      ElMessage.error('Gagal menganalisis kepatuhan: ' + err.message)
      complianceReport.value = null
    } finally {
      loading.value = false
    }
  }

  // Execute the closure of the selected semester
  const handleCloseSemester = async () => {
    if (!selectedAcademicYearId.value) return

    try {
      await ElMessageBox.confirm(
        `Apakah Anda benar-benar yakin ingin MENUTUP & MEMBEKUKAN semester "${selectedYearEntity.value?.name}" secara permanen?`,
        'Konfirmasi Penutupan Semester',
        {
          confirmButtonText: 'Ya, Tutup Sekarang',
          cancelButtonText: 'Batal',
          type: 'warning',
          buttonSize: 'default'
        }
      )

      processing.value = true
      await semesterClosingService.closeSemester(selectedAcademicYearId.value, { force: true })
      ElMessage.success('Semester berhasil ditutup dan seluruh data dikunci dengan sukses!')

      await fetchYears()
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error('Gagal menutup semester: ' + err.message)
      }
    } finally {
      processing.value = false
    }
  }

  // Handle unlocking semester with audit reason
  const handleUnlockSemester = async () => {
    if (!selectedAcademicYearId.value) return

    try {
      const { value: reason } = await ElMessageBox.prompt(
        'Masukkan alasan pembukaan kunci semester untuk pencatatan audit log:',
        'Buka Kunci Semester',
        {
          confirmButtonText: 'Buka Kunci',
          cancelButtonText: 'Batal',
          inputPattern: /.{5,}/,
          inputErrorMessage: 'Alasan wajib diisi minimal 5 karakter.'
        }
      )

      if (reason) {
        processing.value = true
        await semesterClosingService.unlockSemester(selectedAcademicYearId.value, reason)
        ElMessage.success('Kunci semester berhasil dibuka untuk perbaikan administratif.')
        await fetchYears()
      }
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error('Gagal membuka kunci semester: ' + err.message)
      }
    } finally {
      processing.value = false
    }
  }

  // Standard utility to format date nicely
  const formatDate = (isoStr: string): string => {
    if (!isoStr) return '-'
    const d = new Date(isoStr)
    return (
      d.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB'
    )
  }

  onMounted(() => {
    fetchYears()
  })
</script>

<style scoped>
  .art-card {
    background-color: var(--el-bg-color);
  }
</style>
