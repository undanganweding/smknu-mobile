<template>
  <div
    class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
  >
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4"
    >
      <div>
        <div class="flex items-center gap-2">
          <h2
            class="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <i class="ri-checkbox-multiple-line text-emerald-600"></i> Progres Kelengkapan &
            Pengajuan Periode
          </h2>
          <el-tag :type="statusTagType" size="small" effect="dark" class="font-bold">
            {{ statusLabel }}
          </el-tag>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Validasi otomatis kelengkapan data presensi, jurnal, dan penilaian sebelum diajukan ke
          Bagian Kurikulum.
        </p>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <el-button
          v-if="
            submission?.status === 'DRAFT' ||
            submission?.status === 'READY_TO_SUBMIT' ||
            submission?.status === 'RETURNED'
          "
          type="primary"
          :disabled="!completeness?.isReadyToSubmit || isSubmitting"
          :loading="isSubmitting"
          @click="handleSubmit"
        >
          <i class="ri-send-plane-fill mr-1.5"></i>
          {{ submission?.status === 'RETURNED' ? 'Kirim Revisi Pengajuan' : 'Ajukan ke Kurikulum' }}
        </el-button>

        <span
          v-else-if="submission?.status === 'SUBMITTED'"
          class="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"
        >
          <i class="ri-time-line"></i> Menunggu Review Kurikulum
        </span>

        <span
          v-else-if="submission?.status === 'APPROVED'"
          class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"
        >
          <i class="ri-check-double-line"></i> Pengajuan Disetujui
        </span>

        <span
          v-else-if="submission?.status === 'LOCKED'"
          class="text-xs text-slate-500 font-semibold flex items-center gap-1"
        >
          <i class="ri-lock-line"></i> Periode Terkunci (Locked)
        </span>
      </div>
    </div>

    <!-- Overall Progress Bar -->
    <div
      class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2"
    >
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-slate-700 dark:text-slate-300">
          Skor Kelengkapan Administrasi:
          <span class="font-bold text-emerald-600 dark:text-emerald-400"
            >{{ completeness?.overallPercentage || 0 }}%</span
          >
        </span>
        <span class="text-slate-500">
          Target Pengajuan: <span class="font-bold">Min. 75%</span>
        </span>
      </div>
      <el-progress
        :percentage="completeness?.overallPercentage || 0"
        :color="progressColor"
        :stroke-width="10"
        :show-text="false"
      />
    </div>

    <!-- Review feedback alert if returned -->
    <div
      v-if="submission?.status === 'RETURNED' && submission?.feedback"
      class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1"
    >
      <div class="font-bold flex items-center gap-1.5">
        <i class="ri-error-warning-fill text-rose-600"></i> Catatan Revisi dari Kurikulum:
      </div>
      <p class="leading-relaxed">{{ submission.feedback }}</p>
    </div>

    <!-- Completeness Checklist Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="item in completeness?.items || []"
        :key="item.key"
        class="p-3.5 rounded-xl border transition-all duration-150"
        :class="
          item.percentage >= 80
            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/50'
        "
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{{
            item.label
          }}</span>
          <span
            class="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded"
            :class="
              item.percentage >= 80
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
            "
          >
            {{ item.percentage }}%
          </span>
        </div>

        <p class="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
          {{ item.notes }}
        </p>

        <router-link
          v-if="item.actionUrl"
          :to="item.actionUrl"
          class="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1"
        >
          Lengkapi Data <i class="ri-arrow-right-s-line"></i>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { completenessEngine } from '@/core/services/academic/CompletenessEngine'
  import { submissionService } from '@/core/services/academic/SubmissionService'
  import type { CompletenessReport, SubmissionEntity } from '@/core/types/cloud'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const props = defineProps<{
    teacherId: string
  }>()

  const completeness = ref<CompletenessReport | null>(null)
  const submission = ref<SubmissionEntity | null>(null)
  const isSubmitting = ref(false)

  onMounted(async () => {
    await loadData()
  })

  async function loadData() {
    if (!props.teacherId) return
    try {
      const periodId = 'period_semester_ganjil_2026'
      completeness.value = await completenessEngine.evaluateTeacherCompleteness(
        props.teacherId,
        periodId
      )
      submission.value = await submissionService.getOrCreateSubmission(props.teacherId, periodId)
    } catch (err) {
      console.error('[TeacherSubmissionCard] Error loading data:', err)
    }
  }

  const statusLabel = computed(() => {
    const status = submission.value?.status
    switch (status) {
      case 'SUBMITTED':
        return 'TERKIRIM / MENUNGGU REVIEW'
      case 'REVIEW':
        return 'SEDANG DIREVIEW'
      case 'RETURNED':
        return 'PERLU REVISI'
      case 'APPROVED':
        return 'DISETUJUI (APPROVED)'
      case 'LOCKED':
        return 'TERKUNCI (LOCKED)'
      case 'READY_TO_SUBMIT':
        return 'SIAP DIAJUKAN'
      default:
        return 'DRAFT'
    }
  })

  const statusTagType = computed(() => {
    const status = submission.value?.status
    switch (status) {
      case 'APPROVED':
        return 'success'
      case 'SUBMITTED':
      case 'REVIEW':
        return 'warning'
      case 'RETURNED':
        return 'danger'
      case 'LOCKED':
        return 'info'
      case 'READY_TO_SUBMIT':
        return 'success'
      default:
        return 'info'
    }
  })

  const progressColor = computed(() => {
    const pct = completeness.value?.overallPercentage || 0
    if (pct >= 85) return '#10b981'
    if (pct >= 75) return '#06b6d4'
    if (pct >= 50) return '#f59e0b'
    return '#ef4444'
  })

  async function handleSubmit() {
    if (!props.teacherId) return

    try {
      await ElMessageBox.confirm(
        'Apakah Anda yakin akan mengirimkan berkas pengajuan administrasi mengajar ini ke Bagian Kurikulum?',
        'Konfirmasi Pengajuan',
        {
          confirmButtonText: 'Kirim Pengajuan',
          cancelButtonText: 'Batal',
          type: 'info'
        }
      )

      isSubmitting.value = true
      const periodId = 'period_semester_ganjil_2026'
      const updated = await submissionService.submitForReview(props.teacherId, periodId)
      submission.value = updated
      ElMessage.success('Pengajuan berhasil dikirimkan ke Kurikulum!')
    } catch (err: any) {
      if (err !== 'cancel') {
        ElMessage.error(err.message || 'Gagal mengajukan data.')
      }
    } finally {
      isSubmitting.value = false
    }
  }
</script>
