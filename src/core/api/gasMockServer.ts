/**
 * Guru Offline - Google Apps Script In-Memory Mock Server
 * Mirrors 100% of the validation, authorization, idempotency, and persistence logic in Code.gs
 * Used for deterministic Phase 5 unit & integration testing in Node/browser environments.
 */

import { repositories } from '../repositories'
import type { GasSyncRequestPayload, GasSyncResponsePayload, SyncEntityType } from '../types'

export class GasMockServer {
  private static instance: GasMockServer | null = null

  // In-memory persistent database mirroring Google Sheets
  private syncLogSheet = new Map<string, GasSyncResponsePayload>()
  private attendanceSheet = new Map<string, any>()
  private journalSheet = new Map<string, any>()
  private assessmentSheet = new Map<string, any>()
  private assessmentScoreSheet = new Map<string, any>()

  // Network simulation flag & controls
  private simulateNetworkTimeout = false
  private simulateTimeoutAfterWrite = false

  public static getInstance(): GasMockServer {
    if (!GasMockServer.instance) {
      GasMockServer.instance = new GasMockServer()
    }
    return GasMockServer.instance
  }

  public resetDatabase(): void {
    this.syncLogSheet.clear()
    this.attendanceSheet.clear()
    this.journalSheet.clear()
    this.assessmentSheet.clear()
    this.assessmentScoreSheet.clear()
    this.simulateNetworkTimeout = false
    this.simulateTimeoutAfterWrite = false
  }

  public setSimulateNetworkTimeout(enabled: boolean): void {
    this.simulateNetworkTimeout = enabled
  }

  public setSimulateTimeoutAfterWrite(enabled: boolean): void {
    this.simulateTimeoutAfterWrite = enabled
  }

  public getSheetData(sheetName: string): any[] {
    if (sheetName === 'Attendance') return Array.from(this.attendanceSheet.values())
    if (sheetName === 'Journals') return Array.from(this.journalSheet.values())
    if (sheetName === 'Assessments') return Array.from(this.assessmentSheet.values())
    if (sheetName === 'Assessment_Scores') return Array.from(this.assessmentScoreSheet.values())
    if (sheetName === 'Sync_Queue') return Array.from(this.syncLogSheet.values())
    return []
  }

  /**
   * Process mutation request matching Code.gs behavior
   */
  public async handlePost(req: GasSyncRequestPayload): Promise<GasSyncResponsePayload> {
    const nowIso = new Date().toISOString()

    // Simulated network timeout before request reaches server
    if (this.simulateNetworkTimeout) {
      throw new Error('Network error: Request timed out (Failed to fetch).')
    }

    // 1. Basic Payload Validation
    if (
      !req ||
      !req.operationId ||
      !req.entityType ||
      !req.entityId ||
      !req.teacherId ||
      !req.payload
    ) {
      return {
        success: false,
        operationId: req ? req.operationId || 'invalid' : 'invalid',
        entityId: req ? req.entityId || 'invalid' : 'invalid',
        entityType: req ? req.entityType || 'MASTER' : 'MASTER',
        message:
          'Data request tidak lengkap. OperationId, entityType, entityId, teacherId, dan payload wajib ada.',
        errorCode: 'INVALID_PAYLOAD',
        isRetryable: false,
        syncedAt: nowIso
      }
    }

    // 2. IDEMPOTENCY CHECK
    if (this.syncLogSheet.has(req.operationId)) {
      const saved = this.syncLogSheet.get(req.operationId)!
      return {
        ...saved,
        message: 'Operasi sudah pernah diproses sebelumnya (Idempotent).'
      }
    }

    // 3. TEACHER AUTHORIZATION VALIDATION
    const teacherAuth = await this.validateTeacherAuthorization(
      req.teacherId,
      req.entityType,
      req.payload
    )
    if (!teacherAuth.authorized) {
      const authError: GasSyncResponsePayload = {
        success: false,
        operationId: req.operationId,
        entityId: req.entityId,
        entityType: req.entityType,
        message: teacherAuth.message,
        errorCode: 'UNAUTHORIZED',
        isRetryable: false,
        syncedAt: nowIso
      }
      this.syncLogSheet.set(req.operationId, authError)
      return authError
    }

    // 4. ENTITY RELATIONSHIP & DOMAIN VALIDATION
    const domainCheck = this.validateDomainMutation(req.entityType, req.payload)
    if (!domainCheck.valid) {
      const domainError: GasSyncResponsePayload = {
        success: false,
        operationId: req.operationId,
        entityId: req.entityId,
        entityType: req.entityType,
        message: domainCheck.message,
        errorCode: (domainCheck.errorCode as any) || 'INVALID_PAYLOAD',
        isRetryable: false,
        syncedAt: nowIso
      }
      this.syncLogSheet.set(req.operationId, domainError)
      return domainError
    }

    // 5. EXECUTE GOOGLE SHEETS PERSISTENCE
    try {
      if (req.entityType === 'ATTENDANCE') {
        this.attendanceSheet.set(req.payload.id, { ...req.payload, updatedAt: nowIso })
      } else if (req.entityType === 'JOURNAL') {
        this.journalSheet.set(req.payload.id, { ...req.payload, updatedAt: nowIso })
      } else if (req.entityType === 'ASSESSMENT') {
        this.assessmentSheet.set(req.payload.id, { ...req.payload, updatedAt: nowIso })
        if (req.payload.scores && Array.isArray(req.payload.scores)) {
          for (const sc of req.payload.scores) {
            const scId = sc.id || `${req.payload.id}_${sc.studentId}`
            this.assessmentScoreSheet.set(scId, {
              ...sc,
              id: scId,
              assessmentId: req.payload.id,
              updatedAt: nowIso
            })
          }
        }
      } else {
        throw new Error(`Tipe entity tidak didukung: ${req.entityType}`)
      }

      // Simulated network timeout AFTER successful server write
      if (this.simulateTimeoutAfterWrite) {
        this.simulateTimeoutAfterWrite = false // Reset after triggering once
        throw new Error('Network error: Connection lost after server response dispatch.')
      }

      const successResponse: GasSyncResponsePayload = {
        success: true,
        operationId: req.operationId,
        entityId: req.entityId,
        entityType: req.entityType,
        message: 'Data berhasil tersimpan ke Google Sheets.',
        syncedAt: nowIso
      }

      this.syncLogSheet.set(req.operationId, successResponse)
      return successResponse
    } catch (err: any) {
      // If error was simulated timeout, rethrow so caller sees network failure
      if (err.message.includes('Connection lost')) {
        throw err
      }

      const execError: GasSyncResponsePayload = {
        success: false,
        operationId: req.operationId,
        entityId: req.entityId,
        entityType: req.entityType,
        message: `Gagal menulis ke Google Sheets: ${err.message}`,
        errorCode: 'SERVER_ERROR',
        isRetryable: true,
        syncedAt: nowIso
      }
      this.syncLogSheet.set(req.operationId, execError)
      return execError
    }
  }

