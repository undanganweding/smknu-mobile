/**
 * Guru Offline - Submission Workflow Service
 * Canonical Target: Submission lifecycle management:
 * DRAFT -> READY_TO_SUBMIT -> SUBMITTED -> REVIEW -> RETURNED/APPROVED -> LOCKED
 */

import { indexedDb } from '../../db/indexedDb'
import { pendingMutationQueue } from '../sync/PendingMutationQueue'
import { completenessEngine } from './CompletenessEngine'
import { auditLogService } from '../audit/AuditLogService'
import type { SubmissionEntity } from '../../types/cloud'

export class SubmissionService {
  private static instance: SubmissionService

  public static getInstance(): SubmissionService {
    if (!SubmissionService.instance) {
      SubmissionService.instance = new SubmissionService()
    }
    return SubmissionService.instance
  }

  /**
   * Get or create a draft submission for a teacher in an academic period
   */
  public async getOrCreateSubmission(
    teacherId: string,
    academicPeriodId: string
  ): Promise<SubmissionEntity> {
    const existing = await this.findByTeacherAndPeriod(teacherId, academicPeriodId)
    if (existing) return existing

    const completeness = await completenessEngine.evaluateTeacherCompleteness(
      teacherId,
      academicPeriodId
    )
    const now = new Date().toISOString()

    const draft: SubmissionEntity = {
      id: `sub_${teacherId}_${academicPeriodId}`,
      teacherId,
      academicPeriodId,
      status: completeness.isReadyToSubmit ? 'READY_TO_SUBMIT' : 'DRAFT',
      version: 1,
      completeness,
      createdAt: now,
      updatedAt: now
    }

    await this.saveLocal(draft)
    return draft
  }

  /**
   * Submit draft to Admin for review
   */
  public async submitForReview(
    teacherId: string,
    academicPeriodId: string,
    options?: { force?: boolean }
  ): Promise<SubmissionEntity> {
    const sub = await this.getOrCreateSubmission(teacherId, academicPeriodId)

    if (sub.status === 'LOCKED') {
      throw new Error('Periode ini sudah dikunci (LOCKED) dan tidak dapat diajukan kembali.')
    }

    const completeness = await completenessEngine.evaluateTeacherCompleteness(
      teacherId,
      academicPeriodId
    )
    if (!completeness.isReadyToSubmit && !options?.force) {
      throw new Error(
        `Kelengkapan akademik baru ${completeness.overallPercentage}%. Harap lengkapi item yang belum terpenuhi.`
      )
    }

    sub.status = 'SUBMITTED'
    sub.submittedAt = new Date().toISOString()
    sub.updatedAt = new Date().toISOString()
    sub.version = (sub.version || 1) + 1
    sub.completeness = completeness

    await this.saveLocal(sub)
    // Enqueue for cloud synchronization
    await pendingMutationQueue.enqueue('submission', sub.id, 'UPDATE', sub)

    return sub
  }

