/**
 * Guru Offline - Phase 3 Comprehensive Master Data & Scheduling Test Suite
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

export async function runPhase3Tests() {
  console.log('\n--- STARTING PHASE 3 MASTER DATA & SCHEDULING TEST SUITE ---')
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

  // Initialize DB with seed data
  await seedDatabase(true)

  // 1. Teacher Service
  await test('1. TeacherService lists seed teachers (73 teachers seeded)', async () => {
    const teachers = await teacherService.getAllTeachers()
    if (teachers.length < 70) {
      throw new Error(`Expected at least 70 teachers, got ${teachers.length}`)
    }
  })

  await test('2. TeacherService creates new teacher and validates NIP uniqueness', async () => {
    const created = await teacherService.createTeacher({
      name: 'Guru Uji Coba, S.Kom.',
      nip: '199001012020121001',
      nuptk: '1234567890123456',
      gender: 'L',
      education: 'S1',
      position: 'Guru Produktif RPL',
      employmentStatus: 'GTY'
    })

    if (!created.id || created.name !== 'Guru Uji Coba, S.Kom.') {
      throw new Error('Failed to create teacher entity')
    }

    // Try creating duplicate NIP
    let duplicateRejected = false
    try {
      await teacherService.createTeacher({
        name: 'Guru Duplikat, S.Pd.',
        nip: '199001012020121001'
      })
    } catch {
      duplicateRejected = true
    }

    if (!duplicateRejected) {
      throw new Error('Duplicate NIP was not rejected!')
    }
  })

  await test('3. TeacherService toggles status (deactivation preserves historical data)', async () => {
    const teachers = await teacherService.getAllTeachers()
    const target = teachers[0]
    const updated = await teacherService.toggleTeacherStatus(target.id)

    if (updated.status === target.status) {
      throw new Error('Teacher status did not toggle')
    }

    // Toggle back
    await teacherService.toggleTeacherStatus(target.id)
  })

  // 4. Subject Service
  await test('4. SubjectService lists subjects and creates new subject', async () => {
    const subjects = await subjectService.getAllSubjects()
    if (subjects.length < 60) {
      throw new Error(`Expected at least 60 subjects, got ${subjects.length}`)
    }

    const created = await subjectService.createSubject({
      code: 'TEST-PPLG-99',
      name: 'Pemrograman Web Lanjut Testing',
      category: 'KEJURUAN',
      defaultKkm: 80
    })

    if (created.code !== 'TEST-PPLG-99') {
      throw new Error('Subject code mismatch')
    }

    // Duplicate code check
    let dupRejected = false
    try {
      await subjectService.createSubject({
        code: 'TEST-PPLG-99',
        name: 'Duplikat Mapel'
      })
    } catch {
      dupRejected = true
    }

    if (!dupRejected) {
      throw new Error('Duplicate subject code was not rejected!')
    }
  })

  // 5. Class (Rombel) Service
  await test('5. ClassService manages classes and homeroom teachers', async () => {
    const classes = await classService.getAllClasses()
    if (classes.length < 40) {
      throw new Error(`Expected at least 40 classes, got ${classes.length}`)
    }

    const activeAy = await academicService.getActiveAcademicYear()
    const majors = await classService.getAllMajors()
    const teachers = await teacherService.getAllTeachers('ACTIVE')

    const created = await classService.createClass({
      name: 'X PPLG 99 Test',
      level: 'X',
      rombel: 99,
      academicYearId: activeAy?.id || 'ay_2026_2027_ganjil',
      majorId: majors[0].id,
      homeroomTeacherId: teachers[0].id
    })

    if (!created.id || created.homeroomTeacherId !== teachers[0].id) {
      throw new Error('Failed to create class with homeroom teacher')
    }
  })

  // 6. Room Service
  await test('6. RoomService manages rooms and validates room codes', async () => {
    const rooms = await roomService.getAllRooms()
    if (rooms.length < 50) {
      throw new Error(`Expected at least 50 rooms, got ${rooms.length}`)
    }

    const created = await roomService.createRoom({
      code: 'LAB-TEST-01',
      name: 'Laboratorium Pengujian Software',
      type: 'LAB',
      capacity: 36
    })

    if (created.code !== 'LAB-TEST-01') {
      throw new Error('Room code mismatch')
    }
  })

  // 7. Student Service
  await test('7. StudentService manages student lifecycle and status transitions', async () => {
    const classes = await classService.getAllClasses()
    const targetClass = classes[0]

    const student = await studentService.createStudent({
      nis: '99999901',
      nisn: '0089999901',
      name: 'Ahmad Siswa Pengujian',
      gender: 'L',
      classId: targetClass.id,
      birthPlace: 'Semarang',
      birthDate: '2009-05-15',
      parentPhone: '081234567890'
    })

    if (student.status !== 'ACTIVE') {
      throw new Error('Initial student status should be ACTIVE')
    }

    // Status transition: MUTATION
    const mutated = await studentService.setStudentStatus(student.id, 'MUTATION')
    if (mutated.status !== 'MUTATION') {
      throw new Error('Failed to update student status to MUTATION')
    }

    // Status transition: GRADUATED
    const graduated = await studentService.setStudentStatus(student.id, 'GRADUATED')
    if (graduated.status !== 'GRADUATED') {
      throw new Error('Failed to update student status to GRADUATED')
    }
  })

  // 8. Assignment Service
  await test('8. AssignmentService calculates total teaching load per teacher', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const activeAy = await academicService.getActiveAcademicYear()

    const teacher = teachers[0]
    await assignmentService.createAssignment({
      code: 'KODE TEST 1',
      teacherId: teacher.id,
      subjectId: subjects[0].id,
      hours: 6,
      academicYearId: activeAy?.id || 'ay_2026_2027_ganjil',
      semester: 'GANJIL'
    })

    await assignmentService.createAssignment({
      code: 'KODE TEST 2',
      teacherId: teacher.id,
      subjectId: subjects[1].id,
      hours: 4,
      academicYearId: activeAy?.id || 'ay_2026_2027_ganjil',
      semester: 'GANJIL'
    })

    const totalHours = await assignmentService.getTotalTeachingHours(teacher.id)
    if (totalHours < 10) {
      throw new Error(`Expected total hours >= 10, got ${totalHours}`)
    }
  })

  // 9. Schedule Service & Conflict Detection
  await test('9. ScheduleService creates schedule and detects teacher clash', async () => {
    const classes = await classService.getAllClasses()
    const rooms = await roomService.getAllRooms()
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const activeAy = await academicService.getActiveAcademicYear()
    const ayId = activeAy?.id || 'ay_2026_2027_ganjil'

    // Create assignment for Teacher A
    const asgA = await assignmentService.createAssignment({
      code: 'KODE CLASH A',
      teacherId: teachers[0].id,
      subjectId: subjects[0].id,
      hours: 4,
      academicYearId: ayId,
      semester: 'GANJIL'
    })

    // Schedule 1: Teacher A in Class 1, Room 1 on SABTU period 1-3
    await scheduleService.createSchedule({
      academicYearId: ayId,
      classId: classes[0].id,
      teacherAssignmentId: asgA.id,
      dayOfWeek: 'SABTU',
      periodStart: 1,
      periodEnd: 3,
      timeStart: '07:00',
      timeEnd: '09:15',
      roomId: rooms[0]?.id || 'rm_test_0'
    })

    // Attempt Schedule 2: Same Teacher A in Class 2 on SABTU period 2-4 -> Should trigger TEACHER clash
    let teacherClashCaught = false
    try {
      await scheduleService.createSchedule({
        academicYearId: ayId,
        classId: classes[1]?.id || 'cls_test_1',
        teacherAssignmentId: asgA.id,
        dayOfWeek: 'SABTU',
        periodStart: 2,
        periodEnd: 4,
        timeStart: '07:45',
        timeEnd: '10:00',
        roomId: rooms[1] && rooms[1].id !== rooms[0]?.id ? rooms[1].id : 'rm_test_distinct_9'
      })
    } catch (err: any) {
      if (err.message.includes('Guru bersangkutan sudah dijadwalkan')) {
        teacherClashCaught = true
      }
    }

    if (!teacherClashCaught) {
      throw new Error('Teacher conflict was not detected!')
    }
  })

  await test('10. ScheduleService detects room clash (same room at overlapping period)', async () => {
    const classes = await classService.getAllClasses()
    const rooms = await roomService.getAllRooms()
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const ayId = 'ay_2026_2027_ganjil'

    // Create assignment for Teacher B (different teacher)
    const asgB = await assignmentService.createAssignment({
      code: 'KODE CLASH B',
      teacherId: teachers[1].id,
      subjectId: subjects[1].id,
      hours: 4,
      academicYearId: ayId,
      semester: 'GANJIL'
    })

    // Attempt to book Room 0 on SABTU period 1-2 for Class 2 -> Should trigger ROOM clash
    let roomClashCaught = false
    try {
      await scheduleService.createSchedule({
        academicYearId: ayId,
        classId: classes[1]?.id || 'cls_test_1',
        teacherAssignmentId: asgB.id,
        dayOfWeek: 'SABTU',
        periodStart: 1,
        periodEnd: 2,
        timeStart: '07:00',
        timeEnd: '08:30',
        roomId: rooms[0]?.id || 'rm_test_0'
      })
    } catch (err: any) {
      if (err.message.includes('Ruang ini sudah digunakan')) {
        roomClashCaught = true
      }
    }

    if (!roomClashCaught) {
      throw new Error('Room conflict was not detected!')
    }
  })

  await test('11. ScheduleService detects class clash (same class double-booked)', async () => {
    const classes = await classService.getAllClasses()
    const rooms = await roomService.getAllRooms()
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const subjects = await subjectService.getAllSubjects('ACTIVE')
    const ayId = 'ay_2026_2027_ganjil'

    const asgB = await assignmentService.createAssignment({
      code: 'KODE CLASH B2',
      teacherId: teachers[1].id,
      subjectId: subjects[1].id,
      hours: 4,
      academicYearId: ayId,
      semester: 'GANJIL'
    })

    // Attempt to schedule Class 0 on SABTU period 2-4 -> Overlaps with existing period 1-3
    let classClashCaught = false
    try {
      await scheduleService.createSchedule({
        academicYearId: ayId,
        classId: classes[0].id,
        teacherAssignmentId: asgB.id,
        dayOfWeek: 'SABTU',
        periodStart: 2,
        periodEnd: 4,
        timeStart: '07:45',
        timeEnd: '10:00',
        roomId: rooms[1]?.id || rooms[0].id
      })
    } catch (err: any) {
      if (
        err.message.includes('Kelas ini sudah memiliki jadwal') ||
        err.message.includes('bentrok') ||
        err.message.includes('Integritas')
      ) {
        classClashCaught = true
      }
    }

    if (!classClashCaught) {
      throw new Error('Class conflict was not detected!')
    }
  })

  // 12. Academic Service
  await test('13. AcademicService manages school identity and active school year', async () => {
    const identity = await academicService.getSchoolIdentity()
    if (!identity || identity.name !== 'SMK NU UNGARAN') {
      throw new Error('School identity missing or invalid')
    }

    const updated = await academicService.updateSchoolIdentity({
      ...identity,
      principalName: 'Dr. H. Ahmad Hanik, M.Pd. (Verified)'
    })

    if (!updated.principalName.includes('Verified')) {
      throw new Error('Failed to update principal name')
    }

    const newYear = await academicService.createAcademicYear({
      name: '2027/2028',
      semester: 'GANJIL',
      isActive: false,
      startDate: '2027-07-12',
      endDate: '2027-12-18'
    })

    const activated = await academicService.setActiveAcademicYear(newYear.id)
    if (!activated.isActive) {
      throw new Error('Failed to switch active academic year')
    }

    // Switch back to 2026/2027
    const allYears = await academicService.getAllAcademicYears()
    const orig = allYears.find(
      (y) => y.name.includes('2026/2027') || y.id === 'ay_2026_2027_ganjil'
    )
    if (orig) {
      await academicService.setActiveAcademicYear(orig.id)
    }
  })

  // 14. Phase 3A: Teacher Teaching Schedule Resolution
  await test('14. ScheduleService resolves complete teacher schedule with relations', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const allAssignments = await assignmentService.getAllAssignments()
    const targetTeacher =
      teachers.find((t) => allAssignments.some((a) => a.teacherId === t.id)) || teachers[0]

    const scheduleData = await scheduleService.getTeacherSchedule(targetTeacher.id)
    if (!scheduleData.teacher || scheduleData.teacher.id !== targetTeacher.id) {
      throw new Error('Teacher not resolved in schedule data')
    }
    if (!scheduleData.academicYear) {
      throw new Error('Academic year not resolved in schedule data')
    }
    if (scheduleData.schedules.length === 0) {
      throw new Error('Expected at least 1 schedule for teacher[0]')
    }

    // Verify relations in resolved items
    const firstItem = scheduleData.schedules[0]
    if (!firstItem.className || firstItem.className === 'Kelas Tidak Diketahui') {
      throw new Error(`Class not resolved properly: ${firstItem.className}`)
    }
    if (!firstItem.subjectName || firstItem.subjectName === 'Mata Pelajaran') {
      throw new Error(`Subject not resolved properly: ${firstItem.subjectName}`)
    }
    if (!firstItem.roomName || firstItem.roomName === 'Ruang Kelas') {
      throw new Error(`Room not resolved properly: ${firstItem.roomName}`)
    }
    if (!firstItem.majorName) {
      throw new Error('Major name missing in resolved schedule')
    }
    if (firstItem.totalPeriods !== firstItem.periodEnd - firstItem.periodStart + 1) {
      throw new Error('Total periods calculation mismatch')
    }
  })

  // 15. Phase 3A: Block Teaching Sorting and Weekly Grouping
  await test('15. ScheduleService groups weekly and sorts by day and periodStart ASC', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const allAssignments = await assignmentService.getAllAssignments()
    const targetTeacher =
      teachers.find((t) => allAssignments.some((a) => a.teacherId === t.id)) || teachers[0]

    const scheduleData = await scheduleService.getTeacherSchedule(targetTeacher.id)

    // Check weekly grouping
    const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const
    let totalGrouped = 0
    days.forEach((day) => {
      const items = scheduleData.weeklySchedules[day]
      totalGrouped += items.length
      // Check chronological sorting within each day
      for (let i = 0; i < items.length - 1; i++) {
        if (items[i].periodStart > items[i + 1].periodStart) {
          throw new Error(
            `Day ${day} is not sorted chronologically: period ${items[i].periodStart} > ${items[i + 1].periodStart}`
          )
        }
      }
    })

    if (totalGrouped !== scheduleData.schedules.length) {
      throw new Error(
        `Weekly grouped count (${totalGrouped}) != total schedules (${scheduleData.schedules.length})`
      )
    }
  })

  // 16. Phase 3A: Today's Summary & Dynamic Timing Resolution
  await test('16. ScheduleService accurately calculates today summary and timing statuses', async () => {
    const teachers = await teacherService.getAllTeachers('ACTIVE')
    const allAssignments = await assignmentService.getAllAssignments()
    const targetTeacher =
      teachers.find((t) => allAssignments.some((a) => a.teacherId === t.id)) || teachers[0]

    // Test with a mock Monday date: 2026-09-21 (SENIN) at 08:00 WIB (during period 1-3 which is 07:00-09:15)
    const mockMonday = new Date('2026-09-21T08:00:00')
    let mondayTeacher = targetTeacher
    let mondayData = await scheduleService.getTeacherSchedule(
      mondayTeacher.id,
      undefined,
      mockMonday
    )

    if (mondayData.todaySchedules.length === 0) {
      for (const t of teachers) {
        const data = await scheduleService.getTeacherSchedule(t.id, undefined, mockMonday)
        if (data.todaySchedules.length > 0) {
          mondayTeacher = t
          mondayData = data
          break
        }
      }
    }

    if (mondayData.todaySchedules.length === 0) {
      throw new Error('Expected Monday schedules for a teacher')
    }

    // Since mock Monday is at 08:00, the 07:00-09:15 session should have timingStatus ONGOING
    const ongoingSession = mondayData.todaySchedules.find((s) => s.periodStart === 1)
    if (!ongoingSession || ongoingSession.timingStatus !== 'ONGOING') {
      throw new Error(
        `Expected period 1 session to be ONGOING at 08:00, got: ${ongoingSession?.timingStatus}`
      )
    }

    if (mondayData.todaySummary.totalSessions !== mondayData.todaySchedules.length) {
      throw new Error('todaySummary.totalSessions mismatch')
    }
    if (mondayData.todaySummary.currentSession?.id !== ongoingSession.id) {
      throw new Error('todaySummary.currentSession does not match ongoing session')
    }
  })

  // 17. Phase 3A: Empty State handling for teachers with no schedules
  await test('17. ScheduleService handles empty states and non-existent teachers gracefully', async () => {
    // Non-existent teacher ID
    const emptyData = await scheduleService.getTeacherSchedule('non_existent_teacher_id')
    if (emptyData.schedules.length !== 0 || emptyData.todaySummary.totalSessions !== 0) {
      throw new Error('Expected empty result for non-existent teacher')
    }

    // Teacher with no assignments / schedules
    const freshTeacher = await teacherService.createTeacher({
      name: 'Guru Baru Tanpa Jadwal, S.Pd.',
      nip: '199505052026011099'
    })
    const freshData = await scheduleService.getTeacherSchedule(freshTeacher.id)
    if (freshData.schedules.length !== 0 || freshData.todaySummary.totalHours !== 0) {
      throw new Error('Expected 0 schedules and 0 hours for fresh teacher')
    }
    if (freshData.teacher?.id !== freshTeacher.id) {
      throw new Error('Fresh teacher entity should be present')
    }
  })

  console.log(`\n--- PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`)
  if (failed > 0) {
    throw new Error(`Phase 3 test suite failed with ${failed} failure(s)`)
  }
}
