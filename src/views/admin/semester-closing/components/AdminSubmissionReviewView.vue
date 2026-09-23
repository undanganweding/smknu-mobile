<template>
  <div class="space-y-4">
    <!-- Header Controls -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
    >
      <div>
        <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <i class="ri-user-star-line text-emerald-600"></i> Review Berkas Pengajuan Administrasi
          Guru
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Verifikasi pemenuhan target presensi, jurnal mengajar, dan buku nilai sebelum penutupan
          semester resmi.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <el-select
          v-model="filterStatus"
          placeholder="Filter Status"
          class="w-44"
          size="small"
          clearable
        >
          <el-option label="Semua Status" value="" />
          <el-option label="Menunggu Review" value="SUBMITTED" />
          <el-option label="Disetujui (Approved)" value="APPROVED" />
          <el-option label="Perlu Revisi" value="RETURNED" />
          <el-option label="Draft Guru" value="DRAFT" />
          <el-option label="Terkunci (Locked)" value="LOCKED" />
        </el-select>

        <el-button size="small" @click="loadSubmissions">
          <i class="ri-refresh-line mr-1"></i> Segarkan
        </el-button>
      </div>
    </div>

    <!-- Submissions Table -->
    <el-table v-loading="loading" :data="filteredSubmissions" border stripe style="width: 100%">
      <el-tableColumn label="Nama Guru" min-width="180">
        <template #default="scope">
          <div class="font-semibold text-slate-800 dark:text-slate-100">{{
            getTeacherName(scope.row.teacherId)
          }}</div>
          <div class="text-[11px] text-slate-400 font-mono">ID: {{ scope.row.teacherId }}</div>
        </template>
      </el-tableColumn>

      <el-tableColumn label="Status Pengajuan" width="160" align="center">
        <template #default="scope">
          <el-tag :type="getStatusTag(scope.row.status)" size="small" class="font-bold">
            {{ formatStatus(scope.row.status) }}
          </el-tag>
        </template>
      </el-tableColumn>

      <el-tableColumn label="Skor Kelengkapan" width="180">
        <template #default="scope">
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-semibold">
              <span>{{ scope.row.completeness?.overallPercentage || 0 }}%</span>
              <span
                :class="
                  scope.row.completeness?.isReadyToSubmit ? 'text-emerald-600' : 'text-amber-600'
                "
              >
                {{ scope.row.completeness?.isReadyToSubmit ? 'Memenuhi Syarat' : 'Belum Lengkap' }}
              </span>
            </div>
            <el-progress
              :percentage="scope.row.completeness?.overallPercentage || 0"
              :status="scope.row.completeness?.isReadyToSubmit ? 'success' : 'warning'"
              :stroke-width="6"
              :show-text="false"
            />
          </div>
        </template>
      </el-tableColumn>

      <el-tableColumn label="Detail Item Administrasi" min-width="260">
        <template #default="scope">
          <div class="flex flex-wrap gap-1.5 py-1">
            <span
              v-for="item in scope.row.completeness?.items || []"
              :key="item.key"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border"
              :class="
                item.percentage >= 80
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
              "
              :title="item.notes"
            >
              {{ item.label }}: {{ item.percentage }}%
            </span>
          </div>
        </template>
      </el-tableColumn>

      <el-tableColumn label="Tanggal Ajukan" width="140" align="center">
        <template #default="scope">
          <span class="text-xs text-slate-500 font-mono">
            {{ formatDate(scope.row.submittedAt) }}
          </span>
        </template>
      </el-tableColumn>

      <el-tableColumn label="Aksi Kurikulum" width="220" fixed="right" align="center">
        <template #default="scope">
          <div class="flex items-center justify-center gap-1.5">
            <el-button
              v-if="scope.row.status === 'SUBMITTED' || scope.row.status === 'REVIEW'"
              type="success"
              size="small"
              @click="handleApprove(scope.row as any)"
            >
              Setujui
            </el-button>

            <el-button
              v-if="scope.row.status === 'SUBMITTED' || scope.row.status === 'REVIEW'"
              type="danger"
              size="small"
              @click="openRevisionModal(scope.row as any)"
            >
              Revisi
            </el-button>

            <el-button
              v-if="scope.row.status === 'APPROVED'"
              type="info"
              size="small"
              @click="handleLock(scope.row as any)"
            >
              Kunci (Lock)
            </el-button>

            <span v-if="scope.row.status === 'LOCKED'" class="text-xs text-slate-400 font-semibold">
              <i class="ri-lock-line"></i> Terkunci
            </span>
          </div>
        </template>
      </el-tableColumn>
    </el-table>

    <!-- Revision Modal Dialog -->
    <el-dialog
      v-model="revisionModalVisible"
      title="Kembalikan untuk Revisi"
      width="480px"
      append-to-body
    >
      <div class="space-y-3">
        <p class="text-xs text-slate-500">
          Berikan catatan atau instruksi perbaikan kepada guru terkait bagian administrasi yang
          belum lengkap.
        </p>
        <el-input
          v-model="revisionFeedback"
          type="textarea"
          :rows="4"
          placeholder="Contoh: Jurnal pertemuan ke-14 kelas X-TJKT-1 belum diinput, serta nilai STS belum lengkap."
        />
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="revisionModalVisible = false">Batal</el-button>
          <el-button type="danger" :disabled="!revisionFeedback.trim()" @click="submitRevision">
            Kirim Catatan Revisi
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { submissionService } from '@/core/services/academic/SubmissionService'
  import { repositories } from '@/core/repositories'
  import type { SubmissionEntity, SubmissionStatus } from '@/core/types/cloud'
  import type { TeacherEntity } from '@/core/types'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const loading = ref(false)
  const submissions = ref<SubmissionEntity[]>([])
  const teachers = ref<TeacherEntity[]>([])
  const filterStatus = ref('')

  const revisionModalVisible = ref(false)
  const selectedSubmission = ref<SubmissionEntity | null>(null)
  const revisionFeedback = ref('')

  onMounted(async () => {
    await Promise.all([loadSubmissions(), loadTeachers()])
  })

  async function loadSubmissions() {
    loading.value = true
    try {
      submissions.value = await submissionService.findAll()
    } catch (err) {
      console.error('[AdminSubmissionReviewView] Error loading submissions:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadTeachers() {
    try {
      teachers.value = await repositories.teachers.findAll()
    } catch {
      teachers.value = []
    }
  }

  function getTeacherName(teacherId: string): string {
    const t = teachers.value.find((item) => item.id === teacherId)
    return t ? t.name : teacherId
  }

  const filteredSubmissions = computed(() => {
    if (!filterStatus.value) return submissions.value
    return submissions.value.filter((s) => s.status === filterStatus.value)
  })

  function formatStatus(status: SubmissionStatus): string {
    const map: Record<SubmissionStatus, string> = {
      DRAFT: 'DRAFT GURU',
      READY_TO_SUBMIT: 'SIAP AJUKAN',
      SUBMITTED: 'MENUNGGU REVIEW',
      REVIEW: 'SEDANG DIREVIEW',
      RETURNED: 'PERLU REVISI',
      APPROVED: 'DISETUJUI',
      LOCKED: 'TERKUNCI'
    }
    return map[status] || status
  }

  function getStatusTag(
    status: SubmissionStatus
  ): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
    const map: Record<SubmissionStatus, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
      DRAFT: 'info',
      READY_TO_SUBMIT: 'primary',
      SUBMITTED: 'warning',
      REVIEW: 'warning',
      RETURNED: 'danger',
      APPROVED: 'success',
      LOCKED: 'info'
    }
    return map[status] || 'info'
  }

  function formatDate(iso?: string): string {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return iso
    }
  }

  async function handleApprove(sub: SubmissionEntity) {
    try {
      await ElMessageBox.confirm(
        `Setujui pengajuan administrasi dari ${getTeacherName(sub.teacherId)}?`,
        'Persetujuan Pengajuan',
        { type: 'success' }
      )
      await submissionService.approveSubmission(sub.id, 'Administrator Kurikulum')
      ElMessage.success('Pengajuan berhasil disetujui!')
      await loadSubmissions()
    } catch (err: any) {
      if (err !== 'cancel') ElMessage.error(err.message || 'Gagal menyetujui pengajuan.')
    }
  }

  function openRevisionModal(sub: SubmissionEntity) {
    selectedSubmission.value = sub
    revisionFeedback.value = ''
    revisionModalVisible.value = true
  }

  async function submitRevision() {
    if (!selectedSubmission.value || !revisionFeedback.value.trim()) return
    try {
      await submissionService.returnForRevision(
        selectedSubmission.value.id,
        'Administrator Kurikulum',
        revisionFeedback.value.trim()
      )
      ElMessage.warning('Pengajuan dikembalikan ke guru untuk revisi.')
      revisionModalVisible.value = false
      await loadSubmissions()
    } catch (err: any) {
      ElMessage.error(err.message || 'Gagal memproses revisi.')
    }
  }

  async function handleLock(sub: SubmissionEntity) {
    try {
      await ElMessageBox.confirm(
        'Kunci pengajuan ini secara permanen? Data tidak dapat diubah lagi.',
        'Kunci Pengajuan',
        { type: 'warning' }
      )
      await submissionService.lockSubmission(sub.id)
      ElMessage.success('Pengajuan berhasil dikunci (LOCKED)!')
      await loadSubmissions()
    } catch (err: any) {
      if (err !== 'cancel') ElMessage.error(err.message || 'Gagal mengunci pengajuan.')
    }
  }
</script>
