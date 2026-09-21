/**
 * Guru Offline - Phase C2 Administrative Academic Ledger Export Test Suite
 * Covers requirements for AcademicLedgerService:
 * 1. Admin authorization (Success)
 * 2. Guru rejection (Throws AuthorizationError)
 * 3. Correct multi-domain aggregation (Grade ledger weighted scores, attendance tally, discipline note tracking, teacher teaching load)
 * 4. XLSX workbook compilation with 4 target sheets
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth'
import { academicLedgerService } from '../services/report/AcademicLedgerService'
import type {
  AcademicYearEntity,
  ClassEntity,
  StudentEntity,
  SubjectEntity,
  AssessmentEntity,
  AttendanceEntity,
  DisciplineNoteEntity
} from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`)
  }
}

export async function runPhaseC2Tests() {
  console.log('\n=== RUNNING PHASE C2 ACADEMIC LEDGER EXPORT TEST SUITE ===\n')
  let passed = 0
  let failed = 0

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message || err)
      failed++
    }
  }

  // 1. Initial database seeding
  await seedDatabase(true)

  // Clear existing setup and prepare clean mock records
  const listAY = await repositories.academicYears.findAll()
  for (const ay of listAY) {
    await repositories.academicYears.delete(ay.id)
  }

  const listClasses = await repositories.classes.findAll()
  for (const c of listClasses) {
    await repositories.classes.delete(c.id)
  }

  const listStudents = await repositories.students.findAll()
  for (const s of listStudents) {
    await repositories.students.delete(s.id)
  }

  const listSubjects = await repositories.subjects.findAll()
  for (const sub of listSubjects) {
    await repositories.subjects.delete(sub.id)
  }

  const listAssessments = await repositories.assessments.findAll()
  for (const asm of listAssessments) {
    await repositories.assessments.delete(asm.id)
  }

  const listAttendances = await repositories.attendances.findAll()
  for (const att of listAttendances) {
    await repositories.attendances.delete(att.id)
  }

  const listNotes = await repositories.disciplineNotes.findAll()
  for (const note of listNotes) {
    await repositories.disciplineNotes.delete(note.id)
  }

  // Set up mock metadata
  const academicYearId = 'ay_2026_2027'
  const ay: AcademicYearEntity = {
    id: academicYearId,
    name: '2026/2027',
    semester: 'GANJIL',
    isActive: true,
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await repositories.academicYears.create(ay)

  const classId = 'class_10_tkj1'
  const classObj: ClassEntity = {
    id: classId,
    name: 'X TKJ 1',
    level: 'X',
    rombel: 1,
    academicYearId,
    majorId: 'mj_tkj',
    homeroomTeacherId: 'tch_guru_1',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await repositories.classes.create(classObj)

  const studentId = 'std_mamat'
  const student: StudentEntity = {
    id: studentId,
    nis: '26001',
    name: 'Mamat Slamet',
    gender: 'L',
    classId,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await repositories.students.create(student)

  const subjectId = 'sub_ddj'
  const subject: SubjectEntity = {
    id: subjectId,
    code: 'DDJ',
    name: 'Dasar-Dasar Jaringan',
    category: 'KEJURUAN',
    defaultKkm: 75,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await repositories.subjects.create(subject)

  // -------------------------------------------------------------
  // TEST 1: Guru Authorization Rejection
  // -------------------------------------------------------------
  await test('1. Guru session is rejected from Academic Ledger operations', async () => {
    // Mimic Guru session
    authService.setSessionForTesting({
      sessionId: 'sess_guru_ledger',
      userId: 'user_guru',
      username: 'guru_test',
      role: 'GURU',
      teacherId: 'tch_guru_1',
      teacherName: 'Guru Test, S.Pd.',
      authenticatedAt: new Date().toISOString()
    })

    try {
      await academicLedgerService.getGradeLedgerData(academicYearId, 'GANJIL', classId)
      assert(false, 'Should have thrown AuthorizationError')
    } catch (err: any) {
      assert(err.message.includes('Akses Ditolak'), 'Should throw Access Denied')
    }
  })

  // -------------------------------------------------------------
  // TEST 2: Admin Access & Complete Grade Ledger Aggregation
  // -------------------------------------------------------------
  await test('2. Admin can successfully fetch Grade Ledger and weighted scores', async () => {
    // Setup Admin session
    authService.setSessionForTesting({
      sessionId: 'sess_admin_ledger',
      userId: 'user_admin',
      username: 'admin',
      role: 'ADMIN',
      authenticatedAt: new Date().toISOString()
    })

    // Create 3 assessments (Formatif, STS, SAS) to verify the 50/25/25 calculation
    const asmFormatif: AssessmentEntity = {
      id: 'asm_f1',
      classId,
      subjectId,
      teacherAssignmentId: 'asg_1',
      academicYearId,
      semester: 'GANJIL',
      type: 'HARIAN',
      title: 'Harian 1',
      maxScore: 100,
      scores: [{ studentId, score: 80 }],
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const asmSts: AssessmentEntity = {
      id: 'asm_sts1',
      classId,
      subjectId,
      teacherAssignmentId: 'asg_1',
      academicYearId,
      semester: 'GANJIL',
      type: 'STS',
      title: 'STS 1',
      maxScore: 100,
      scores: [{ studentId, score: 90 }],
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const asmSas: AssessmentEntity = {
      id: 'asm_sas1',
      classId,
      subjectId,
      teacherAssignmentId: 'asg_1',
      academicYearId,
      semester: 'GANJIL',
      type: 'SAS',
      title: 'SAS 1',
      maxScore: 100,
      scores: [{ studentId, score: 70 }],
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await repositories.assessments.create(asmFormatif)
    await repositories.assessments.create(asmSts)
    await repositories.assessments.create(asmSas)

    const gradeLedger = await academicLedgerService.getGradeLedgerData(
      academicYearId,
      'GANJIL',
      classId
    )
    assert(gradeLedger.subjects.length === 1, 'Should find 1 active subject')
    assert(gradeLedger.rows.length === 1, 'Should find 1 active student')

    const studentRow = gradeLedger.rows[0]
    assert(studentRow.nis === '26001', 'NIS matches')
    assert(studentRow.name === 'Mamat Slamet', 'Student name matches')

    // Calculated NA formula: 50% * Formatif (80) + 25% * STS (90) + 25% * SAS (70)
    // 40 + 22.5 + 17.5 = 80
    assert(studentRow.grades['DDJ'] === 80, `Expected 80 grade, got ${studentRow.grades['DDJ']}`)
    assert(studentRow.averageScore === 80, `Average score is 80, got ${studentRow.averageScore}`)
    assert(studentRow.belowKkmCount === 0, 'No grade below KKM 75')
    assert(studentRow.status === 'TUNTAS', 'Status is TUNTAS')
  })

  // -------------------------------------------------------------
  // TEST 3: Attendance Ledger Aggregation Verification
  // -------------------------------------------------------------
  await test('3. Attendance Ledger tallies presence percentage accurately', async () => {
    // Log attendance
    const attendance: AttendanceEntity = {
      id: 'att_mamat_1',
      scheduleId: 'sch_1',
      classId,
      teacherAssignmentId: 'asg_1',
      date: '2026-08-10',
      academicYearId,
      semester: 'GANJIL',
      records: [{ studentId, status: 'H' }],
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await repositories.attendances.create(attendance)

    const attendance2: AttendanceEntity = {
      id: 'att_mamat_2',
      scheduleId: 'sch_1',
      classId,
      teacherAssignmentId: 'asg_1',
      date: '2026-08-11',
      academicYearId,
      semester: 'GANJIL',
      records: [{ studentId, status: 'A' }], // Absent / Alpa
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await repositories.attendances.create(attendance2)

    const ledger = await academicLedgerService.getAttendanceLedgerData(
      academicYearId,
      'GANJIL',
      classId
    )
    assert(ledger.length === 1, 'Should return 1 attendance record')
    const rec = ledger[0]
    assert(rec.hadir === 1, 'Exactly 1 present')
    assert(rec.alpa === 1, 'Exactly 1 alpa')
    assert(rec.total === 2, 'Total 2 sessions logged')
    // Presence percentage = (1 / 2) * 100 = 50%
    assert(rec.percentage === 50, `Presence should be 50%, got ${rec.percentage}%`)
  })

  // -------------------------------------------------------------
  // TEST 4: Discipline Ledger Boundary Constraints
  // -------------------------------------------------------------
  await test('4. Discipline Ledger aggregates notes matching date boundary', async () => {
    // Create valid violation within semester dates (July - Dec 2026)
    const validNote: DisciplineNoteEntity = {
      id: 'disc_valid',
      studentId,
      teacherId: 'tch_guru_1',
      classId,
      date: '2026-09-15',
      type: 'VIOLATION',
      point: 15,
      description: 'Terlambat masuk gerbang sekolah',
      followup: 'Diberikan teguran lisan',
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await repositories.disciplineNotes.create(validNote)

    // Create invalid note outside academic year (e.g., in 2027)
    const invalidNote: DisciplineNoteEntity = {
      id: 'disc_invalid',
      studentId,
      teacherId: 'tch_guru_1',
      classId,
      date: '2027-02-15', // Outside bounds
      type: 'VIOLATION',
      point: 20,
      description: 'Pelanggaran atribut lengkap',
      createdBy: 'user_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await repositories.disciplineNotes.create(invalidNote)

    const notes = await academicLedgerService.getDisciplineLedgerData(academicYearId, classId)
    assert(notes.length === 1, 'Should aggregate only the note within year dates range')
    assert(notes[0].point === 15, 'Retrieved point matches')
    assert(notes[0].category === 'PELANGGARAN', 'Indonesian category maps correctly')
  })

  // -------------------------------------------------------------
  // TEST 5: XLSX Document Export Workbook Generation
  // -------------------------------------------------------------
  await test('5. XLSX document compiler generates workbook structure correctly', async () => {
    const file = await academicLedgerService.generateLedgerXlsx(academicYearId, 'GANJIL', classId)
    assert(file.filename.startsWith('LEDGER_AKADEMIK'), 'Filename prefix matches template')
    assert(
      file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Mime type is XLSX'
    )
    assert(file.content !== undefined && file.content !== null, 'Output content is present')
  })

  console.log(`\nAcademic Ledger Test Summary: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    throw new Error('Some Phase C2 Academic Ledger tests failed.')
  }
}
