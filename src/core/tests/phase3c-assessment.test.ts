/**
 * Phase 3C - Student Assessment / Penilaian Test Suite
 * SMK NU Ungaran - Guru Offline
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth/AuthService'
import { assessmentService } from '../services/assessment/AssessmentService'
import type { SessionData } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase3cTests() {
  console.log('=== RUNNING PHASE 3C TESTS: ASSESSMENT / PENILAIAN SISWA ===\n')

  // 1. Initialize & Seed Database
  console.log('Test 1: Initializing IndexedDB and Seeding Master Data...')
  await seedDatabase()
  console.log('✓ Database initialized & seeded successfully.')

  // 2. Identify Test Teachers & Assignments
  console.log('\nTest 2: Identifying Teachers and Assigned Subjects...')
  const allAssignments = await repositories.teacherAssignments.findAll()
  const allSchedules = await repositories.schedules.findAll()
  assert(allAssignments.length >= 2, 'Assignments must be seeded with at least 2 entries')
  assert(allSchedules.length >= 2, 'Schedules must be seeded with at least 2 entries')

  const t1Schedule = allSchedules[0]
  const t1Asg = (await repositories.teacherAssignments.findById(t1Schedule.teacherAssignmentId))!
  const teacher1 = (await repositories.teachers.findById(t1Asg.teacherId))!
  const t1ClassId = t1Schedule.classId

  const t2Schedule = allSchedules.find((s) => {
    const asg = allAssignments.find((a) => a.id === s.teacherAssignmentId)
    return asg && asg.teacherId !== teacher1.id
  })!
  assert(!!t2Schedule, 'Must find a second schedule belonging to a different teacher')
  const t2Asg = (await repositories.teacherAssignments.findById(t2Schedule.teacherAssignmentId))!
  const teacher2 = (await repositories.teachers.findById(t2Asg.teacherId))!
  const t2ClassId = t2Schedule.classId

  console.log(`✓ Teacher 1: ${teacher1.name} (Assignment: ${t1Asg.id}, Class: ${t1ClassId})`)
  console.log(`✓ Teacher 2: ${teacher2.name} (Assignment: ${t2Asg.id}, Class: ${t2ClassId})`)

  // 3. Set Session as Teacher 1
  await authService.logout()
  const sessionTeacher1: SessionData = {
    sessionId: 'sess_test_t1',
    userId: 'usr_' + teacher1.id,
    username: teacher1.nip || 'guru_test_1',
    role: 'GURU',
    teacherId: teacher1.id,
    teacherName: teacher1.name,
    authenticatedAt: new Date().toISOString()
  }
  localStorage.setItem('guru_offline_session', JSON.stringify(sessionTeacher1))
  assert(authService.getCurrentSession()?.teacherId === teacher1.id, 'Session set to Teacher 1')
  console.log('\nTest 3: Authentication session active as Teacher 1.')

  // 4. Create Assessment by Teacher 1 for their own assignment
  console.log('\nTest 4: Creating Assessment for Teacher 1...')
  const createdAssessment = await assessmentService.createAssessment({
    teacherAssignmentId: t1Asg.id,
    classId: t1ClassId,
    type: 'HARIAN',
    title: 'Ulangan Harian 1 - Dasar Pemrograman',
    date: '2026-09-18',
    maxScore: 100
  })

  assert(!!createdAssessment.id, 'Assessment ID generated')
  assert(createdAssessment.classId === t1ClassId, 'classId matches assignment')
  assert(createdAssessment.subjectId === t1Asg.subjectId, 'subjectId matches assignment')
  assert(createdAssessment.teacherAssignmentId === t1Asg.id, 'teacherAssignmentId matches')
  assert(createdAssessment.type === 'HARIAN', 'type matches')
  assert(createdAssessment.title === 'Ulangan Harian 1 - Dasar Pemrograman', 'title matches')
  assert(createdAssessment.maxScore === 100, 'maxScore is 100')
  assert(Array.isArray(createdAssessment.scores), 'scores array initialized')
  console.log(`✓ Assessment created successfully: ${createdAssessment.id}`)

  // 5. Cross-Teacher Assessment Creation Rejection (Teacher 1 trying to use Teacher 2's assignment)
  console.log('\nTest 5: Enforcing Cross-Teacher Creation Rejection...')
  let crossCreateBlocked = false
  try {
    await assessmentService.createAssessment({
      teacherAssignmentId: t2Asg.id,
      classId: t2ClassId,
      type: 'TUGAS',
      title: 'Tugas Tidak Sah',
      date: '2026-09-18',
      maxScore: 100
    })
  } catch {
    crossCreateBlocked = true
  }
  assert(
    crossCreateBlocked,
    'Teacher 1 must not be allowed to create assessment on Teacher 2 assignment'
  )
  console.log('✓ Cross-teacher creation properly rejected by service layer.')

  // 6. Student Roster Loading for Assessment
  console.log('\nTest 6: Loading Student Roster for Assessment...')
  const detail = await assessmentService.getAssessmentDetail(createdAssessment.id)
  assert(detail.assessment.id === createdAssessment.id, 'Assessment detail matches ID')
  assert(detail.roster.length > 0, 'Roster must contain active students of the class')
  assert(
    detail.statistics.totalStudents === detail.roster.length,
    'Total students statistics matches'
  )
  assert(detail.statistics.gradedCount === 0, 'Initially 0 students are graded')
  assert(
    detail.statistics.ungradedCount === detail.roster.length,
    'Initially all students are ungraded'
  )
  assert(
    detail.statistics.averageScore === null,
    'Average score must be null (not 0) when no scores exist'
  )
  console.log(
    `✓ Roster loaded with ${detail.roster.length} students. Ungraded correctly not treated as 0.`
  )

  // 7. Input and Save Valid Scores (including Decimals)
  console.log('\nTest 7: Saving Valid Scores (including Decimals)...')
  const st1 = detail.roster[0]
  const st2 = detail.roster[1]
  const st3 = detail.roster[2]

  await assessmentService.saveAssessmentScores(createdAssessment.id, [
    { studentId: st1.studentId, score: 95.5, feedback: 'Sangat baik' },
    { studentId: st2.studentId, score: 72.25, feedback: 'Perlu remidi materi loop' },
    { studentId: st3.studentId, score: 88, feedback: 'Bagus' }
  ])

  const updatedDetail = await assessmentService.getAssessmentDetail(createdAssessment.id)
  const rosterSt1 = updatedDetail.roster.find((r) => r.studentId === st1.studentId)
  const rosterSt2 = updatedDetail.roster.find((r) => r.studentId === st2.studentId)
  const rosterSt3 = updatedDetail.roster.find((r) => r.studentId === st3.studentId)
  const rosterSt4 = updatedDetail.roster[3]

  assert(rosterSt1?.score === 95.5, 'Exact decimal 95.5 preserved')
  assert(rosterSt2?.score === 72.25, 'Exact decimal 72.25 preserved')
  assert(rosterSt3?.score === 88, 'Score 88 preserved')
  assert(rosterSt4?.score === undefined, 'Ungraded student 4 score is undefined')
  assert(rosterSt4?.isGraded === false, 'Ungraded student 4 is not graded')
  console.log('✓ Valid scores & exact decimal precision saved successfully.')

  // 8. Statistical Calculations Accuracy
  console.log('\nTest 8: Verifying Statistical Calculations...')
  const stats = updatedDetail.statistics
  assert(stats.totalStudents === detail.roster.length, 'Total students count accurate')
  assert(stats.gradedCount === 3, 'Graded count is exactly 3')
  assert(stats.ungradedCount === detail.roster.length - 3, 'Ungraded count accurate')
  // avg = (95.5 + 72.25 + 88) / 3 = 255.75 / 3 = 85.25
  assert(
    stats.averageScore === 85.25,
    `Average calculation accurate: expected 85.25, got ${stats.averageScore}`
  )
  assert(stats.minScore === 72.25, `Min score accurate: expected 72.25, got ${stats.minScore}`)
  assert(stats.maxScore === 95.5, `Max score accurate: expected 95.5, got ${stats.maxScore}`)
  console.log(
    `✓ Statistics: Graded=${stats.gradedCount}, Ungraded=${stats.ungradedCount}, Avg=${stats.averageScore}, Min=${stats.minScore}, Max=${stats.maxScore}`
  )

  // 9. Score Validation (Negative, Exceeding Max, Non-Numeric)
  console.log('\nTest 9: Enforcing Score Numeric Range & Validity...')
  let negBlocked = false
  try {
    await assessmentService.saveAssessmentScores(createdAssessment.id, [
      { studentId: st1.studentId, score: -5 }
    ])
  } catch {
    negBlocked = true
  }
  assert(negBlocked, 'Negative score must be rejected')

  let exceedBlocked = false
  try {
    await assessmentService.saveAssessmentScores(createdAssessment.id, [
      { studentId: st1.studentId, score: 105 }
    ])
  } catch {
    exceedBlocked = true
  }
  assert(exceedBlocked, 'Score exceeding maxScore (100) must be rejected')

  let nanBlocked = false
  try {
    await assessmentService.saveAssessmentScores(createdAssessment.id, [
      { studentId: st1.studentId, score: 'abc' as any }
    ])
  } catch {
    nanBlocked = true
  }
  assert(nanBlocked, 'Non-numeric string must be rejected')
  console.log('✓ Invalid score values (negative, >max, NaN) rejected safely.')

  // 10. Upsert & In-Place Score Updates (No Duplicate records)
  console.log('\nTest 10: Verifying Upsert & Duplicate Prevention per Student...')
  await assessmentService.saveAssessmentScores(createdAssessment.id, [
    { studentId: st1.studentId, score: 100, feedback: 'Nilai sempurna setelah remidi' }
  ])

  const storedAssessment = (await repositories.assessments.findById(createdAssessment.id))!
  const st1Entries = storedAssessment.scores.filter((s) => s.studentId === st1.studentId)
  assert(st1Entries.length === 1, 'Exact 1 score entry per studentId (no duplicate records)')
  assert(st1Entries[0].score === 100, 'Score updated in-place to 100')
  console.log('✓ Score upsert confirmed: in-place update without duplicate records.')

  // 11. Clearing a Score (Reset to Ungraded)
  console.log('\nTest 11: Resetting a Score to Ungraded...')
  await assessmentService.saveAssessmentScores(createdAssessment.id, [
    { studentId: st2.studentId, score: null }
  ])
  const afterResetDetail = await assessmentService.getAssessmentDetail(createdAssessment.id)
  const st2AfterReset = afterResetDetail.roster.find((r) => r.studentId === st2.studentId)
  assert(st2AfterReset?.score === undefined, 'Student 2 score cleared to undefined')
  assert(st2AfterReset?.isGraded === false, 'Student 2 is now ungraded')
  assert(afterResetDetail.statistics.gradedCount === 2, 'Graded count updated to 2')
  console.log('✓ Score cleared and returned to ungraded state.')

  // 12. Cross-Teacher Authorization Enforcement
  console.log('\nTest 12: Enforcing Cross-Teacher Authorization (Read, Update, Score, Delete)...')
  // Switch session to Teacher 2
  await authService.logout()
  const sessionTeacher2: SessionData = {
    sessionId: 'sess_test_t2',
    userId: 'usr_' + teacher2.id,
    username: teacher2.nip || 'guru_test_2',
    role: 'GURU',
    teacherId: teacher2.id,
    teacherName: teacher2.name,
    authenticatedAt: new Date().toISOString()
  }
  localStorage.setItem('guru_offline_session', JSON.stringify(sessionTeacher2))
  assert(authService.getCurrentSession()?.teacherId === teacher2.id, 'Session set to Teacher 2')

  let t2ReadBlocked = false
  try {
    await assessmentService.getAssessmentDetail(createdAssessment.id)
  } catch {
    t2ReadBlocked = true
  }
  assert(t2ReadBlocked, 'Teacher 2 must not be allowed to read Teacher 1 assessment detail')

  let t2ScoreBlocked = false
  try {
    await assessmentService.saveAssessmentScores(createdAssessment.id, [
      { studentId: st1.studentId, score: 80 }
    ])
  } catch {
    t2ScoreBlocked = true
  }
  assert(t2ScoreBlocked, 'Teacher 2 must not be allowed to submit scores on Teacher 1 assessment')

  let t2DeleteBlocked = false
  try {
    await assessmentService.deleteAssessment(createdAssessment.id)
  } catch {
    t2DeleteBlocked = true
  }
  assert(t2DeleteBlocked, 'Teacher 2 must not be allowed to delete Teacher 1 assessment')

  // Teacher 2 query list should not contain Teacher 1 assessment
  const t2List = await assessmentService.getAssessments()
  const foundT1 = t2List.find((a) => a.id === createdAssessment.id)
  assert(!foundT1, 'Teacher 2 assessment list must not contain Teacher 1 assessments')
  console.log('✓ Cross-teacher access fully blocked across all operations.')

  // 13. Update & Delete Assessment by Owner (Teacher 1)
  console.log('\nTest 13: Updating and Deleting Assessment by Owner...')
  await authService.logout()
  localStorage.setItem('guru_offline_session', JSON.stringify(sessionTeacher1))

  const updatedAssessment = await assessmentService.updateAssessment(createdAssessment.id, {
    title: 'Ulangan Harian 1 - Pemrograman Dasar (Revisi)',
    type: 'TUGAS'
  })
  assert(
    updatedAssessment.title === 'Ulangan Harian 1 - Pemrograman Dasar (Revisi)',
    'Title updated'
  )
  assert(updatedAssessment.type === 'TUGAS', 'Type updated')

  const deleted = await assessmentService.deleteAssessment(createdAssessment.id)
  assert(deleted === true, 'Assessment successfully deleted')
  const afterDelete = await repositories.assessments.findById(createdAssessment.id)
  assert(afterDelete === null, 'Assessment removed from IndexedDB')
  console.log('✓ Assessment updated and deleted by owner successfully.')

  console.log('\n======================================================')
  console.log('✓ ALL 13 PHASE 3C ASSESSMENT & SCORING TESTS PASSED!')
  console.log('======================================================\n')
}
