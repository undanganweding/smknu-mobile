/**
 * Guru Offline - Announcement Master Service
 * Handles School announcements, broadcast notices, pinned items, and role-targeted feeds.
 */

import { repositories } from '../../repositories'
import { auditLogService } from '../audit/AuditLogService'
import type { AnnouncementEntity, AccountStatus, UserRole } from '../../types'

export interface CreateAnnouncementDTO {
  title: string
  content: string
  authorId?: string
  targetRole?: UserRole | 'ALL'
  isPinned?: boolean
  isPublished?: boolean
  publishedAt?: string
  expiresAt?: string
  status?: AccountStatus
}

export type UpdateAnnouncementDTO = Partial<CreateAnnouncementDTO>

export class AnnouncementService {
  private static instance: AnnouncementService | null = null

  public static getInstance(): AnnouncementService {
    if (!AnnouncementService.instance) {
      AnnouncementService.instance = new AnnouncementService()
    }
    return AnnouncementService.instance
  }

  public async getAllAnnouncements(): Promise<AnnouncementEntity[]> {
    return await repositories.announcements.findAll()
  }

  public async getPublishedAnnouncements(role?: string): Promise<AnnouncementEntity[]> {
    const list = await repositories.announcements.findPublished(role)
    return list.sort((a, b) => {
      // Pinned first, then newest publishedAt
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return timeB - timeA
    })
  }

  public async getPinnedAnnouncements(): Promise<AnnouncementEntity[]> {
    return await repositories.announcements.findPinned()
  }

  public async getAnnouncementById(id: string): Promise<AnnouncementEntity | null> {
    return await repositories.announcements.findById(id)
  }

  public async createAnnouncement(
    data: CreateAnnouncementDTO,
    actorId = 'admin'
  ): Promise<AnnouncementEntity> {
    if (!data.title || !data.title.trim()) {
      throw new Error('Judul pengumuman wajib diisi.')
    }
    if (!data.content || !data.content.trim()) {
      throw new Error('Isi pengumuman wajib diisi.')
    }

    const now = new Date().toISOString()
    const isPub = data.isPublished !== undefined ? data.isPublished : true
    const isPin = data.isPinned || false
    const newAnnouncement: any = {
      id: `anc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      content: data.content.trim(),
      authorId: data.authorId || actorId,
      targetRole: (data.targetRole as any) || 'ALL',
      priority: 'NORMAL',
      published: isPub,
      pinned: isPin,
      isPinned: isPin,
      isPublished: isPub,
      publishedAt: isPub ? data.publishedAt || now : undefined,
      expiresAt: data.expiresAt,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    const created = await repositories.announcements.create(newAnnouncement)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'announcements',
      affectedIds: [created.id],
      operation: 'CREATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { title: created.title, isPublished: created.isPublished }
    })

    return created
  }

  public async updateAnnouncement(
    id: string,
    updates: UpdateAnnouncementDTO,
    actorId = 'admin'
  ): Promise<AnnouncementEntity> {
    const existing = await repositories.announcements.findById(id)
    if (!existing) {
      throw new Error('Data pengumuman tidak ditemukan.')
    }

    const cleanUpdates: Partial<AnnouncementEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    if (updates.isPublished && !existing.publishedAt) {
      cleanUpdates.publishedAt = new Date().toISOString()
    }

    const updated = await repositories.announcements.update(id, cleanUpdates)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: 'UPDATE_ANNOUNCEMENT',
      entityType: 'announcements',
      affectedIds: [id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { updates }
    })

    return updated
  }

  public async togglePin(id: string, actorId = 'admin'): Promise<AnnouncementEntity> {
    const existing = await repositories.announcements.findById(id)
    if (!existing) {
      throw new Error('Data pengumuman tidak ditemukan.')
    }

    const currentPin =
      (existing as any).pinned !== undefined ? (existing as any).pinned : (existing as any).isPinned
    const newPin = !currentPin

    const updated = await repositories.announcements.update(id, {
      pinned: newPin,
      isPinned: newPin,
      updatedAt: new Date().toISOString()
    } as any)

    await auditLogService.recordLog({
      actor: actorId,
      role: 'ADMIN',
      action: updated.isPinned ? 'PIN_ANNOUNCEMENT' : 'UNPIN_ANNOUNCEMENT',
      entityType: 'announcements',
      affectedIds: [id],
      operation: 'UPDATE',
      result: 'SUCCESS',
      source: 'LOCAL',
      details: { title: existing.title, isPinned: updated.isPinned }
    })

    return updated
  }

  public async deleteAnnouncement(id: string, actorId = 'admin'): Promise<boolean> {
    const existing = await repositories.announcements.findById(id)
    if (!existing) {
      throw new Error('Data pengumuman tidak ditemukan.')
    }

    const deleted = await repositories.announcements.delete(id)

    if (deleted) {
      await auditLogService.recordLog({
        actor: actorId,
        role: 'ADMIN',
        action: 'DELETE_ANNOUNCEMENT',
        entityType: 'announcements',
        affectedIds: [id],
        operation: 'DELETE',
        result: 'SUCCESS',
        source: 'LOCAL',
        details: { title: existing.title }
      })
    }

    return deleted
  }
}

export const announcementService = AnnouncementService.getInstance()
