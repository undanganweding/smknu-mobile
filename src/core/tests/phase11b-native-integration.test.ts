/**
 * Phase 11b - Google Workspace Native Integration Test Suite
 * Guru Offline - SMK NU Ungaran
 */

import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { syncService } from '../services/sync/SyncService'
import { googleWorkspaceService } from '../services/sync/GoogleWorkspaceService'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPhase11bTests() {
  console.log('=== RUNNING PHASE 11B: GOOGLE WORKSPACE NATIVE INTEGRATION TESTS ===\n')

  // 1. Enable Mock Mode for testing
  console.log('Test 1: Setting up mock mode...')
  googleWorkspaceService.setMockMode(true)
  assert(googleWorkspaceService.isEnabled() === true, 'Mock mode should be enabled')
  console.log('✓ Mock mode successfully set up.')

  // 2. Clear sync queue & seed database
  console.log('\nTest 2: Seeding database...')
  await repositories.syncQueue.clear()
  await repositories.teachers.clear()
  await seedDatabase()
  console.log('✓ Local database successfully seeded.')

  // 3. Connect/Disconnect flows
  console.log('\nTest 3: Testing Google Sign-in flow...')
  const session = await googleWorkspaceService.signIn()
  assert(session.token === 'mock-oauth-token-12345', 'Mock OAuth token should match')
  assert(session.user.email === 'syifa.anjay@gmail.com', 'Mock email should match')
  assert(
    googleWorkspaceService.getAccessToken() === 'mock-oauth-token-12345',
    'Token should be cached in memory'
  )
  console.log('✓ Google Sign-in connected and token cached perfectly.')

  console.log('\nTest 4: Managing Spreadsheet ID...')
  googleWorkspaceService.setSpreadsheetId('custom-school-spreadsheet-999')
  assert(
    googleWorkspaceService.getSpreadsheetId() === 'custom-school-spreadsheet-999',
    'Spreadsheet ID must be persisted'
  )
  console.log('✓ Spreadsheet ID persisted and recovered.')

  // 4. API integrations in mock mode
  console.log('\nTest 5: Testing Sheet initialization and headers...')
  const ssId = await googleWorkspaceService.ensureSpreadsheet()
  assert(ssId === 'custom-school-spreadsheet-999', 'Spreadsheet ID must match configuration')
  console.log('✓ Sheets initialized successfully.')

  console.log('\nTest 6: Testing Drive backups uploads...')
  const backupJson = JSON.stringify({ version: '1.0', data: [] })
  const fileId = await googleWorkspaceService.uploadBackupToDrive('backup.json', backupJson)
  assert(fileId === 'mock-drive-file-id-12345', 'Uploaded Drive backup file ID mismatch')
  console.log('✓ Drive backups successfully simulated.')

  console.log('\nTest 7: Testing other Workspace APIs (Gmail, Calendar, Docs, Forms)...')
  await googleWorkspaceService.sendGmailAlert('wali@gmail.com', 'Presensi', 'Alpha')

  const eventId = await googleWorkspaceService.createCalendarEvent({
    summary: 'Ujian Tengah Semester',
    description: 'UTS RPL',
    startDateTime: '2026-09-20T08:00:00',
    endDateTime: '2026-09-20T10:00:00'
  })
  assert(eventId === 'mock-calendar-event-id-12345', 'Calendar event ID mismatch')

  const docId = await googleWorkspaceService.createDocTemplate('Sertifikat', ['Sertifikat Lulus'])
  assert(docId === 'mock-doc-id-12345', 'Docs document ID mismatch')

  const responses = await googleWorkspaceService.getFormFeedback('mock-form')
  assert(responses.length > 0, 'Should fetch non-empty list of responses')
  console.log('✓ Gmail, Calendar, Docs, and Forms APIs verified.')

  // 5. SyncQueue integration & state transitions
  console.log('\nTest 8: Testing SyncQueue queueing and success states...')
  const item = await syncService.enqueue('MASTER', 'teacher_101', 'CREATE', {
    id: 'teacher_101',
    nip: '198203042009021002',
    name: 'Syifa Fauziyah, S.Pd.',
    position: 'Guru Produktif'
  })
  assert(item.status === 'PENDING', 'Enqueued item status must be PENDING')

  const result = await syncService.syncAll()
  assert(result.syncedCount === 1, 'Synced count should be 1')
  assert(result.failedCount === 0, 'Failed count should be 0')

  const updated = await repositories.syncQueue.findById(item.id)
  assert(updated?.status === 'SYNCED', 'Synced item status must be SYNCED')
  assert(updated?.syncedAt !== undefined, 'Synced item syncedAt must be set')
  console.log('✓ SyncQueue processing successfully finished as SYNCED.')

  // 6. Graceful failure and error capturing
  console.log('\nTest 9: Testing failure handling when session is lost...')
  await googleWorkspaceService.logout() // Clear mock token
  googleWorkspaceService.setMockMode(false) // Disable mock to trigger real API checks
  // Stub isEnabled to force SyncService to use native sync even with null token
  const originalIsEnabled = googleWorkspaceService.isEnabled
  googleWorkspaceService.isEnabled = () => true

  const failedItem = await syncService.enqueue('MASTER', 'teacher_202', 'CREATE', {
    id: 'teacher_202',
    name: 'Pak Ahmad, M.Kom.'
  })

  const failResult = await syncService.syncAll()
  assert(failResult.syncedCount === 0, 'No item should successfully sync without token')
  assert(failResult.failedCount === 1, 'Failed item count should be 1')

  const failedDbItem = await repositories.syncQueue.findById(failedItem.id)
  if (!failedDbItem) {
    throw new Error('failedDbItem must exist')
  }
  console.log('DEBUG: failedDbItem?.lastError =', failedDbItem.lastError)
  assert(failedDbItem.status === 'FAILED', 'Item must be flagged as FAILED')
  assert(
    failedDbItem.lastError !== undefined && failedDbItem.lastError !== null,
    'Error message must be captured'
  )
  assert(failedDbItem.lastError!.includes('Sesi Google belum terhubung'), 'Error message mismatch')
  console.log('✓ Failures successfully captured with structured reasons.')

  // Restore original function
  googleWorkspaceService.isEnabled = originalIsEnabled

  // 7. 401 Token Invalidation Test
  console.log('\nTest 10: Testing 401 response token invalidation...')
  googleWorkspaceService.setMockMode(false)
  ;(googleWorkspaceService as any).cachedToken = 'expired-token-xyz'
  assert(googleWorkspaceService.getAccessToken() === 'expired-token-xyz', 'Token should be set')

  const originalFetch = globalThis.fetch
  try {
    Object.defineProperty(globalThis, 'fetch', {
      value: async () =>
        new Response('Unauthorized token', {
          status: 401,
          statusText: 'Unauthorized'
        }),
      writable: true,
      configurable: true
    })
  } catch (err) {
    console.debug('[Test] Mock fetch override skipped:', err)
  }

  let caught401 = false
  try {
    await (googleWorkspaceService as any).callGoogleAPI('https://sheets.googleapis.com/test')
  } catch (err: any) {
    caught401 = true
    assert(err.message.includes('401'), 'Error should mention 401')
  }
  assert(caught401, '401 error should be thrown')
  assert(googleWorkspaceService.getAccessToken() === null, 'cachedToken must be cleared upon 401')
  assert(googleWorkspaceService.isEnabled() === false, 'Service must become disabled upon 401')
  console.log('✓ 401 Token invalidation verified: cached token is cleared and service disabled.')

  // Restore fetch and mock mode
  try {
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true
    })
  } catch (err) {
    console.debug('[Test] Restore fetch skipped:', err)
  }
  googleWorkspaceService.setMockMode(true)

  console.log('\n======================================================================')
  console.log('=== PHASE 11B: ALL GOOGLE WORKSPACE TESTS PASSED PERFECTLY ===')
  console.log('======================================================================\n')
}
