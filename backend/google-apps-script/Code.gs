/**
 * Guru Offline - Google Apps Script Backend API
 * Production Code for Google Sheets Integration
 * SMK NU Ungaran
 */

/**
 * Main Web App POST Entry Point
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        operationId: 'unknown',
        entityId: 'unknown',
        entityType: 'MASTER',
        message: 'Request body kosong atau tidak valid.',
        errorCode: 'INVALID_PAYLOAD',
        isRetryable: false,
        syncedAt: new Date().toISOString()
      });
    }

    var requestData = JSON.parse(e.postData.contents);
    var response = processSyncMutation(requestData);
    return createJsonResponse(response);
  } catch (err) {
    return createJsonResponse({
      success: false,
      operationId: 'unknown',
      entityId: 'unknown',
      entityType: 'MASTER',
      message: 'Server Error: ' + (err.message || err.toString()),
      errorCode: 'SERVER_ERROR',
      isRetryable: true,
      syncedAt: new Date().toISOString()
    });
  }
}

/**
 * Health Check GET Entry Point
 */
function doGet(e) {
  return createJsonResponse({
    status: 'OK',
    service: 'Guru Offline Apps Script Backend',
    school: 'SMK NU Ungaran',
    timestamp: new Date().toISOString()
  });
}

/**
 * Helper to build JSON HTTP response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Core Mutation Router & Validation Logic
 */
