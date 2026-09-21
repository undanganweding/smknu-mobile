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
            class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
          >
            PENILAIAN SISWA
          </span>
        </div>
        <h1
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2 flex items-center gap-2"
        >
          <i class="ri-file-list-3-line text-indigo-600"></i> Penilaian & Asesmen Pembelajaran
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span class="font-semibold text-gray-800 dark:text-gray-200">{{ teacherName }}</span>
          <span> &bull; Kelola nilai ulangan harian, tugas, kuis, STS, dan SAS</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <ElButton type="primary" @click="openCreateModal">
          <i class="ri-add-line mr-1"></i> Buat Assessment
        </ElButton>
        <ElButton plain @click="goToSchedule">
          <i class="ri-calendar-schedule-line mr-1"></i> Jadwal Mengajar
        </ElButton>
        <ElButton plain @click="goToDashboard">
          <i class="ri-dashboard-line mr-1"></i> Dashboard
        </ElButton>
      </div>
    </div>

    <!-- Error / Access Alert -->
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
      <!-- Filter & Search Bar -->
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
              @change="applyFilters"
            >
              <ElOption v-for="c in uniqueClasses" :key="c.id" :label="c.name" :value="c.id" />
            </ElSelect>
          </div>

          <!-- Subject Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Filter Mata Pelajaran
            </label>
            <ElSelect
              v-model="filterSubjectId"
              placeholder="Semua Mapel"
              clearable
              class="w-full"
              @change="applyFilters"
            >
              <ElOption v-for="s in uniqueSubjects" :key="s.id" :label="s.name" :value="s.id" />
            </ElSelect>
          </div>

          <!-- Assessment Type Filter -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Jenis Assessment
            </label>
            <ElSelect
              v-model="filterType"
              placeholder="Semua Jenis"
              clearable
              class="w-full"
              @change="applyFilters"
            >
              <ElOption label="Semua Jenis" value="" />
              <ElOption label="Ulangan Harian (UH)" value="HARIAN" />
              <ElOption label="Tugas" value="TUGAS" />
              <ElOption label="Kuis" value="KUIS" />
              <ElOption label="Sumatif Tengah Semester (STS)" value="STS" />
              <ElOption label="Sumatif Akhir Semester (SAS)" value="SAS" />
              <ElOption label="Penilaian Sikap" value="SIKAP" />
              <ElOption label="Keterampilan / Praktik" value="KETERAMPILAN" />
            </ElSelect>
          </div>

          <!-- Search Keyword -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Cari Assessment
            </label>
            <ElInput
              v-model="searchKeyword"
              placeholder="Cari judul / materi..."
              clearable
              prefix-icon="ri-search-line"
              @input="applyFilters"
            />
          </div>
        </div>

        <div
          class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500"
        >
          <span
            >Menampilkan <strong>{{ filteredAssessments.length }}</strong> penilaian</span
          >
          <ElButton size="small" text @click="resetFilters">
            <i class="ri-refresh-line mr-1"></i> Reset Filter
          </ElButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-16 text-center text-gray-400">
        <i class="ri-loader-4-line text-3xl animate-spin"></i>
        <p class="mt-2 text-sm">Memuat daftar penilaian...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredAssessments.length === 0" class="art-card p-12 text-center">
        <div
          class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 mx-auto flex items-center justify-center text-3xl mb-4"
        >
          <i class="ri-file-list-3-line"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Belum Ada Data Penilaian
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1">
          {{
            searchKeyword || filterClassId || filterSubjectId || filterType
              ? 'Tidak ditemukan assessment yang sesuai dengan filter yang dipilih.'
              : 'Buat assessment pertama untuk kelas dan mata pelajaran yang Anda ampu.'
          }}
        </p>
        <div class="mt-6 flex justify-center gap-3">
          <ElButton
            v-if="searchKeyword || filterClassId || filterSubjectId || filterType"
            plain
            @click="resetFilters"
          >
            Reset Filter
          </ElButton>
          <ElButton type="primary" @click="openCreateModal">
            <i class="ri-add-line mr-1"></i> Buat Assessment Baru
          </ElButton>
        </div>
      </div>

      <!-- Assessment Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in filteredAssessments"
          :key="item.id"
          class="art-card hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
        >
          <div class="space-y-3">
            <!-- Badges & Date -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="px-2.5 py-0.5 text-xs font-semibold rounded-md uppercase"
                :class="getTypeBadgeClass(item.type)"
              >
                {{ getTypeLabel(item.type) }}
              </span>
              <span class="text-xs text-gray-400 flex items-center gap-1 font-mono">
                <i class="ri-calendar-line"></i> {{ item.date }}
              </span>
            </div>

            <!-- Title & Class -->
            <div>
              <h3 class="font-bold text-gray-900 dark:text-gray-100 text-base line-clamp-1">
                {{ item.title }}
              </h3>
              <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <span class="font-semibold text-indigo-600 dark:text-indigo-400">{{
                  item.className
                }}</span>
                <span>&bull;</span>
                <span class="truncate">{{ item.subjectName }}</span>
              </div>
            </div>

            <!-- Scoring Progress -->
            <div class="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">Progress Penilaian:</span>
                <span
                  class="font-semibold"
                  :class="
                    item.statistics.ungradedCount === 0 && item.statistics.totalStudents > 0
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  "
                >
                  {{ item.statistics.gradedCount }} / {{ item.statistics.totalStudents }} Siswa
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-1.5 rounded-full transition-all duration-300"
                  :class="
                    item.statistics.ungradedCount === 0 && item.statistics.totalStudents > 0
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  "
                  :style="{
                    width:
                      item.statistics.totalStudents > 0
                        ? `${(item.statistics.gradedCount / item.statistics.totalStudents) * 100}%`
                        : '0%'
                  }"
                ></div>
              </div>

              <!-- Mini Stats -->
              <div
                class="grid grid-cols-3 gap-1 pt-1 text-center font-mono text-[11px] border-t border-gray-100 dark:border-gray-800 text-gray-500"
              >
                <div>
                  <span class="block text-[10px] text-gray-400">RATA-RATA</span>
                  <strong class="text-gray-800 dark:text-gray-200">
                    {{ item.statistics.averageScore !== null ? item.statistics.averageScore : '-' }}
                  </strong>
                </div>
                <div>
                  <span class="block text-[10px] text-gray-400">MIN</span>
                  <strong class="text-gray-800 dark:text-gray-200">
                    {{ item.statistics.minScore !== null ? item.statistics.minScore : '-' }}
                  </strong>
                </div>
                <div>
                  <span class="block text-[10px] text-gray-400">MAX</span>
                  <strong class="text-gray-800 dark:text-gray-200">
                    {{ item.statistics.maxScore !== null ? item.statistics.maxScore : '-' }}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Card Actions -->
          <div
            class="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2"
          >
            <div class="text-xs text-gray-400">
              Max:
              <span class="font-semibold text-gray-600 dark:text-gray-300">{{
                item.maxScore
              }}</span>
              <span class="mx-1">&bull;</span>
              KKM:
              <span class="font-semibold text-gray-600 dark:text-gray-300">{{ item.kkm }}</span>
            </div>

            <div class="flex items-center gap-1">
              <ElButton type="primary" size="small" @click="openScoreModal(item.id)">
                <i class="ri-edit-2-line mr-1"></i> Input Nilai
              </ElButton>

              <ElDropdown trigger="click" @command="(cmd: string) => handleCardAction(cmd, item)">
                <ElButton size="small" plain class="!px-2">
                  <i class="ri-more-2-fill"></i>
                </ElButton>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="edit">
                      <i class="ri-pencil-line mr-1"></i> Edit Info
                    </ElDropdownItem>
                    <ElDropdownItem command="delete" divided class="!text-rose-600">
                      <i class="ri-delete-bin-line mr-1"></i> Hapus Assessment
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal: Buat / Edit Assessment -->
    <ElDialog
      v-model="showFormModal"
      :title="isEditMode ? 'Edit Informasi Assessment' : 'Buat Assessment Baru'"
      width="560px"
      destroy-on-close
    >
      <ElForm
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-position="top"
        class="space-y-3"
      >
        <!-- Assignment Selection (Disabled in edit mode) -->
        <ElFormItem label="Penugasan Kelas & Mata Pelajaran" prop="teacherAssignmentId">
          <ElSelect
            v-model="formModel.teacherAssignmentId"
            placeholder="Pilih kelas dan mata pelajaran..."
            class="w-full"
            :disabled="isEditMode"
            @change="onAssignmentSelected"
          >
            <ElOption
              v-for="opt in assignmentOptions"
              :key="opt.assignmentId"
              :label="`${opt.className} - ${opt.subjectName} (KKM: ${opt.kkm})`"
              :value="opt.assignmentId"
            />
          </ElSelect>
          <span v-if="isEditMode" class="text-xs text-gray-400 mt-1">
            Kelas dan mata pelajaran tidak dapat diubah untuk menjaga integritas nilai siswa.
          </span>
        </ElFormItem>

        <!-- Assessment Title -->
        <ElFormItem label="Judul / Nama Assessment" prop="title">
          <ElInput
            v-model="formModel.title"
            placeholder="Contoh: Ulangan Harian 1 - Logika Gerbang Digital"
            maxlength="100"
            show-word-limit
          />
        </ElFormItem>

        <!-- Grid: Type & Date & Max Score -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ElFormItem label="Jenis Assessment" prop="type">
            <ElSelect v-model="formModel.type" placeholder="Pilih jenis" class="w-full">
              <ElOption label="Ulangan Harian" value="HARIAN" />
              <ElOption label="Tugas" value="TUGAS" />
              <ElOption label="Kuis" value="KUIS" />
              <ElOption label="STS" value="STS" />
              <ElOption label="SAS" value="SAS" />
              <ElOption label="Sikap" value="SIKAP" />
              <ElOption label="Keterampilan" value="KETERAMPILAN" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem label="Tanggal" prop="date">
            <ElDatePicker
              v-model="formModel.date"
              type="date"
              placeholder="Tanggal"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="!w-full"
            />
          </ElFormItem>

          <ElFormItem label="Nilai Maksimum" prop="maxScore">
            <ElInputNumber
              v-model="formModel.maxScore"
              :min="10"
              :max="1000"
              :step="10"
              class="!w-full"
            />
          </ElFormItem>
        </div>
      </ElForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <ElButton @click="showFormModal = false">Batal</ElButton>
          <ElButton type="primary" :loading="savingForm" @click="submitAssessmentForm">
            <i class="ri-save-line mr-1"></i>
            {{ isEditMode ? 'Simpan Perubahan' : 'Buat Assessment' }}
          </ElButton>
        </div>
      </template>
    </ElDialog>

    <!-- Modal / Drawer: Input Nilai Siswa -->
    <ElDrawer
      v-model="showScoreModal"
      title="Input Nilai Siswa"
      size="880px"
      destroy-on-close
      :before-close="handleScoreModalClose"
    >
      <div v-if="loadingDetail" class="py-20 text-center text-gray-400">
        <i class="ri-loader-4-line text-3xl animate-spin"></i>
        <p class="mt-2 text-sm">Memuat data siswa dan nilai...</p>
      </div>

      <div v-else-if="activeDetail" class="space-y-5 pb-8">
        <!-- Assessment Context Header -->
        <div
          class="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 space-y-2"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span
                class="px-2 py-0.5 text-xs font-semibold rounded uppercase"
                :class="getTypeBadgeClass(activeDetail.assessment.type)"
              >
                {{ getTypeLabel(activeDetail.assessment.type) }}
              </span>
              <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                {{ activeDetail.assessment.title }}
              </h2>
            </div>
            <div class="text-right text-xs text-gray-500 font-mono">
              <div
                >Tanggal: <strong>{{ activeDetail.assessment.date }}</strong></div
              >
              <div
                >Nilai Maksimum: <strong>{{ activeDetail.assessment.maxScore }}</strong> &bull; KKM:
                <strong>{{ activeDetail.assessment.kkm }}</strong></div
              >
            </div>
          </div>

          <div
            class="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/50"
          >
            <div
              >Kelas:
              <strong class="text-indigo-700 dark:text-indigo-300">{{
                activeDetail.assessment.className
              }}</strong></div
            >
            <div
              >Mata Pelajaran: <strong>{{ activeDetail.assessment.subjectName }}</strong></div
            >
            <div
              >Tahun / Sem:
              <strong
                >{{ activeDetail.assessment.academicYearName }} ({{
                  activeDetail.assessment.semester
                }})</strong
              ></div
            >
          </div>
        </div>

        <!-- Live Statistics Counter -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center font-mono">
          <div
            class="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <span class="block text-[11px] text-gray-400">TOTAL SISWA</span>
            <span class="text-base font-bold text-gray-800 dark:text-gray-200">
              {{ localStatistics.totalStudents }}
            </span>
          </div>

          <div
            class="bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/50"
          >
            <span class="block text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold"
              >SUDAH DINILAI</span
            >
            <span class="text-base font-bold text-emerald-700 dark:text-emerald-300">
              {{ localStatistics.gradedCount }}
            </span>
          </div>

          <div
            class="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-800/50"
          >
            <span class="block text-[11px] text-amber-600 dark:text-amber-400 font-semibold"
              >BELUM DIISI</span
            >
            <span class="text-base font-bold text-amber-700 dark:text-amber-300">
              {{ localStatistics.ungradedCount }}
            </span>
          </div>

          <div
            class="bg-blue-50/60 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-100 dark:border-blue-800/50"
          >
            <span class="block text-[11px] text-blue-600 dark:text-blue-400 font-semibold"
              >RATA-RATA</span
            >
            <span class="text-base font-bold text-blue-700 dark:text-blue-300">
              {{ localStatistics.averageScore !== null ? localStatistics.averageScore : '-' }}
            </span>
          </div>

          <div
            class="bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-100 dark:border-purple-800/50"
          >
            <span class="block text-[11px] text-purple-600 dark:text-purple-400 font-semibold"
              >MIN / MAX</span
            >
            <span class="text-xs font-bold text-purple-700 dark:text-purple-300">
              {{ localStatistics.minScore !== null ? localStatistics.minScore : '-' }} /
              {{ localStatistics.maxScore !== null ? localStatistics.maxScore : '-' }}
            </span>
          </div>

          <div
            class="bg-teal-50/60 dark:bg-teal-950/30 p-2.5 rounded-lg border border-teal-100 dark:border-teal-800/50"
          >
            <span class="block text-[11px] text-teal-600 dark:text-teal-400 font-semibold"
              >TUNTAS KKM</span
            >
            <span class="text-base font-bold text-teal-700 dark:text-teal-300">
              {{ localStatistics.passedKkmCount }}
            </span>
          </div>
        </div>

        <!-- Roster Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div class="flex items-center gap-2">
            <ElRadioGroup v-model="rosterFilter" size="small">
              <ElRadioButton label="ALL">Semua ({{ localRoster.length }})</ElRadioButton>
              <ElRadioButton label="UNGRADED"
                >Belum Diisi ({{ localStatistics.ungradedCount }})</ElRadioButton
              >
              <ElRadioButton label="GRADED"
                >Sudah Dinilai ({{ localStatistics.gradedCount }})</ElRadioButton
              >
            </ElRadioGroup>
          </div>

          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>Input otomatis menyimpan status. Dukungan desimal (misal 85.5).</span>
          </div>
        </div>

        <!-- Student Scoring Table -->
        <div
          class="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm"
        >
          <table class="w-full text-left text-sm">
            <thead
              class="bg-gray-50 dark:bg-gray-900/80 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800"
            >
              <tr>
                <th class="py-3 px-3 w-12 text-center">No</th>
                <th class="py-3 px-3 w-28">NIS</th>
                <th class="py-3 px-4">Nama Siswa</th>
                <th class="py-3 px-2 w-12 text-center">L/P</th>
                <th class="py-3 px-3 w-36 text-center"
                  >Nilai (0-{{ activeDetail.assessment.maxScore }})</th
                >
                <th class="py-3 px-3 w-28 text-center">Status</th>
                <th class="py-3 px-3">Catatan / Feedback</th>
                <th class="py-3 px-2 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(st, idx) in filteredRoster"
                :key="st.studentId"
                class="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                :class="{
                  'bg-amber-50/20 dark:bg-amber-950/10':
                    st.rawScore === '' || st.rawScore === undefined || st.rawScore === null
                }"
              >
                <td class="py-2.5 px-3 text-center text-xs font-mono text-gray-400">
                  {{ idx + 1 }}
                </td>
                <td class="py-2.5 px-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                  {{ st.nis || '-' }}
                </td>
                <td class="py-2.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                  {{ st.name }}
                </td>
                <td
                  class="py-2.5 px-2 text-center text-xs font-semibold"
                  :class="st.gender === 'L' ? 'text-blue-600' : 'text-pink-600'"
                >
                  {{ st.gender }}
                </td>

                <!-- Score Input Field -->
                <td class="py-2 px-3 text-center">
                  <ElInput
                    v-model="st.rawScore"
                    placeholder="Belum diisi"
                    size="small"
                    class="!w-28 text-center font-mono"
                    :class="{ '!border-rose-400': st.hasError }"
                    @input="onScoreInputChange(st)"
                  />
                </td>

                <!-- KKM / Graded Status -->
                <td class="py-2.5 px-3 text-center">
                  <span
                    v-if="st.rawScore !== '' && st.rawScore !== undefined && st.rawScore !== null"
                    class="px-2 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center gap-1"
                    :class="
                      Number(st.rawScore) >= activeDetail.assessment.kkm
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    "
                  >
                    <i
                      :class="
                        Number(st.rawScore) >= activeDetail.assessment.kkm
                          ? 'ri-check-line'
                          : 'ri-close-line'
                      "
                    ></i>
                    {{ Number(st.rawScore) >= activeDetail.assessment.kkm ? 'Tuntas' : 'Remidi' }}
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    Belum diisi
                  </span>
                </td>

                <!-- Feedback Input -->
                <td class="py-2 px-3">
                  <ElInput
                    v-model="st.feedback"
                    placeholder="Catatan guru..."
                    size="small"
                    clearable
                  />
                </td>

                <!-- Clear Button -->
                <td class="py-2 px-2 text-center">
                  <ElTooltip content="Kosongkan Nilai" placement="top">
                    <ElButton
                      size="small"
                      text
                      type="danger"
                      :disabled="st.rawScore === '' || st.rawScore === undefined"
                      @click="clearStudentScore(st)"
                    >
                      <i class="ri-eraser-line"></i>
                    </ElButton>
                  </ElTooltip>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <div
          class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800"
        >
          <div class="text-xs text-gray-500">
            <span
              >{{ localStatistics.gradedCount }} dari {{ localStatistics.totalStudents }} siswa
              telah dinilai</span
            >
          </div>

          <div class="flex items-center gap-2">
            <ElButton @click="showScoreModal = false">Tutup</ElButton>
            <ElButton type="primary" :loading="savingScores" @click="saveAllScores">
              <i class="ri-save-line mr-1"></i> Simpan Nilai
            </ElButton>
          </div>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import {
    ElMessage,
    ElMessageBox,
    ElButton,
    ElSelect,
    ElOption,
    ElInput,
    ElDialog,
    ElDrawer,
    ElForm,
    ElFormItem,
    ElDatePicker,
    ElInputNumber,
    type FormInstance,
    type FormRules
  } from 'element-plus'
  import { authService } from '@/core/services/auth/AuthService'
  import {
    assessmentService,
    type ResolvedAssessmentItem,
    type AssessmentDetailData,
    type TeacherAssignmentOption,
    type AssessmentStatistics
  } from '@/core/services/assessment/AssessmentService'
  import type { AssessmentType } from '@/core/types'

  const router = useRouter()

  // State
  const loading = ref(false)
  const errorMessage = ref('')
  const teacherName = ref('')
  const allAssessments = ref<ResolvedAssessmentItem[]>([])
  const assignmentOptions = ref<TeacherAssignmentOption[]>([])

  // Filters
  const filterClassId = ref('')
  const filterSubjectId = ref('')
  const filterType = ref('')
  const searchKeyword = ref('')

  // Modals
  const showFormModal = ref(false)
  const isEditMode = ref(false)
  const editingAssessmentId = ref('')
  const savingForm = ref(false)
  const formRef = ref<FormInstance>()

  const formModel = ref<{
    teacherAssignmentId: string
    classId: string
    type: AssessmentType
    title: string
    date: string
    maxScore: number
  }>({
    teacherAssignmentId: '',
    classId: '',
    type: 'HARIAN',
    title: '',
    date: '',
    maxScore: 100
  })

  const formRules: FormRules = {
    teacherAssignmentId: [
      { required: true, message: 'Pilih penugasan kelas dan mapel', trigger: 'change' }
    ],
    title: [
      { required: true, message: 'Judul penilaian wajib diisi', trigger: 'blur' },
      { min: 3, message: 'Judul minimal 3 karakter', trigger: 'blur' }
    ],
    type: [{ required: true, message: 'Pilih jenis assessment', trigger: 'change' }],
    date: [{ required: true, message: 'Pilih tanggal pelaksanaan', trigger: 'change' }],
    maxScore: [{ required: true, message: 'Nilai maksimum wajib diisi', trigger: 'blur' }]
  }

  // Scoring Drawer State
  const showScoreModal = ref(false)
  const loadingDetail = ref(false)
  const savingScores = ref(false)
  const activeDetail = ref<AssessmentDetailData | null>(null)
  const rosterFilter = ref<'ALL' | 'UNGRADED' | 'GRADED'>('ALL')

  interface LocalRosterItem {
    studentId: string
    nis: string
    nisn?: string
    name: string
    gender: string
    rawScore: string | number | undefined
    feedback?: string
    hasError?: boolean
  }

  const localRoster = ref<LocalRosterItem[]>([])

  // Computed Properties for Filters
  const uniqueClasses = computed(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const opt of assignmentOptions.value) {
      if (!map.has(opt.classId)) {
        map.set(opt.classId, { id: opt.classId, name: opt.className })
      }
    }
    return Array.from(map.values())
  })

  const uniqueSubjects = computed(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const opt of assignmentOptions.value) {
      if (!map.has(opt.subjectId)) {
        map.set(opt.subjectId, { id: opt.subjectId, name: opt.subjectName })
      }
    }
    return Array.from(map.values())
  })

  const filteredAssessments = computed(() => {
    return allAssessments.value.filter((item) => {
      if (filterClassId.value && item.classId !== filterClassId.value) return false
      if (filterSubjectId.value && item.subjectId !== filterSubjectId.value) return false
      if (filterType.value && item.type !== filterType.value) return false
      if (searchKeyword.value) {
        const kw = searchKeyword.value.toLowerCase().trim()
        const match =
          item.title.toLowerCase().includes(kw) ||
          item.className.toLowerCase().includes(kw) ||
          item.subjectName.toLowerCase().includes(kw)
        if (!match) return false
      }
      return true
    })
  })

  // Live Statistics calculation for active scoring drawer
  const localStatistics = computed<AssessmentStatistics>(() => {
    if (!activeDetail.value) {
      return {
        totalStudents: 0,
        gradedCount: 0,
        ungradedCount: 0,
        averageScore: null,
        minScore: null,
        maxScore: null,
        passedKkmCount: 0,
        failedKkmCount: 0,
        kkm: 75
      }
    }

    const scoresList = localRoster.value
      .map((item) => {
        if (
          item.rawScore !== '' &&
          item.rawScore !== undefined &&
          item.rawScore !== null &&
          !isNaN(Number(item.rawScore))
        ) {
          return { studentId: item.studentId, score: Number(item.rawScore) }
        }
        return null
      })
      .filter((s): s is { studentId: string; score: number } => s !== null)

    return assessmentService.calculateStatistics(
      scoresList,
      localRoster.value.length,
      activeDetail.value.assessment.kkm
    )
  })

  const filteredRoster = computed(() => {
    return localRoster.value.filter((st) => {
      const isGraded =
        st.rawScore !== '' &&
        st.rawScore !== undefined &&
        st.rawScore !== null &&
        !isNaN(Number(st.rawScore))

      if (rosterFilter.value === 'GRADED') return isGraded
      if (rosterFilter.value === 'UNGRADED') return !isGraded
      return true
    })
  })

  // Methods
  const getTypeLabel = (type: AssessmentType) => {
    switch (type) {
      case 'HARIAN':
        return 'Ulangan Harian'
      case 'TUGAS':
        return 'Tugas'
      case 'KUIS':
        return 'Kuis'
      case 'STS':
        return 'STS (Tengah Semester)'
      case 'SAS':
        return 'SAS (Akhir Semester)'
      case 'SIKAP':
        return 'Sikap'
      case 'KETERAMPILAN':
        return 'Keterampilan'
      default:
        return type
    }
  }

  const getTypeBadgeClass = (type: AssessmentType) => {
    switch (type) {
      case 'HARIAN':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
      case 'TUGAS':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      case 'KUIS':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
      case 'STS':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
      case 'SAS':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
      case 'SIKAP':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
      case 'KETERAMPILAN':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const loadData = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const session = authService.getCurrentSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      teacherName.value = session.teacherName || session.username

      const [assessments, options] = await Promise.all([
        assessmentService.getAssessments(),
        assessmentService.getTeacherAssignmentOptions()
      ])

      allAssessments.value = assessments
      assignmentOptions.value = options
    } catch (err: any) {
      errorMessage.value = err.message || 'Gagal memuat data penilaian.'
    } finally {
      loading.value = false
    }
  }

  const applyFilters = () => {
    // Computed reactive automatically
  }

  const resetFilters = () => {
    filterClassId.value = ''
    filterSubjectId.value = ''
    filterType.value = ''
    searchKeyword.value = ''
  }

  const openCreateModal = () => {
    isEditMode.value = false
    editingAssessmentId.value = ''

    const today = new Date().toISOString().split('T')[0]
    formModel.value = {
      teacherAssignmentId: assignmentOptions.value[0]?.assignmentId || '',
      classId: assignmentOptions.value[0]?.classId || '',
      type: 'HARIAN',
      title: '',
      date: today,
      maxScore: 100
    }
    showFormModal.value = true
  }

  const onAssignmentSelected = (asgId: string) => {
    const found = assignmentOptions.value.find((a) => a.assignmentId === asgId)
    if (found) {
      formModel.value.classId = found.classId
    }
  }

  const submitAssessmentForm = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (!valid) return
      savingForm.value = true
      try {
        if (isEditMode.value) {
          await assessmentService.updateAssessment(editingAssessmentId.value, {
            title: formModel.value.title,
            type: formModel.value.type,
            date: formModel.value.date,
            maxScore: formModel.value.maxScore
          })
          ElMessage.success('Informasi assessment berhasil diperbarui.')
        } else {
          await assessmentService.createAssessment({
            teacherAssignmentId: formModel.value.teacherAssignmentId,
            classId: formModel.value.classId,
            type: formModel.value.type,
            title: formModel.value.title,
            date: formModel.value.date,
            maxScore: formModel.value.maxScore
          })
          ElMessage.success('Assessment baru berhasil dibuat.')
        }

        showFormModal.value = false
        await loadData()
      } catch (err: any) {
        ElMessage.error(err.message || 'Gagal menyimpan assessment.')
      } finally {
        savingForm.value = false
      }
    })
  }

  const handleCardAction = async (command: string, item: ResolvedAssessmentItem) => {
    if (command === 'edit') {
      isEditMode.value = true
      editingAssessmentId.value = item.id
      formModel.value = {
        teacherAssignmentId: item.teacherAssignmentId,
        classId: item.classId,
        type: item.type,
        title: item.title,
        date: item.date,
        maxScore: item.maxScore
      }
      showFormModal.value = true
    } else if (command === 'delete') {
      try {
        await ElMessageBox.confirm(
          `Apakah Anda yakin ingin menghapus assessment "${item.title}"? Seluruh data nilai siswa di dalamnya akan ikut terhapus.`,
          'Konfirmasi Hapus Assessment',
          {
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            type: 'warning'
          }
        )

        loading.value = true
        await assessmentService.deleteAssessment(item.id)
        ElMessage.success('Assessment berhasil dihapus.')
        await loadData()
      } catch (e) {
        if (e !== 'cancel') {
          ElMessage.error('Gagal menghapus assessment.')
        }
      } finally {
        loading.value = false
      }
    }
  }

  // Open Score Input Drawer
  const openScoreModal = async (assessmentId: string) => {
    showScoreModal.value = true
    loadingDetail.value = true
    activeDetail.value = null
    rosterFilter.value = 'ALL'

    try {
      const detail = await assessmentService.getAssessmentDetail(assessmentId)
      activeDetail.value = detail

      localRoster.value = detail.roster.map((r) => ({
        studentId: r.studentId,
        nis: r.nis,
        nisn: r.nisn,
        name: r.name,
        gender: r.gender,
        rawScore: r.score !== undefined ? r.score : '',
        feedback: r.feedback || '',
        hasError: false
      }))
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memuat detail penilaian.')
      showScoreModal.value = false
    } finally {
      loadingDetail.value = false
    }
  }

  const onScoreInputChange = (st: LocalRosterItem) => {
    if (st.rawScore === '' || st.rawScore === undefined || st.rawScore === null) {
      st.hasError = false
      return
    }

    const num = Number(st.rawScore)
    const max = activeDetail.value?.assessment.maxScore || 100
    if (isNaN(num) || num < 0 || num > max) {
      st.hasError = true
    } else {
      st.hasError = false
    }
  }

  const clearStudentScore = (st: LocalRosterItem) => {
    st.rawScore = ''
    st.hasError = false
  }

  const saveAllScores = async () => {
    if (!activeDetail.value) return

    // Validate inputs
    const max = activeDetail.value.assessment.maxScore || 100
    for (const st of localRoster.value) {
      if (st.rawScore !== '' && st.rawScore !== undefined && st.rawScore !== null) {
        const num = Number(st.rawScore)
        if (isNaN(num) || num < 0 || num > max) {
          ElMessage.error(`Nilai untuk "${st.name}" tidak valid. Harus angka antara 0 s/d ${max}.`)
          st.hasError = true
          return
        }
      }
    }

    savingScores.value = true
    try {
      const scoreInputs = localRoster.value.map((st) => ({
        studentId: st.studentId,
        score:
          st.rawScore !== '' && st.rawScore !== undefined && st.rawScore !== null
            ? Number(st.rawScore)
            : null,
        feedback: st.feedback
      }))

      await assessmentService.saveAssessmentScores(activeDetail.value.assessment.id, scoreInputs)

      ElMessage.success('Nilai siswa berhasil disimpan ke database offline.')
      showScoreModal.value = false
      await loadData()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal menyimpan nilai.')
    } finally {
      savingScores.value = false
    }
  }

  const handleScoreModalClose = (done: () => void) => {
    done()
  }

  // Navigation
  const goToSchedule = () => router.push('/teacher/schedule')
  const goToDashboard = () => router.push('/teacher/dashboard')

  onMounted(async () => {
    await loadData()
  })
</script>

<style scoped>
  /* Custom clean styles */
</style>
