/**
 * Phase 12 - Student Discipline & Achievement Portal Test Suite
 * SMK NU Ungaran - Guru Offline
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { disciplineService } from '../services/discipline/DisciplineService'
import type { SessionData } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase12Tests() {
  console.log('=== RUNNING PHASE 12 TESTS: STUDENT DISCIPLINE & ACHIEVEMENT PORTAL ===\n')

  // 1. Initialize & Seed Database
  console.log('Test 1: Initializing IndexedDB and Seeding Master Data...')
  await seedDatabase()
  console.log('✓ Database initialized & seeded successfully.')

  // 2. Identify Test Teachers, Classes, and Students
  console.log('\nTest 2: Identifying Teachers, Classes, and Students...')
  const allTeachers = await repositories.teachers.findAll()
  const allClasses = await repositories.classes.findAll()
  const allStudents = await repositories.students.findAll()

  assert(allTeachers.length >= 2, 'Must have at least 2 teachers in seed')
  assert(allClasses.length >= 2, 'Must have at least 2 classes in seed')
  assert(allStudents.length >= 5, 'Must have at least 5 students in seed')

  const teacher1 = allTeachers[0]
  const teacher2 = allTeachers[1]

  // Find classes that have students
  const classStudentCounts = new Map<string, typeof allStudents>()
  for (const s of allStudents) {
    const list = classStudentCounts.get(s.classId) || []
    list.push(s)
    classStudentCounts.set(s.classId, list)
  }

  const populatedClassIds = Array.from(classStudentCounts.keys())
  assert(populatedClassIds.length >= 1, 'Must have at least 1 populated class')

  const class1 = allClasses.find((c) => c.id === populatedClassIds[0])!
  const studentsInClass1 = classStudentCounts.get(class1.id)!
  assert(studentsInClass1.length >= 2, 'Class 1 must have at least 2 students')

  const student1A = studentsInClass1[0]
  const student1B = studentsInClass1[1]

  // Target class 2 (can be same or other class)
  const otherClass = allClasses.find((c) => c.id !== class1.id) || allClasses[1]
  const class2 = otherClass

  console.log(`✓ Teacher 1: ${teacher1.name} (ID: ${teacher1.id})`)
  console.log(`✓ Teacher 2: ${teacher2.name} (ID: ${teacher2.id})`)
  console.log(`✓ Class 1: ${class1.name} with students: ${student1A.name}, ${student1B.name}`)
  console.log(`✓ Class 2 (for mismatch check): ${class2.name}`)

  // 3. Set Session as Teacher 1
  console.log('\nTest 3: Authenticating as Teacher 1...')
  await authService.logout()
  const sessionTeacher1: SessionData = {
    sessionId: 'sess_test_disc_t1',
    userId: 'usr_' + teacher1.id,
    username: teacher1.nip || 'guru_t1',
    role: 'GURU',
    teacherId: teacher1.id,
    teacherName: teacher1.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(sessionTeacher1)
  console.log(`✓ Authenticated as ${sessionTeacher1.teacherName}`)

  // 4. Create Discipline Notes (VIOLATION, PRAISE, NOTE)
  console.log('\nTest 4: Creating VIOLATION, PRAISE, and NOTE Records...')
  const today = disciplineService.getLocalDateString()

  // 4a. Violation note
  const noteViolation = await disciplineService.createNote({
    studentId: student1A.id,
    classId: class1.id,
    date: today,
    type: 'VIOLATION',
    point: 10,
    description: 'Terlambat masuk kelas lebih dari 20 menit tanpa surat izin piket.',
    followup: 'Diberikan teguran lisan dan pembinaan oleh wali kelas.'
  })
  assert(!!noteViolation.id, 'Violation note should have generated ID')
  assert(
    noteViolation.teacherId === teacher1.id,
    'teacherId should be automatically bound to session'
  )
  assert(noteViolation.type === 'VIOLATION', 'type should be VIOLATION')
  assert(noteViolation.point === 10, 'point should be 10')
  console.log(`✓ Created VIOLATION note: ${noteViolation.id}`)

  // 4b. Praise note
  const notePraise = await disciplineService.createNote({
    studentId: student1A.id,
    classId: class1.id,
    date: today,
    type: 'PRAISE',
    point: 25,
    description: 'Juara 1 Lomba Desain Grafis / Web Design tingkat Kabupaten Semarang.',
    followup: 'Pemberian sertifikat penghargaan dan apresiasi saat upacara.'
  })
  assert(notePraise.type === 'PRAISE', 'type should be PRAISE')
  assert(notePraise.point === 25, 'point should be 25')
  console.log(`✓ Created PRAISE note: ${notePraise.id}`)

  // 4c. Counseling note
  const noteObservation = await disciplineService.createNote({
    studentId: student1B.id,
    classId: class1.id,
    date: today,
    type: 'NOTE',
    description: 'Observasi perkembangan minat belajar pada materi kejuruan produktif.',
    followup: 'Pendampingan belajar mandiri.'
  })
  assert(noteObservation.type === 'NOTE', 'type should be NOTE')
  assert(noteObservation.point === undefined, 'point should be undefined for note')
  console.log(`✓ Created NOTE note: ${noteObservation.id}`)

  // 5. Referential Integrity & Validation Tests
  console.log('\nTest 5: Validating Referential Integrity & Rejecting Invalid Inputs...')

  // 5a. Missing student
  let errMissingStudent = false
  try {
    await disciplineService.createNote({
      studentId: 'invalid_student_id_999',
      classId: class1.id,
      date: today,
      type: 'VIOLATION',
      description: 'Test invalid student'
    })
  } catch (e: any) {
    errMissingStudent = true
    assert(e.message.includes('tidak ditemukan'), 'Should state student not found')
  }
  assert(errMissingStudent, 'Must reject non-existent student')
  console.log('✓ Rejected non-existent student ID.')

  // 5b. Student mismatch with class
  let errClassMismatch = false
  try {
    await disciplineService.createNote({
      studentId: student1A.id,
      classId: class2.id, // Student 1A belongs to class1, not class2
      date: today,
      type: 'VIOLATION',
      description: 'Test class mismatch'
    })
  } catch (e: any) {
    errClassMismatch = true
    assert(e.message.includes('terdaftar di kelas lain'), 'Should state class mismatch')
  }
  assert(errClassMismatch, 'Must reject student-class mismatch')
  console.log('✓ Rejected student belonging to different class.')

  // 5c. Missing required fields
  let errMissingDesc = false
  try {
    await disciplineService.createNote({
      studentId: student1A.id,
      classId: class1.id,
      date: today,
      type: 'VIOLATION',
      description: '   '
    })
  } catch {
    errMissingDesc = true
  }
  assert(errMissingDesc, 'Must reject empty description')
  console.log('✓ Rejected empty description.')

  // 6. Authorization Tests
  console.log('\nTest 6: Testing Role-Based Ownership Authorization...')

  // Teacher 1 updates own note -> SUCCESS
  const updatedViolation = await disciplineService.updateNote(noteViolation.id, {
    description: 'Terlambat masuk kelas 25 menit (telah dikonfirmasi piket).',
    point: 15
  })
  assert(updatedViolation.point === 15, 'Point should be updated to 15')
  assert(updatedViolation.description.includes('25 menit'), 'Description should be updated')
  console.log('✓ Teacher 1 successfully updated own note.')

  // Switch to Teacher 2
  const sessionTeacher2: SessionData = {
    sessionId: 'sess_test_disc_t2',
    userId: 'usr_' + teacher2.id,
    username: teacher2.nip || 'guru_t2',
    role: 'GURU',
    teacherId: teacher2.id,
    teacherName: teacher2.name,
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(sessionTeacher2)

  // Teacher 2 tries to update Teacher 1's note -> MUST FAIL
  let errTeacher2Edit = false
  try {
    await disciplineService.updateNote(noteViolation.id, {
      description: 'Hacked by Teacher 2'
    })
  } catch (e: any) {
    errTeacher2Edit = true
    assert(e.message.includes('tidak memiliki otorisasi'), 'Should reject unauthorized edit')
  }
  assert(errTeacher2Edit, 'Teacher 2 must NOT be allowed to edit Teacher 1 note')
  console.log('✓ Teacher 2 blocked from editing Teacher 1 note.')

  // Teacher 2 tries to delete Teacher 1's note -> MUST FAIL
  let errTeacher2Delete = false
  try {
    await disciplineService.deleteNote(noteViolation.id)
  } catch (e: any) {
    errTeacher2Delete = true
    assert(e.message.includes('tidak memiliki otorisasi'), 'Should reject unauthorized delete')
  }
  assert(errTeacher2Delete, 'Teacher 2 must NOT be allowed to delete Teacher 1 note')
  console.log('✓ Teacher 2 blocked from deleting Teacher 1 note.')

  // Switch to Admin Session -> Admin can update and delete any note
  console.log('\nTest 7: Testing Admin Oversight & Correction Power...')
  const sessionAdmin: SessionData = {
    sessionId: 'sess_test_disc_admin',
    userId: 'usr_admin',
    username: 'admin',
    role: 'ADMIN',
    authenticatedAt: new Date().toISOString()
  }
  authService.setSessionForTesting(sessionAdmin)

  const adminUpdated = await disciplineService.updateNote(noteViolation.id, {
    followup: 'Koreksi Admin: Surat peringatan diterbitkan oleh BK.'
  })
  assert(
    adminUpdated.followup?.includes('Koreksi Admin') ?? false,
    'Admin should be able to update note'
  )
  console.log('✓ Admin successfully updated teacher note.')

  // 8. Query & Filtering Tests
  console.log('\nTest 8: Testing Query, Filtering, and Relation Resolution...')

  // Filter by Class 1
  const class1Notes = await disciplineService.getNotes({ classId: class1.id })
  assert(class1Notes.length >= 3, 'Class 1 should have at least 3 notes')
  assert(class1Notes[0].studentName.length > 0, 'Relation studentName must be resolved')
  assert(class1Notes[0].className.length > 0, 'Relation className must be resolved')
  assert(class1Notes[0].teacherName.length > 0, 'Relation teacherName must be resolved')
  console.log(`✓ Fetched ${class1Notes.length} notes for Class 1 with resolved names.`)

  // Filter by Type = 'PRAISE'
  const praiseNotes = await disciplineService.getNotes({ type: 'PRAISE' })
  assert(
    praiseNotes.every((n) => n.type === 'PRAISE'),
    'All filtered notes must be PRAISE'
  )
  console.log(`✓ Fetched ${praiseNotes.length} PRAISE notes accurately.`)

  // 9. Student Discipline Summary & Point Aggregation
  console.log('\nTest 9: Testing Student Discipline Summary & Points Aggregation...')
  const summary = await disciplineService.getStudentDisciplineSummary(student1A.id)
  assert(summary.studentId === student1A.id, 'Summary studentId matches')
  assert(summary.violationCount === 1, 'Should have 1 violation')
  assert(summary.praiseCount === 1, 'Should have 1 praise')
  // Total points = (+25 praise) - (15 violation) = +10
  assert(summary.totalPoints === 10, `Expected totalPoints +10, got ${summary.totalPoints}`)
  assert(summary.notes.length === 2, 'Student 1A has 2 notes total')
  console.log(
    `✓ Student 1A Summary: Violations: ${summary.violationCount}, Praises: ${summary.praiseCount}, Total Points: ${summary.totalPoints}`
  )

  // 10. SyncQueue Enqueue Verification
  console.log('\nTest 10: Verifying SyncQueue Integration...')
  const pendingSyncs = await repositories.syncQueue.findAll()
  const disciplineSyncs = pendingSyncs.filter((s) => s.entityType === 'DISCIPLINE')
  assert(disciplineSyncs.length >= 3, 'Must have recorded at least 3 DISCIPLINE sync queue items')
  assert(
    disciplineSyncs.some((s) => s.operation === 'CREATE'),
    'Must have CREATE operation in sync queue'
  )
  assert(
    disciplineSyncs.some((s) => s.operation === 'UPDATE'),
    'Must have UPDATE operation in sync queue'
  )
  console.log(`✓ Found ${disciplineSyncs.length} DISCIPLINE items in SyncQueue.`)

  // 11. Delete Note Verification
  console.log('\nTest 11: Testing Delete Note Operation...')
  const deleted = await disciplineService.deleteNote(noteObservation.id)
  assert(deleted === true, 'Delete should return true')
  const afterDelete = await repositories.disciplineNotes.findById(noteObservation.id)
  assert(afterDelete === null, 'Deleted note must no longer exist in IndexedDB')
  console.log('✓ Successfully deleted observation note.')

  console.log('\n=========================================================================')
  console.log(' PHASE 12: ALL STUDENT DISCIPLINE TESTS PASSED PERFECTLY')
  console.log('=========================================================================\n')
}
