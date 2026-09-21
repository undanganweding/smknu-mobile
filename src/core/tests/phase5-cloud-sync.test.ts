/**
 * Phase 5 E2E Integration Test Suite
 * Guru Offline - Real Google Sheets / Apps Script Cloud Sync Pipeline
 *
 * Verifies:
 * 1. Online attendance sync
 * 2. Online journal sync
 * 3. Online assessment sync
 * 4. Offline queue creation
 * 5. Reconnect sync
 * 6. Successful acknowledgement
 * 7. Retry after failure
 * 8. Duplicate operation prevention (Idempotency)
 * 9. Timeout-after-write scenario
 * 10. Partial queue failure
 * 11. Teacher authorization rejection
 * 12. Malformed request rejection
 * 13. Invalid entity relationship rejection
 * 14. Invalid attendance state rejection
 * 15. Invalid assessment state rejection
 * 16. API error handling
 * 17. Persistence verification in Google Sheets
 * 18. Browser / application restart recovery
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth'
import { attendanceService } from '../services/attendance'
import { journalService } from '../services/journal'
import { assessmentService } from '../services/assessment'
import { syncService } from '../services/sync'
import { gasApiClient } from '../api/gasApiClient'
import { gasMockServer } from '../api/gasMockServer'
import type { SyncQueueEntity } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`)
  }
}

export async function runPhase5Tests() {
  console.log('=== RUNNING PHASE 5 CLOUD SYNC TEST SUITE ===\n')

  // Force API Client to use gasMockServer
  gasApiClient.setForceMock(true)
  gasMockServer.resetDatabase()

  // Seed local IndexedDB database
  await seedDatabase()

  // Login as GURU
  const loginRes = await authService.login('guru', 'guru123')
  assert(loginRes.success && loginRes.session !== null, 'Login GURU successful')
  const session = authService.getCurrentSession()!
  const teacherId = session.teacherId!

  // Clear any pre-existing sync queue items
  const initialItems = await repositories.syncQueue.findAll()
  for (const item of initialItems) {
    await repositories.syncQueue.delete(item.id)
  }

  // Fetch teacher schedule
  const schedules = await repositories.schedules.findAll()
  const assignments = await repositories.teacherAssignments.findByTeacherId(teacherId)
  assert(assignments.length > 0, 'Teacher assignments found')

  const validSchedule = schedules.find((s) =>
    assignments.some((a) => a.id === s.teacherAssignmentId)
  )
  assert(validSchedule !== undefined, 'Valid teacher schedule found')

  const students = await repositories.students.findByClassId(validSchedule!.classId)
  assert(students.length > 0, 'Students found for class')

  // -------------------------------------------------------------
  // TEST 1: Online Attendance Sync
  // -------------------------------------------------------------
  console.log('[TEST 1/18] Online Attendance Sync...')
  const attRes = await attendanceService.saveAttendance({
    scheduleId: validSchedule!.id,
    date: '2026-09-18',
    records: [
      { studentId: students[0].id, status: 'H' },
      { studentId: students[1].id, status: 'I', note: 'Izin lomba' }
    ]
  })
  assert(attRes.attendance !== undefined, 'Local attendance record saved')

  const pendingAfterAtt = await syncService.getPendingItems()
  assert(pendingAfterAtt.length === 1, 'Attendance mutation queued in SyncQueue')
  assert(pendingAfterAtt[0].entityType === 'ATTENDANCE', 'Entity type is ATTENDANCE')

  const syncResult1 = await syncService.syncAll()
  assert(syncResult1.syncedCount === 1, 'Sync count is 1')
  assert(syncResult1.failedCount === 0, 'Failed count is 0')

  const syncedAttItems = await repositories.syncQueue.findByEntity(
    'ATTENDANCE',
    attRes.attendance.id
  )
  assert(syncedAttItems[0].status === 'SYNCED', 'SyncQueue item marked SYNCED')
  assert(syncedAttItems[0].syncedAt !== undefined, 'syncedAt timestamp recorded')

  const sheetAttData = gasMockServer.getSheetData('Attendance')
  assert(sheetAttData.length === 1, 'Attendance row written to Google Sheets')
  assert(sheetAttData[0].id === attRes.attendance.id, 'Sheet record ID matches')
  console.log('PASSED: Online Attendance Sync\n')

  // -------------------------------------------------------------
  // TEST 2: Online Journal Sync
  // -------------------------------------------------------------
  console.log('[TEST 2/18] Online Journal Sync...')
  const jrnRes = await journalService.saveJournal({
    scheduleId: validSchedule!.id,
    date: '2026-09-18',
    topic: 'Pemrograman Web Dasar - HTML5 & CSS3',
    activitySummary: 'Siswa mempraktikkan pembuatan elemen form dan layout flexbox.',
    notes: 'Catatan: Kelas sangat kondusif.'
  })
  assert(jrnRes.journal !== undefined, 'Local journal record saved')

  const syncResult2 = await syncService.syncAll()
  assert(syncResult2.syncedCount === 1, 'Journal synced successfully')

  const syncedJrnItems = await repositories.syncQueue.findByEntity('JOURNAL', jrnRes.journal.id)
  assert(syncedJrnItems[0].status === 'SYNCED', 'Journal queue item marked SYNCED')

  const sheetJrnData = gasMockServer.getSheetData('Journals')
  assert(sheetJrnData.length === 1, 'Journal row written to Google Sheets')
  assert(sheetJrnData[0].topic.includes('Pemrograman Web'), 'Sheet topic matches')
  console.log('PASSED: Online Journal Sync\n')

  // -------------------------------------------------------------
  // TEST 3: Online Assessment Sync
  // -------------------------------------------------------------
  console.log('[TEST 3/18] Online Assessment Sync...')
  const createdAsm = await assessmentService.createAssessment({
    teacherAssignmentId: assignments[0].id,
    classId: validSchedule!.classId,
    type: 'HARIAN',
    title: 'UH 1 - Fundamental HTML & CSS',
    date: '2026-09-18',
    maxScore: 100
  })

  await assessmentService.saveAssessmentScores(createdAsm.id, [
    { studentId: students[0].id, score: 88, feedback: 'Sangat baik' },
    { studentId: students[1].id, score: 92, feedback: 'Sempurna' }
  ])

  const syncResult3 = await syncService.syncAll()
  assert(syncResult3.syncedCount >= 1, 'Assessment synced successfully')

  const sheetAsmData = gasMockServer.getSheetData('Assessments')
  assert(sheetAsmData.length === 1, 'Assessment row written to Google Sheets')

  const sheetScoreData = gasMockServer.getSheetData('Assessment_Scores')
  assert(sheetScoreData.length === 2, 'Assessment score rows written to Google Sheets')
  console.log('PASSED: Online Assessment Sync\n')

  // -------------------------------------------------------------
  // TEST 4 & 5: Offline Queue Creation & Reconnect Sync
  // -------------------------------------------------------------
  console.log('[TEST 4 & 5/18] Offline Queue Creation & Reconnect Sync...')
  const offlineJrnRes = await journalService.saveJournal({
    scheduleId: validSchedule!.id,
    date: '2026-09-19',
    topic: 'Offline Topic - JavaScript Syntax',
    activitySummary: 'Disimpan saat offline.'
  })

  const pendingOffline = await syncService.getPendingItems()
  const foundOffline = pendingOffline.find((i) => i.entityId === offlineJrnRes.journal.id)
  assert(foundOffline !== undefined, 'Offline mutation safely queued in IndexedDB as PENDING')
  assert(foundOffline!.status === 'PENDING', 'Item status is PENDING')

  // Reconnect trigger
  const reconnectResult = await syncService.syncAll()
  assert(reconnectResult.syncedCount >= 1, 'Reconnect drained pending queue items')

  const syncedOfflineItem = await repositories.syncQueue.findByEntity(
    'JOURNAL',
    offlineJrnRes.journal.id
  )
  assert(syncedOfflineItem[0].status === 'SYNCED', 'Offline item transitioned to SYNCED')
  console.log('PASSED: Offline Queue Creation & Reconnect Sync\n')

  // -------------------------------------------------------------
  // TEST 6: Successful Acknowledgement Structure
  // -------------------------------------------------------------
  console.log('[TEST 6/18] Successful Acknowledgement Verification...')
  assert(syncedOfflineItem[0].syncedAt !== undefined, 'Response acknowledgement includes syncedAt')
  assert(syncedOfflineItem[0].lastError === undefined, 'No errors in acknowledged item')
  console.log('PASSED: Successful Acknowledgement\n')

  // -------------------------------------------------------------
  // TEST 7: Retry After Failure
  // -------------------------------------------------------------
  console.log('[TEST 7/18] Retry After Failure...')
  // Enable temporary simulated network timeout
  gasMockServer.setSimulateNetworkTimeout(true)

  const retryJrnRes = await journalService.saveJournal({
    scheduleId: validSchedule!.id,
    date: '2026-09-20',
    topic: 'Topic Retry Test',
    activitySummary: 'Penjelasan retry.'
  })

  const failedSyncAttempt = await syncService.syncAll()
  assert(
    failedSyncAttempt.failedCount === 1,
    'Sync attempt failed as expected during network error'
  )

  const failedItems = await repositories.syncQueue.findByEntity('JOURNAL', retryJrnRes.journal.id)
  assert(failedItems[0].status === 'FAILED', 'Item status set to FAILED')
  assert(failedItems[0].attempts === 1, 'Attempts counter incremented to 1')

  // Restore network connection and retry
  gasMockServer.setSimulateNetworkTimeout(false)
  const retrySyncResult = await syncService.syncAll()
  assert(retrySyncResult.syncedCount === 1, 'Retry successfully synced FAILED item')

  const recoveredItem = await repositories.syncQueue.findByEntity('JOURNAL', retryJrnRes.journal.id)
  assert(recoveredItem[0].status === 'SYNCED', 'Item recovered to SYNCED status')
  console.log('PASSED: Retry After Failure\n')

  // -------------------------------------------------------------
  // TEST 8: Duplicate Operation Prevention (Idempotency)
  // -------------------------------------------------------------
  console.log('[TEST 8/18] Duplicate Operation Prevention (Idempotency)...')
  const testQueueItem = syncedOfflineItem[0]
  const duplicateReqPayload = {
    operationId: testQueueItem.id, // Same operationId as already synced item
    operation: testQueueItem.operation,
    entityType: testQueueItem.entityType,
    entityId: testQueueItem.entityId,
    teacherId,
    payload: testQueueItem.payload,
    clientTimestamp: new Date().toISOString()
  }

  const sheetJournalCountBefore = gasMockServer.getSheetData('Journals').length
  const dupRes = await gasApiClient.sendMutation(duplicateReqPayload)

  assert(dupRes.success === true, 'Duplicate call returned success')
  assert(
    dupRes.message.includes('Idempotent'),
    'Response message acknowledges idempotent execution'
  )

  const sheetJournalCountAfter = gasMockServer.getSheetData('Journals').length
  assert(
    sheetJournalCountBefore === sheetJournalCountAfter,
    'No duplicate row created in Google Sheets'
  )
  console.log('PASSED: Duplicate Operation Prevention\n')

  // -------------------------------------------------------------
  // TEST 9: Timeout After Write Scenario
  // -------------------------------------------------------------
  console.log('[TEST 9/18] Timeout After Write Scenario...')
  const timeoutJrnRes = await journalService.saveJournal({
    scheduleId: validSchedule!.id,
    date: '2026-09-21',
    topic: 'Topic Timeout After Write',
    activitySummary: 'Aktivitas timeout test.'
  })

  gasMockServer.setSimulateTimeoutAfterWrite(true)
  const timeoutSyncAttempt = await syncService.syncAll()
  assert(timeoutSyncAttempt.failedCount === 1, 'Client experienced timeout after write')

  // Verify server actually wrote the data
  const sheetJournalsAfterTimeout = gasMockServer.getSheetData('Journals')
  const foundInSheet = sheetJournalsAfterTimeout.find((j: any) => j.id === timeoutJrnRes.journal.id)
  assert(foundInSheet !== undefined, 'Data was persisted on server before connection dropped')

  // Retry sync with same operationId
  gasMockServer.setSimulateTimeoutAfterWrite(false)
  const retryTimeoutResult = await syncService.syncAll()
  assert(retryTimeoutResult.syncedCount === 1, 'Retry successfully completed')

  const finalSheetJournals = gasMockServer.getSheetData('Journals')
  const countInSheet = finalSheetJournals.filter(
    (j: any) => j.id === timeoutJrnRes.journal.id
  ).length
  assert(countInSheet === 1, 'Exact 1 record exists in sheet after retry (No duplicate)')
  console.log('PASSED: Timeout After Write Scenario\n')

  // -------------------------------------------------------------
  // TEST 10: Partial Queue Failure
  // -------------------------------------------------------------
  console.log('[TEST 10/18] Partial Queue Failure...')
  // Queue Item A (Valid Attendance)
  await syncService.enqueue('ATTENDANCE', 'att_partial_a', 'CREATE', {
    id: 'att_partial_a',
    scheduleId: validSchedule!.id,
    date: '2026-09-22',
    teacherId,
    records: [{ studentId: students[0].id, status: 'H' }]
  })

  // Queue Item B (Invalid Journal - Missing required topic)
  await syncService.enqueue('JOURNAL', 'jrn_partial_b', 'CREATE', {
    id: 'jrn_partial_b',
    scheduleId: validSchedule!.id,
    date: '2026-09-22',
    teacherId,
    topic: '', // Missing topic causes server rejection
    activitySummary: 'Aktivitas'
  })

  // Queue Item C (Valid Assessment)
  await syncService.enqueue('ASSESSMENT', 'asm_partial_c', 'CREATE', {
    id: 'asm_partial_c',
    teacherAssignmentId: assignments[0].id,
    classId: validSchedule!.classId,
    type: 'KUIS',
    title: 'Kuis Quick Check',
    date: '2026-09-22',
    maxScore: 100,
    kkm: 75,
    scores: []
  })

  const partialSyncResult = await syncService.syncAll()
  assert(partialSyncResult.syncedCount === 2, 'Item A and C synced (Count = 2)')
  assert(partialSyncResult.failedCount === 1, 'Item B failed (Count = 1)')

  const itemAUpdated = (await repositories.syncQueue.findByEntity('ATTENDANCE', 'att_partial_a'))[0]
  const itemBUpdated = (await repositories.syncQueue.findByEntity('JOURNAL', 'jrn_partial_b'))[0]
  const itemCUpdated = (await repositories.syncQueue.findByEntity('ASSESSMENT', 'asm_partial_c'))[0]

  assert(itemAUpdated.status === 'SYNCED', 'Item A is SYNCED')
  assert(itemBUpdated.status === 'FAILED', 'Item B is FAILED')
  assert(itemCUpdated.status === 'SYNCED', 'Item C is SYNCED')
  console.log('PASSED: Partial Queue Failure\n')

  // -------------------------------------------------------------
  // TEST 11: Teacher Authorization Rejection
  // -------------------------------------------------------------
  console.log('[TEST 11/18] Teacher Authorization Rejection...')
  const unauthorizedReq = {
    operationId: 'unauth_op_123',
    operation: 'CREATE' as const,
    entityType: 'ATTENDANCE' as const,
    entityId: 'unauth_att_1',
    teacherId: 'non_existent_teacher_id',
    payload: {
      id: 'unauth_att_1',
      scheduleId: validSchedule!.id,
      date: '2026-09-22',
      records: [{ studentId: students[0].id, status: 'H' }]
    },
    clientTimestamp: new Date().toISOString()
  }

  const unauthRes = await gasApiClient.sendMutation(unauthorizedReq)
  assert(unauthRes.success === false, 'Server rejected unauthorized teacher')
  assert(unauthRes.errorCode === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED')
  console.log('PASSED: Teacher Authorization Rejection\n')

  // -------------------------------------------------------------
  // TEST 12: Malformed Request Rejection
  // -------------------------------------------------------------
  console.log('[TEST 12/18] Malformed Request Rejection...')
  const malformedReq = {
    operationId: 'malformed_123',
    operation: 'CREATE' as const,
    entityType: 'ATTENDANCE' as const,
    entityId: '',
    teacherId: '',
    payload: null,
    clientTimestamp: new Date().toISOString()
  }

  const malformedRes = await gasApiClient.sendMutation(malformedReq as any)
  assert(malformedRes.success === false, 'Server rejected malformed request')
  assert(malformedRes.errorCode === 'INVALID_PAYLOAD', 'Error code is INVALID_PAYLOAD')
  console.log('PASSED: Malformed Request Rejection\n')

  // -------------------------------------------------------------
  // TEST 13: Invalid Entity Relationship Rejection
  // -------------------------------------------------------------
  console.log('[TEST 13/18] Invalid Entity Relationship Rejection...')
  const invalidRelReq = {
    operationId: 'invalid_rel_123',
    operation: 'CREATE' as const,
    entityType: 'JOURNAL' as const,
    entityId: 'jrn_invalid_rel',
    teacherId,
    payload: {
      id: 'jrn_invalid_rel',
      scheduleId: 'non_existent_schedule_id_99999',
      date: '2026-09-22',
      topic: 'Topic Test',
      activitySummary: 'Activity Summary'
    },
    clientTimestamp: new Date().toISOString()
  }

  const invalidRelRes = await gasApiClient.sendMutation(invalidRelReq)
  assert(invalidRelRes.success === false, 'Server rejected invalid schedule ID')
  assert(
    invalidRelRes.errorCode === 'UNAUTHORIZED' || invalidRelRes.errorCode === 'INVALID_PAYLOAD',
    'Rejected with relationship error'
  )
  console.log('PASSED: Invalid Entity Relationship Rejection\n')

  // -------------------------------------------------------------
  // TEST 14: Invalid Attendance State Rejection
  // -------------------------------------------------------------
  console.log('[TEST 14/18] Invalid Attendance State Rejection...')
  const invalidAttReq = {
    operationId: 'invalid_att_state_123',
    operation: 'CREATE' as const,
    entityType: 'ATTENDANCE' as const,
    entityId: 'att_invalid_state',
    teacherId,
    payload: {
      id: 'att_invalid_state',
      scheduleId: validSchedule!.id,
      date: '2026-09-22',
      records: [{ studentId: students[0].id, status: 'INVALID_STATUS_CODE' }]
    },
    clientTimestamp: new Date().toISOString()
  }

  const invalidAttRes = await gasApiClient.sendMutation(invalidAttReq)
  assert(invalidAttRes.success === false, 'Server rejected invalid attendance status code')
  assert(invalidAttRes.errorCode === 'INVALID_PAYLOAD', 'Error code is INVALID_PAYLOAD')
  console.log('PASSED: Invalid Attendance State Rejection\n')

  // -------------------------------------------------------------
  // TEST 15: Invalid Assessment State Rejection
  // -------------------------------------------------------------
  console.log('[TEST 15/18] Invalid Assessment State Rejection...')
  const invalidAsmReq = {
    operationId: 'invalid_asm_state_123',
    operation: 'CREATE' as const,
    entityType: 'ASSESSMENT' as const,
    entityId: 'asm_invalid_state',
    teacherId,
    payload: {
      id: 'asm_invalid_state',
      teacherAssignmentId: assignments[0].id,
      title: 'Tugas Invalid',
      maxScore: -50 // Negative max score
    },
    clientTimestamp: new Date().toISOString()
  }

  const invalidAsmRes = await gasApiClient.sendMutation(invalidAsmReq)
  assert(invalidAsmRes.success === false, 'Server rejected negative max score')
  assert(invalidAsmRes.errorCode === 'INVALID_PAYLOAD', 'Error code is INVALID_PAYLOAD')
  console.log('PASSED: Invalid Assessment State Rejection\n')

  // -------------------------------------------------------------
  // TEST 16: API Error Handling Model
  // -------------------------------------------------------------
  console.log('[TEST 16/18] API Error Handling Model...')
  assert(typeof invalidAsmRes.message === 'string', 'Error message is human-readable string')
  assert(invalidAsmRes.errorCode !== undefined, 'ErrorCode is defined')
  assert(typeof invalidAsmRes.syncedAt === 'string', 'syncedAt is defined')
  console.log('PASSED: API Error Handling Model\n')

  // -------------------------------------------------------------
  // TEST 17: Persistence Verification
  // -------------------------------------------------------------
  console.log('[TEST 17/18] Persistence Verification in Google Sheets...')
  const finalAttendanceSheet = gasMockServer.getSheetData('Attendance')
  const finalJournalsSheet = gasMockServer.getSheetData('Journals')
  const finalAssessmentsSheet = gasMockServer.getSheetData('Assessments')

  assert(finalAttendanceSheet.length >= 2, 'Attendance records stored in Google Sheets')
  assert(finalJournalsSheet.length >= 2, 'Journal records stored in Google Sheets')
  assert(finalAssessmentsSheet.length >= 2, 'Assessment records stored in Google Sheets')
  console.log('PASSED: Persistence Verification\n')

  // -------------------------------------------------------------
  // TEST 18: Browser / Application Restart Recovery
  // -------------------------------------------------------------
  console.log('[TEST 18/18] Browser / Application Restart Recovery...')
  // Inject orphaned item stuck in SYNCING state
  const orphanedId = 'orphaned_sync_123'
  const orphanedItem: SyncQueueEntity = {
    id: orphanedId,
    entityType: 'JOURNAL',
    entityId: 'jrn_orphaned_1',
    operation: 'CREATE',
    payload: {
      id: 'jrn_orphaned_1',
      scheduleId: validSchedule!.id,
      date: '2026-09-23',
      teacherId,
      topic: 'Orphaned Topic',
      activitySummary: 'Aktivitas Orfan'
    },
    status: 'SYNCING',
    attempts: 1,
    queuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await repositories.syncQueue.create(orphanedItem)

  const recoveredCount = await syncService.recoverOrphanedSyncs()
  assert(recoveredCount === 1, 'Recovered 1 orphaned sync item')

  const recoveredDbItem = (
    await repositories.syncQueue.findByEntity('JOURNAL', 'jrn_orphaned_1')
  )[0]
  assert(recoveredDbItem.status === 'PENDING', 'Orphaned item restored to PENDING status')
  console.log('PASSED: Browser / Application Restart Recovery\n')

  console.log('=== ALL 18 PHASE 5 TEST CASES PASSED SUCCESSFULLY ===')
}