  /**
   * Admin approves submission
   */
  public async approveSubmission(
    submissionId: string,
    reviewerName: string
  ): Promise<SubmissionEntity> {
    const sub = await this.findById(submissionId)
    if (!sub) throw new Error('Pengajuan tidak ditemukan.')

    sub.status = 'APPROVED'
    sub.reviewedAt = new Date().toISOString()
    sub.reviewedBy = reviewerName
    sub.updatedAt = new Date().toISOString()

    await this.saveLocal(sub)
    await pendingMutationQueue.enqueue('submission', sub.id, 'UPDATE', sub)

    await auditLogService.log({
      action: 'SUBMISSION_APPROVED',
      entityType: 'SUBMISSION',
      affectedIds: [sub.id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'ADMIN_GOVERNANCE',
      details: {
        submissionId: sub.id,
        teacherId: sub.teacherId,
        academicPeriodId: sub.academicPeriodId,
        reviewedBy: reviewerName,
        timestamp: sub.reviewedAt
      }
    })

    return sub
  }

  /**
   * Admin returns submission for revision
   */
  public async returnForRevision(
    submissionId: string,
    reviewerName: string,
    feedback: string
  ): Promise<SubmissionEntity> {
    const sub = await this.findById(submissionId)
    if (!sub) throw new Error('Pengajuan tidak ditemukan.')

    sub.status = 'RETURNED'
    sub.reviewedAt = new Date().toISOString()
    sub.reviewedBy = reviewerName
    sub.feedback = feedback
    sub.updatedAt = new Date().toISOString()

    await this.saveLocal(sub)
    await pendingMutationQueue.enqueue('submission', sub.id, 'UPDATE', sub)

    await auditLogService.log({
      action: 'SUBMISSION_RETURNED',
      entityType: 'SUBMISSION',
      affectedIds: [sub.id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'ADMIN_GOVERNANCE',
      details: {
        submissionId: sub.id,
        teacherId: sub.teacherId,
        academicPeriodId: sub.academicPeriodId,
        reviewedBy: reviewerName,
        feedback,
        timestamp: sub.reviewedAt
      }
    })

    return sub
  }

  /**
   * Admin locks submission/period
   */
  public async lockSubmission(submissionId: string): Promise<SubmissionEntity> {
    const sub = await this.findById(submissionId)
    if (!sub) throw new Error('Pengajuan tidak ditemukan.')

    sub.status = 'LOCKED'
    sub.updatedAt = new Date().toISOString()

    await this.saveLocal(sub)
    await pendingMutationQueue.enqueue('submission', sub.id, 'UPDATE', sub)

    await auditLogService.log({
      action: 'SUBMISSION_LOCKED',
      entityType: 'SUBMISSION',
      affectedIds: [sub.id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'ADMIN_GOVERNANCE',
      details: {
        submissionId: sub.id,
        teacherId: sub.teacherId,
        academicPeriodId: sub.academicPeriodId
      }
    })

    return sub
  }

  public async findById(id: string): Promise<SubmissionEntity | null> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction('submissions', 'readonly')
      const store = tx.objectStore('submissions')
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  }

  public async findByTeacherAndPeriod(
    teacherId: string,
    academicPeriodId: string
  ): Promise<SubmissionEntity | null> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction('submissions', 'readonly')
      const store = tx.objectStore('submissions')
      const req = store.getAll()
      req.onsuccess = () => {
        const list: SubmissionEntity[] = req.result || []
        const match = list.find(
          (s) => s.teacherId === teacherId && s.academicPeriodId === academicPeriodId
        )
        resolve(match || null)
      }
      req.onerror = () => resolve(null)
    })
  }

  public async findByPeriod(academicPeriodId: string): Promise<SubmissionEntity[]> {
    const all = await this.findAll()
    return all.filter((s) => s.academicPeriodId === academicPeriodId)
  }

  public async findByFilter(filter: {
    academicPeriodId?: string
    teacherId?: string
    status?: string
  }): Promise<SubmissionEntity[]> {
    let list = await this.findAll()
    if (filter.academicPeriodId) {
      list = list.filter((s) => s.academicPeriodId === filter.academicPeriodId)
    }
    if (filter.teacherId) {
      list = list.filter((s) => s.teacherId === filter.teacherId)
    }
    if (filter.status) {
      list = list.filter((s) => s.status === filter.status)
    }
    return list
  }

  public async findAll(): Promise<SubmissionEntity[]> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve) => {
      const tx = db.transaction('submissions', 'readonly')
      const store = tx.objectStore('submissions')
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  }

  private async saveLocal(entity: SubmissionEntity): Promise<void> {
    const db = await indexedDb.getDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('submissions', 'readwrite')
      const store = tx.objectStore('submissions')
      const req = store.put(entity)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}

export const submissionService = SubmissionService.getInstance()
