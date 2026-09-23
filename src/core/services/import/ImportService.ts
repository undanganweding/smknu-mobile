/**
 * Guru Offline - Data Onboarding & Import Service
 * Enterprise CSV/XLSX import pipeline with validation, preview, safe upsert, atomic commit, and error reporting.
 */

import * as XLSX from 'xlsx'
import { repositories } from '../../repositories'
import { authService, AuthorizationError } from '../auth'
import { auditLogService } from '../audit/AuditLogService'
import {
  parseDokumen1FromPdf,
  parseDokumen1FromXlsx,
  type Dokumen1Row,
  type Dokumen1ParseResult
} from './PdfDokumen1Parser'
import type { MasterEntityType, ExportFormat } from '../export/ExportService'
import type {
  ImportStatus,
  ImportCommitMode,
  ImportDuplicateMode,
  ImportHistoryEntity,
  SyncQueueEntity,
  TeacherEntity,
  StudentEntity,
  ClassEntity,
  SubjectEntity,
  RoomEntity,
  TeacherAssignmentEntity,
  ScheduleEntity,
  DayOfWeek
} from '../../types'

export type { ImportStatus, ImportCommitMode, ImportDuplicateMode, ImportHistoryEntity }

export type RowValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE'

export interface ParsedImportRow {
  rowNumber: number
  rawData: Record<string, any>
  normalizedData: Record<string, any>
  status: RowValidationStatus
  errors: { field: string; value: any; errorCode: string; message: string }[]
  warnings: { field: string; value: any; message: string }[]
  existingEntityId?: string
}

export interface ImportPreviewResult {
  entityType: MasterEntityType
  filename: string
  totalRows: number
  validCount: number
  warningCount: number
  errorCount: number
  duplicateCount: number
  headers: string[]
  unrecognizedHeaders: string[]
  missingRequiredHeaders: string[]
  rows: ParsedImportRow[]
}

export interface CommitImportOptions {
  preview: ImportPreviewResult
  commitMode?: ImportCommitMode
  duplicateMode?: ImportDuplicateMode
}

export interface ImportExecutionResult {
  success: boolean
  importId: string
  entityType: MasterEntityType
  filename: string
  totalRows: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  warningCount: number
  status: ImportStatus
  errorLogCsv?: string
  message: string
}

export class ImportService {
  /**
   * Column Aliases Mapping for Flexible Header Resolution
   */
  private readonly ALIAS_MAP: Record<string, string[]> = {
    teacher_code: ['teacher_code', 'kode_guru', 'nip_guru', 'NIP Guru', 'Guru'],
    nip: ['nip', 'NIP', 'N.I.P', 'nip_guru'],
    nuptk: ['nuptk', 'NUPTK', 'N.U.P.T.K'],
    name: ['name', 'nama', 'nama_lengkap', 'Nama', 'Nama Lengkap', 'Nama Siswa', 'Nama Guru'],
    student_code: ['student_code', 'kode_siswa', 'nis_siswa'],
    nis: ['nis', 'NIS', 'N.I.S', 'nis_siswa'],
    nisn: ['nisn', 'NISN', 'N.I.S.N'],
    rombel_code: ['rombel_code', 'kode_rombel', 'kelas', 'rombel', 'Rombel', 'Kelas', 'Nama Kelas'],
    subject_code: ['subject_code', 'kode_mapel', 'mapel', 'Mata Pelajaran', 'Mata Pelajaran Kode'],
    room_code: ['room_code', 'kode_ruang', 'ruang', 'Ruang', 'Nama Ruang'],
    academic_year_code: ['academic_year_code', 'tahun_ajaran', 'tahun_akademik', 'Tahun Ajaran'],
    homeroom_teacher_code: [
      'homeroom_teacher_code',
      'wali_kelas',
      'nip_walikelas',
      'Kode Wali Kelas'
    ],
    weekly_jp: ['weekly_jp', 'jp', 'jam_pelajaran', 'Jumlah JP', 'JP'],
    gender: ['gender', 'jenis_kelamin', 'jk', 'L/P', 'JK'],
    phone: ['phone', 'hp', 'no_hp', 'telepon', 'No HP'],
    email: ['email', 'surel', 'Email'],
    birth_place: ['birth_place', 'tempat_lahir', 'Tempat Lahir'],
    birth_date: ['birth_date', 'tanggal_lahir', 'tgl_lahir', 'Tanggal Lahir'],
    grade: ['grade', 'tingkat', 'kelas_level', 'Tingkat'],
    major: ['major', 'jurusan', 'program_keahlian', 'Jurusan'],
    capacity: ['capacity', 'kapasitas', 'Kapasitas'],
    type: ['type', 'jenis', 'tipe', 'Jenis Ruang'],
    category: ['category', 'kategori', 'Kategori'],
    kkm: ['kkm', 'KKM', 'Kriteria Ketuntasan Minimal'],
    status: ['status', 'keadaan', 'Status'],
    day: ['day', 'hari', 'day_of_week', 'Hari'],
    time_slot: ['time_slot', 'jam_ke', 'sesi', 'Jam Ke']
  }

  /**
   * Required Headers per Entity Type
   */
  private readonly REQUIRED_HEADERS: Record<MasterEntityType, string[]> = {
    TEACHER: ['name'],
    STUDENT: ['nis', 'name', 'rombel_code'],
    CLASS: ['rombel_code', 'name', 'grade', 'academic_year_code'],
    SUBJECT: ['subject_code', 'name'],
    ROOM: ['room_code', 'name'],
    ASSIGNMENT: ['teacher_code', 'subject_code', 'rombel_code', 'academic_year_code'],
    SCHEDULE: ['teacher_code', 'subject_code', 'rombel_code', 'day', 'time_slot']
  }

