/**
 * Guru Offline - Phase 2 Master Data & Admin Governance Core Test Suite
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import {
  teacherService,
  subjectService,
  classService,
  assignmentService,
  scheduleService,
  academicService,
  timeSlotService,
  academicPeriodService
} from '../services/master'
import { schoolAgendaService } from '../services/agenda/SchoolAgendaService'
import { announcementService } from '../services/announcement/AnnouncementService'
import { googleSheetsImportService } from '../services/import/GoogleSheetsImportService'
import { repositories } from '../repositories'

export async function runPhase2Tests() {
  console.log('\n--- STARTING PHASE 2 MASTER DATA & ADMIN GOVERNANCE TEST SUITE ---')
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

  // 1. Teacher CRUD & Status
  await test('1. Teacher master data: create, query, and toggle active status', async () => {
    const teacher = await teacherService.createTeacher({
      name: 'Drs. H. Ahmad Mustofa, M.Pd.',
      nip: '197505052000031009',
      gender: 'L',
      status: 'ACTIVE'
    })
    if (!teacher.id) throw new Error('Teacher creation failed')

    const toggled = await teacherService.toggleTeacherStatus(teacher.id)
    if (toggled.status !== 'INACTIVE') throw new Error('Teacher toggle to INACTIVE failed')

    const reactivated = await teacherService.toggleTeacherStatus(teacher.id)
    if (reactivated.status !== 'ACTIVE') throw new Error('Teacher toggle to ACTIVE failed')
  })

  // 2. Referential Integrity: Reject orphan Assignment
  await test('2. Referential Integrity: Reject assignment for nonexistent teacher', async () => {
    const subjects = await subjectService.getAllSubjects()
    const activeAy = await academicService.getActiveAcademicYear()

    try {
      await assignmentService.createAssignment({
        teacherId: 'nonexistent_teacher_id_99999',
        subjectId: subjects[0].id,
        code: 'TEST-01',
        hours: 4,
        academicYearId: activeAy?.id || 'ay_seed',
        semester: 'GANJIL'
      })
      throw new Error('Should have thrown an integrity error for nonexistent teacher')
    } catch (err: any) {
      if (!err.message.includes('tidak ditemukan')) {
        throw new Error(`Unexpected error message: ${err.message}`)
      }
    }
  })

  // 3. Referential Integrity: Reject schedule for invalid room or assignment
  await test('3. Referential Integrity: Reject schedule for nonexistent room', async () => {
    const assignments = await assignmentService.getAllAssignments()
    const classes = await classService.getAllClasses()
    const activeAy = await academicService.getActiveAcademicYear()

    if (assignments.length === 0 || classes.length === 0) {
      throw new Error('Seed assignments or classes not found')
    }

    try {
      await scheduleService.createSchedule({
        academicYearId: activeAy?.id || 'ay_seed',
        classId: classes[0].id,
        teacherAssignmentId: assignments[0].id,
        dayOfWeek: 'SENIN',
        periodStart: 1,
        periodEnd: 2,
        timeStart: '07:00',
        timeEnd: '08:30',
        roomId: 'nonexistent_room_999'
      })
      throw new Error('Should have thrown an integrity error for nonexistent room')
    } catch (err: any) {
      if (!err.message.includes('tidak ditemukan')) {
        throw new Error(`Unexpected error message: ${err.message}`)
      }
    }
  })

  // 4. Time Slot Canonical Model
  await test('4. Canonical Time Slot: distinguishes teaching vs non-teaching bell schedule', async () => {
    const allSlots = await timeSlotService.getTimeSlots()
    const teachingSlots = await timeSlotService.getTeachingSlots()
    const nonTeachingSlots = await timeSlotService.getNonTeachingAgendas()

    if (allSlots.length < 10) throw new Error('Expected at least 10 slots')
    if (teachingSlots.length !== 10) {
      throw new Error(`Expected exactly 10 teaching periods (1-10), got ${teachingSlots.length}`)
    }

    const dhuhaSlot = nonTeachingSlots.find((s) => s.type === 'DHUHA')
    if (!dhuhaSlot) throw new Error('Dhuha slot not found in non-teaching agendas')

    const dhuhurSlot = nonTeachingSlots.find((s) => s.type === 'DHUHUR')
    if (!dhuhurSlot) throw new Error('Dhuhur slot not found in non-teaching agendas')
  })

  // 5. Academic Period Management & Locking
  await test('5. Academic Period: create, lock, and preserve historical state', async () => {
    const activeAy = await academicService.getActiveAcademicYear()
    if (!activeAy) throw new Error('Active academic year not found')

    const period = await academicPeriodService.createPeriod({
      academicYearId: activeAy.id,
      name: 'Penilaian Tengah Semester (PTS) Ganjil 2026/2027',
      periodType: 'MID_SEMESTER',
      semester: 'GANJIL',
      year: 2026,
      startDate: '2026-09-15',
      endDate: '2026-09-25',
      submissionDeadline: '2026-09-30'
    })

    if (!period.id || period.isLocked) throw new Error('Period creation failed')

    // Lock period
    const locked = await academicPeriodService.lockPeriod(period.id, 'admin')
    if (!locked.isLocked || !locked.lockedAt) throw new Error('Period locking failed')

    // Try updating locked period (should be prevented)
    try {
      await academicPeriodService.updatePeriod(period.id, { name: 'Attempted Change' }, 'admin')
      throw new Error('Should have prevented updating locked period')
    } catch (err: any) {
      if (!err.message.includes('dikunci') && !err.message.includes('terkunci')) {
        throw new Error(`Unexpected error message: ${err.message}`)
      }
    }

    // Unlock period
    const unlocked = await academicPeriodService.unlockPeriod(period.id, 'admin')
    if (unlocked.isLocked) throw new Error('Period unlocking failed')
  })

  // 6. School Agenda Management & Audit Log
  await test('6. School Agenda: create, query by role, and verify audit log', async () => {
    const agenda = await schoolAgendaService.createAgenda({
      title: 'Rapat Pleno Kurikulum & Pembagian Tugas',
      category: 'RAPAT',
      targetRole: 'GURU',
      startDate: '2026-07-10',
      endDate: '2026-07-10',
      location: 'Aula Utama SMK NU Ungaran',
      isMandatory: true
    })

    if (!agenda.id) throw new Error('Agenda creation failed')

    const guruAgendas = await schoolAgendaService.getAgendasForRole('GURU')
    const found = guruAgendas.find((a) => a.id === agenda.id)
    if (!found) throw new Error('Agenda not found in role-filtered query')

    // Verify audit log
    const auditLogs = await repositories.auditLogs.findAll()
    const log = auditLogs.find(
      (l) => l.action === 'CREATE_SCHOOL_AGENDA' && l.affectedIds?.includes(agenda.id)
    )
    if (!log) throw new Error('Audit log for agenda creation was not recorded')
  })

  // 7. Announcements Management (Pin, Publish, Query)
  await test('7. Announcement: create, pin, and query published feed', async () => {
    const anc = await announcementService.createAnnouncement({
      title: 'Instruksi Pengisian Jurnal Mengajar Semester Ganjil',
      content: 'Bapak/Ibu Guru dimohon menyelesaikan jurnal mengajar sebelum tanggal 20.',
      targetRole: 'GURU',
      isPinned: false,
      isPublished: true
    })

    if (!anc.id) throw new Error('Announcement creation failed')

    // Pin announcement
    const pinned = await announcementService.togglePin(anc.id)
    if (!pinned.isPinned) throw new Error('Pinning announcement failed')

    const published = await announcementService.getPublishedAnnouncements('GURU')
    const found = published.find((a) => a.id === anc.id)
    if (!found) throw new Error('Announcement not found in published feed')
    if (published[0].id !== anc.id) {
      throw new Error('Pinned announcement must appear first in feed')
    }
  })

  // 8. Google Sheets Import Pipeline Preview & Duplicate Check
  await test('8. Google Sheets Import: parse CSV, validate schema, detect duplicates', async () => {
    const csvContent = `Nama Lengkap,NIP,NUPTK,JK,No HP
Drs. Budi Santoso,197001011995011001,1111222233334444,L,08123456789
Siti Rahmawati,197502021998022002,,P,08123456780
,,,L,
Drs. Budi Santoso,197001011995011001,,L,`

    const parsed = await googleSheetsImportService.fetchAndParseCsv(csvContent)
    if (parsed.length !== 5) throw new Error(`Expected 5 parsed rows, got ${parsed.length}`)

    const preview = await googleSheetsImportService.previewTeachers(parsed)
    if (preview.validRows.length !== 2) {
      throw new Error(`Expected 2 valid rows, got ${preview.validRows.length}`)
    }
    if (preview.duplicates.length !== 1) {
      throw new Error(`Expected 1 duplicate NIP row, got ${preview.duplicates.length}`)
    }
    if (preview.invalidRows.length !== 2) {
      throw new Error(
        `Expected 2 invalid rows (missing name and duplicate), got ${preview.invalidRows.length}`
      )
    }
  })

  console.log(`\nPHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED\n`)
  if (failed > 0) {
    throw new Error(`${failed} Phase 2 tests failed!`)
  }
}

// Run if called directly via ts-node / vite-node
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
  runPhase2Tests().catch((e) => {
    console.error('Test execution failed:', e)
    process.exit(1)
  })
}
