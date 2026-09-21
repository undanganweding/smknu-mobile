/**
 * Guru Offline - Discipline & Achievement Service (Phase A / Phase 12)
 * Manages Student Discipline, Violations, Praise, and Counseling Notes
 *
 * Rules:
 * 1. Strict 100% Offline IndexedDB architecture: View -> Service -> Repository -> IndexedDB.
 * 2. Teacher Authorization: A teacher can create notes and update/delete their OWN notes.
 *    Admin has full oversight and can edit/delete any note for administrative corrections.
 * 3. Referential integrity: Validates student, class, and teacher existence, and confirms
 *    that the student is registered in the selected class.
 * 4. Integrates with SyncQueue for seamless local-first mutational sync.
 */

import { repositories } from '../../repositories'
import { authService } from '../auth/AuthService'
import { syncService } from '../sync/SyncService'
import { academicLockGuardService } from '../academic/AcademicLockGuardService'
import type { DisciplineNoteEntity, DisciplineType, SessionData } from '../../types'

export interface CreateDisciplineNoteDTO {
  studentId: string
  classId: string
  date: string
  type: DisciplineType
  description: string
  point?: number
  followup?: string
}

export interface UpdateDisciplineNoteDTO {
  date?: string
  type?: DisciplineType
  description?: string
  point?: number
  followup?: string
}

export interface DisciplineFilters {
  classId?: string
  studentId?: string
  type?: DisciplineType | 'ALL'
  startDate?: string
  endDate?: string
  teacherId?: string
}

export interface ResolvedDisciplineNoteItem extends DisciplineNoteEntity {
  studentName: string
  studentNis: string
  studentNisn?: string
  studentGender: 'L' | 'P'
  className: string
  classLevel: string
  majorCode: string
  teacherName: string
  teacherNip?: string
}

export interface StudentDisciplineSummary {
  studentId: string
  studentName: string
  studentNis: string
  className: string
  totalNotes: number
  violationCount: number
  praiseCount: number
  noteCount: number
  totalPoints: number
  notes: ResolvedDisciplineNoteItem[]
}

export class DisciplineService {
  /**
   * Helper to format date to local YYYY-MM-DD
   */
  public getLocalDateString(date = new Date()): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /**
   * Helper to validate session
   */
  private getSession(): SessionData {
    const session = authService.getCurrentSession()
    if (!session) {
      throw new Error('Sesi pengguna tidak valid atau belum login.')
    }
    return session
  }

