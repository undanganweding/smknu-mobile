import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth'
import { semesterClosingService } from '../services/academic/SemesterClosingService'
import {
  academicLockGuardService,
  SemesterLockedError
} from '../services/academic/AcademicLockGuardService'
import { historicalReportService } from '../services/academic/HistoricalReportService'
import { assessmentService } from '../services/assessment/AssessmentService'
import { attendanceService } from '../services/attendance/AttendanceService'
import { journalService } from '../services/journal/JournalService'
import { disciplineService } from '../services/discipline/DisciplineService'
import { syncService } from '../services/sync/SyncService'
import type {
  AcademicYearEntity,
  ClassEntity,
  StudentEntity,
  SubjectEntity,
  ScheduleEntity,
  SyncQueueEntity
} from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`)
  }
}

export async function runPhaseC3Tests() {
  console.log('\n=== RUNNING PHASE C3 SEMESTER CLOSING TEST SUITE ===\n')
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

  // Clean and prepare target structures
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

  const listJournals = await repositories.journals.findAll()
  for (const j of listJournals) {
    await repositories.journals.delete(j.id)
  }

  const listNotes = await repositories.disciplineNotes.findAll()
  for (const note of listNotes) {
    await repositories.disciplineNotes.delete(note.id)
  }

  const listSchedules = await repositories.schedules.findAll()
  for (const sch of listSchedules) {
    await repositories.schedules.delete(sch.id)
  }

  // Set up mock metadata
  const academicYearId = 'ay_2026_ganjil'
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

  // Seed missing teacher, major, and room entities
  await repositories.teachers.create({
    id: 'tch_guru_1',
    nip: '198001012005011001',
    name: 'Guru Test',
    gender: 'L',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.majors.create({
    id: 'mj_tkj',
    code: 'TKJ',
    name: 'Teknik Komputer dan Jaringan',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  await repositories.rooms.create({
    id: 'room_1',
    code: 'R1',
    name: 'Ruang Teori 1',
    type: 'THEORY',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const teacherAssignmentId = 'asg_1'
  await repositories.teacherAssignments.create({
    id: teacherAssignmentId,
    teacherId: 'tch_guru_1',
    code: 'ASG-TKJ-1',
    subjectId,
    academicYearId,
    hours: 4,
    semester: 'GANJIL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const scheduleId = 'sch_1'
  const scheduleObj: ScheduleEntity = {
    id: scheduleId,
    academicYearId,
    classId,
    teacherAssignmentId,
    roomId: 'room_1',
    dayOfWeek: 'SENIN',
    periodStart: 1,
    periodEnd: 4,
    timeStart: '07:00',
    timeEnd: '10:00',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await repositories.schedules.create(scheduleObj)

  // -------------------------------------------------------------
  // TEST 1: Compliance Checking & Admin Access
  // -------------------------------------------------------------
  await test('1. Admin can successfully fetch pre-closing compliance metrics', async () => {
    authService.setSessionForTesting({
      sessionId: 'sess_admin_closing',
      userId: 'user_admin',
      username: 'admin',
      role: 'ADMIN',
      authenticatedAt: new Date().toISOString()
    })

    const report = await semesterClosingService.getSemesterCompliance(academicYearId)
    assert(report.totalClasses === 1, 'Report sees 1 class')
    assert(report.totalAssessments === 0, 'No assessments yet')
    assert(report.journalComplianceRate === 0, '0% journal compliance yet')
  })

  // -------------------------------------------------------------
  // TEST 2: Lock Transition Immutability
  // -------------------------------------------------------------
  await test('2. Admin can execute lock, marking semester locked and inactive', async () => {
    // Before lock
    let isLocked = await academicLockGuardService.isSemesterLocked(academicYearId)
    assert(!isLocked, 'Semester should be unlocked initially')

    // Seed at least one assessment to make the compliance checking happy
    await repositories.assessments.create({
      id: 'asm_dummy',
      classId,
      subjectId,
      teacherAssignmentId,
      academicYearId,
      semester: 'GANJIL',
      type: 'HARIAN',
      title: 'Dummy Asm',
      maxScore: 100,
      scores: [],
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Execute lock
    await semesterClosingService.closeSemester(academicYearId)

    // After lock
    isLocked = await academicLockGuardService.isSemesterLocked(academicYearId)
    assert(isLocked, 'Semester must be locked after closeSemester')

    const activeAY = await repositories.academicYears.findById(academicYearId)
    assert(!!activeAY && activeAY.isLocked === true, 'isLocked is set on database')
    assert(!!activeAY && activeAY.isActive === false, 'isActive is disabled')
  })

  // -------------------------------------------------------------
  // TEST 3: Write Protection Interception (Assessments, Attendance, Journal)
  // -------------------------------------------------------------
  await test('3. Mutation attempts in locked semester are rejected with SemesterLockedError', async () => {
    // 3a. Assessment protection
    authService.setSessionForTesting({
      sessionId: 'sess_guru',
      userId: 'user_guru',
      username: 'guru_test',
      role: 'GURU',
      teacherId: 'tch_guru_1',
      teacherName: 'Guru Test',
      authenticatedAt: new Date().toISOString()
    })

    try {
      await assessmentService.createAssessment({
        teacherAssignmentId,
        classId,
        type: 'HARIAN',
        title: 'Penilaian Pasca Lock'
      })
      assert(false, 'Should throw error when creating assessment in locked semester')
    } catch (err: any) {
      assert(err instanceof SemesterLockedError, 'Throws SemesterLockedError on assessment create')
    }

    // 3b. Attendance protection
    try {
      await attendanceService.saveAttendance({
        scheduleId,
        date: '2026-09-10',
        records: [{ studentId, status: 'H' }]
      })
      assert(false, 'Should throw error when saving attendance in locked semester')
    } catch (err: any) {
      assert(err instanceof SemesterLockedError, 'Throws SemesterLockedError on attendance save')
    }

    // 3c. Journal protection
    try {
      await journalService.saveJournal({
        scheduleId,
        date: '2026-09-10',
        topic: 'Materi Jaringan',
        activitySummary: 'Praktek RJ45'
      })
      assert(false, 'Should throw error when saving journal in locked semester')
    } catch (err: any) {
      assert(err instanceof SemesterLockedError, 'Throws SemesterLockedError on journal save')
    }

    // 3d. Discipline protection (date locked)
    try {
      await disciplineService.createNote({
        studentId,
        classId,
        date: '2026-09-10', // Falls inside locked date boundaries (Jul - Dec 2026)
        type: 'VIOLATION',
        description: 'Melanggar aturan'
      })
      assert(false, 'Should throw error when saving discipline note on locked date range')
    } catch (err: any) {
      assert(
        err instanceof SemesterLockedError,
        'Throws SemesterLockedError on discipline note create'
      )
    }
  })

  // -------------------------------------------------------------
  // TEST 4: Sync Queue Safety Block
  // -------------------------------------------------------------
  await test('4. SyncQueue safety engine blocks sync single item for locked semesters', async () => {
    const queueItem: SyncQueueEntity = {
      id: 'sync_dummy_1',
      entityType: 'ASSESSMENT',
      entityId: 'asm_offline_1',
      operation: 'CREATE',
      status: 'PENDING',
      attempts: 0,
      queuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payload: {
        id: 'asm_offline_1',
        academicYearId // References locked academic year
      }
    }

    await repositories.syncQueue.create(queueItem)

    // Execute sync Single
    const response = await syncService.syncSingleItem(queueItem)
    assert(response.success === false, 'Sync should fail for locked semester payload')
    assert(
      response.message.includes('Semester akademik telah dikunci'),
      'Correct safety error returned'
    )

    const dbItem = await repositories.syncQueue.findById('sync_dummy_1')
    assert(!!dbItem && dbItem.status === 'FAILED', 'Sync status transitioned to FAILED')
    assert(
      !!dbItem &&
        !!dbItem.lastError &&
        dbItem.lastError.includes('Semester akademik telah dikunci'),
      'Error message saved in queue'
    )
  })

  // -------------------------------------------------------------
  // TEST 5: Read-Only Historical Lookups
  // -------------------------------------------------------------
  await test('5. Read-only historical lookup is allowed for archives', async () => {
    authService.setSessionForTesting({
      sessionId: 'sess_admin_closing',
      userId: 'user_admin',
      username: 'admin',
      role: 'ADMIN',
      authenticatedAt: new Date().toISOString()
    })

    const historicalYears = await historicalReportService.getHistoricalSemesters()
    assert(historicalYears.length === 1, 'Sees 1 locked historical semester')
    assert(historicalYears[0].id === academicYearId, 'Locked semester matches')
  })

  console.log(`\nSemester Closing Test Summary: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    throw new Error('Some Phase C3 Semester Closing tests failed.')
  }
}