function processSyncMutation(req) {
  var nowIso = new Date().toISOString();

  // 1. Basic Payload Validation
  if (!req || !req.operationId || !req.entityType || !req.entityId || !req.teacherId || !req.payload) {
    return {
      success: false,
      operationId: req ? (req.operationId || 'invalid') : 'invalid',
      entityId: req ? (req.entityId || 'invalid') : 'invalid',
      entityType: req ? (req.entityType || 'MASTER') : 'MASTER',
      message: 'Data request tidak lengkap. OperationId, entityType, entityId, teacherId, dan payload wajib ada.',
      errorCode: 'INVALID_PAYLOAD',
      isRetryable: false,
      syncedAt: nowIso
    };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var syncLogSheet = getOrCreateSheet(ss, 'Sync_Queue', [
    'operationId', 'entityType', 'entityId', 'operation', 'teacherId', 'status', 'responseJson', 'createdAt', 'syncedAt'
  ]);

  // 2. IDEMPOTENCY CHECK
  var existingLog = findRowByValue(syncLogSheet, 1, req.operationId);
  if (existingLog) {
    var savedResponseJson = existingLog[7];
    if (savedResponseJson) {
      try {
        var parsedSaved = JSON.parse(savedResponseJson);
        return parsedSaved;
      } catch (pErr) {
        // Fallback if log parse fails
      }
    }
    return {
      success: true,
      operationId: req.operationId,
      entityId: req.entityId,
      entityType: req.entityType,
      message: 'Operasi sudah pernah diproses sebelumnya (Idempotent).',
      syncedAt: existingLog[8] || nowIso
    };
  }

  // 3. TEACHER AUTHORIZATION VALIDATION
  var teacherCheck = validateTeacherAuthorization(ss, req.teacherId, req.entityType, req.payload);
  if (!teacherCheck.authorized) {
    var authErrorResponse = {
      success: false,
      operationId: req.operationId,
      entityId: req.entityId,
      entityType: req.entityType,
      message: teacherCheck.message,
      errorCode: 'UNAUTHORIZED',
      isRetryable: false,
      syncedAt: nowIso
    };
    recordSyncLog(syncLogSheet, req, 'FAILED', authErrorResponse, nowIso);
    return authErrorResponse;
  }

  // 4. ENTITY RELATIONSHIP & DOMAIN VALIDATION
  var domainCheck = validateDomainMutation(ss, req.entityType, req.payload);
  if (!domainCheck.valid) {
    var domainErrorResponse = {
      success: false,
      operationId: req.operationId,
      entityId: req.entityId,
      entityType: req.entityType,
      message: domainCheck.message,
      errorCode: domainCheck.errorCode || 'INVALID_PAYLOAD',
      isRetryable: false,
      syncedAt: nowIso
    };
    recordSyncLog(syncLogSheet, req, 'FAILED', domainErrorResponse, nowIso);
    return domainErrorResponse;
  }

  // 5. EXECUTE SHEET PERSISTENCE
  try {
    if (req.entityType === 'ATTENDANCE') {
      persistAttendance(ss, req.payload);
    } else if (req.entityType === 'JOURNAL') {
      persistJournal(ss, req.payload);
    } else if (req.entityType === 'ASSESSMENT') {
      persistAssessment(ss, req.payload);
    } else {
      throw new Error('Tipe entity tidak didukung: ' + req.entityType);
    }

    var successResponse = {
      success: true,
      operationId: req.operationId,
      entityId: req.entityId,
      entityType: req.entityType,
      message: 'Data berhasil tersimpan ke Google Sheets.',
      syncedAt: nowIso
    };

    recordSyncLog(syncLogSheet, req, 'SYNCED', successResponse, nowIso);
    return successResponse;
  } catch (err) {
    var execErrorResponse = {
      success: false,
      operationId: req.operationId,
      entityId: req.entityId,
      entityType: req.entityType,
      message: 'Gagal menulis ke Google Sheets: ' + (err.message || err.toString()),
      errorCode: 'SERVER_ERROR',
      isRetryable: true,
      syncedAt: nowIso
    };
    recordSyncLog(syncLogSheet, req, 'FAILED', execErrorResponse, nowIso);
    return execErrorResponse;
  }
}

/**
 * Validate Teacher Identity and Active Status
 */
function validateTeacherAuthorization(ss, teacherId, entityType, payload) {
  var teachersSheet = ss.getSheetByName('Teachers');
  if (teachersSheet) {
    var teacherRow = findRowByValue(teachersSheet, 1, teacherId);
    if (!teacherRow) {
      return { authorized: false, message: 'Akses ditolak. Data Guru tidak ditemukan di master data.' };
    }
    // Check status if column 5 exists
    var status = teacherRow[4];
    if (status && status !== 'ACTIVE') {
      return { authorized: false, message: 'Akses ditolak. Akun Guru dalam status tidak aktif.' };
    }
  }

  // Validate schedule ownership if payload has scheduleId
  if (payload && payload.scheduleId) {
    var schedulesSheet = ss.getSheetByName('Schedules');
    var assignmentsSheet = ss.getSheetByName('TeacherAssignments');

    if (schedulesSheet && assignmentsSheet) {
      var schedRow = findRowByValue(schedulesSheet, 1, payload.scheduleId);
      if (!schedRow) {
        return { authorized: false, message: 'Jadwal pelajaran tidak ditemukan di master database.' };
      }
      var assignmentId = schedRow[1]; // col 2: teacherAssignmentId
      var asgRow = findRowByValue(assignmentsSheet, 1, assignmentId);
      if (!asgRow || asgRow[1] !== teacherId) { // col 2: teacherId
        return { authorized: false, message: 'Akses ditolak. Anda tidak memiliki hak akses ke jadwal kelas ini.' };
      }
    }
  }

  return { authorized: true };
}

/**
 * Validate Specific Domain Payload Structure
 */
function validateDomainMutation(ss, entityType, payload) {
  if (entityType === 'ATTENDANCE') {
    if (!payload.scheduleId) return { valid: false, message: 'ID Jadwal mengajar wajib diisi.' };
    if (!payload.date) return { valid: false, message: 'Tanggal presensi wajib diisi.' };
    if (!payload.records || !Array.isArray(payload.records) || payload.records.length === 0) {
      return { valid: false, message: 'Daftar presensi siswa tidak boleh kosong.' };
    }
    // Check valid status values
    var validStatuses = ['H', 'I', 'S', 'A', 'T', 'D'];
    for (var i = 0; i < payload.records.length; i++) {
      var r = payload.records[i];
      if (!r.studentId || !r.status || validStatuses.indexOf(r.status) === -1) {
        return { valid: false, message: 'Status presensi siswa "' + r.studentId + '" tidak valid.' };
      }
    }
  } else if (entityType === 'JOURNAL') {
    if (!payload.scheduleId) return { valid: false, message: 'ID Jadwal mengajar wajib diisi.' };
    if (!payload.date) return { valid: false, message: 'Tanggal jurnal wajib diisi.' };
    if (!payload.topic || !payload.topic.trim()) {
      return { valid: false, message: 'Materi / Topik pembelajaran wajib diisi.' };
    }
    if (!payload.activitySummary || !payload.activitySummary.trim()) {
      return { valid: false, message: 'Kegiatan pembelajaran wajib diisi.' };
    }
  } else if (entityType === 'ASSESSMENT') {
    if (!payload.teacherAssignmentId) return { valid: false, message: 'Penugasan guru wajib dipilih.' };
    if (!payload.title || !payload.title.trim()) return { valid: false, message: 'Judul penilaian wajib diisi.' };
    if (!payload.maxScore || isNaN(payload.maxScore) || payload.maxScore <= 0) {
      return { valid: false, message: 'Nilai maksimum harus angka positif.' };
    }
  }
  return { valid: true };
}

/**
 * Write Attendance to "Attendance" Sheet
 */
function persistAttendance(ss, payload) {
  var sheet = getOrCreateSheet(ss, 'Attendance', [
    'id', 'scheduleId', 'date', 'teacherId', 'hadirCount', 'izinCount', 'sakitCount', 'alpaCount', 'recordsJson', 'updatedAt'
  ]);

  var rowIndex = findRowIndexById(sheet, 1, payload.id);
  var recordsJson = JSON.stringify(payload.records || []);
  var summary = calculateAttendanceCounts(payload.records || []);
  var now = new Date().toISOString();

  var rowValues = [
    payload.id,
    payload.scheduleId,
    payload.date,
    payload.teacherId || '',
    summary.hadir,
    summary.izin,
    summary.sakit,
    summary.alpa,
    recordsJson,
    now
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Write Journal to "Journals" Sheet
 */
function persistJournal(ss, payload) {
  var sheet = getOrCreateSheet(ss, 'Journals', [
    'id', 'scheduleId', 'date', 'teacherId', 'topic', 'activitySummary', 'notes', 'studentAttendanceSummaryJson', 'updatedAt'
  ]);

  var rowIndex = findRowIndexById(sheet, 1, payload.id);
  var attSummaryJson = JSON.stringify(payload.studentAttendanceSummary || {});
  var now = new Date().toISOString();

  var rowValues = [
    payload.id,
    payload.scheduleId,
    payload.date,
    payload.teacherId || '',
    payload.topic || '',
    payload.activitySummary || '',
    payload.notes || '',
    attSummaryJson,
    now
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Write Assessment to "Assessments" & "Assessment_Scores" Sheets
 */
function persistAssessment(ss, payload) {
  var asmSheet = getOrCreateSheet(ss, 'Assessments', [
    'id', 'teacherAssignmentId', 'classId', 'type', 'title', 'date', 'maxScore', 'kkm', 'updatedAt'
  ]);

  var now = new Date().toISOString();
  var asmRowIndex = findRowIndexById(asmSheet, 1, payload.id);
  var asmValues = [
    payload.id,
    payload.teacherAssignmentId,
    payload.classId || '',
    payload.type || 'HARIAN',
    payload.title || '',
    payload.date || '',
    payload.maxScore || 100,
    payload.kkm || 75,
    now
  ];

  if (asmRowIndex > 0) {
    asmSheet.getRange(asmRowIndex, 1, 1, asmValues.length).setValues([asmValues]);
  } else {
    asmSheet.appendRow(asmValues);
  }

  // Persist scores if included
  if (payload.scores && Array.isArray(payload.scores)) {
    var scoreSheet = getOrCreateSheet(ss, 'Assessment_Scores', [
      'id', 'assessmentId', 'studentId', 'score', 'feedback', 'updatedAt'
    ]);

    for (var i = 0; i < payload.scores.length; i++) {
      var sc = payload.scores[i];
      var scId = sc.id || (payload.id + '_' + sc.studentId);
      var scRowIndex = findRowIndexById(scoreSheet, 1, scId);
      var scValues = [
        scId,
        payload.id,
        sc.studentId,
        sc.score !== null && sc.score !== undefined ? sc.score : '',
        sc.feedback || '',
        now
      ];

      if (scRowIndex > 0) {
        scoreSheet.getRange(scRowIndex, 1, 1, scValues.length).setValues([scValues]);
      } else {
        scoreSheet.appendRow(scValues);
      }
    }
  }
}

/**
 * Record Idempotency Log Entry
 */
function recordSyncLog(sheet, req, status, response, now) {
  var responseJson = JSON.stringify(response);
  sheet.appendRow([
    req.operationId,
    req.entityType,
    req.entityId,
    req.operation || 'CREATE',
    req.teacherId || '',
    status,
    responseJson,
    req.clientTimestamp || now,
    now
  ]);
}

/**
 * Helper: Find or Create Sheet
 */
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

/**
 * Helper: Find row values by key in column (1-indexed)
 */
function findRowByValue(sheet, colIndex, targetVal) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]) === String(targetVal)) {
      return data[i];
    }
  }
  return null;
}

/**
 * Helper: Find row index by key in column (1-indexed row number)
 */
function findRowIndexById(sheet, colIndex, targetVal) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]) === String(targetVal)) {
      return i + 1;
    }
  }
  return 0;
}

/**
 * Helper: Calculate Hadir, Izin, Sakit, Alpa counts
 */
function calculateAttendanceCounts(records) {
  var counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  for (var i = 0; i < records.length; i++) {
    var st = records[i].status;
    if (st === 'H') counts.hadir++;
    else if (st === 'I') counts.izin++;
    else if (st === 'S') counts.sakit++;
    else if (st === 'A') counts.alpa++;
  }
  return counts;
}