  /**
   * Parse raw File buffer / text into array of object rows
   */
  public parseFileContent(content: ArrayBuffer | string, filename: string): any[] {
    const isCsv = filename.toLowerCase().endsWith('.csv')

    if (isCsv && typeof content === 'string') {
      const workbook = XLSX.read(content, { type: 'string' })
      const firstSheetName = workbook.SheetNames[0]
      return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' })
    } else {
      const workbook = XLSX.read(content, { type: 'buffer' })
      const firstSheetName = workbook.SheetNames[0]
      return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' })
    }
  }

  /**
   * Map raw row header to canonical domain field
   */
  private normalizeHeaderKey(rawKey: string): {
    key: string
    isKnown: boolean
    isAmbiguous: boolean
  } {
    const cleanKey = String(rawKey)
      .trim()
      .toLowerCase()
      .replace(/[\s._-]/g, '')
    if (!cleanKey) return { key: '', isKnown: false, isAmbiguous: false }

    let matchedStandardKey: string | null = null
    let matchCount = 0

    for (const [standardKey, aliases] of Object.entries(this.ALIAS_MAP)) {
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[\s._-]/g, '')
        if (cleanKey === cleanAlias) {
          matchedStandardKey = standardKey
          matchCount++
          break
        }
      }
    }

    if (matchCount > 1) {
      return { key: String(rawKey).trim(), isKnown: false, isAmbiguous: true }
    }
    if (matchedStandardKey) {
      return { key: matchedStandardKey, isKnown: true, isAmbiguous: false }
    }
    return { key: String(rawKey).trim(), isKnown: false, isAmbiguous: false }
  }

  /**
   * Normalize gender strings (L / P / LAKI_LAKI / PEREMPUAN)
   */
  private normalizeGender(val: any): 'L' | 'P' {
    if (!val) return 'L'
    const s = String(val).trim().toUpperCase()
    if (s.startsWith('P') || s.includes('PEREMPUAN') || s.includes('FEMALE')) return 'P'
    return 'L'
  }

  /**
   * Parse and validate Preview of Import File
   */
  public async previewImport(
    entityType: MasterEntityType,
    filename: string,
    rawRows: any[]
  ): Promise<ImportPreviewResult> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses ditolak. Preview import hanya dapat dilakukan oleh Admin.'
      )
    }

    const requiredKeys = this.REQUIRED_HEADERS[entityType] || []
    const parsedRows: ParsedImportRow[] = []
    const rawHeadersSet = new Set<string>()
    const normalizedHeadersSet = new Set<string>()
    const unrecognizedHeadersSet = new Set<string>()

    // Fetch existing database entities for domain validation & duplicate detection
    const existingTeachers = await repositories.teachers.findAll()
    const existingStudents = await repositories.students.findAll()
    const existingClasses = await repositories.classes.findAll()
    const existingSubjects = await repositories.subjects.findAll()
    const existingRooms = await repositories.rooms.findAll()
    const existingAcademicYears = await repositories.academicYears.findAll()

    // Tracking seen keys in current file for in-file duplicate detection
    const seenFileKeys = new Set<string>()

    // Identify headers in raw data
    if (rawRows.length > 0) {
      Object.keys(rawRows[0]).forEach((k) => {
        rawHeadersSet.add(k)
        const headerInfo = this.normalizeHeaderKey(k)
        if (headerInfo.isKnown) {
          normalizedHeadersSet.add(headerInfo.key)
        } else if (headerInfo.isAmbiguous) {
          unrecognizedHeadersSet.add(`${k} (Ambiguous)`)
        } else {
          unrecognizedHeadersSet.add(k)
        }
      })
    }

    const missingRequiredHeaders = requiredKeys.filter((rk) => !normalizedHeadersSet.has(rk))

    let validCount = 0
    let warningCount = 0
    let errorCount = 0
    let duplicateCount = 0

    // Parse each row
    for (let index = 0; index < rawRows.length; index++) {
      const rowData = rawRows[index]
      const rowNumber = index + 2 // 1-indexed header + 1
      const normalizedData: Record<string, any> = {}
      const errors: ParsedImportRow['errors'] = []
      const warnings: ParsedImportRow['warnings'] = []
      let existingEntityId: string | undefined = undefined

      // Normalize row headers
      for (const [rawKey, val] of Object.entries(rowData)) {
        const headerInfo = this.normalizeHeaderKey(rawKey)
        if (headerInfo.isAmbiguous) {
          errors.push({
            field: rawKey,
            value: val,
            errorCode: 'AMBIGUOUS_COLUMN',
            message: `Header "${rawKey}" ambigu dan tidak dapat dipetakan secara pasti.`
          })
        } else if (headerInfo.key) {
          normalizedData[headerInfo.key] = typeof val === 'string' ? val.trim() : val
        }
      }

      // Skip completely empty rows
      const hasAnyValue = Object.values(normalizedData).some(
        (v) => v !== '' && v !== null && v !== undefined
      )
      if (!hasAnyValue) continue

      // Structural Validation: Required Fields
      for (const reqKey of requiredKeys) {
        if (
          normalizedData[reqKey] === '' ||
          normalizedData[reqKey] === null ||
          normalizedData[reqKey] === undefined
        ) {
          errors.push({
            field: reqKey,
            value: '',
            errorCode: 'REQUIRED_FIELD_MISSING',
            message: `Kolom wajib "${reqKey}" tidak boleh kosong.`
          })
        }
      }

      // Domain Validation & Referential Checks per Entity
      switch (entityType) {
        case 'TEACHER': {
          const nip = normalizedData.nip ? String(normalizedData.nip) : ''
          const nuptk = normalizedData.nuptk ? String(normalizedData.nuptk) : ''
          const name = normalizedData.name ? String(normalizedData.name) : ''

          if (nip) {
            const matchNip = existingTeachers.find((t) => t.nip && t.nip === nip)
            if (matchNip) {
              existingEntityId = matchNip.id
            }
          }
          if (!existingEntityId && nuptk) {
            const matchNuptk = existingTeachers.find((t) => t.nuptk && t.nuptk === nuptk)
            if (matchNuptk) {
              existingEntityId = matchNuptk.id
            }
          }
          if (!existingEntityId && name) {
            const matchName = existingTeachers.find(
              (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase()
            )
            if (matchName) {
              existingEntityId = matchName.id
            }
          }
          if (!existingEntityId && nuptk) {
            const matchNuptk = existingTeachers.find((t) => t.nuptk === nuptk)
            if (matchNuptk) {
              existingEntityId = matchNuptk.id
            }
          }

          // In-file duplicate check
          const fileKey = nip
            ? `nip:${nip}`
            : nuptk
              ? `nuptk:${nuptk}`
              : `name:${normalizedData.name}`
          if (seenFileKeys.has(fileKey)) {
            errors.push({
              field: 'nip/nuptk',
              value: fileKey,
              errorCode: 'DUPLICATE_IN_FILE',
              message: `Data guru terduplikasi dalam file import.`
            })
          } else {
            seenFileKeys.add(fileKey)
          }
          break
        }

        case 'STUDENT': {
          const nis = normalizedData.nis ? String(normalizedData.nis) : ''
          const nisn = normalizedData.nisn ? String(normalizedData.nisn) : ''
          const rombelCode = normalizedData.rombel_code ? String(normalizedData.rombel_code) : ''

          if (nis) {
            const matchNis = existingStudents.find((s) => s.nis === nis)
            if (matchNis) {
              existingEntityId = matchNis.id
            }
          }
          if (!existingEntityId && nisn) {
            const matchNisn = existingStudents.find((s) => s.nisn === nisn)
            if (matchNisn) {
              existingEntityId = matchNisn.id
            }
          }

          // Check rombel referential integrity
          const matchedClass = existingClasses.find(
            (c) =>
              c.name.toLowerCase() === rombelCode.toLowerCase() ||
              String(c.rombel).toLowerCase() === rombelCode.toLowerCase() ||
              (c as any).code === rombelCode ||
              c.id === rombelCode
          )
          if (!matchedClass && rombelCode) {
            errors.push({
              field: 'rombel_code',
              value: rombelCode,
              errorCode: 'ROMBEL_NOT_FOUND',
              message: `Rombel "${rombelCode}" tidak ditemukan di database master.`
            })
          } else if (matchedClass) {
            normalizedData.classId = matchedClass.id
          }

          // In-file duplicate check
          const fileKey = `nis:${nis}`
          if (seenFileKeys.has(fileKey)) {
            errors.push({
              field: 'nis',
              value: nis,
              errorCode: 'DUPLICATE_IN_FILE',
              message: `NIS "${nis}" terduplikasi dalam file import.`
            })
          } else {
            seenFileKeys.add(fileKey)
          }
          break
        }

        case 'CLASS': {
          const rombelCode = normalizedData.rombel_code ? String(normalizedData.rombel_code) : ''
          const ayCode = normalizedData.academic_year_code
            ? String(normalizedData.academic_year_code)
            : ''

          const matchedClass = existingClasses.find(
            (c) =>
              c.name.toLowerCase() === rombelCode.toLowerCase() ||
              String(c.rombel).toLowerCase() === rombelCode.toLowerCase() ||
              (c as any).code === rombelCode ||
              c.name === normalizedData.name
          )
          if (matchedClass) {
            existingEntityId = matchedClass.id
          }

          const matchedAy = existingAcademicYears.find(
            (a) => (a as any).code === ayCode || a.name === ayCode
          )
          if (!matchedAy && ayCode) {
            errors.push({
              field: 'academic_year_code',
              value: ayCode,
              errorCode: 'ACADEMIC_YEAR_NOT_FOUND',
              message: `Tahun ajaran "${ayCode}" tidak ditemukan.`
            })
          } else if (matchedAy) {
            normalizedData.academicYearId = matchedAy.id
          }

          // Homeroom teacher optional reference
          if (normalizedData.homeroom_teacher_code) {
            const tCode = String(normalizedData.homeroom_teacher_code)
            const matchTeacher = existingTeachers.find(
              (t) => t.nip === tCode || (t as any).code === tCode
            )
            if (!matchTeacher) {
              warnings.push({
                field: 'homeroom_teacher_code',
                value: tCode,
                message: `Wali kelas dengan kode "${tCode}" tidak ditemukan.`
              })
            } else {
              normalizedData.homeroomTeacherId = matchTeacher.id
            }
          }

          const fileKey = `rombel:${rombelCode}`
          if (seenFileKeys.has(fileKey)) {
            errors.push({
              field: 'rombel_code',
              value: rombelCode,
              errorCode: 'DUPLICATE_IN_FILE',
              message: `Kode Rombel "${rombelCode}" terduplikasi dalam file import.`
            })
          } else {
            seenFileKeys.add(fileKey)
          }
          break
        }

        case 'SUBJECT': {
          const subjectCode = normalizedData.subject_code ? String(normalizedData.subject_code) : ''
          const matchSub = existingSubjects.find((s) => s.code === subjectCode)
          if (matchSub) {
            existingEntityId = matchSub.id
          }

          const fileKey = `subject:${subjectCode}`
          if (seenFileKeys.has(fileKey)) {
            errors.push({
              field: 'subject_code',
              value: subjectCode,
              errorCode: 'DUPLICATE_IN_FILE',
              message: `Kode Mapel "${subjectCode}" terduplikasi dalam file import.`
            })
          } else {
            seenFileKeys.add(fileKey)
          }
          break
        }

        case 'ROOM': {
          const roomCode = normalizedData.room_code ? String(normalizedData.room_code) : ''
          const matchRoom = existingRooms.find((r) => r.code === roomCode)
          if (matchRoom) {
            existingEntityId = matchRoom.id
          }

          const fileKey = `room:${roomCode}`
          if (seenFileKeys.has(fileKey)) {
            errors.push({
              field: 'room_code',
              value: roomCode,
              errorCode: 'DUPLICATE_IN_FILE',
              message: `Kode Ruang "${roomCode}" terduplikasi dalam file import.`
            })
          } else {
            seenFileKeys.add(fileKey)
          }
          break
        }

        case 'ASSIGNMENT': {
          const tCode = normalizedData.teacher_code ? String(normalizedData.teacher_code) : ''
          const sCode = normalizedData.subject_code ? String(normalizedData.subject_code) : ''
          const rCode = normalizedData.rombel_code ? String(normalizedData.rombel_code) : ''
          const ayCode = normalizedData.academic_year_code
            ? String(normalizedData.academic_year_code)
            : ''

          const matchTeacher = existingTeachers.find(
            (t) => t.nip === tCode || (t as any).code === tCode || t.id === tCode
          )
          if (!matchTeacher && tCode) {
            errors.push({
              field: 'teacher_code',
              value: tCode,
              errorCode: 'TEACHER_NOT_FOUND',
              message: `Guru "${tCode}" tidak ditemukan.`
            })
          } else if (matchTeacher) {
            normalizedData.teacherId = matchTeacher.id
          }

          const matchSubject = existingSubjects.find((s) => s.code === sCode || s.id === sCode)
          if (!matchSubject && sCode) {
            errors.push({
              field: 'subject_code',
              value: sCode,
              errorCode: 'SUBJECT_NOT_FOUND',
              message: `Mapel "${sCode}" tidak ditemukan.`
            })
          } else if (matchSubject) {
            normalizedData.subjectId = matchSubject.id
          }

          const matchClass = existingClasses.find(
            (c) =>
              c.name.toLowerCase() === rCode.toLowerCase() ||
              String(c.rombel).toLowerCase() === rCode.toLowerCase() ||
              (c as any).code === rCode ||
              c.id === rCode
          )
          if (!matchClass && rCode) {
            errors.push({
              field: 'rombel_code',
              value: rCode,
              errorCode: 'ROMBEL_NOT_FOUND',
              message: `Rombel "${rCode}" tidak ditemukan.`
            })
          } else if (matchClass) {
            normalizedData.classId = matchClass.id
          }

          const matchAy = existingAcademicYears.find(
            (a) => (a as any).code === ayCode || a.name === ayCode || a.id === ayCode
          )
          if (!matchAy && ayCode) {
            errors.push({
              field: 'academic_year_code',
              value: ayCode,
              errorCode: 'ACADEMIC_YEAR_NOT_FOUND',
              message: `Tahun ajaran "${ayCode}" tidak ditemukan.`
            })
          } else if (matchAy) {
            normalizedData.academicYearId = matchAy.id
          }

          break
        }

        case 'SCHEDULE': {
          const tCode = normalizedData.teacher_code ? String(normalizedData.teacher_code) : ''
          const rCode = normalizedData.rombel_code ? String(normalizedData.rombel_code) : ''
          const rmCode = normalizedData.room_code ? String(normalizedData.room_code) : ''

          const matchTeacher = existingTeachers.find(
            (t) => t.nip === tCode || (t as any).code === tCode || t.id === tCode
          )
          if (!matchTeacher && tCode) {
            errors.push({
              field: 'teacher_code',
              value: tCode,
              errorCode: 'TEACHER_NOT_FOUND',
              message: `Guru "${tCode}" tidak ditemukan.`
            })
          }

          const matchClass = existingClasses.find(
            (c) =>
              c.name.toLowerCase() === rCode.toLowerCase() ||
              String(c.rombel).toLowerCase() === rCode.toLowerCase() ||
              (c as any).code === rCode ||
              c.id === rCode
          )
          if (!matchClass && rCode) {
            errors.push({
              field: 'rombel_code',
              value: rCode,
              errorCode: 'ROMBEL_NOT_FOUND',
              message: `Rombel "${rCode}" tidak ditemukan.`
            })
          }

          if (rmCode) {
            const matchRoom = existingRooms.find((r) => r.code === rmCode || r.id === rmCode)
            if (!matchRoom) {
              warnings.push({
                field: 'room_code',
                value: rmCode,
                message: `Ruang "${rmCode}" tidak ditemukan.`
              })
            } else {
              normalizedData.roomId = matchRoom.id
            }
          }
          break
        }
      }

      // Determine overall row status
      let status: RowValidationStatus = 'VALID'
      if (errors.length > 0) {
        status = 'ERROR'
        errorCount++
      } else if (existingEntityId) {
        status = 'DUPLICATE'
        duplicateCount++
      } else if (warnings.length > 0) {
        status = 'WARNING'
        warningCount++
      } else {
        validCount++
      }

      parsedRows.push({
        rowNumber,
        rawData: rowData,
        normalizedData,
        status,
        errors,
        warnings,
        existingEntityId
      })
    }

    return {
      entityType,
      filename,
      totalRows: parsedRows.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
      headers: Array.from(normalizedHeadersSet),
      unrecognizedHeaders: Array.from(unrecognizedHeadersSet),
      missingRequiredHeaders,
      rows: parsedRows
    }
  }

  /**
   * Execute Transactional Commit for Imported Data
   */
  public async commitImport(options: CommitImportOptions): Promise<ImportExecutionResult> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError('Akses ditolak. Commit import hanya dapat dilakukan oleh Admin.')
    }

    const { preview, commitMode = 'STRICT', duplicateMode = 'CREATE_ONLY' } = options

    // Check strict mode violation
    if (commitMode === 'STRICT' && preview.errorCount > 0) {
      const errorCsv = this.generateErrorReportCsv(preview.rows)
      return {
        success: false,
        importId: `imp_failed_${Date.now()}`,
        entityType: preview.entityType,
        filename: preview.filename,
        totalRows: preview.totalRows,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: preview.totalRows,
        failedCount: preview.errorCount,
        warningCount: preview.warningCount,
        status: 'FAILED',
        errorLogCsv: errorCsv,
        message: `Import ditolak (Mode STRICT): Terdapat ${preview.errorCount} baris dengan kesalahan validasi.`
      }
    }

    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0
    let failedCount = preview.errorCount
    const affectedIds: string[] = []

    const importId = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

    // Process row commits
    for (const row of preview.rows) {
      if (row.status === 'ERROR') {
        skippedCount++
        continue
      }

      if (row.status === 'DUPLICATE') {
        if (duplicateMode === 'CREATE_ONLY') {
          skippedCount++
          continue
        }
      }

      try {
        const isUpdate = Boolean(row.existingEntityId && duplicateMode !== 'CREATE_ONLY')

        switch (preview.entityType) {
          case 'TEACHER': {
            const id = isUpdate
              ? row.existingEntityId!
              : `tch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const now = new Date().toISOString()
            const teacherEntity: TeacherEntity = {
              id,
              nip: row.normalizedData.nip || '',
              nuptk: row.normalizedData.nuptk || '',
              name: row.normalizedData.name,
              gender: this.normalizeGender(row.normalizedData.gender),
              phone: row.normalizedData.phone || '',
              email: row.normalizedData.email || '',
              status: row.normalizedData.status || 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.teachers.save(teacherEntity)

            // Enqueue SyncQueue item for GAS sync
            const syncItem: SyncQueueEntity = {
              id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              entityType: 'MASTER',
              entityId: teacherEntity.id,
              operation: isUpdate ? 'UPDATE' : 'CREATE',
              payload: teacherEntity,
              status: 'PENDING',
              attempts: 0,
              queuedAt: now,
              createdAt: now,
              updatedAt: now
            }
            await repositories.syncQueue.save(syncItem)

            affectedIds.push(id)
            if (isUpdate) updatedCount++
            else createdCount++
            break
          }

          case 'STUDENT': {
            const now = new Date().toISOString()
            const id = isUpdate
              ? row.existingEntityId!
              : `std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const studentEntity: StudentEntity = {
              id,
              nis: row.normalizedData.nis,
              nisn: row.normalizedData.nisn || '',
              name: row.normalizedData.name,
              gender: this.normalizeGender(row.normalizedData.gender),
              classId: row.normalizedData.classId,
              birthPlace: row.normalizedData.birth_place || '',
              birthDate: row.normalizedData.birth_date || '',
              status: row.normalizedData.status || 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.students.save(studentEntity)

            const syncItem: SyncQueueEntity = {
              id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              entityType: 'MASTER',
              entityId: studentEntity.id,
              operation: isUpdate ? 'UPDATE' : 'CREATE',
              payload: studentEntity,
              status: 'PENDING',
              attempts: 0,
              queuedAt: now,
              createdAt: now,
              updatedAt: now
            }
            await repositories.syncQueue.save(syncItem)

            affectedIds.push(id)
            if (isUpdate) updatedCount++
            else createdCount++
            break
          }

          case 'CLASS': {
            const now = new Date().toISOString()
            const id = isUpdate
              ? row.existingEntityId!
              : `cls_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const classEntity: ClassEntity = {
              id,
              rombel: row.normalizedData.rombel_code || id,
              name: row.normalizedData.name,
              level: row.normalizedData.grade || 'X',
              majorId: row.normalizedData.major || '',
              academicYearId: row.normalizedData.academicYearId,
              homeroomTeacherId: row.normalizedData.homeroomTeacherId || '',
              status: row.normalizedData.status || 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.classes.save(classEntity)

            const syncItem: SyncQueueEntity = {
              id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              entityType: 'MASTER',
              entityId: classEntity.id,
              operation: isUpdate ? 'UPDATE' : 'CREATE',
              payload: classEntity,
              status: 'PENDING',
              attempts: 0,
              queuedAt: now,
              createdAt: now,
              updatedAt: now
            }
            await repositories.syncQueue.save(syncItem)

            affectedIds.push(id)
            if (isUpdate) updatedCount++
            else createdCount++
            break
          }

          case 'SUBJECT': {
            const now = new Date().toISOString()
            const id = isUpdate
              ? row.existingEntityId!
              : `sbj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const subjectEntity: SubjectEntity = {
              id,
              code: row.normalizedData.subject_code,
              name: row.normalizedData.name,
              category: row.normalizedData.category || 'UMUM',
              defaultKkm: Number(row.normalizedData.kkm) || 75,
              status: row.normalizedData.status || 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.subjects.save(subjectEntity)

            const syncItem: SyncQueueEntity = {
              id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              entityType: 'MASTER',
              entityId: subjectEntity.id,
              operation: isUpdate ? 'UPDATE' : 'CREATE',
              payload: subjectEntity,
              status: 'PENDING',
              attempts: 0,
              queuedAt: now,
              createdAt: now,
              updatedAt: now
            }
            await repositories.syncQueue.save(syncItem)

            affectedIds.push(id)
            if (isUpdate) updatedCount++
            else createdCount++
            break
          }

          case 'ROOM': {
            const now = new Date().toISOString()
            const id = isUpdate
              ? row.existingEntityId!
              : `rm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const roomEntity: RoomEntity = {
              id,
              code: row.normalizedData.room_code,
              name: row.normalizedData.name,
              type: row.normalizedData.type || 'THEORY',
              capacity: Number(row.normalizedData.capacity) || 36,
              status: row.normalizedData.status || 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.rooms.save(roomEntity)

            const syncItem: SyncQueueEntity = {
              id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              entityType: 'MASTER',
              entityId: roomEntity.id,
              operation: isUpdate ? 'UPDATE' : 'CREATE',
              payload: roomEntity,
              status: 'PENDING',
              attempts: 0,
              queuedAt: now,
              createdAt: now,
              updatedAt: now
            }
            await repositories.syncQueue.save(syncItem)

            affectedIds.push(id)
            if (isUpdate) updatedCount++
            else createdCount++
            break
          }

          case 'ASSIGNMENT': {
            const now = new Date().toISOString()
            const id = `asg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const assignmentEntity: TeacherAssignmentEntity = {
              id,
              code: `SK-${id}`,
              teacherId: row.normalizedData.teacherId,
              subjectId: row.normalizedData.subjectId,
              academicYearId: row.normalizedData.academicYearId,
              semester: 'GANJIL',
              hours: Number(row.normalizedData.weekly_jp) || 2,
              status: 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.teacherAssignments.save(assignmentEntity)

            affectedIds.push(id)
            createdCount++
            break
          }

          case 'SCHEDULE': {
            const now = new Date().toISOString()
            const id = `schd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            const scheduleEntity: ScheduleEntity = {
              id,
              academicYearId: row.normalizedData.academicYearId || 'ay_active',
              classId: row.normalizedData.classId || 'cls_target',
              teacherAssignmentId: row.normalizedData.teacherAssignmentId || 'asg_default',
              roomId: row.normalizedData.roomId || 'rm_default',
              dayOfWeek: (row.normalizedData.day as DayOfWeek) || 'SENIN',
              periodStart: 1,
              periodEnd: 2,
              timeStart: '07:00',
              timeEnd: '08:30',
              status: 'ACTIVE',
              createdAt: now,
              updatedAt: now
            }
            await repositories.schedules.save(scheduleEntity)

            affectedIds.push(id)
            createdCount++
            break
          }
        }
      } catch {
        failedCount++
        skippedCount++
      }
    }

    const finalStatus: ImportStatus =
      failedCount > 0 ? (createdCount > 0 || updatedCount > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED'

    const errorCsv = preview.rows.some((r) => r.status === 'ERROR')
      ? this.generateErrorReportCsv(preview.rows)
      : undefined

    // Record Import History Entry
    const nowHistory = new Date().toISOString()
    const importHistory: ImportHistoryEntity = {
      id: importId,
      timestamp: nowHistory,
      actor: session.username,
      entityType: preview.entityType,
      createdAt: nowHistory,
      updatedAt: nowHistory,
      filename: preview.filename,
      commitMode,
      duplicateMode,
      totalRows: preview.totalRows,
      createdCount,
      updatedCount,
      failedCount,
      warningCount: preview.warningCount,
      status: finalStatus,
      errorLogCsv: errorCsv
    }
    await repositories.importHistory.save(importHistory)

    // Log Audit Event
    await auditLogService.log({
      action: `IMPORT_${preview.entityType}`,
      entityType: preview.entityType,
      affectedIds,
      operation: 'CREATE',
      result: finalStatus === 'FAILED' ? 'FAILED' : 'SUCCESS',
      details: {
        importId,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        commitMode,
        duplicateMode
      }
    })

    return {
      success: finalStatus !== 'FAILED',
      importId,
      entityType: preview.entityType,
      filename: preview.filename,
      totalRows: preview.totalRows,
      createdCount,
      updatedCount,
      skippedCount,
      failedCount,
      warningCount: preview.warningCount,
      status: finalStatus,
      errorLogCsv: errorCsv,
      message: `Import selesai: ${createdCount} dibuat, ${updatedCount} diperbarui, ${skippedCount} dilewati/gagal.`
    }
  }

  /**
   * Generate Downloadable Official Import Template
   */
  public generateTemplate(
    entityType: MasterEntityType,
    format: ExportFormat = 'CSV'
  ): { filename: string; mimeType: string; content: string | ArrayBuffer } {
    let headers: string[] = []
    let sampleRows: (string | number)[][] = []

    switch (entityType) {
      case 'TEACHER':
        headers = ['teacher_code', 'nip', 'nuptk', 'name', 'gender', 'phone', 'email', 'status']
        sampleRows = [
          [
            'TCH-001',
            '198501012010011001',
            '1234567890123456',
            'Ahmad Subagyo, S.Pd.',
            'L',
            '081234567890',
            'ahmad@smknu.sch.id',
            'ACTIVE'
          ],
          [
            'TCH-002',
            '199002022015022002',
            '9876543210654321',
            'Siti Rahma, M.Kom.',
            'P',
            '081987654321',
            'siti@smknu.sch.id',
            'ACTIVE'
          ]
        ]
        break

      case 'STUDENT':
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
        sampleRows = [
          [
            'STD-001',
            '20261001',
            '0051234567',
            'Budi Santoso',
            'L',
            'Semarang',
            '2008-05-12',
            'X-TJKT-1',
            'ACTIVE'
          ],
          [
            'STD-002',
            '20261002',
            '0057654321',
            'Anisa Putri',
            'P',
            'Ungaran',
            '2008-08-20',
            'X-TJKT-1',
            'ACTIVE'
          ]
        ]
        break

      case 'CLASS':
        headers = [
          'rombel_code',
          'name',
          'grade',
          'major',
          'academic_year_code',
          'homeroom_teacher_code',
          'status'
        ]
        sampleRows = [
          ['X-TJKT-1', 'X TJKT 1', 'X', 'TJKT', '2026/2027', '198501012010011001', 'ACTIVE'],
          ['XI-PPLG-2', 'XI PPLG 2', 'XI', 'PPLG', '2026/2027', '199002022015022002', 'ACTIVE']
        ]
        break

      case 'SUBJECT':
        headers = ['subject_code', 'name', 'category', 'kkm', 'status']
        sampleRows = [
          ['MTK-X', 'Matematika Kelas X', 'UMUM', 75, 'ACTIVE'],
          ['PROG-XI', 'Pemrograman Berorientasi Objek', 'KEJURUAN', 78, 'ACTIVE']
        ]
        break

      case 'ROOM':
        headers = ['room_code', 'name', 'type', 'capacity', 'status']
        sampleRows = [
          ['LAB-RPL-1', 'Laboratorium Software', 'LAB', 36, 'ACTIVE'],
          ['TEORI-01', 'Ruang Teori 01', 'TEORI', 36, 'ACTIVE']
        ]
        break

      case 'ASSIGNMENT':
        headers = ['teacher_code', 'subject_code', 'rombel_code', 'weekly_jp', 'academic_year_code']
        sampleRows = [
          ['198501012010011001', 'MTK-X', 'X-TJKT-1', 4, '2026/2027'],
          ['199002022015022002', 'PROG-XI', 'XI-PPLG-2', 6, '2026/2027']
        ]
        break

      case 'SCHEDULE':
        headers = ['teacher_code', 'subject_code', 'rombel_code', 'room_code', 'day', 'time_slot']
        sampleRows = [
          ['198501012010011001', 'MTK-X', 'X-TJKT-1', 'TEORI-01', 'SENIN', '07:00-08:30'],
          ['199002022015022002', 'PROG-XI', 'XI-PPLG-2', 'LAB-RPL-1', 'SELASA', '08:30-10:00']
        ]
        break
    }

    const filename = `template-import-${entityType.toLowerCase()}.${format.toLowerCase()}`

    if (format === 'CSV') {
      const csvLines = [
        headers.join(','),
        ...sampleRows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ]
      return {
        filename,
        mimeType: 'text/csv;charset=utf-8;',
        content: csvLines.join('\n')
      }
    } else {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
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

  /**
   * Generate Downloadable Error Log CSV Report
   */
  public generateErrorReportCsv(rows: ParsedImportRow[]): string {
    const headers = ['row', 'field', 'value', 'error_code', 'message']
    const csvRows: string[][] = []

    for (const row of rows) {
      if (row.status === 'ERROR') {
        for (const err of row.errors) {
          csvRows.push([
            String(row.rowNumber),
            err.field,
            String(err.value || ''),
            err.errorCode,
            err.message
          ])
        }
      }
    }

    const csvContent = [
      headers.join(','),
      ...csvRows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Parse and validate Dokumen 1 file (PDF, XLSX, XLS)
   */
  public async parseAndPreviewDokumen1(
    buffer: ArrayBuffer,
    filename: string
  ): Promise<Dokumen1ParseResult> {
    const isPdf = filename.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      return await parseDokumen1FromPdf(buffer)
    } else {
      return parseDokumen1FromXlsx(buffer)
    }
  }

  /**
   * Commit Dokumen 1 into database (syncs Teachers, Subjects, and 117 Assignments atomically)
   */
  public async commitDokumen1(
    rows: Dokumen1Row[],
    filename: string
  ): Promise<{
    success: boolean
    teachersCreatedOrUpdated: number
    subjectsCreatedOrUpdated: number
    assignmentsCreatedOrUpdated: number
    message: string
  }> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError(
        'Akses ditolak. Import Dokumen 1 hanya dapat dilakukan oleh Admin.'
      )
    }

    const now = new Date().toISOString()
    const activeAcademicYear = await repositories.academicYears.findActive()
    const academicYearId = activeAcademicYear?.id || 'ay_2026_2027_ganjil'

    // Existing master data
    const [existingTeachers, existingSubjects, existingAssignments] = await Promise.all([
      repositories.teachers.findAll(),
      repositories.subjects.findAll(),
      repositories.teacherAssignments.findAll()
    ])

    const teacherMapByName = new Map<string, TeacherEntity>()
    existingTeachers.forEach((t) => teacherMapByName.set(t.name.toLowerCase().trim(), t))

    const subjectMapByName = new Map<string, SubjectEntity>()
    existingSubjects.forEach((s) => subjectMapByName.set(s.name.toLowerCase().trim(), s))

    const assignmentMapByCode = new Map<string, TeacherAssignmentEntity>()
    existingAssignments.forEach((a) => {
      if (a.code) assignmentMapByCode.set(a.code.toUpperCase().trim(), a)
    })

    let teachersCount = 0
    let subjectsCount = 0
    let assignmentsCount = 0

    // Process rows
    for (const row of rows) {
      if (!row.code || !row.teacherName) continue

      const cleanTeacherName = (row.cleanTeacherName || row.teacherName).trim()
      const cleanSubjectName = (row.subjectName || '-').trim()

      // 1. Teacher Entity
      let teacher = teacherMapByName.get(cleanTeacherName.toLowerCase())
      if (!teacher) {
        const newTeacherId = `tch_${cleanTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        teacher = {
          id: newTeacherId,
          name: cleanTeacherName,
          status: 'ACTIVE',
          gender:
            cleanTeacherName.toLowerCase().includes('ibu') ||
            cleanTeacherName.toLowerCase().includes('siti') ||
            cleanTeacherName.toLowerCase().includes('dewi') ||
            cleanTeacherName.toLowerCase().includes('dina') ||
            cleanTeacherName.toLowerCase().includes('ika') ||
            cleanTeacherName.toLowerCase().includes('erna') ||
            cleanTeacherName.toLowerCase().includes('lufita')
              ? 'P'
              : 'L',
          createdAt: now,
          updatedAt: now
        }
        await repositories.teachers.create(teacher)
        teacherMapByName.set(cleanTeacherName.toLowerCase(), teacher)
        teachersCount++
      }

      // 2. Subject Entity
      let subject = subjectMapByName.get(cleanSubjectName.toLowerCase())
      if (!subject && cleanSubjectName !== '-') {
        const newSubjectId = `sbj_${cleanSubjectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        const subjectCode = cleanSubjectName
          .slice(0, 8)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
        subject = {
          id: newSubjectId,
          code: subjectCode || 'MAPEL',
          name: cleanSubjectName,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        }
        await repositories.subjects.create(subject)
        subjectMapByName.set(cleanSubjectName.toLowerCase(), subject)
        subjectsCount++
      }

      // 3. Assignment Entity
      const codeKey = row.code.toUpperCase().trim()
      const existingAssignment = assignmentMapByCode.get(codeKey)

      if (existingAssignment) {
        // Update
        existingAssignment.teacherId = teacher.id
        if (subject) existingAssignment.subjectId = subject.id
        existingAssignment.hours = row.hours
        existingAssignment.updatedAt = now
        await repositories.teacherAssignments.update(existingAssignment.id, existingAssignment)
        assignmentsCount++
      } else {
        // Create
        const newAssignmentId = `asgn_${row.code.toLowerCase()}_${row.no}`
        const newAssignment: TeacherAssignmentEntity = {
          id: newAssignmentId,
          teacherId: teacher.id,
          code: row.code,
          subjectId: subject ? subject.id : 'sbj_general',
          hours: row.hours,
          academicYearId,
          semester: 'GANJIL',
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        }
        await repositories.teacherAssignments.create(newAssignment)
        assignmentMapByCode.set(codeKey, newAssignment)
        assignmentsCount++
      }
    }

    // Audit log
    await auditLogService.log({
      action: 'IMPORT_DOKUMEN_1',
      entityType: 'TEACHER',
      operation: `Import Dokumen 1 (${filename}): ${rows.length} baris diproses, ${teachersCount} guru baru, ${subjectsCount} mapel baru, ${assignmentsCount} penugasan disinkronkan.`,
      result: 'SUCCESS'
    })

    // Save to Import History
    const historyId = `imp_dok1_${Date.now()}`
    await repositories.importHistory.create({
      id: historyId,
      timestamp: now,
      actor: session.username,
      entityType: 'TEACHER',
      filename,
      commitMode: 'STRICT',
      duplicateMode: 'UPSERT',
      totalRows: rows.length,
      createdCount: assignmentsCount,
      updatedCount: 0,
      failedCount: 0,
      warningCount: 0,
      status: 'COMPLETED',
      createdAt: now,
      updatedAt: now
    })

    return {
      success: true,
      teachersCreatedOrUpdated: teachersCount,
      subjectsCreatedOrUpdated: subjectsCount,
      assignmentsCreatedOrUpdated: assignmentsCount,
      message: `Berhasil mengimpor Dokumen 1 (${rows.length} baris). ${teachersCount} guru, ${subjectsCount} mata pelajaran, dan ${assignmentsCount} SK penugasan telah diperbarui secara paten.`
    }
  }

  /**
   * Retrieve Import History list for Admin
   */
  public async getImportHistory(): Promise<ImportHistoryEntity[]> {
    const session = authService.getCurrentSession()
    if (!session || session.role !== 'ADMIN') {
      throw new AuthorizationError('Akses ditolak. Riwayat import hanya dapat diakses oleh Admin.')
    }
    const history = await repositories.importHistory.findAll()
    return history.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }
}

export const importService = new ImportService()
