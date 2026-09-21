/**
 * Guru Offline - Teacher Master Service
 * Handles Teacher domain operations, validation, and statistics
 */

import { repositories } from '../../repositories'
import type { TeacherEntity, AccountStatus, GenderType } from '../../types'

export interface CreateTeacherDTO {
  name: string
  nip?: string
  nuptk?: string
  nik?: string
  title?: string
  gender?: GenderType
  birthPlace?: string
  birthDate?: string
  employmentStatus?: string
  position?: string
  rankGroup?: string
  education?: string
  studyProgram?: string
  phone?: string
  email?: string
  address?: string
  status?: AccountStatus
}

export type UpdateTeacherDTO = Partial<CreateTeacherDTO>

export class TeacherService {
  async getAllTeachers(status?: AccountStatus): Promise<TeacherEntity[]> {
    const list = await repositories.teachers.findAll()
    if (status) {
      return list.filter((t) => t.status === status)
    }
    return list
  }

  async getTeacherById(id: string): Promise<TeacherEntity | null> {
    return await repositories.teachers.findById(id)
  }

  async searchTeachers(query: string, status?: AccountStatus): Promise<TeacherEntity[]> {
    const q = query.trim().toLowerCase()
    const all = await this.getAllTeachers(status)
    if (!q) return all

    return all.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(q)
      const nipMatch = t.nip ? t.nip.toLowerCase().includes(q) : false
      const nuptkMatch = t.nuptk ? t.nuptk.toLowerCase().includes(q) : false
      const positionMatch = t.position ? t.position.toLowerCase().includes(q) : false
      return nameMatch || nipMatch || nuptkMatch || positionMatch
    })
  }

  async createTeacher(data: CreateTeacherDTO): Promise<TeacherEntity> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nama guru wajib diisi.')
    }

    if (data.nip && data.nip.trim() !== '-' && data.nip.trim() !== '') {
      const existing = await repositories.teachers.findByNip(data.nip.trim())
      if (existing) {
        throw new Error(`NIP ${data.nip} sudah terdaftar untuk guru ${existing.name}.`)
      }
    }

    if (data.nuptk && data.nuptk.trim() !== '-' && data.nuptk.trim() !== '') {
      const existing = await repositories.teachers.findByNuptk(data.nuptk.trim())
      if (existing) {
        throw new Error(`NUPTK ${data.nuptk} sudah terdaftar untuk guru ${existing.name}.`)
      }
    }

    const now = new Date().toISOString()
    const newTeacher: TeacherEntity = {
      id: `tch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      nip: data.nip?.trim() || '-',
      nuptk: data.nuptk?.trim() || '-',
      nik: data.nik?.trim(),
      title: data.title?.trim(),
      gender: data.gender || 'L',
      birthPlace: data.birthPlace?.trim(),
      birthDate: data.birthDate?.trim(),
      employmentStatus: data.employmentStatus?.trim() || 'GTT/PTY',
      position: data.position?.trim() || 'Guru Mata Pelajaran',
      rankGroup: data.rankGroup?.trim(),
      education: data.education?.trim() || 'S1',
      studyProgram: data.studyProgram?.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim(),
      address: data.address?.trim(),
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }

    return await repositories.teachers.create(newTeacher)
  }

  async updateTeacher(id: string, updates: UpdateTeacherDTO): Promise<TeacherEntity> {
    const existing = await repositories.teachers.findById(id)
    if (!existing) {
      throw new Error('Data guru tidak ditemukan.')
    }

    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new Error('Nama guru tidak boleh kosong.')
    }

    if (updates.nip && updates.nip.trim() !== '-' && updates.nip.trim() !== existing.nip) {
      const dup = await repositories.teachers.findByNip(updates.nip.trim())
      if (dup && dup.id !== id) {
        throw new Error(`NIP ${updates.nip} sudah terdaftar untuk guru lain.`)
      }
    }

    if (updates.nuptk && updates.nuptk.trim() !== '-' && updates.nuptk.trim() !== existing.nuptk) {
      const dup = await repositories.teachers.findByNuptk(updates.nuptk.trim())
      if (dup && dup.id !== id) {
        throw new Error(`NUPTK ${updates.nuptk} sudah terdaftar untuk guru lain.`)
      }
    }

    const cleanUpdates: Partial<TeacherEntity> = {
      ...updates,
      updatedAt: new Date().toISOString()
    }

    return await repositories.teachers.update(id, cleanUpdates)
  }

  async toggleTeacherStatus(id: string): Promise<TeacherEntity> {
    const existing = await repositories.teachers.findById(id)
    if (!existing) {
      throw new Error('Data guru tidak ditemukan.')
    }

    const newStatus: AccountStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    return await repositories.teachers.update(id, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    })
  }

  async getTeacherStats(): Promise<{
    total: number
    active: number
    inactive: number
    pns: number
    nonPns: number
  }> {
    const all = await repositories.teachers.findAll()
    const active = all.filter((t) => t.status === 'ACTIVE').length
    const pns = all.filter((t) => t.employmentStatus?.toUpperCase().includes('PNS')).length

    return {
      total: all.length,
      active,
      inactive: all.length - active,
      pns,
      nonPns: all.length - pns
    }
  }
}

export const teacherService = new TeacherService()
