/**
 * Guru Offline - Phase 7 Admin System & School Management Core Test Suite
 * Covers 20 comprehensive test cases for Master Data, Scheduling, Referential Integrity,
 * Conflict Detection, Academic Settings, Account Management, and RBAC Authorization.
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import {
  teacherService,
  subjectService,
  classService,
  roomService,
  studentService,
  assignmentService,
  scheduleService,
  academicService
} from '../services/master'
import { authService, authorizationService } from '../services/auth'
import { repositories } from '../repositories'

export async function runPhase7Tests() {
  console.log('\n=== RUNNING PHASE 7 ADMIN SYSTEM & SCHOOL MANAGEMENT TEST SUITE ===\n')
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

  // Seed local IndexedDB database
  await seedDatabase(true)

  // Login as ADMIN
  const loginRes = await authService.login('admin', 'admin123')
  if (!loginRes.success) {
    throw new Error('Failed to authenticate as Admin for Phase 7 test suite')
  }

  // -------------------------------------------------------------
  // TEST 1: Teacher Creation & Validation
  // -------------------------------------------------------------
  await test('1. TeacherService creates new teacher with valid fields', async () => {
    const created = await teacherService.createTeacher({
      name: 'Drs. Supriyadi, M.Pd.',
      nip: '197508152000031001',
      nuptk: '8534753655200013',
      gender: 'L',
      education: 'S2',
      position: 'Guru Utama Teknik Otomotif',
      employmentStatus: 'PNS'
    })

    if (!created.id || created.name !== 'Drs. Supriyadi, M.Pd.') {
      throw new Error('Failed to create teacher entity properly')
    }
    if (created.status !== 'ACTIVE') {
      throw new Error('New teacher default status should be ACTIVE')
    }
  })

  // -------------------------------------------------------------
  // TEST 2: Teacher NIP / NUPTK Uniqueness Validation
  // -------------------------------------------------------------
  await test('2. TeacherService rejects duplicate NIP and NUPTK', async () => {
    let nipRejected = false
    try {
      await teacherService.createTeacher({
        name: 'Guru Penyamar 1',
        nip: '197508152000031001' // Duplicate NIP from Test 1
      })
    } catch (err: any) {
      if (err.message.includes('sudah terdaftar')) {
        nipRejected = true
      }
    }

    if (!nipRejected) {
      throw new Error('Duplicate NIP was not rejected by TeacherService')
    }

    let nuptkRejected = false
    try {
      await teacherService.createTeacher({
        name: 'Guru Penyamar 2',
        nip: '198001012005011002',
        nuptk: '8534753655200013' // Duplicate NUPTK from Test 1
      })
    } catch (err: any) {
      if (err.message.includes('sudah terdaftar')) {
        nuptkRejected = true
      }
    }

    if (!nuptkRejected) {
      throw new Error('Duplicate NUPTK was not rejected by TeacherService')
    }
  })

  // -------------------------------------------------------------
  // TEST 3: Teacher Soft Deactivation (Preserving History)
  // -------------------------------------------------------------
  await test('3. TeacherService toggles status (ACTIVE <-> INACTIVE) preserving records', async () => {
    const teachers = await teacherService.getAllTeachers()
    const target = teachers[0]
    const originalStatus = target.status

    const toggled = await teacherService.toggleTeacherStatus(target.id)
    if (toggled.status === originalStatus) {
      throw new Error('Teacher status did not toggle')
    }

    // Toggle back
    const restored = await teacherService.toggleTeacherStatus(target.id)
    if (restored.status !== originalStatus) {
      throw new Error('Failed to restore teacher status')
    }
  })

  // -------------------------------------------------------------
  // TEST 4: Student Creation & NIS Uniqueness
  // -------------------------------------------------------------
  await test('4. StudentService creates student and rejects duplicate NIS', async () => {
    const classes = await classService.getAllClasses()
    const targetClass = classes[0]

    const student = await studentService.createStudent({
      nis: '20268801',
      nisn: '0098880001',
      name: 'Budi Santoso',
      gender: 'L',
      classId: targetClass.id,
      birthPlace: 'Ungaran',
      birthDate: '2009-08-20'
    })

    if (student.nis !== '20268801' || student.status !== 'ACTIVE') {
      throw new Error('Failed to create student entity')
    }

    let duplicateRejected = false
    try {
      await studentService.createStudent({
        nis: '20268801', // Duplicate NIS
        name: 'Budi Santoso Tiruan',
        gender: 'L',
        classId: targetClass.id
      })
    } catch (err: any) {
      if (err.message.includes('sudah terdaftar')) {
        duplicateRejected = true
      }
    }

    if (!duplicateRejected) {
      throw new Error('Duplicate NIS was not rejected by StudentService')
    }
  })

  // -------------------------------------------------------------
  // TEST 5: Student Status Lifecycle Transitions
  // -------------------------------------------------------------
  await test('5. StudentService transitions student status (ACTIVE -> MUTATION -> GRADUATED -> INACTIVE)', async () => {
    const students = await studentService.getAllStudents('ACTIVE')
    const target = students[0]

    const mutated = await studentService.setStudentStatus(target.id, 'MUTATION')
    if (mutated.status !== 'MUTATION') throw new Error('Failed transition to MUTATION')

    const graduated = await studentService.setStudentStatus(target.id, 'GRADUATED')
    if (graduated.status !== 'GRADUATED') throw new Error('Failed transition to GRADUATED')

    const inactive = await studentService.setStudentStatus(target.id, 'INACTIVE')
    if (inactive.status !== 'INACTIVE') throw new Error('Failed transition to INACTIVE')

    // Restore to ACTIVE
    await studentService.setStudentStatus(target.id, 'ACTIVE')
  })

  // -------------------------------------------------------------
  // TEST 6: Class (Rombel) Management & Homeroom Linking
  // -------------------------------------------------------------
  await test('6. ClassService creates class with grade level, major, and homeroom teacher', async () => {
    const majors = await classService.getAllMajors()
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const activeAy = await academicService.getActiveAcademicYear()

    const newClass = await classService.createClass({
      name: 'X TO 3 Phase7',
      level: 'X',
      rombel: 3,
      academicYearId: activeAy?.id || 'ay_2026_2027_ganjil',
      majorId: majors[0].id,
      homeroomTeacherId: teachers[0].id
    })

    if (!newClass.id || newClass.homeroomTeacherId !== teachers[0].id) {
      throw new Error('Failed to create class with homeroom teacher link')
    }
  })

  // -------------------------------------------------------------
  // TEST 7: Class Search & Filters
  // -------------------------------------------------------------
  await test('7. ClassService searches and filters classes by grade level and major', async () => {
    const levelXClasses = await classService.searchClasses(undefined, 'X', undefined)
    for (const c of levelXClasses) {
      if (c.level !== 'X') {
        throw new Error(`Filter level X returned class with level ${c.level}`)
      }
    }

    const majors = await classService.getAllMajors()
    const majorFiltered = await classService.searchClasses(undefined, undefined, majors[0].id)
    for (const c of majorFiltered) {
      if (c.majorId !== majors[0].id) {
        throw new Error('Major filter mismatch')
      }
    }
  })

  // -------------------------------------------------------------
  // TEST 8: Subject Creation & Code Uniqueness
  // -------------------------------------------------------------
  await test('8. SubjectService creates subject and enforces unique subject code', async () => {
    const created = await subjectService.createSubject({
      code: 'MAPEL-P7-01',
      name: 'Konsentrasi Keahlian PPLG Phase7',
      category: 'KEJURUAN',
      defaultKkm: 82
    })

    if (created.code !== 'MAPEL-P7-01' || created.defaultKkm !== 82) {
      throw new Error('Subject entity creation mismatch')
    }

    let duplicateRejected = false
    try {
      await subjectService.createSubject({
        code: 'MAPEL-P7-01',
        name: 'Konsentrasi Keahlian Duplikat'
      })
    } catch (err: any) {
      if (err.message.includes('sudah digunakan')) {
        duplicateRejected = true
      }
    }

    if (!duplicateRejected) {
      throw new Error('Duplicate subject code was not rejected')
    }
  })

  // -------------------------------------------------------------
  // TEST 9: Subject Filtering by Category
  // -------------------------------------------------------------
  await test('9. SubjectService filters subjects by category (UMUM, KEJURUAN, etc.)', async () => {
    const kejuruanSubjects = await subjectService.searchSubjects('', 'KEJURUAN')
    for (const s of kejuruanSubjects) {
      if (s.category !== 'KEJURUAN') {
        throw new Error(`Expected KEJURUAN, got ${s.category}`)
      }
    }
  })

  // -------------------------------------------------------------
  // TEST 10: Room Management & Duplicate Code Prevention
  // -------------------------------------------------------------
  await test('10. RoomService creates room entity and enforces unique room code', async () => {
    const created = await roomService.createRoom({
      code: 'LAB-P7-99',
      name: 'Laboratorium Rekayasa Perangkat Lunak P7',
      type: 'LAB',
      capacity: 40
    })

    if (created.code !== 'LAB-P7-99' || created.capacity !== 40) {
      throw new Error('Failed to create room entity')
    }

    let duplicateRejected = false
    try {
      await roomService.createRoom({
        code: 'LAB-P7-99',
        name: 'Lab Duplikat',
        type: 'LAB'
      })
    } catch (err: any) {
      if (err.message.includes('sudah digunakan')) {
        duplicateRejected = true
      }
    }

    if (!duplicateRejected) {
      throw new Error('Duplicate room code was not rejected')
    }
  })

  // -------------------------------------------------------------
  // TEST 11: SK Teaching Assignment Creation
  // -------------------------------------------------------------
  await test('11. AssignmentService creates SK teaching assignment (Teacher -> Subject)', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const activeAy = await academicService.getActiveAcademicYear()

    const created = await assignmentService.createAssignment({
      code: 'SK-P7-101',
      teacherId: teachers[0].id,
      subjectId: subjects[0].id,
      hours: 6,
      academicYearId: activeAy?.id || 'ay_2026_2027_ganjil',
      semester: 'GANJIL'
    })

    if (created.code !== 'SK-P7-101' || created.hours !== 6) {
      throw new Error('Assignment entity creation mismatch')
    }
  })

  // -------------------------------------------------------------
  // TEST 12: Total Teaching Hours (JP) Calculation
  // -------------------------------------------------------------
  await test('12. AssignmentService accurately calculates total teaching hours per teacher', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const targetTeacher = teachers[0]

    const totalHours = await assignmentService.getTotalTeachingHours(targetTeacher.id)
    if (totalHours <= 0) {
      throw new Error('Expected positive total teaching hours for assigned teacher')
    }
  })

  // -------------------------------------------------------------
  // TEST 13: Assignment Referential Integrity
  // -------------------------------------------------------------
  await test('13. AssignmentService blocks deletion of assignment linked to schedules', async () => {
    const schedules = await repositories.schedules.findAll()
    if (schedules.length === 0) {
      throw new Error('No schedules found to test referential integrity')
    }

    const linkedAssignmentId = schedules[0].teacherAssignmentId

    let deletionBlocked = false
    try {
      await assignmentService.deleteAssignment(linkedAssignmentId)
    } catch (err: any) {
      if (err.message.includes('masih terdapat') || err.message.includes('jadwal pelajaran')) {
        deletionBlocked = true
      }
    }

    if (!deletionBlocked) {
      throw new Error(
        'Referential integrity failed: Linked assignment was deleted without blocking!'
      )
    }
  })

  // -------------------------------------------------------------
  // TEST 14: Schedule Creation & Matrix Allocation
  // -------------------------------------------------------------
  await test('14. ScheduleService creates valid timetable schedule session', async () => {
    const classes = await classService.getAllClasses('ACTIVE')
    const rooms = await roomService.getAllRooms('ACTIVE')
    const assignments = await assignmentService.getAssignmentsWithDetails()
    const activeAy = await academicService.getActiveAcademicYear()
    const ayId = activeAy?.id || 'ay_2026_2027_ganjil'

    // Pick an unused day/period slot
    const created = await scheduleService.createSchedule({
      academicYearId: ayId,
      classId: classes[classes.length - 1].id,
      teacherAssignmentId: assignments[0].id,
      dayOfWeek: 'SABTU',
      periodStart: 1,
      periodEnd: 2,
      timeStart: '07:00',
      timeEnd: '08:30',
      roomId: rooms[rooms.length - 1].id
    })

    if (!created.id || created.dayOfWeek !== 'SABTU') {
      throw new Error('Failed to create schedule entity')
    }
  })

  // -------------------------------------------------------------
  // TEST 15: Conflict Detection - Teacher Clash
  // -------------------------------------------------------------
  await test('15. ScheduleService detects teacher clash (same teacher in two classes at same period)', async () => {
    const classes = await classService.getAllClasses('ACTIVE')
    const rooms = await roomService.getAllRooms('ACTIVE')
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const ayId = 'ay_2026_2027_ganjil'

    const asgClash = await assignmentService.createAssignment({
      code: 'SK-CLASH-T1',
      teacherId: teachers[2].id,
      subjectId: subjects[0].id,
      hours: 4,
      academicYearId: ayId,
      semester: 'GANJIL'
    })

    // Schedule 1: Teacher 2 in Class 0, Room 0 on JUMAT period 1-2
    await scheduleService.createSchedule({
      academicYearId: ayId,
      classId: classes[0].id,
      teacherAssignmentId: asgClash.id,
      dayOfWeek: 'JUMAT',
      periodStart: 1,
      periodEnd: 2,
      timeStart: '07:00',
      timeEnd: '08:15',
      roomId: rooms[0].id
    })

    // Schedule 2: Same Teacher 2 in Class 1, Room 1 on JUMAT period 2-3 -> Clash!
    let teacherClashDetected = false
    try {
      await scheduleService.createSchedule({
        academicYearId: ayId,
        classId: classes[1].id,
        teacherAssignmentId: asgClash.id,
        dayOfWeek: 'JUMAT',
        periodStart: 2,
        periodEnd: 3,
        timeStart: '07:37',
        timeEnd: '08:52',
        roomId: rooms[1].id
      })
    } catch (err: any) {
      if (err.message.includes('Guru bersangkutan sudah dijadwalkan')) {
        teacherClashDetected = true
      }
    }

    if (!teacherClashDetected) {
      throw new Error('Teacher conflict was not detected by ScheduleService')
    }
  })

  // -------------------------------------------------------------
  // TEST 16: Conflict Detection - Room Clash
  // -------------------------------------------------------------
  await test('16. ScheduleService detects room clash (same room booked for two classes at same period)', async () => {
    const classes = await classService.getAllClasses('ACTIVE')
    const rooms = await roomService.getAllRooms('ACTIVE')
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const ayId = 'ay_2026_2027_ganjil'

    const asgClashR = await assignmentService.createAssignment({
      code: 'SK-CLASH-R1',
      teacherId: teachers[3].id,
      subjectId: subjects[1].id,
      hours: 4,
      academicYearId: ayId,
      semester: 'GANJIL'
    })

    // Attempt to book Room 0 on JUMAT period 1-2 for Class 1 -> Clash with Schedule 1 from Test 15!
    let roomClashDetected = false
    try {
      await scheduleService.createSchedule({
        academicYearId: ayId,
        classId: classes[1].id,
        teacherAssignmentId: asgClashR.id,
        dayOfWeek: 'JUMAT',
        periodStart: 1,
        periodEnd: 2,
        timeStart: '07:00',
        timeEnd: '08:15',
        roomId: rooms[0].id // Room 0 is already occupied by Class 0
      })
    } catch (err: any) {
      if (err.message.includes('Ruang ini sudah digunakan')) {
        roomClashDetected = true
      }
    }

    if (!roomClashDetected) {
      throw new Error('Room conflict was not detected by ScheduleService')
    }
  })

  // -------------------------------------------------------------
  // TEST 17: Conflict Detection - Class Clash
  // -------------------------------------------------------------
  await test('17. ScheduleService detects class clash (same class double-booked at same period)', async () => {
    const classes = await classService.getAllClasses('ACTIVE')
    const rooms = await roomService.getAllRooms('ACTIVE')
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const ayId = 'ay_2026_2027_ganjil'

    const asgClashC = await assignmentService.createAssignment({
      code: 'SK-CLASH-C1',
      teacherId: teachers[4].id,
      subjectId: subjects[2].id,
      hours: 4,
      academicYearId: ayId,
      semester: 'GANJIL'
    })

    // Attempt to schedule Class 0 on JUMAT period 1-3 -> Overlaps Class 0 period 1-2
    let classClashDetected = false
    try {
      await scheduleService.createSchedule({
        academicYearId: ayId,
        classId: classes[0].id, // Class 0 already has a lesson period 1-2
        teacherAssignmentId: asgClashC.id,
        dayOfWeek: 'JUMAT',
        periodStart: 1,
        periodEnd: 3,
        timeStart: '07:00',
        timeEnd: '09:30',
        roomId: rooms[2].id
      })
    } catch (err: any) {
      if (err.message.includes('Kelas ini sudah memiliki jadwal')) {
        classClashDetected = true
      }
    }

    if (!classClashDetected) {
      throw new Error('Class conflict was not detected by ScheduleService')
    }
  })

  // -------------------------------------------------------------
  // TEST 18: Academic Year & School Identity Management
  // -------------------------------------------------------------
  await test('18. AcademicService updates school identity and handles active year switching', async () => {
    const identity = await academicService.getSchoolIdentity()
    if (!identity) throw new Error('School identity missing')

    const updated = await academicService.updateSchoolIdentity({
      ...identity,
      address: 'Jalan Kaligarang No. 9 Ungaran (Terverifikasi P7)'
    })

    if (!updated.address.includes('Terverifikasi P7')) {
      throw new Error('Failed to update school address')
    }

    // Create a new academic year and switch active year
    const newYear = await academicService.createAcademicYear({
      name: '2028/2029',
      semester: 'GANJIL',
      isActive: false,
      startDate: '2028-07-10',
      endDate: '2028-12-16'
    })

    const activated = await academicService.setActiveAcademicYear(newYear.id)
    if (!activated.isActive) {
      throw new Error('Failed to switch active academic year')
    }

    // Switch back to original active year
    const years = await academicService.getAllAcademicYears()
    const orig = years.find((y) => y.name === '2026/2027')
    if (orig) {
      await academicService.setActiveAcademicYear(orig.id)
    }
  })

  // -------------------------------------------------------------
  // TEST 19: Admin User Account Management
  // -------------------------------------------------------------
  await test('19. AuthService manages user creation, teacher linking, status toggle, and password reset', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const targetTeacher = teachers[5]

    // Create a user account for teacher
    const createRes = await authService.createUser({
      username: 'guru_test_p7',
      password: 'password123',
      role: 'GURU',
      teacherId: targetTeacher.id,
      status: 'ACTIVE'
    })

    if (!createRes.success || !createRes.data) {
      throw new Error(`Failed to create user account: ${createRes.message}`)
    }

    const createdUser = createRes.data

    // Toggle status to INACTIVE
    const toggleRes = await authService.setUserStatus(createdUser.id, 'INACTIVE')
    if (!toggleRes.success) throw new Error('Failed to toggle user status to INACTIVE')

    // Toggle back to ACTIVE for login test
    const restoreRes = await authService.setUserStatus(createdUser.id, 'ACTIVE')
    if (!restoreRes.success) throw new Error('Failed to restore user status to ACTIVE')

    // Reset password
    const resetRes = await authService.adminResetPassword(createdUser.id, 'newpassword123')
    if (!resetRes.success) throw new Error('Failed to reset user password')

    // Authenticate with new password
    const loginTest = await authService.login('guru_test_p7', 'newpassword123')
    if (!loginTest.success) {
      throw new Error(`Failed to login with newly reset password: ${loginTest.message}`)
    }

    // Switch back session to Admin
    await authService.login('admin', 'admin123')
  })

  // -------------------------------------------------------------
  // TEST 20: Application-Level RBAC Authorization
  // -------------------------------------------------------------
  await test('20. AuthorizationService enforces admin role requirements at domain level', async () => {
    // Current session is ADMIN -> requireAdmin() should pass
    const adminSession = authorizationService.requireAdmin()
    if (adminSession.role !== 'ADMIN') {
      throw new Error('requireAdmin() returned non-admin session')
    }

    // Login as GURU -> requireAdmin() should throw AuthorizationError
    await authService.login('guru', 'guru123')

    let rbacErrorCaught = false
    try {
      authorizationService.requireAdmin()
    } catch (err: any) {
      if (err.name === 'AuthorizationError' || err.message.includes('Akses Ditolak')) {
        rbacErrorCaught = true
      }
    }

    if (!rbacErrorCaught) {
      throw new Error('AuthorizationService failed to block GURU role from requiring admin access')
    }

    // Restore Admin login
    await authService.login('admin', 'admin123')
  })

  console.log(`\n=== PHASE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
  if (failed > 0) {
    throw new Error(`Phase 7 test suite failed with ${failed} failure(s)`)
  }
}