  private async validateTeacherAuthorization(
    teacherId: string,
    entityType: SyncEntityType,
    payload: any
  ): Promise<{ authorized: boolean; message: string }> {
    const teacher = await repositories.teachers.findById(teacherId)
    if (!teacher) {
      return {
        authorized: false,
        message: 'Akses ditolak. Data Guru tidak ditemukan di master data.'
      }
    }
    if (teacher.status !== 'ACTIVE') {
      return {
        authorized: false,
        message: 'Akses ditolak. Akun Guru dalam status tidak aktif.'
      }
    }

    // Check schedule ownership for attendance and journal
    if (payload && payload.scheduleId) {
      const schedule = await repositories.schedules.findById(payload.scheduleId)
      if (!schedule) {
        return {
          authorized: false,
          message: 'Jadwal pelajaran tidak ditemukan di master database.'
        }
      }
      const assignment = await repositories.teacherAssignments.findById(
        schedule.teacherAssignmentId
      )
      if (!assignment || assignment.teacherId !== teacherId) {
        return {
          authorized: false,
          message: 'Akses ditolak. Anda tidak memiliki hak akses ke jadwal kelas ini.'
        }
      }
    }

    // Check assessment assignment ownership
    if (entityType === 'ASSESSMENT' && payload && payload.teacherAssignmentId) {
      const assignment = await repositories.teacherAssignments.findById(payload.teacherAssignmentId)
      if (!assignment || assignment.teacherId !== teacherId) {
        return {
          authorized: false,
          message: 'Akses ditolak. Anda tidak memiliki hak akses ke data penilaian ini.'
        }
      }
    }

    return { authorized: true, message: '' }
  }

  private validateDomainMutation(
    entityType: SyncEntityType,
    payload: any
  ): { valid: boolean; message: string; errorCode?: string } {
    if (entityType === 'ATTENDANCE') {
      if (!payload.scheduleId)
        return {
          valid: false,
          message: 'ID Jadwal mengajar wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      if (!payload.date)
        return {
          valid: false,
          message: 'Tanggal presensi wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      if (!payload.records || !Array.isArray(payload.records) || payload.records.length === 0) {
        return {
          valid: false,
          message: 'Daftar presensi siswa tidak boleh kosong.',
          errorCode: 'INVALID_PAYLOAD'
        }
      }
      const validStatuses = ['H', 'I', 'S', 'A', 'T', 'D']
      for (const r of payload.records) {
        if (!r.studentId || !r.status || !validStatuses.includes(r.status)) {
          return {
            valid: false,
            message: `Status presensi siswa "${r.studentId}" tidak valid.`,
            errorCode: 'INVALID_PAYLOAD'
          }
        }
      }
    } else if (entityType === 'JOURNAL') {
      if (!payload.scheduleId)
        return {
          valid: false,
          message: 'ID Jadwal mengajar wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      if (!payload.date)
        return {
          valid: false,
          message: 'Tanggal jurnal wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      if (!payload.topic || !payload.topic.trim()) {
        return {
          valid: false,
          message: 'Materi / Topik pembelajaran wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      }
      if (!payload.activitySummary || !payload.activitySummary.trim()) {
        return {
          valid: false,
          message: 'Kegiatan pembelajaran wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      }
    } else if (entityType === 'ASSESSMENT') {
      if (!payload.teacherAssignmentId) {
        return {
          valid: false,
          message: 'Penugasan guru wajib dipilih.',
          errorCode: 'INVALID_PAYLOAD'
        }
      }
      if (!payload.title || !payload.title.trim()) {
        return {
          valid: false,
          message: 'Judul penilaian wajib diisi.',
          errorCode: 'INVALID_PAYLOAD'
        }
      }
      if (!payload.maxScore || isNaN(payload.maxScore) || payload.maxScore <= 0) {
        return {
          valid: false,
          message: 'Nilai maksimum harus angka positif.',
          errorCode: 'INVALID_PAYLOAD'
        }
      }
    }
    return { valid: true, message: '' }
  }
}

export const gasMockServer = GasMockServer.getInstance()
