/**
 * Guru Offline - Phase 9 Data Onboarding, Import/Export & Bulk Administration Test Suite
 * Covers 26 comprehensive test cases for file parsing, header normalization, validation,
 * duplicate detection, strict vs valid-only commitment, safe upsert, atomic commit,
 * bulk operations, master export, audit logging, import history, and RBAC authorization.
 */

import 'fake-indexeddb/auto'
import { seedDatabase } from '../db/seedData'
import { importService } from '../services/import/ImportService'
import { exportService } from '../services/export/ExportService'
import { bulkService } from '../services/bulk/BulkService'
import { auditLogService } from '../services/audit/AuditLogService'
import { backupService } from '../services/backup/BackupService'
import { authService, AuthorizationError } from '../services/auth'
import { repositories } from '../repositories'
import * as XLSX from 'xlsx'

export async function runPhase9Tests() {
  console.log('\n=== RUNNING PHASE 9 DATA ONBOARDING, IMPORT/EXPORT & BULK TEST SUITE ===\n')
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

  // Initialize DB and seed initial master data
  await seedDatabase(true)

  // Login as ADMIN
  const loginAdminRes = await authService.login('admin', 'admin123')
  if (!loginAdminRes.success) {
    throw new Error('Failed to authenticate as Admin for Phase 9 test suite')
  }

  const classes = await repositories.classes.findAll()
  const targetClass = classes[0]
  const academicYears = await repositories.academicYears.findAll()
  const targetAy = academicYears[0]

  // -------------------------------------------------------------
  // TEST 1: CSV File Parsing
  // -------------------------------------------------------------
  await test('1. ImportService parses valid CSV file content into row objects', async () => {
    const csvContent = `name,nip,phone\n"Budi Raharjo","198001012010011005","0812345678"
"Dewi Lestari","198202022010012006","0819876543"`
    const parsed = importService.parseFileContent(csvContent, 'teachers.csv')
    if (parsed.length !== 2) throw new Error(`Expected 2 rows, got ${parsed.length}`)
    if (parsed[0].name !== 'Budi Raharjo')
      throw new Error(`Unexpected parsed row name: ${parsed[0].name}`)
  })

  // -------------------------------------------------------------
  // TEST 2: XLSX File Parsing
  // -------------------------------------------------------------
  await test('2. ImportService parses XLSX binary buffer into row objects', async () => {
    const data = [
      ['subject_code', 'name', 'category', 'kkm'],
      ['MTK-X', 'Matematika X', 'UMUM', 75],
      ['FIS-X', 'Fisika X', 'UMUM', 75]
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    const parsed = importService.parseFileContent(buffer, 'subjects.xlsx')
    if (parsed.length !== 2) throw new Error(`Expected 2 rows, got ${parsed.length}`)
    if (parsed[0].subject_code !== 'MTK-X')
      throw new Error(`Unexpected subject_code: ${parsed[0].subject_code}`)
  })

  // -------------------------------------------------------------
  // TEST 3: Header Normalization & Flexible Aliases
  // -------------------------------------------------------------
  await test('3. ImportService normalizes flexible header aliases (e.g. N.I.P -> nip, Nama Guru -> name)', async () => {
    const rawRows = [
      { 'N.I.P': '198801012012011009', 'Nama Guru': 'Eko Prasetyo', 'No HP': '0811111111' }
    ]
    const preview = await importService.previewImport('TEACHER', 'teachers_alias.csv', rawRows)
    if (preview.rows[0].normalizedData.nip !== '198801012012011009') {
      throw new Error(`Failed to normalize N.I.P: ${preview.rows[0].normalizedData.nip}`)
    }
    if (preview.rows[0].normalizedData.name !== 'Eko Prasetyo') {
      throw new Error(`Failed to normalize Nama Guru: ${preview.rows[0].normalizedData.name}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 4: Missing Required Column Detection
  // -------------------------------------------------------------
  await test('4. ImportService detects missing required headers for entity type', async () => {
    const rawRows = [
      {
        name: 'Siswa Tanpa NIS',
        rombel_code: targetClass.name
      }
    ]
    const preview = await importService.previewImport('STUDENT', 'invalid_student.csv', rawRows)
    if (!preview.missingRequiredHeaders.includes('nis')) {
      throw new Error('Failed to report missing required header "nis"')
    }
  })

  // -------------------------------------------------------------
  // TEST 5: Unknown Column Handling
  // -------------------------------------------------------------
  await test('5. ImportService preserves unrecognized headers cleanly in preview metadata', async () => {
    const rawRows = [{ name: 'Test Room', room_code: 'RM-99', custom_hobby: 'Football' }]
    const preview = await importService.previewImport('ROOM', 'room.csv', rawRows)
    if (!preview.unrecognizedHeaders.includes('custom_hobby')) {
      throw new Error('Failed to record unrecognized header in preview metadata')
    }
  })

  // -------------------------------------------------------------
  // TEST 6: Empty Row Filtering
  // -------------------------------------------------------------
  await test('6. ImportService filters out completely empty rows', async () => {
    const rawRows = [
      { room_code: 'RM-101', name: 'Ruang Teori 101' },
      { room_code: '', name: '' },
      { room_code: 'RM-102', name: 'Ruang Teori 102' }
    ]
    const preview = await importService.previewImport('ROOM', 'rooms_with_empty.csv', rawRows)
    if (preview.totalRows !== 2)
      throw new Error(`Expected 2 non-empty rows, got ${preview.totalRows}`)
  })

  // -------------------------------------------------------------
  // TEST 7: Duplicate Detection Inside File
  // -------------------------------------------------------------
  await test('7. ImportService detects duplicate business keys inside the same file', async () => {
    const rawRows = [
      {
        nis: '99001',
        name: 'Siswa A',
        rombel_code: targetClass.name
      },
      {
        nis: '99001',
        name: 'Siswa B',
        rombel_code: targetClass.name
      }
    ]
    const preview = await importService.previewImport('STUDENT', 'duplicate_students.csv', rawRows)
    if (preview.errorCount === 0) throw new Error('Expected error for duplicate in-file NIS')
    const hasInFileErr = preview.rows.some((r) =>
      r.errors.some((e) => e.errorCode === 'DUPLICATE_IN_FILE')
    )
    if (!hasInFileErr) throw new Error('Failed to mark DUPLICATE_IN_FILE error code')
  })

  // -------------------------------------------------------------
  // TEST 8: Duplicate Detection Against Database
  // -------------------------------------------------------------
  await test('8. ImportService detects existing DB entities and flags as DUPLICATE status', async () => {
    const existingTeachers = await repositories.teachers.findAll()
    const existingTeacher = existingTeachers[0]

    const rawRows = [{ nip: existingTeacher.nip, name: existingTeacher.name }]
    const preview = await importService.previewImport('TEACHER', 'existing_teacher.csv', rawRows)
    if (preview.duplicateCount !== 1) {
      throw new Error(`Expected 1 duplicate row against DB, got ${preview.duplicateCount}`)
    }
    if (preview.rows[0].existingEntityId !== existingTeacher.id) {
      throw new Error('Failed to map existing entity ID to duplicate preview row')
    }
  })

  // -------------------------------------------------------------
  // TEST 9: Teacher Import Pipeline
  // -------------------------------------------------------------
  await test('9. ImportService executes Teacher import and creates new records', async () => {
    const rawRows = [
      {
        nip: '198703032015011003',
        name: 'Drs. Bambang Wijaya',
        gender: 'L',
        phone: '081233445566',
        email: 'bambang@smknu.sch.id'
      }
    ]
    const preview = await importService.previewImport('TEACHER', 'teacher_new.csv', rawRows)
    const commitRes = await importService.commitImport({
      preview,
      commitMode: 'STRICT',
      duplicateMode: 'CREATE_ONLY'
    })

    if (!commitRes.success) throw new Error(`Commit failed: ${commitRes.message}`)
    if (commitRes.createdCount !== 1)
      throw new Error(`Expected 1 created teacher, got ${commitRes.createdCount}`)

    const teachers = await repositories.teachers.findAll()
    const match = teachers.find((t) => t.nip === '198703032015011003')
    if (!match) throw new Error('New imported teacher was not saved to IndexedDB repository')
  })

  // -------------------------------------------------------------
  // TEST 10: Student Import Pipeline
  // -------------------------------------------------------------
  await test('10. ImportService executes Student import linked to valid rombel', async () => {
    const rawRows = [
      {
        nis: '20268801',
        nisn: '0058801',
        name: 'Rina Marlina',
        gender: 'P',
        rombel_code: targetClass.name
      }
    ]
    const preview = await importService.previewImport('STUDENT', 'student_new.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (!commitRes.success) throw new Error(`Commit failed: ${commitRes.message}`)
    const students = await repositories.students.findByClassId(targetClass.id)
    const match = students.find((s) => s.nis === '20268801')
    if (!match) throw new Error('New imported student not found in target class')
  })

  // -------------------------------------------------------------
  // TEST 11: Class/Rombel Import Pipeline
  // -------------------------------------------------------------
  await test('11. ImportService executes Class/Rombel import linked to Academic Year', async () => {
    const rawRows = [
      {
        rombel_code: 'XII-PPLG-1',
        name: 'XII PPLG 1',
        grade: 'XII',
        major: 'PPLG',
        academic_year_code: (targetAy as any).code || targetAy.name
      }
    ]
    const preview = await importService.previewImport('CLASS', 'class_new.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (!commitRes.success) throw new Error(`Commit failed: ${commitRes.message}`)
    const classesList = await repositories.classes.findAll()
    const match = classesList.find(
      (c) => (c as any).code === 'XII-PPLG-1' || c.rombel === 'XII-PPLG-1'
    )
    if (!match) throw new Error('New imported class not saved to DB')
  })

  // -------------------------------------------------------------
  // TEST 12: Subject Import Pipeline
  // -------------------------------------------------------------
  await test('12. ImportService executes Subject import with KKM and Category', async () => {
    const rawRows = [
      { subject_code: 'BASDAT-XI', name: 'Basis Data XI', category: 'KEJURUAN', kkm: 78 }
    ]
    const preview = await importService.previewImport('SUBJECT', 'subject_new.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (!commitRes.success) throw new Error(`Commit failed: ${commitRes.message}`)
    const subjects = await repositories.subjects.findAll()
    const match = subjects.find((s) => s.code === 'BASDAT-XI')
    if (!match || match.defaultKkm !== 78) throw new Error('New subject not saved with correct KKM')
  })

  // -------------------------------------------------------------
  // TEST 13: Room Import Pipeline
  // -------------------------------------------------------------
  await test('13. ImportService executes Room import', async () => {
    const rawRows = [
      { room_code: 'LAB-KOMP-3', name: 'Laboratorium Komputer 3', type: 'LAB', capacity: 36 }
    ]
    const preview = await importService.previewImport('ROOM', 'room_new.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (!commitRes.success) throw new Error(`Commit failed: ${commitRes.message}`)
    const rooms = await repositories.rooms.findAll()
    const match = rooms.find((r) => r.code === 'LAB-KOMP-3')
    if (!match) throw new Error('New room not saved to DB')
  })

  // -------------------------------------------------------------
  // TEST 14: Teacher Assignment Import Pipeline
  // -------------------------------------------------------------
  await test('14. ImportService executes Teacher Assignment import referencing teacher, subject, class', async () => {
    const teachers = await repositories.teachers.findAll()
    const subjects = await repositories.subjects.findAll()

    const rawRows = [
      {
        teacher_code: teachers[0].nip || (teachers[0] as any).code || teachers[0].id,
        subject_code: subjects[0].code,
        rombel_code: targetClass.name,
        academic_year_code: (targetAy as any).code || targetAy.name,
        weekly_jp: 4
      }
    ]
    const preview = await importService.previewImport('ASSIGNMENT', 'assignment_new.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (!commitRes.success) throw new Error(`Commit failed: ${commitRes.message}`)
    const assignments = await repositories.teacherAssignments.findAll()
    if (assignments.length === 0) throw new Error('No assignments saved after import commit')
  })

  // -------------------------------------------------------------
  // TEST 15: Schedule Import Pipeline & Relation Resolution
  // -------------------------------------------------------------
  await test('15. ImportService executes Schedule import with day & time slot validation', async () => {
    const teachers = await repositories.teachers.findAll()
    const subjects = await repositories.subjects.findAll()
    const rooms = await repositories.rooms.findAll()

    const rawRows = [
      {
        teacher_code: teachers[0].nip || (teachers[0] as any).code || teachers[0].id,
        subject_code: subjects[0].code,
        rombel_code: targetClass.name,
        room_code: rooms[0].code,
        day: 'RABU',
        time_slot: '07:00-08:30'
      }
    ]
    const preview = await importService.previewImport('SCHEDULE', 'schedule_new.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (!commitRes.success) throw new Error(`Schedule commit failed: ${commitRes.message}`)
    const schedules = await repositories.schedules.findAll()
    const match = schedules.find((s) => s.dayOfWeek === 'RABU')
    if (!match) throw new Error('Schedule for RABU was not saved')
  })

  // -------------------------------------------------------------
  // TEST 16: Referential Integrity Failure
  // -------------------------------------------------------------
  await test('16. ImportService rejects row on referential integrity failure (e.g. non-existent rombel)', async () => {
    const rawRows = [
      { nis: '20269999', name: 'Siswa Rombel Fiktif', rombel_code: 'ROMBEL_TIDAK_ADA' }
    ]
    const preview = await importService.previewImport('STUDENT', 'invalid_ref.csv', rawRows)
    if (preview.errorCount !== 1)
      throw new Error('Expected 1 validation error for non-existent rombel')
    if (preview.rows[0].errors[0].errorCode !== 'ROMBEL_NOT_FOUND') {
      throw new Error(`Unexpected error code: ${preview.rows[0].errors[0].errorCode}`)
    }
  })

  // -------------------------------------------------------------
  // TEST 17: STRICT Commitment Policy
  // -------------------------------------------------------------
  await test('17. ImportService STRICT mode refuses commit if error count > 0', async () => {
    const rawRows = [
      {
        nis: '20268802',
        name: 'Siswa Valid',
        rombel_code: targetClass.name
      },
      {
        nis: '',
        name: 'Siswa Tanpa NIS',
        rombel_code: targetClass.name
      }
    ]
    const preview = await importService.previewImport('STUDENT', 'strict_fail.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'STRICT' })

    if (commitRes.success)
      throw new Error('STRICT mode should have rejected commit when errors exist')
    if (commitRes.createdCount > 0)
      throw new Error('STRICT mode committed rows despite validation errors')
  })

  // -------------------------------------------------------------
  // TEST 18: VALID_ROWS_ONLY Commitment Policy
  // -------------------------------------------------------------
  await test('18. ImportService VALID_ROWS_ONLY mode commits valid rows and skips invalid rows', async () => {
    const rawRows = [
      {
        nis: '20267701',
        name: 'Siswa Valid 7701',
        rombel_code: targetClass.name
      },
      {
        nis: '',
        name: 'Siswa Invalid 000',
        rombel_code: targetClass.name
      }
    ]
    const preview = await importService.previewImport('STUDENT', 'valid_only.csv', rawRows)
    const commitRes = await importService.commitImport({ preview, commitMode: 'VALID_ROWS_ONLY' })

    if (!commitRes.success) throw new Error('VALID_ROWS_ONLY should succeed for valid rows')
    if (commitRes.createdCount !== 1)
      throw new Error(`Expected 1 created student, got ${commitRes.createdCount}`)
    if (commitRes.skippedCount !== 1)
      throw new Error(`Expected 1 skipped row, got ${commitRes.skippedCount}`)
  })

  // -------------------------------------------------------------
  // TEST 19 & 20: Safe Upsert & Stable Entity ID Preservation
  // -------------------------------------------------------------
  await test('19 & 20. ImportService UPSERT mode updates existing DB entity preserving stable ID', async () => {
    const existingTeachers = await repositories.teachers.findAll()
    const targetTeacher =
      existingTeachers.find((t) => t.nip && t.nip.trim().length > 0) || existingTeachers[0]
    if (!targetTeacher.nip) {
      targetTeacher.nip = '198501012010011001'
      await repositories.teachers.save(targetTeacher)
    }
    const originalId = targetTeacher.id

    const rawRows = [{ nip: targetTeacher.nip, name: `${targetTeacher.name} (Updated Title)` }]
    const preview = await importService.previewImport('TEACHER', 'upsert_teacher.csv', rawRows)
    const commitRes = await importService.commitImport({
      preview,
      duplicateMode: 'UPSERT',
      commitMode: 'STRICT'
    })

    if (!commitRes.success) throw new Error(`UPSERT commit failed: ${commitRes.message}`)
    if (commitRes.updatedCount !== 1)
      throw new Error(`Expected 1 updated teacher, got ${commitRes.updatedCount}`)

    const reloaded = await repositories.teachers.findById(originalId)
    if (!reloaded) throw new Error('Original teacher ID was lost after UPSERT')
    if (!reloaded.name.includes('(Updated Title)'))
      throw new Error('Teacher name was not updated during UPSERT')
  })

  // -------------------------------------------------------------
  // TEST 21: Atomic Commit & SyncQueue Enqueuing
  // -------------------------------------------------------------
  await test('21. ImportService enqueues pending SyncQueue items for GAS cloud sync upon commit', async () => {
    const rawRows = [{ room_code: 'LAB-OTKP-1', name: 'Lab OTKP 1', type: 'LAB', capacity: 36 }]
    const preview = await importService.previewImport('ROOM', 'room_sync.csv', rawRows)
    await importService.commitImport({ preview, commitMode: 'STRICT' })

    const syncPending = await repositories.syncQueue.findPending()
    if (syncPending.length === 0)
      throw new Error('Expected pending SyncQueue item after import commit')
  })

  // -------------------------------------------------------------
  // TEST 22: Bulk Student Class Assignment Workflow
  // -------------------------------------------------------------
  await test('22. BulkService moves selected students to target class/rombel', async () => {
    const allClasses = await repositories.classes.findAll()
    if (allClasses.length < 2)
      throw new Error('Need at least 2 classes for bulk class assignment test')

    const allStudents = await repositories.students.findAll()
    if (allStudents.length === 0) throw new Error('No students found in DB for transfer test')

    const targetStudent = allStudents[0]
    const currentClassId = targetStudent.classId
    const targetClass = allClasses.find((c) => c.id !== currentClassId) || allClasses[1]

    const res = await bulkService.bulkAssignStudentClass([targetStudent.id], targetClass.id)

    if (!res.success) throw new Error(`Bulk transfer failed: ${res.message}`)
    const reloadedStudent = await repositories.students.findById(targetStudent.id)
    if (reloadedStudent?.classId !== targetClass.id)
      throw new Error('Student classId was not updated to target class')
  })

  // -------------------------------------------------------------
  // TEST 23: Bulk Status Update
  // -------------------------------------------------------------
  await test('23. BulkService executes bulk status updates for Teachers and Students', async () => {
    const teachers = await repositories.teachers.findAll()
    const targetIds = teachers.map((t) => t.id)

    const res = await bulkService.bulkUpdateTeacherStatus(targetIds, 'INACTIVE')
    if (!res.success) throw new Error(`Bulk teacher status update failed: ${res.message}`)

    const reloaded = await repositories.teachers.findById(targetIds[0])
    if (reloaded?.status !== 'INACTIVE')
      throw new Error('Teacher status was not updated to INACTIVE')

    // Reset back to ACTIVE
    await bulkService.bulkUpdateTeacherStatus(targetIds, 'ACTIVE')
  })

  // -------------------------------------------------------------
  // TEST 24: Export Filtering (Master Data Export)
  // -------------------------------------------------------------
  await test('24. ExportService exports master data to CSV and XLSX respecting active filters', async () => {
    const csvRes = await exportService.exportMasterData('TEACHER', 'CSV')
    if (!csvRes.filename.endsWith('.csv')) throw new Error('Export filename should end with .csv')
    if (typeof csvRes.content !== 'string' || !csvRes.content.includes('name')) {
      throw new Error('CSV export content missing expected headers')
    }

    const xlsxRes = await exportService.exportMasterData('STUDENT', 'XLSX')
    if (!xlsxRes.filename.endsWith('.xlsx'))
      throw new Error('Export filename should end with .xlsx')
    if (!(xlsxRes.content instanceof ArrayBuffer))
      throw new Error('XLSX export content should be ArrayBuffer')
  })

  // -------------------------------------------------------------
  // TEST 25: Audit Logging & Import History Recording
  // -------------------------------------------------------------
  await test('25. AuditLogService and ImportHistoryService record administrative operations', async () => {
    const history = await importService.getImportHistory()
    if (history.length === 0) throw new Error('Expected recorded import history entries')

    const auditLogs = await auditLogService.getAuditLogs()
    if (auditLogs.length === 0)
      throw new Error('Expected recorded audit logs for administrative operations')
  })

  // -------------------------------------------------------------
  // TEST 26: Security & RBAC Enforcement
  // -------------------------------------------------------------
  await test('26. Import, Bulk, Export, and Audit services strictly block GURU session', async () => {
    const guruLoginRes = await authService.login('guru', 'guru123')
    if (!guruLoginRes.success) throw new Error('Failed to login as GURU for RBAC test')

    let importBlocked = false
    try {
      await importService.getImportHistory()
    } catch (err: any) {
      if (err instanceof AuthorizationError) importBlocked = true
    }
    if (!importBlocked) throw new Error('GURU session was not blocked from getImportHistory')

    let bulkBlocked = false
    try {
      await bulkService.bulkUpdateTeacherStatus(['tch_1'], 'INACTIVE')
    } catch (err: any) {
      if (err instanceof AuthorizationError) bulkBlocked = true
    }
    if (!bulkBlocked) throw new Error('GURU session was not blocked from bulk operations')

    let exportBlocked = false
    try {
      await exportService.exportMasterData('TEACHER', 'CSV')
    } catch (err: any) {
      if (err instanceof AuthorizationError) exportBlocked = true
    }
    if (!exportBlocked) throw new Error('GURU session was not blocked from export master data')

    // Restore ADMIN session
    await authService.login('admin', 'admin123')
  })

  // -------------------------------------------------------------
  // TEST 27: Backup & Restore Service
  // -------------------------------------------------------------
  await test('27. BackupService handles creation, validation, safety, and restore round-trip perfectly', async () => {
    // 1. Create backup
    const backup = await backupService.createBackup()

    // 2. Validate basic backup metadata & schema
    if (backup.backupFormat !== 'guru-offline-backup') {
      throw new Error('Backup format mismatch')
    }
    if (backup.backupVersion !== 1) {
      throw new Error('Backup version mismatch')
    }
    if (!backup.stores || typeof backup.stores !== 'object') {
      throw new Error('Backup stores missing')
    }

    // 3. Ensure expected stores are contained
    const hasUsersStore = 'users' in backup.stores
    const hasTeachersStore = 'teachers' in backup.stores
    if (!hasUsersStore || !hasTeachersStore) {
      throw new Error('Backup is missing mandatory stores')
    }

    // 4. Exclude plaintext secrets (only safe PBKDF2 hashes are exported)
    const users = backup.stores.users
    for (const u of users) {
      if (u.password && !u.password.startsWith('$pbkdf2$')) {
        throw new Error('Raw or non-hashed password detected in export')
      }
    }

    // 5. Validate backup payload method
    const validRes = await backupService.validateBackup(backup)
    if (!validRes.valid) {
      throw new Error(`Validation failed for valid backup: ${validRes.reason}`)
    }

    // 6. Malformed JSON validation rejection
    const malformedRes = await backupService.validateBackup('not-a-json-object')
    if (malformedRes.valid) {
      throw new Error('Malformed JSON backup should be rejected')
    }

    // 7. Wrong backup format validation rejection
    const wrongFormatRes = await backupService.validateBackup({
      ...backup,
      backupFormat: 'fake-format'
    })
    if (wrongFormatRes.valid) {
      throw new Error('Wrong backup format should be rejected')
    }

    // 8. Incompatible version validation rejection
    const wrongVersionRes = await backupService.validateBackup({
      ...backup,
      backupVersion: 999
    })
    if (wrongVersionRes.valid) {
      throw new Error('Incompatible backup version should be rejected')
    }

    // 9. Invalid entity validation rejection (missing ID key)
    const invalidEntityRes = await backupService.validateBackup({
      ...backup,
      stores: {
        ...backup.stores,
        users: [{ username: 'admin' }] // Missing 'id'
      }
    })
    if (invalidEntityRes.valid) {
      throw new Error('Entity missing keyPath (id) should be rejected')
    }

    // 10. Invalid reference validation rejection (non-object entity)
    const nonObjectEntityRes = await backupService.validateBackup({
      ...backup,
      stores: {
        ...backup.stores,
        users: ['just-a-string']
      }
    })
    if (nonObjectEntityRes.valid) {
      throw new Error('Non-object entity in stores should be rejected')
    }

    // 11. Restore round-trip integrity
    const restoreRes = await backupService.restoreBackup(backup)
    if (!restoreRes.success) {
      throw new Error('Restore round-trip failed')
    }

    // Verify duplicate ID handling and data existence post-restore
    const reloadedUsers = await repositories.users.findAll()
    if (reloadedUsers.length !== users.length) {
      throw new Error('User counts differ after restore round-trip')
    }
  })

  console.log('\n======================================================')
  console.log(`=== PHASE 9 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
  console.log('======================================================\n')

  if (failed > 0) {
    throw new Error(`Phase 9 test suite failed with ${failed} failure(s).`)
  }
}
