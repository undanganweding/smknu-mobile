<template>
  <div class="p-5 space-y-5">
    <!-- Top Header Card -->
    <div class="art-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            OFFLINE DATABASE
          </span>
          <span
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
          >
            KEDISIPLINAN & PRESTASI
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-shield-user-line text-amber-600"></i> Buku Pelanggaran & Prestasi Siswa
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ teacherName }}</span>
          <span>
            &bull; Pencatatan insiden pelanggaran tata tertib, apresiasi prestasi, dan pembinaan
            karakter</span
          >
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Catat Kejadian
        </ElButton>
        <ElButton plain @click="goToDashboard">
          <i class="ri-dashboard-line mr-1"></i> Dashboard
        </ElButton>
      </div>
    </div>

    <!-- Metric Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Notes -->
      <div class="art-card p-4 flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl"
        >
          <i class="ri-file-text-line"></i>
        </div>
        <div>
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Total Catatan</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ stats.total }}</div>
        </div>
      </div>

      <!-- Violations -->
      <div class="art-card p-4 flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 text-2xl"
        >
          <i class="ri-alert-line"></i>
        </div>
        <div>
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Pelanggaran</div>
          <div class="text-2xl font-bold text-rose-600 dark:text-rose-400">{{
            stats.violations
          }}</div>
        </div>
      </div>

      <!-- Praises / Achievements -->
      <div class="art-card p-4 flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl"
        >
          <i class="ri-trophy-line"></i>
        </div>
        <div>
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400"
            >Prestasi / Apresiasi</div
          >
          <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{{
            stats.praises
          }}</div>
        </div>
      </div>

      <!-- Counseling / Notes -->
      <div class="art-card p-4 flex items-center gap-4">
        <div
          class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl"
        >
          <i class="ri-empathize-line"></i>
        </div>
        <div>
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">Pembinaan Karakter</div>
          <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{
            stats.notes
          }}</div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 text-center text-rose-700 dark:text-rose-300 space-y-2"
    >
      <i class="ri-error-warning-line text-3xl"></i>
      <div class="font-semibold text-base">{{ errorMessage }}</div>
      <div class="pt-2">
        <ElButton type="primary" @click="loadData"> Muat Ulang Data </ElButton>
      </div>
    </div>

    <template v-else>
      <!-- Filter Bar -->
      <div class="art-card p-5 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Class Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Filter Kelas
            </label>
            <ElSelect
              v-model="filterClassId"
              placeholder="Semua Kelas"
              clearable
              class="w-full"
              @change="onFilterClassChange"
            >
              <ElOption v-for="c in availableClasses" :key="c.id" :label="c.name" :value="c.id" />
            </ElSelect>
          </div>

          <!-- Student Filter (dependent on class) -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Filter Siswa
            </label>
            <ElSelect
              v-model="filterStudentId"
              placeholder="Semua Siswa"
              clearable
              filterable
              class="w-full"
              :disabled="!filterClassId"
              @change="applyFilters"
            >
              <ElOption
                v-for="s in filteredStudentsForFilter"
                :key="s.id"
                :label="`${s.name} (${s.nis})`"
                :value="s.id"
              />
            </ElSelect>
          </div>

          <!-- Type Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Jenis Catatan
            </label>
            <ElSelect
              v-model="filterType"
              placeholder="Semua Jenis"
              clearable
              class="w-full"
              @change="applyFilters"
            >
              <ElOption label="Semua Jenis" value="ALL" />
              <ElOption label="Pelanggaran (Violation)" value="VIOLATION" />
              <ElOption label="Prestasi (Praise)" value="PRAISE" />
              <ElOption label="Pembinaan (Note)" value="NOTE" />
            </ElSelect>
          </div>

          <!-- Date Range Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Rentang Tanggal
            </label>
            <ElDatePicker
              v-model="filterDateRange"
              type="daterange"
              range-separator="s/d"
              start-placeholder="Mulai"
              end-placeholder="Selesai"
              value-format="YYYY-MM-DD"
              class="!w-full"
              @change="applyFilters"
            />
          </div>
        </div>
      </div>

      <!-- Data Table Card -->
      <div class="art-card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <i class="ri-list-check-2 text-amber-600"></i> Daftar Catatan Kejadian
            <span class="text-xs font-normal text-gray-500"
              >({{ displayedNotes.length }} rekaman)</span
            >
          </h2>
        </div>

        <ElTable
          v-loading="loadingData"
          :data="paginatedNotes"
          border
          stripe
          class="w-full"
          empty-text="Belum ada catatan kedisiplinan atau prestasi yang dicatat."
        >
          <!-- Date Column -->
          <ElTableColumn prop="date" label="Tanggal" width="120" sortable align="center">
            <template #default="{ row }">
              <span class="font-medium text-xs">{{ formatDateDisplay(row.date) }}</span>
            </template>
          </ElTableColumn>

          <!-- Student Column -->
          <ElTableColumn label="Siswa" min-width="180">
            <template #default="{ row }">
              <div>
                <span
                  class="font-semibold text-gray-900 dark:text-gray-100 hover:text-amber-600 cursor-pointer"
                  @click="openStudentDrawer(row.studentId)"
                >
                  {{ row.studentName }}
                </span>
                <div class="text-xs text-gray-400">NIS: {{ row.studentNis }}</div>
              </div>
            </template>
          </ElTableColumn>

          <!-- Class Column -->
          <ElTableColumn prop="className" label="Kelas" width="110" align="center">
            <template #default="{ row }">
              <ElTag size="small" type="info" effect="plain">{{ row.className }}</ElTag>
            </template>
          </ElTableColumn>

          <!-- Type Column -->
          <ElTableColumn label="Jenis" width="130" align="center">
            <template #default="{ row }">
              <ElTag
                v-if="row.type === 'VIOLATION'"
                type="danger"
                effect="light"
                size="small"
                class="font-semibold"
              >
                <i class="ri-alert-line mr-1"></i> Pelanggaran
              </ElTag>
              <ElTag
                v-else-if="row.type === 'PRAISE'"
                type="success"
                effect="light"
                size="small"
                class="font-semibold"
              >
                <i class="ri-trophy-line mr-1"></i> Prestasi
              </ElTag>
              <ElTag v-else type="primary" effect="light" size="small" class="font-semibold">
                <i class="ri-file-text-line mr-1"></i> Pembinaan
              </ElTag>
            </template>
          </ElTableColumn>

          <!-- Point Column -->
          <ElTableColumn label="Poin" width="80" align="center">
            <template #default="{ row }">
              <span
                v-if="typeof row.point === 'number'"
                :class="
                  row.type === 'VIOLATION'
                    ? 'text-rose-600 font-bold'
                    : row.type === 'PRAISE'
                      ? 'text-emerald-600 font-bold'
                      : 'text-gray-600 font-medium'
                "
              >
                {{
                  row.type === 'VIOLATION'
                    ? `-${row.point}`
                    : row.type === 'PRAISE'
                      ? `+${row.point}`
                      : row.point
                }}
              </span>
              <span v-else class="text-gray-400 text-xs">-</span>
            </template>
          </ElTableColumn>

          <!-- Description Column -->
          <ElTableColumn prop="description" label="Deskripsi Kejadian" min-width="220">
            <template #default="{ row }">
              <div
                class="text-sm text-gray-800 dark:text-gray-200 line-clamp-2"
                :title="row.description"
              >
                {{ row.description }}
              </div>
              <div v-if="row.followup" class="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                <i class="ri-arrow-right-s-line"></i> Tindak Lanjut: {{ row.followup }}
              </div>
            </template>
          </ElTableColumn>

          <!-- Teacher Recorder Column -->
          <ElTableColumn prop="teacherName" label="Pencatat" min-width="150">
            <template #default="{ row }">
              <span class="text-xs text-gray-600 dark:text-gray-300">{{ row.teacherName }}</span>
            </template>
          </ElTableColumn>

          <!-- Actions Column -->
          <ElTableColumn label="Aksi" width="160" align="center" fixed="right">
            <template #default="{ row }">
              <div class="flex items-center justify-center gap-1">
                <ElButton
                  size="small"
                  plain
                  type="info"
                  title="Lihat Riwayat Karakter Siswa"
                  @click="openStudentDrawer(row.studentId)"
                >
                  <i class="ri-history-line"></i>
                </ElButton>
                <ElButton
                  v-if="canManageNote(row)"
                  size="small"
                  plain
                  type="primary"
                  title="Edit Catatan"
                  @click="openEditModal(row)"
                >
                  <i class="ri-edit-line"></i>
                </ElButton>
                <ElButton
                  v-if="canManageNote(row)"
                  size="small"
                  plain
                  type="danger"
                  title="Hapus Catatan"
                  @click="confirmDeleteNote(row)"
                >
                  <i class="ri-delete-bin-line"></i>
                </ElButton>
              </div>
            </template>
          </ElTableColumn>
        </ElTable>

        <!-- Pagination -->
        <div v-if="displayedNotes.length > pageSize" class="flex justify-end pt-2">
          <ElPagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="displayedNotes.length"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
          />
        </div>
      </div>
    </template>

    <!-- Create / Edit Note Dialog -->
    <ElDialog
      v-model="modalVisible"
      :title="
        modalMode === 'CREATE' ? 'Catat Kejadian Disiplin / Prestasi' : 'Edit Catatan Kejadian'
      "
      width="560px"
      destroy-on-close
    >
      <ElForm
        ref="noteFormRef"
        :model="formModel"
        :rules="formRules"
        label-position="top"
        class="space-y-4"
      >
        <!-- Class Selector -->
        <ElFormItem label="Kelas / Rombel" prop="classId">
          <ElSelect
            v-model="formModel.classId"
            placeholder="Pilih Kelas"
            class="w-full"
            :disabled="modalMode === 'EDIT'"
            @change="onFormClassChange"
          >
            <ElOption v-for="c in availableClasses" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </ElFormItem>

        <!-- Student Selector -->
        <ElFormItem label="Nama Siswa" prop="studentId">
          <ElSelect
            v-model="formModel.studentId"
            placeholder="Pilih Siswa"
            filterable
            class="w-full"
            :disabled="modalMode === 'EDIT' || !formModel.classId"
          >
            <ElOption
              v-for="s in formStudentsList"
              :key="s.id"
              :label="`${s.name} (${s.nis})`"
              :value="s.id"
            />
          </ElSelect>
        </ElFormItem>

        <!-- Date & Type Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ElFormItem label="Tanggal Kejadian" prop="date">
            <ElDatePicker
              v-model="formModel.date"
              type="date"
              placeholder="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>

          <ElFormItem label="Jenis Catatan" prop="type">
            <ElSelect v-model="formModel.type" class="w-full">
              <ElOption label="Pelanggaran (Violation)" value="VIOLATION" />
              <ElOption label="Prestasi (Praise)" value="PRAISE" />
              <ElOption label="Pembinaan (Note)" value="NOTE" />
            </ElSelect>
          </ElFormItem>
        </div>

        <!-- Point Input (Optional) -->
        <ElFormItem label="Bobot Poin (Opsional)" prop="point">
          <ElInputNumber
            v-model="formModel.point"
            :min="0"
            :max="100"
            :step="5"
            placeholder="0"
            class="!w-full"
          />
          <div class="text-xs text-gray-400 mt-1">
            Contoh: Pelanggaran (+10 poin penalti), Prestasi (+25 poin reward), Pembinaan (0 /
            kosong).
          </div>
        </ElFormItem>

        <!-- Description Textarea -->
        <ElFormItem label="Deskripsi / Kronologi Kejadian" prop="description">
          <ElInput
            v-model="formModel.description"
            type="textarea"
            :rows="3"
            placeholder="Uraikan kejadian, pelanggaran, atau prestasi secara jelas dan objektif..."
          />
        </ElFormItem>

        <!-- Follow-up Textarea (Optional) -->
        <ElFormItem label="Tindak Lanjut / Penanganan (Opsional)" prop="followup">
          <ElInput
            v-model="formModel.followup"
            type="textarea"
            :rows="2"
            placeholder="Misal: Diberikan teguran lisan, konseling BK, pemberian sertifikat penghargaan..."
          />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="modalVisible = false">Batal</ElButton>
          <ElButton type="primary" :loading="savingNote" @click="submitNoteForm">
            {{ modalMode === 'CREATE' ? 'Simpan Catatan' : 'Perbarui Catatan' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- Student Character History Drawer -->
    <ElDrawer
      v-model="drawerVisible"
      title="Riwayat Karakter & Prestasi Siswa"
      size="480px"
      destroy-on-close
    >
      <div v-if="studentSummary" class="space-y-5">
        <!-- Student Info Header -->
        <div
          class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-2 border border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-lg"
            >
              {{ studentSummary.studentName.charAt(0) }}
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-gray-100 text-base">
                {{ studentSummary.studentName }}
              </h3>
              <p class="text-xs text-gray-500"
                >NIS: {{ studentSummary.studentNis }} &bull; {{ studentSummary.className }}</p
              >
            </div>
          </div>
        </div>

        <!-- Mini Stats Grid -->
        <div class="grid grid-cols-4 gap-2 text-center">
          <div
            class="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900"
          >
            <div class="text-lg font-bold text-blue-600">{{ studentSummary.totalNotes }}</div>
            <div class="text-[10px] text-gray-500 font-medium">Total</div>
          </div>
          <div
            class="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900"
          >
            <div class="text-lg font-bold text-rose-600">{{ studentSummary.violationCount }}</div>
            <div class="text-[10px] text-gray-500 font-medium">Pelanggaran</div>
          </div>
          <div
            class="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900"
          >
            <div class="text-lg font-bold text-emerald-600">{{ studentSummary.praiseCount }}</div>
            <div class="text-[10px] text-gray-500 font-medium">Prestasi</div>
          </div>
          <div
            class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900"
          >
            <div
              class="text-lg font-bold"
              :class="studentSummary.totalPoints >= 0 ? 'text-emerald-600' : 'text-rose-600'"
            >
              {{
                studentSummary.totalPoints > 0
                  ? `+${studentSummary.totalPoints}`
                  : studentSummary.totalPoints
              }}
            </div>
            <div class="text-[10px] text-gray-500 font-medium">Net Poin</div>
          </div>
        </div>

        <!-- Chronological Timeline -->
        <div class="space-y-3 pt-2">
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Linimasa Catatan Kejadian ({{ studentSummary.notes.length }})
          </h4>

          <div
            v-if="studentSummary.notes.length === 0"
            class="text-center py-8 text-gray-400 text-sm"
          >
            Belum ada rekaman kedisiplinan atau prestasi untuk siswa ini.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="note in studentSummary.notes"
              :key="note.id"
              class="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1.5 shadow-sm"
            >
              <div class="flex items-center justify-between">
                <ElTag v-if="note.type === 'VIOLATION'" type="danger" size="small" effect="light">
                  Pelanggaran {{ note.point ? `(-${note.point} poin)` : '' }}
                </ElTag>
                <ElTag
                  v-else-if="note.type === 'PRAISE'"
                  type="success"
                  size="small"
                  effect="light"
                >
                  Prestasi {{ note.point ? `(+${note.point} poin)` : '' }}
                </ElTag>
                <ElTag v-else type="primary" size="small" effect="light"> Pembinaan </ElTag>
                <span class="text-xs text-gray-400">{{ formatDateDisplay(note.date) }}</span>
              </div>
              <p class="text-sm text-gray-800 dark:text-gray-200">{{ note.description }}</p>
              <div
                v-if="note.followup"
                class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded"
              >
                <strong>Tindak Lanjut:</strong> {{ note.followup }}
              </div>
              <div class="text-[11px] text-gray-400 text-right">
                Pencatat: {{ note.teacherName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import {
    authService,
    disciplineService,
    type ResolvedDisciplineNoteItem,
    type StudentDisciplineSummary
  } from '@/core/services'
  import { repositories } from '@/core/repositories'
  import type { ClassEntity, StudentEntity, SessionData, DisciplineType } from '@/core/types'

  const router = useRouter()

  // State
  const loadingData = ref(true)
  const errorMessage = ref('')
  const currentSession = ref<SessionData | null>(null)
  const teacherName = computed(
    () => currentSession.value?.teacherName || currentSession.value?.username || 'Guru'
  )

  // Raw Master Collections
  const availableClasses = ref<ClassEntity[]>([])
  const allStudents = ref<StudentEntity[]>([])
  const allNotes = ref<ResolvedDisciplineNoteItem[]>([])

  // Filter State
  const filterClassId = ref<string>('')
  const filterStudentId = ref<string>('')
  const filterType = ref<DisciplineType | 'ALL'>('ALL')
  const filterDateRange = ref<[string, string] | null>(null)

  // Pagination
  const currentPage = ref(1)
  const pageSize = ref(10)

  // Computed Filtered Students for Filter Dropdown
  const filteredStudentsForFilter = computed(() => {
    if (!filterClassId.value) return []
    return allStudents.value.filter((s) => s.classId === filterClassId.value)
  })

  // Metrics Computation
  const stats = computed(() => {
    let total = 0
    let violations = 0
    let praises = 0
    let notes = 0

    for (const n of allNotes.value) {
      total++
      if (n.type === 'VIOLATION') violations++
      else if (n.type === 'PRAISE') praises++
      else if (n.type === 'NOTE') notes++
    }

    return { total, violations, praises, notes }
  })

  // Displayed Notes after in-memory filters
  const displayedNotes = computed(() => {
    return allNotes.value.filter((n) => {
      if (filterClassId.value && n.classId !== filterClassId.value) return false
      if (filterStudentId.value && n.studentId !== filterStudentId.value) return false
      if (filterType.value && filterType.value !== 'ALL' && n.type !== filterType.value)
        return false
      if (filterDateRange.value && filterDateRange.value.length === 2) {
        if (n.date < filterDateRange.value[0] || n.date > filterDateRange.value[1]) return false
      }
      return true
    })
  })

  const paginatedNotes = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return displayedNotes.value.slice(start, start + pageSize.value)
  })

  // Create / Edit Modal State
  const modalVisible = ref(false)
  const modalMode = ref<'CREATE' | 'EDIT'>('CREATE')
  const activeEditId = ref<string | null>(null)
  const savingNote = ref(false)
  const noteFormRef = ref<FormInstance>()

  const formModel = reactive({
    classId: '',
    studentId: '',
    date: disciplineService.getLocalDateString(),
    type: 'VIOLATION' as DisciplineType,
    point: undefined as number | undefined,
    description: '',
    followup: ''
  })

  const formRules: FormRules = {
    classId: [{ required: true, message: 'Pilih kelas siswa', trigger: 'change' }],
    studentId: [{ required: true, message: 'Pilih nama siswa', trigger: 'change' }],
    date: [{ required: true, message: 'Pilih tanggal kejadian', trigger: 'change' }],
    type: [{ required: true, message: 'Pilih jenis catatan', trigger: 'change' }],
    description: [{ required: true, message: 'Uraikan deskripsi kejadian', trigger: 'blur' }]
  }

  const formStudentsList = computed(() => {
    if (!formModel.classId) return []
    return allStudents.value.filter((s) => s.classId === formModel.classId)
  })

  // Drawer State
  const drawerVisible = ref(false)
  const studentSummary = ref<StudentDisciplineSummary | null>(null)

  // Navigation
  function goToDashboard() {
    router.push('/teacher/dashboard')
  }

  function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '-'
    try {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  function canManageNote(note: any): boolean {
    if (!currentSession.value || !note) return false
    if (currentSession.value.role === 'ADMIN') return true
    return note.teacherId === currentSession.value.teacherId
  }

  // Filter Event Handlers
  function onFilterClassChange() {
    filterStudentId.value = ''
    currentPage.value = 1
    applyFilters()
  }

  function applyFilters() {
    currentPage.value = 1
  }

  function onFormClassChange() {
    formModel.studentId = ''
  }

  // Load Data
  async function loadData() {
    loadingData.value = true
    errorMessage.value = ''
    try {
      currentSession.value = authService.getCurrentSession()
      if (!currentSession.value) {
        errorMessage.value = 'Sesi pengguna tidak valid. Silakan login kembali.'
        return
      }

      const [classes, students, notes] = await Promise.all([
        repositories.classes.findAll(),
        repositories.students.findAll(),
        disciplineService.getNotes()
      ])

      // Sort classes by name
      classes.sort((a, b) => a.name.localeCompare(b.name))
      availableClasses.value = classes

      // Sort students by name
      students.sort((a, b) => a.name.localeCompare(b.name))
      allStudents.value = students

      allNotes.value = notes
    } catch (err: any) {
      console.error('Error loading discipline data:', err)
      errorMessage.value = err.message || 'Gagal memuat data kedisiplinan.'
    } finally {
      loadingData.value = false
    }
  }

  // Open Modal Handlers
  function openCreateModal() {
    modalMode.value = 'CREATE'
    activeEditId.value = null
    formModel.classId = filterClassId.value || (availableClasses.value[0]?.id ?? '')
    formModel.studentId = ''
    formModel.date = disciplineService.getLocalDateString()
    formModel.type = 'VIOLATION'
    formModel.point = undefined
    formModel.description = ''
    formModel.followup = ''
    modalVisible.value = true
  }

  function openEditModal(note: any) {
    modalMode.value = 'EDIT'
    activeEditId.value = note.id
    formModel.classId = note.classId
    formModel.studentId = note.studentId
    formModel.date = note.date
    formModel.type = note.type
    formModel.point = note.point
    formModel.description = note.description
    formModel.followup = note.followup || ''
    modalVisible.value = true
  }

  // Submit Modal Form
  async function submitNoteForm() {
    if (!noteFormRef.value) return
    await noteFormRef.value.validate(async (valid) => {
      if (!valid) return
      savingNote.value = true
      try {
        if (modalMode.value === 'CREATE') {
          await disciplineService.createNote({
            classId: formModel.classId,
            studentId: formModel.studentId,
            date: formModel.date,
            type: formModel.type,
            point: formModel.point,
            description: formModel.description,
            followup: formModel.followup
          })
          ElMessage.success('Catatan berhasil disimpan ke IndexedDB.')
        } else if (modalMode.value === 'EDIT' && activeEditId.value) {
          await disciplineService.updateNote(activeEditId.value, {
            date: formModel.date,
            type: formModel.type,
            point: formModel.point,
            description: formModel.description,
            followup: formModel.followup
          })
          ElMessage.success('Catatan berhasil diperbarui.')
        }

        modalVisible.value = false
        await loadData()
      } catch (err: any) {
        console.error('Save note error:', err)
        ElMessage.error(err.message || 'Gagal menyimpan catatan.')
      } finally {
        savingNote.value = false
      }
    })
  }

  // Delete Note Handler
  async function confirmDeleteNote(note: any) {
    try {
      await ElMessageBox.confirm(
        `Apakah Anda yakin ingin menghapus catatan untuk "${note.studentName}" tanggal ${formatDateDisplay(note.date)}?`,
        'Konfirmasi Hapus Catatan',
        {
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal',
          type: 'warning'
        }
      )

      loadingData.value = true
      await disciplineService.deleteNote(note.id)
      ElMessage.success('Catatan berhasil dihapus.')
      await loadData()
    } catch (action) {
      if (action !== 'cancel') {
        console.error('Delete note error:', action)
      }
    } finally {
      loadingData.value = false
    }
  }

  // Drawer Handler
  async function openStudentDrawer(studentId: string) {
    try {
      const summary = await disciplineService.getStudentDisciplineSummary(studentId)
      studentSummary.value = summary
      drawerVisible.value = true
    } catch (err: any) {
      console.error('Error fetching student summary:', err)
      ElMessage.error(err.message || 'Gagal memuat ringkasan karakter siswa.')
    }
  }

  onMounted(() => {
    loadData()
  })
</script>

<style scoped>
  .art-card {
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 12px;
  }
</style>
