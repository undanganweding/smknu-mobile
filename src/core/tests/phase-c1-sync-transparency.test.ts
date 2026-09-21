/**
 * Guru Offline - Phase C1 Offline Sync Transparency Dashboard Test Suite
 * Covers requirements for SyncTransparencyService:
 * 1. Summary statistics (pending, failed, successToday)
 * 2. Role-Based Access Control (Guru see/retry own queue, admin global access)
 * 3. Retry operations (pending, failed, invalid)
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { repositories } from '../repositories'
import { authService } from '../services/auth'
import { syncTransparencyService } from '../services/sync/SyncTransparencyService'
import type { SyncQueueEntity } from '../types'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`)
  }
}

export async function runPhaseC1Tests() {
  console.log('\n=== RUNNING PHASE C1 SYNC TRANSPARENCY DASHBOARD TEST SUITE ===\n')
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

  // 1. Initial Seeding
  await seedDatabase(true)

  // Clear existing queue
  const existingQueue = await repositories.syncQueue.findAll()
  for (const item of existingQueue) {
    await repositories.syncQueue.delete(item.id)
  }

  // 2. Setup mock sync items for different teachers
  const t1_id = 'tch_achmad_ali_mahmudi__s_ds_'
  const t2_id = 'tch_achmad_zairin__s_pd___m_pd_'

  const now = new Date().toISOString()
  const todayStr = now.split('T')[0]

  // Teacher 1 items enqueued
  const item1: SyncQueueEntity = {
    id: 'sync_t1_pending_1',
    entityType: 'ATTENDANCE',
    entityId: 'att_1',
    operation: 'CREATE',
    payload: { id: 'att_1', createdBy: t1_id, teacherId: t1_id },
    status: 'PENDING',
    attempts: 0,
    queuedAt: now,
    createdAt: now,
    updatedAt: now
  }

  const item2: SyncQueueEntity = {
    id: 'sync_t1_failed_1',
    entityType: 'JOURNAL',
    entityId: 'jrn_1',
    operation: 'UPDATE',
    payload: { id: 'jrn_1', createdBy: t1_id, teacherId: t1_id },
    status: 'FAILED',
    attempts: 2,
    lastError: 'Conflict: Sheet modification collision',
    queuedAt: now,
    createdAt: now,
    updatedAt: now
  }

  const item3: SyncQueueEntity = {
    id: 'sync_t1_synced_1',
    entityType: 'ASSESSMENT',
    entityId: 'asm_1',
    operation: 'CREATE',
    payload: { id: 'asm_1', createdBy: t1_id, teacherId: t1_id },
    status: 'SYNCED',
    attempts: 1,
    syncedAt: `${todayStr}T10:00:00.000Z`,
    queuedAt: now,
    createdAt: now,
    updatedAt: now
  }

  // Teacher 2 items enqueued
  const item4: SyncQueueEntity = {
    id: 'sync_t2_pending_1',
    entityType: 'DISCIPLINE',
    entityId: 'dsc_1',
    operation: 'CREATE',
    payload: { id: 'dsc_1', createdBy: t2_id, teacherId: t2_id },
    status: 'PENDING',
    attempts: 0,
    queuedAt: now,
    createdAt: now,
    updatedAt: now
  }

  await repositories.syncQueue.create(item1)
  await repositories.syncQueue.create(item2)
  await repositories.syncQueue.create(item3)
  await repositories.syncQueue.create(item4)

  // -------------------------------------------------------------
  // TEST 1: Summary Statistics for Admin
  // -------------------------------------------------------------
  await test('1. SyncTransparencyService returns complete statistics for Admin', async () => {
    // Login as Admin
    await authService.login('admin', 'admin123')
    const summary = await syncTransparencyService.getSummary()

    assert(summary.totalPending === 2, 'Admin should see both pending items')
    assert(summary.failed === 1, 'Admin should see the failed item')
    assert(summary.conflict === 1, 'Admin should identify conflict error')
    assert(summary.successToday === 1, "Admin should see today's synced item")
  })

  // -------------------------------------------------------------
  // TEST 2: Summary Statistics & Visibility for GURU 1 (Owner of t1 items)
  // -------------------------------------------------------------
  await test('2. GURU 1 sees only their own sync queue summary & items', async () => {
    const users = await repositories.users.findAll()
    const guruUser = users.find((u) => u.role === 'GURU')
    assert(guruUser !== undefined, 'At least one Guru user exists in DB')

    // Force login session for testing to ensure teacherId is exactly t1_id
    authService.setSessionForTesting({
      sessionId: 'sess_guru_1',
      userId: guruUser!.id,
      username: guruUser!.username,
      role: 'GURU',
      teacherId: t1_id,
      teacherName: 'Achmad Ali Mahmudi, S.Ds.',
      authenticatedAt: new Date().toISOString()
    })

    const summary = await syncTransparencyService.getSummary()
    assert(summary.totalPending === 1, 'Guru 1 should see exactly 1 pending item of theirs')
    assert(summary.failed === 1, 'Guru 1 should see exactly 1 failed item of theirs')
    assert(summary.conflict === 1, 'Guru 1 should see conflict in their failed item')
    assert(summary.successToday === 1, 'Guru 1 should see their synced item')

    const items = await syncTransparencyService.getQueueItems()
    assert(items.length === 3, 'Guru 1 should retrieve exactly their own 3 items')
    assert(!items.some((i) => i.id === 'sync_t2_pending_1'), "Guru 1 must not see Guru 2's items")
  })

  // -------------------------------------------------------------
  // TEST 3: GURU 2 Visibility and Isolation
  // -------------------------------------------------------------
  await test("3. GURU 2 is completely isolated from GURU 1's sync records", async () => {
    const users = await repositories.users.findAll()
    const guruUser = users.find((u) => u.role === 'GURU')

    // Force login session for Teacher 2
    authService.setSessionForTesting({
      sessionId: 'sess_guru_2',
      userId: guruUser!.id,
      username: guruUser!.username,
      role: 'GURU',
      teacherId: t2_id,
      teacherName: 'Teacher Two',
      authenticatedAt: new Date().toISOString()
    })

    const summary = await syncTransparencyService.getSummary()
    assert(summary.totalPending === 1, 'Guru 2 should see exactly their 1 pending item')
    assert(summary.failed === 0, 'Guru 2 should have 0 failed items')

    const items = await syncTransparencyService.getQueueItems()
    assert(items.length === 1, 'Guru 2 retrieves exactly 1 item')
    assert(
      items[0].id === 'sync_t2_pending_1',
      'Guru 2 retrieved item matches their expected pending queue item'
    )
  })

  // -------------------------------------------------------------
  // TEST 4: Mass and Selective Filter Options
  // -------------------------------------------------------------
  await test('4. Filter and search parameters accurately restrict queue items', async () => {
    // Admin login
    await authService.login('admin', 'admin123')

    const pendingItems = await syncTransparencyService.getQueueItems({ status: 'PENDING' })
    assert(pendingItems.length === 2, 'Filtered by PENDING status returns 2 items')

    const journalItems = await syncTransparencyService.getQueueItems({ entityType: 'JOURNAL' })
    assert(journalItems.length === 1, 'Filtered by JOURNAL entity returns 1 item')

    const searchResult = await syncTransparencyService.getQueueItems({ search: 'collision' })
    assert(searchResult.length === 1, 'Searching by error collision finds the correct item')
  })

  // -------------------------------------------------------------
  // TEST 5: Retry Authorization Restrictions
  // -------------------------------------------------------------
  await test("5. GURU is blocked from retrying other users' items", async () => {
    const users = await repositories.users.findAll()
    const guruUser = users.find((u) => u.role === 'GURU')

    // Login as GURU 2 (who only owns t2 items)
    authService.setSessionForTesting({
      sessionId: 'sess_guru_2',
      userId: guruUser!.id,
      username: guruUser!.username,
      role: 'GURU',
      teacherId: t2_id,
      teacherName: 'Teacher Two',
      authenticatedAt: new Date().toISOString()
    })

    // GURU 2 attempts to retry GURU 1's failed record
    let errorThrown = false
    try {
      await syncTransparencyService.retryItem('sync_t1_failed_1')
    } catch (err: any) {
      errorThrown = true
      assert(
        err.message.includes('Akses Ditolak'),
        'Throws expected AuthorizationError on cross-user retry'
      )
    }
    assert(errorThrown, 'AuthorizationError must be thrown on unauthorized retry attempt')
  })

  // -------------------------------------------------------------
  // TEST 6: Execution and Error Handling on Retries
  // -------------------------------------------------------------
  await test('6. Retrying non-existent items fails gracefully', async () => {
    await authService.login('admin', 'admin123')
    let failed = false
    try {
      await syncTransparencyService.retryItem('non_existent_item_id')
    } catch {
      failed = true
    }
    assert(failed, "Should throw error when item ID doesn't exist in the database")
  })

  console.log(`\nPhase C1 Test Summary: ${passed} passed, ${failed} failed.\n`)
  if (failed > 0) {
    throw new Error(`Sync Transparency Dashboard Tests failed with ${failed} errors.`)
  }
}