  /**
   * Get filtered discipline notes with resolved relations
   */
  public async getNotes(filters?: DisciplineFilters): Promise<ResolvedDisciplineNoteItem[]> {
    this.getSession()

    // 1. Fetch base notes (optimized using index if classId or studentId is provided)
    let rawNotes: DisciplineNoteEntity[] = []
    if (filters?.studentId) {
      rawNotes = await repositories.disciplineNotes.findByStudentId(filters.studentId)
    } else if (filters?.classId) {
      rawNotes = await repositories.disciplineNotes.findByClassId(filters.classId)
    } else {
      rawNotes = await repositories.disciplineNotes.findAll()
    }

    // 2. Fetch cache mappings for resolution
    const [allStudents, allClasses, allTeachers] = await Promise.all([
      repositories.students.findAll(),
      repositories.classes.findAll(),
      repositories.teachers.findAll()
    ])

    const studentMap = new Map(allStudents.map((s) => [s.id, s]))
    const classMap = new Map(allClasses.map((c) => [c.id, c]))
    const teacherMap = new Map(allTeachers.map((t) => [t.id, t]))

    // 3. Filter notes in-memory
    const filtered = rawNotes.filter((note) => {
      if (filters?.classId && note.classId !== filters.classId) return false
      if (filters?.studentId && note.studentId !== filters.studentId) return false
      if (filters?.type && filters.type !== 'ALL' && note.type !== filters.type) return false
      if (filters?.teacherId && note.teacherId !== filters.teacherId) return false
      if (filters?.startDate && note.date < filters.startDate) return false
      if (filters?.endDate && note.date > filters.endDate) return false
      return true
    })

    // 4. Sort newest first
    filtered.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date)
      if (cmp !== 0) return cmp
      return b.createdAt.localeCompare(a.createdAt)
    })

    // 5. Map resolved relations
    return filtered.map((note) => {
      const student = studentMap.get(note.studentId)
      const cls = classMap.get(note.classId)
      const teacher = teacherMap.get(note.teacherId)

      return {
        ...note,
        studentName: student?.name || 'Siswa Tidak Dikenal',
        studentNis: student?.nis || '-',
        studentNisn: student?.nisn,
        studentGender: student?.gender || 'L',
        className: cls?.name || 'Kelas Tidak Dikenal',
        classLevel: cls?.level || '-',
        majorCode: cls?.majorId || '-',
        teacherName: teacher?.name || 'Guru',
        teacherNip: teacher?.nip
      }
    })
  }

  /**
   * Get notes by student ID
   */
  public async getNotesByStudent(studentId: string): Promise<ResolvedDisciplineNoteItem[]> {
    return this.getNotes({ studentId })
  }

  /**
   * Get notes by class ID
   */
  public async getNotesByClass(classId: string): Promise<ResolvedDisciplineNoteItem[]> {
    return this.getNotes({ classId })
  }

  /**
   * Get aggregate student discipline summary
   */
  public async getStudentDisciplineSummary(studentId: string): Promise<StudentDisciplineSummary> {
    this.getSession()
    const student = await repositories.students.findById(studentId)
    if (!student) {
      throw new Error(`Siswa dengan ID "${studentId}" tidak ditemukan.`)
    }

    const cls = await repositories.classes.findById(student.classId)
    const notes = await this.getNotesByStudent(studentId)

    let violationCount = 0
    let praiseCount = 0
    let noteCount = 0
    let totalPoints = 0

    for (const n of notes) {
      if (n.type === 'VIOLATION') {
        violationCount++
        if (typeof n.point === 'number') totalPoints -= n.point
      } else if (n.type === 'PRAISE') {
        praiseCount++
        if (typeof n.point === 'number') totalPoints += n.point
      } else if (n.type === 'NOTE') {
        noteCount++
      }
    }

    return {
      studentId: student.id,
      studentName: student.name,
      studentNis: student.nis,
      className: cls?.name || '-',
      totalNotes: notes.length,
      violationCount,
      praiseCount,
      noteCount,
      totalPoints,
      notes
    }
  }

  /**
   * Create a new discipline / achievement note
   */
  public async createNote(dto: CreateDisciplineNoteDTO): Promise<DisciplineNoteEntity> {
    const session = this.getSession()

    // 1. Determine teacherId from session
    let teacherId = session.teacherId
    if (!teacherId) {
      if (session.role === 'ADMIN') {
        // Fallback or pick first teacher for Admin if not linked
        const teachers = await repositories.teachers.findAll()
        teacherId = teachers[0]?.id || 'admin_usr'
      } else {
        throw new Error('Akun guru Anda belum terhubung dengan data master guru.')
      }
    }

    // 2. Validate required inputs
    if (!dto.studentId?.trim()) {
      throw new Error('Siswa wajib dipilih.')
    }
    if (!dto.classId?.trim()) {
      throw new Error('Kelas wajib dipilih.')
    }
    if (!dto.date?.trim()) {
      throw new Error('Tanggal kejadian wajib diisi.')
    }
    if (!dto.type || !['VIOLATION', 'PRAISE', 'NOTE'].includes(dto.type)) {
      throw new Error('Jenis catatan tidak valid (harus Pelanggaran, Prestasi, atau Pembinaan).')
    }
    if (!dto.description?.trim()) {
      throw new Error('Uraian deskripsi kejadian wajib diisi.')
    }

    await academicLockGuardService.enforceDateLock(dto.date)

    // 3. Referential integrity checks
    const [student, cls, teacher] = await Promise.all([
      repositories.students.findById(dto.studentId),
      repositories.classes.findById(dto.classId),
      repositories.teachers.findById(teacherId)
    ])

    if (!student) {
      throw new Error(`Siswa tidak ditemukan di database.`)
    }
    if (!cls) {
      throw new Error(`Kelas tidak ditemukan di database.`)
    }
    if (!teacher && session.role !== 'ADMIN') {
      throw new Error(`Guru tidak ditemukan di database.`)
    }

    // Validate that student actually belongs to the specified class
    if (student.classId !== dto.classId) {
      throw new Error(
        `Siswa "${student.name}" terdaftar di kelas lain, bukan di kelas yang dipilih.`
      )
    }

    const now = new Date().toISOString()
    const newNote: DisciplineNoteEntity = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : 'disc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      studentId: student.id,
      teacherId,
      classId: cls.id,
      date: dto.date.trim(),
      type: dto.type,
      point: typeof dto.point === 'number' ? Math.abs(dto.point) : undefined,
      description: dto.description.trim(),
      followup: dto.followup?.trim() || undefined,
      createdBy: session.username || session.userId,
      createdAt: now,
      updatedAt: now
    }

    // 4. Save to IndexedDB
    await repositories.disciplineNotes.create(newNote)

    // 5. Enqueue Sync
    await syncService.enqueue('DISCIPLINE', newNote.id, 'CREATE', newNote)

    return newNote
  }

  /**
   * Update an existing discipline / achievement note
   */
  public async updateNote(id: string, dto: UpdateDisciplineNoteDTO): Promise<DisciplineNoteEntity> {
    const session = this.getSession()

    const existing = await repositories.disciplineNotes.findById(id)
    if (!existing) {
      throw new Error(`Catatan kedisiplinan tidak ditemukan.`)
    }

    await academicLockGuardService.enforceDateLock(existing.date)
    if (dto.date) {
      await academicLockGuardService.enforceDateLock(dto.date)
    }

    // Authorization: Teacher can only update their own notes; Admin can update any note
    if (session.role === 'GURU' && existing.teacherId !== session.teacherId) {
      throw new Error(
        'Anda tidak memiliki otorisasi untuk mengubah catatan yang dibuat oleh guru lain.'
      )
    }

    if (dto.type && !['VIOLATION', 'PRAISE', 'NOTE'].includes(dto.type)) {
      throw new Error('Jenis catatan tidak valid.')
    }
    if (dto.description !== undefined && !dto.description.trim()) {
      throw new Error('Uraian deskripsi kejadian tidak boleh kosong.')
    }
    if (dto.date !== undefined && !dto.date.trim()) {
      throw new Error('Tanggal kejadian tidak boleh kosong.')
    }

    const now = new Date().toISOString()
    const updated: DisciplineNoteEntity = {
      ...existing,
      date: dto.date !== undefined ? dto.date.trim() : existing.date,
      type: dto.type !== undefined ? dto.type : existing.type,
      point:
        dto.point !== undefined
          ? typeof dto.point === 'number'
            ? Math.abs(dto.point)
            : undefined
          : existing.point,
      description: dto.description !== undefined ? dto.description.trim() : existing.description,
      followup: dto.followup !== undefined ? dto.followup?.trim() || undefined : existing.followup,
      updatedBy: session.username || session.userId,
      updatedAt: now
    }

    // Save to IndexedDB
    await repositories.disciplineNotes.update(id, updated)

    // Enqueue Sync
    await syncService.enqueue('DISCIPLINE', id, 'UPDATE', updated)

    return updated
  }

  /**
   * Delete an existing discipline note
   */
  public async deleteNote(id: string): Promise<boolean> {
    const session = this.getSession()

    const existing = await repositories.disciplineNotes.findById(id)
    if (!existing) {
      throw new Error(`Catatan kedisiplinan tidak ditemukan.`)
    }

    await academicLockGuardService.enforceDateLock(existing.date)

    // Authorization: Teacher can only delete their own notes; Admin can delete any note
    if (session.role === 'GURU' && existing.teacherId !== session.teacherId) {
      throw new Error(
        'Anda tidak memiliki otorisasi untuk menghapus catatan yang dibuat oleh guru lain.'
      )
    }

    // Delete from IndexedDB
    await repositories.disciplineNotes.delete(id)

    // Enqueue Sync
    await syncService.enqueue('DISCIPLINE', id, 'DELETE', { id })

    return true
  }
}

export const disciplineService = new DisciplineService()
