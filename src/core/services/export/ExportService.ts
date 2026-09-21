/**
 * Guru Offline - Export Service
 * Exports master data entities to CSV or XLSX format respecting active filters.
 */

import * as XLSX from 'xlsx'
import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { auditLogService } from '../audit/AuditLogService'

export type ExportFormat = 'CSV' | 'XLSX'
export type MasterEntityType =
  'TEACHER' | 'STUDENT' | 'CLASS' | 'SUBJECT' | 'ROOM' | 'ASSIGNMENT' | 'SCHEDULE'

export interface ExportFilterInput {
  academicYearId?: string
  classId?: string
  majorId?: string
  gradeLevel?: string
  status?: string
}

export class ExportService {
  /**
   * Export master data to file payload (CSV string or XLSX ArrayBuffer)
   */
  public async exportMasterData(
    entityType: MasterEntityType,
    format: ExportFormat,
    filter?: ExportFilterInput
  ): Promise<{ filename: string; mimeType: string; content: string | ArrayBuffer }> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses ditolak. Export master data hanya dapat dilakukan oleh Admin.'
      )
    }

    let headers: string[] = []
    let rows: (string | number)[][] = []
    const timestamp = new Date().toISOString().split('T')[0]

    switch (entityType) {
      case 'TEACHER': {
        headers = ['teacher_code', 'nip', 'nuptk', 'name', 'gender', 'phone', 'email', 'status']
        let list = await repositories.teachers.findAll()
        if (filter?.status) list = list.filter((t) => t.status === filter.status)
        rows = list.map((t) => [
          (t as any).code || t.nip || t.id,
          t.nip || '',
          t.nuptk || '',
          t.name,
          t.gender || 'L',
          t.phone || '',
          t.email || '',
          t.status
        ])
        break
      }

      case 'STUDENT': {
        headers = [
          'student_code',
          'nis',
          'nisn',
          'name',
          'gender',
          'birth_place',
          'birth_date',
          'rombel_code',
          'status'
        ]
        let list = await repositories.students.findAll()
        const classes = await repositories.classes.findAll()
        const classMap = new Map(classes.map((c) => [c.id, (c as any).code || c.name]))

        if (filter?.classId) list = list.filter((s) => s.classId === filter.classId)
        if (filter?.status) list = list.filter((s) => s.status === filter.status)

        rows = list.map((s) => [
          (s as any).code || s.id,
          s.nis,
          s.nisn || '',
          s.name,
          s.gender,
          s.birthPlace || '',
          s.birthDate || '',
          classMap.get(s.classId) || s.classId,
          s.status
        ])
        break
      }

      case 'CLASS': {
        headers = [
          'rombel_code',
          'name',
          'grade',
          'major',
          'academic_year_code',
          'homeroom_teacher_code',
          'status'
        ]
        let list = await repositories.classes.findAll()
        const academicYears = await repositories.academicYears.findAll()
        const teachers = await repositories.teachers.findAll()
        const ayMap = new Map(academicYears.map((a) => [a.id, (a as any).code || a.name]))
        const tMap = new Map(teachers.map((t) => [t.id, t.nip || (t as any).code || t.name]))

        if (filter?.academicYearId)
          list = list.filter((c) => c.academicYearId === filter.academicYearId)
        if (filter?.gradeLevel) list = list.filter((c) => c.level === filter.gradeLevel)

        rows = list.map((c) => [
          (c as any).code || c.id,
          c.name,
          c.level,
          c.majorId || '',
          ayMap.get(c.academicYearId) || c.academicYearId,
          c.homeroomTeacherId ? tMap.get(c.homeroomTeacherId) || c.homeroomTeacherId : '',
          c.status || 'ACTIVE'
        ])
        break
      }

      case 'SUBJECT': {
        headers = ['subject_code', 'name', 'category', 'kkm', 'status']
        let list = await repositories.subjects.findAll()
        if (filter?.status) list = list.filter((s) => s.status === filter.status)
        rows = list.map((s) => [
          s.code,
          s.name,
          s.category || 'UMUM',
          s.defaultKkm || 75,
          s.status || 'ACTIVE'
        ])
        break
      }

      case 'ROOM': {
        headers = ['room_code', 'name', 'type', 'capacity', 'status']
        let list = await repositories.rooms.findAll()
        if (filter?.status) list = list.filter((r) => r.status === filter.status)
        rows = list.map((r) => [
          r.code,
          r.name,
          r.type || 'THEORY',
          r.capacity || 36,
          r.status || 'ACTIVE'
        ])
        break
      }

      case 'ASSIGNMENT': {
        headers = ['teacher_code', 'subject_code', 'rombel_code', 'weekly_jp', 'academic_year_code']
        let list = await repositories.teacherAssignments.findAll()
        const teachers = await repositories.teachers.findAll()
        const subjects = await repositories.subjects.findAll()
        const classes = await repositories.classes.findAll()
        const academicYears = await repositories.academicYears.findAll()

        const tMap = new Map(teachers.map((t) => [t.id, t.nip || (t as any).code || t.name]))
        const sMap = new Map(subjects.map((s) => [s.id, s.code]))
        const cMap = new Map(classes.map((c) => [c.id, (c as any).code || c.name]))
        const ayMap = new Map(academicYears.map((a) => [a.id, (a as any).code || a.name]))

        if (filter?.academicYearId)
          list = list.filter((a) => a.academicYearId === filter.academicYearId)

        rows = list.map((a) => [
          tMap.get(a.teacherId) || a.teacherId,
          sMap.get(a.subjectId) || a.subjectId,
          (a as any).classId ? cMap.get((a as any).classId) || (a as any).classId : '',
          a.hours || 2,
          ayMap.get(a.academicYearId) || a.academicYearId
        ])
        break
      }

      case 'SCHEDULE': {
        headers = ['teacher_code', 'subject_code', 'rombel_code', 'room_code', 'day', 'time_slot']
        let list = await repositories.schedules.findAll()
        const assignments = await repositories.teacherAssignments.findAll()
        const teachers = await repositories.teachers.findAll()
        const subjects = await repositories.subjects.findAll()
        const classes = await repositories.classes.findAll()
        const rooms = await repositories.rooms.findAll()

        const assignMap = new Map(assignments.map((a) => [a.id, a]))
        const tMap = new Map(teachers.map((t) => [t.id, t.nip || (t as any).code || t.name]))
        const sMap = new Map(subjects.map((s) => [s.id, s.code]))
        const cMap = new Map(classes.map((c) => [c.id, (c as any).code || c.name]))
        const rMap = new Map(rooms.map((r) => [r.id, r.code]))

        if (filter?.academicYearId)
          list = list.filter((s) => s.academicYearId === filter.academicYearId)
        if (filter?.classId) list = list.filter((s) => s.classId === filter.classId)

        rows = list.map((sch) => {
          const assign = assignMap.get(sch.teacherAssignmentId)
          const teacherCode = assign ? tMap.get(assign.teacherId) || assign.teacherId : ''
          const subjectCode = assign ? sMap.get(assign.subjectId) || assign.subjectId : ''
          const rombelCode = cMap.get(sch.classId) || sch.classId
          const roomCode = sch.roomId ? rMap.get(sch.roomId) || sch.roomId : ''

          return [
            teacherCode,
            subjectCode,
            rombelCode,
            roomCode,
            sch.dayOfWeek,
            (sch as any).timeSlot || `${sch.periodStart}-${sch.periodEnd}`
          ]
        })
        break
      }
    }

    await auditLogService.log({
      action: `EXPORT_${entityType}`,
      entityType,
      operation: 'EXPORT',
      result: 'SUCCESS',
      details: { format, rowCount: rows.length, filter }
    })

    const filename = `${entityType.toLowerCase()}-export-${timestamp}.${format.toLowerCase()}`

    if (format === 'CSV') {
      const csvLines = [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ]
      return {
        filename,
        mimeType: 'text/csv;charset=utf-8;',
        content: csvLines.join('\n')
      }
    } else {
      const worksheetData = [headers, ...rows]
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, entityType)
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

      return {
        filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        content: buffer
      }
    }
  }
}

export const exportService = new ExportService()
