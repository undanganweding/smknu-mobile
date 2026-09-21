/**
 * Guru Offline - Google Workspace Integration Service
 * Native REST API connection to Google Sheets, Google Drive, Gmail, Docs, Calendar, and Forms.
 * Preserves stable IDs, authorization boundaries, and offline-first SyncQueue engine.
 */

import { initializeApp, getApp, getApps } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import firebaseConfig from '../../../../firebase-applet-config.json'

// Scopes requested by user and authorized via metadata
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/forms.responses.readonly'
]

export interface WorkspaceConfig {
  spreadsheetId?: string
  isMockMode?: boolean
}

export class GoogleWorkspaceService {
  private static instance: GoogleWorkspaceService | null = null
  private auth: any = null
  private cachedToken: string | null = null
  private currentUser: User | null = null
  private isSigningIn = false
  private config: WorkspaceConfig = {
    isMockMode: false
  }

  // Local storage cache keys
  private readonly SPREADSHEET_ID_KEY = 'guru_offline_workspace_ss_id'

  private constructor() {
    this.initializeFirebase()
    this.loadSpreadsheetId()
  }

  public static getInstance(): GoogleWorkspaceService {
    if (!GoogleWorkspaceService.instance) {
      GoogleWorkspaceService.instance = new GoogleWorkspaceService()
    }
    return GoogleWorkspaceService.instance
  }

  /**
   * Safe Firebase App initialization to avoid duplicate initializations
   */
  private initializeFirebase(): void {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
      this.auth = getAuth(app)
    } catch (err) {
      console.error('[GoogleWorkspaceService] Firebase Auth init error:', err)
    }
  }

  private loadSpreadsheetId(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.SPREADSHEET_ID_KEY)
      if (saved) {
        this.config.spreadsheetId = saved
      }
    }
  }

  public setSpreadsheetId(id: string): void {
    this.config.spreadsheetId = id
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.SPREADSHEET_ID_KEY, id)
    }
  }

  public getSpreadsheetId(): string | undefined {
    return this.config.spreadsheetId
  }

  public setMockMode(enabled: boolean): void {
    this.config.isMockMode = enabled
  }

  public isEnabled(): boolean {
    return !!this.cachedToken || this.config.isMockMode === true
  }

  public getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Initialize Auth Observer on startup
   */
  public initAuthObserver(
    onSuccess?: (user: User, token: string) => void,
    onFailure?: () => void
  ): () => void {
    if (!this.auth) {
      if (onFailure) onFailure()
      return () => {}
    }
    return onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user
      if (user && this.cachedToken) {
        if (onSuccess) onSuccess(user, this.cachedToken)
      } else {
        if (!this.isSigningIn) {
          this.cachedToken = null
          this.currentUser = null
          if (onFailure) onFailure()
        }
      }
    })
  }

  /**
   * Native Sign-In Popup to fetch OAuth Credentials safely
   */
  public async signIn(): Promise<{ user: User; token: string }> {
    if (this.config.isMockMode) {
      this.cachedToken = 'mock-oauth-token-12345'
      return {
        user: { email: 'syifa.anjay@gmail.com', displayName: 'Mock User' } as User,
        token: this.cachedToken
      }
    }

    if (!this.auth) {
      throw new Error('Firebase Auth is not initialized.')
    }

    try {
      this.isSigningIn = true
      const provider = new GoogleAuthProvider()
      WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope))

      const result = await signInWithPopup(this.auth, provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (!credential?.accessToken) {
        throw new Error('OAuth access token could not be obtained.')
      }

      this.cachedToken = credential.accessToken
      this.currentUser = result.user
      return { user: result.user, token: this.cachedToken }
    } catch (err: any) {
      console.error('[GoogleWorkspaceService] OAuth Sign-In failed:', err)
      throw err
    } finally {
      this.isSigningIn = false
    }
  }

  public async logout(): Promise<void> {
    this.cachedToken = null
    this.currentUser = null
    if (this.auth) {
      await signOut(this.auth)
    }
  }

  public getAccessToken(): string | null {
    return this.cachedToken
  }

  /**
   * Perform direct REST API calls using client-side fetch + Bearer Token
   */
  private async callGoogleAPI(
    url: string,
    method: string = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<any> {
    if (this.config.isMockMode) {
      return { success: true, message: 'Mock API call' }
    }

    const token = this.getAccessToken()
    if (!token) {
      throw new Error('Sesi Google belum terhubung. Silakan sambungkan akun Google Anda.')
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.cachedToken = null
        this.currentUser = null
      }
      const errorText = await response.text()
      throw new Error(`Google API Error ${response.status}: ${errorText || response.statusText}`)
    }

    return response.json()
  }

  /**
   * 1. GOOGLE SHEETS — Auto-discover or Create Centralized Spreadsheet
   */
  public async ensureSpreadsheet(): Promise<string> {
    if (this.config.spreadsheetId) {
      return this.config.spreadsheetId
    }

    if (this.config.isMockMode) {
      const mockId = 'mock-spreadsheet-id-12345'
      this.setSpreadsheetId(mockId)
      return mockId
    }

    console.log('[GoogleWorkspaceService] Searching for spreadsheet in Drive...')
    const query = encodeURIComponent(
      "name = 'Guru_Offline_Database_SMK_NU_Ungaran' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false"
    )
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`
    const searchRes = await this.callGoogleAPI(searchUrl)

    if (searchRes.files && searchRes.files.length > 0) {
      const existingId = searchRes.files[0].id
      console.log('[GoogleWorkspaceService] Found existing spreadsheet:', existingId)
      this.setSpreadsheetId(existingId)
      return existingId
    }

    console.log('[GoogleWorkspaceService] Spreadsheet not found. Creating a new one...')
    const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets'
    const payload = {
      properties: {
        title: 'Guru_Offline_Database_SMK_NU_Ungaran'
      },
      sheets: [
        { properties: { title: 'Sync_Queue' } },
        { properties: { title: 'Teachers' } },
        { properties: { title: 'TeacherAssignments' } },
        { properties: { title: 'Rombels' } },
        { properties: { title: 'Students' } },
        { properties: { title: 'Schedules' } },
        { properties: { title: 'Attendance' } },
        { properties: { title: 'Journals' } },
        { properties: { title: 'Assessments' } },
        { properties: { title: 'Assessment_Scores' } },
        { properties: { title: 'Users' } },
        { properties: { title: 'Audit' } }
      ]
    }

    const createRes = await this.callGoogleAPI(createUrl, 'POST', payload)
    const newId = createRes.spreadsheetId
    console.log('[GoogleWorkspaceService] New Spreadsheet created successfully:', newId)
    this.setSpreadsheetId(newId)

    // Initialize headers for worksheets
    await this.initializeSheetHeaders(newId)

    return newId
  }

  private async initializeSheetHeaders(spreadsheetId: string): Promise<void> {
    const headersMap: Record<string, string[]> = {
      Sync_Queue: [
        'operationId',
        'entityType',
        'entityId',
        'operation',
        'teacherId',
        'status',
        'responseJson',
        'createdAt',
        'syncedAt'
      ],
      Teachers: ['id', 'nip', 'nuptk', 'name', 'position', 'status', 'createdAt', 'updatedAt'],
      TeacherAssignments: [
        'id',
        'code',
        'teacherId',
        'subjectId',
        'classId',
        'hours',
        'createdAt',
        'updatedAt'
      ],
      Rombels: ['id', 'name', 'gradeLevel', 'major', 'homeroomTeacherId', 'createdAt', 'updatedAt'],
      Students: ['id', 'nis', 'name', 'classId', 'status', 'createdAt', 'updatedAt'],
      Schedules: [
        'id',
        'classId',
        'teacherAssignmentId',
        'dayOfWeek',
        'periodStart',
        'periodEnd',
        'roomId',
        'createdAt',
        'updatedAt'
      ],
      Attendance: [
        'id',
        'scheduleId',
        'date',
        'teacherId',
        'academicYearId',
        'semester',
        'isSubmitted',
        'submittedAt',
        'createdAt',
        'updatedAt'
      ],
      Journals: [
        'id',
        'scheduleId',
        'date',
        'teacherId',
        'topic',
        'activities',
        'notes',
        'absentStudentsCount',
        'createdAt',
        'updatedAt'
      ],
      Assessments: [
        'id',
        'teacherAssignmentId',
        'name',
        'type',
        'kkm',
        'weight',
        'academicYearId',
        'semester',
        'date',
        'createdAt',
        'updatedAt'
      ],
      Assessment_Scores: [
        'id',
        'assessmentId',
        'studentId',
        'score',
        'notes',
        'createdAt',
        'updatedAt'
      ],
      Users: [
        'id',
        'username',
        'passwordHash',
        'role',
        'teacherId',
        'status',
        'createdAt',
        'updatedAt'
      ],
      Audit: ['id', 'userId', 'role', 'action', 'details', 'timestamp']
    }

    for (const [sheetName, headers] of Object.entries(headersMap)) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z1?valueInputOption=USER_ENTERED`
      await this.callGoogleAPI(url, 'PUT', { values: [headers] })
    }
  }

  /**
   * Write data row / Mutation to target Sheet
   */
  public async writeToSheet(sheetName: string, rowData: any[]): Promise<void> {
    if (this.config.isMockMode) return

    const ssId = await this.ensureSpreadsheet()
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/${sheetName}!A:A:append?valueInputOption=USER_ENTERED`
    await this.callGoogleAPI(appendUrl, 'POST', { values: [rowData] })
  }

  /**
   * Server-Equivalent Idempotency: Check if an operationId has already been successfully synced.
   */
  public async checkOperationIdempotency(operationId: string): Promise<boolean> {
    if (this.config.isMockMode) return false

    const ssId = await this.ensureSpreadsheet()
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${ssId}/values/Sync_Queue!A:A`
    try {
      const res = await this.callGoogleAPI(readUrl)
      if (res.values) {
        // Flatten values array and look for operationId
        const ids = res.values.map((row: any[]) => row[0])
        return ids.includes(operationId)
      }
    } catch (err) {
      console.warn('[GoogleWorkspaceService] Error checking Sync_Queue idempotency:', err)
    }
    return false
  }

  /**
   * Sync a mutation payload natively
   */
  public async syncMutationNatively(payload: any): Promise<{ success: boolean; syncedAt: string }> {
    if (this.config.isMockMode) {
      return { success: true, syncedAt: new Date().toISOString() }
    }

    const { operationId, entityType, entityId, operation, teacherId, clientTimestamp } = payload
    const now = new Date().toISOString()

    // 1. Check server-equivalent idempotency
    const isAlreadySynced = await this.checkOperationIdempotency(operationId)
    if (isAlreadySynced) {
      console.log(
        '[GoogleWorkspaceService] Idempotency triggered! Mutation already synced:',
        operationId
      )
      return { success: true, syncedAt: now }
    }

    // 2. Select target sheet and write main mutation
    const targetSheet = this.getTargetSheetByEntityType(entityType)
    const entityRow = this.flattenEntityToRow(entityType, payload.payload)

    if (targetSheet && entityRow) {
      await this.writeToSheet(targetSheet, entityRow)
    }

    // 3. Log into Sync_Queue sheet for auditing and server-equivalent idempotency tracking
    const queueRow = [
      operationId,
      entityType,
      entityId,
      operation,
      teacherId,
      'SYNCED',
      JSON.stringify(payload.payload || {}),
      clientTimestamp,
      now
    ]
    await this.writeToSheet('Sync_Queue', queueRow)

    return { success: true, syncedAt: now }
  }

  private getTargetSheetByEntityType(type: string): string | null {
    switch (type) {
      case 'TEACHER':
        return 'Teachers'
      case 'ASSIGNMENT':
        return 'TeacherAssignments'
      case 'CLASS':
        return 'Rombels'
      case 'STUDENT':
        return 'Students'
      case 'SCHEDULE':
        return 'Schedules'
      case 'ATTENDANCE':
        return 'Attendance'
      case 'JOURNAL':
        return 'Journals'
      case 'ASSESSMENT':
        return 'Assessments'
      case 'ASSESSMENT_SCORE':
        return 'Assessment_Scores'
      case 'USER':
        return 'Users'
      case 'AUDIT':
        return 'Audit'
      default:
        return null
    }
  }

  private flattenEntityToRow(type: string, entity: any): any[] | null {
    if (!entity) return null
    switch (type) {
      case 'TEACHER':
        return [
          entity.id,
          entity.nip,
          entity.nuptk,
          entity.name,
          entity.position,
          entity.status,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'ASSIGNMENT':
        return [
          entity.id,
          entity.code,
          entity.teacherId,
          entity.subjectId,
          entity.classId,
          entity.hours,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'CLASS':
        return [
          entity.id,
          entity.name,
          entity.gradeLevel,
          entity.major,
          entity.homeroomTeacherId,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'STUDENT':
        return [
          entity.id,
          entity.nis,
          entity.name,
          entity.classId,
          entity.status,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'SCHEDULE':
        return [
          entity.id,
          entity.classId,
          entity.teacherAssignmentId,
          entity.dayOfWeek,
          entity.periodStart,
          entity.periodEnd,
          entity.roomId,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'ATTENDANCE':
        return [
          entity.id,
          entity.scheduleId,
          entity.date,
          entity.teacherId,
          entity.academicYearId,
          entity.semester,
          entity.isSubmitted ? 'true' : 'false',
          entity.submittedAt,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'JOURNAL':
        return [
          entity.id,
          entity.scheduleId,
          entity.date,
          entity.teacherId,
          entity.topic,
          entity.activities,
          entity.notes,
          entity.absentStudentsCount,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'ASSESSMENT':
        return [
          entity.id,
          entity.teacherAssignmentId,
          entity.name,
          entity.type,
          entity.kkm,
          entity.weight,
          entity.academicYearId,
          entity.semester,
          entity.date,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'ASSESSMENT_SCORE':
        return [
          entity.id,
          entity.assessmentId,
          entity.studentId,
          entity.score,
          entity.notes,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'USER':
        return [
          entity.id,
          entity.username,
          entity.passwordHash,
          entity.role,
          entity.teacherId,
          entity.status,
          entity.createdAt,
          entity.updatedAt
        ]
      case 'AUDIT':
        return [
          entity.id,
          entity.userId,
          entity.role,
          entity.action,
          entity.details,
          entity.timestamp
        ]
      default:
        return null
    }
  }

  /**
   * 2. GOOGLE DRIVE — Secure Cloud Backup Uploading (Multi-part Content Type)
   */
  public async uploadBackupToDrive(fileName: string, jsonContent: string): Promise<string> {
    if (this.config.isMockMode) {
      return 'mock-drive-file-id-12345'
    }

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('Sesi Google belum terhubung. Silakan sambungkan akun Google Anda.')
    }

    const metadata = {
      name: fileName,
      mimeType: 'application/json'
    }

    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    })

    if (!response.ok) {
      if (response.status === 401) {
        this.cachedToken = null
        this.currentUser = null
      }
      const errText = await response.text()
      throw new Error(`Drive Backup Upload Error: ${errText || response.statusText}`)
    }

    const data = await response.json()
    return data.id
  }

  /**
   * 3. GMAIL — Send School Email Alert Notification
   */
  public async sendGmailAlert(to: string, subject: string, bodyText: string): Promise<void> {
    if (this.config.isMockMode) return

    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
    const emailContent = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      `<h3>SIAKAD SMK NU Ungaran Alert Notification</h3><p>${bodyText}</p>`
    ].join('\r\n')

    // Base64Url encoding
    const encodedMail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await this.callGoogleAPI(url, 'POST', { raw: encodedMail })
  }

  /**
   * 4. GOOGLE CALENDAR — Create Academic Timetable Calendar Event
   */
  public async createCalendarEvent(eventDetails: {
    summary: string
    description: string
    startDateTime: string
    endDateTime: string
  }): Promise<string> {
    if (this.config.isMockMode) return 'mock-calendar-event-id-12345'

    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startDateTime,
        timeZone: 'Asia/Jakarta'
      },
      end: {
        dateTime: eventDetails.endDateTime,
        timeZone: 'Asia/Jakarta'
      }
    }

    const res = await this.callGoogleAPI(url, 'POST', event)
    return res.id
  }

  /**
   * 5. GOOGLE DOCS — Generate Academic Document Template
   */
  public async createDocTemplate(title: string, paragraphs: string[]): Promise<string> {
    if (this.config.isMockMode) return 'mock-doc-id-12345'

    const createUrl = 'https://docs.googleapis.com/v1/documents'
    const doc = await this.callGoogleAPI(createUrl, 'POST', { title })
    const docId = doc.documentId

    const requests = paragraphs.map((text) => ({
      insertText: {
        text: text + '\n\n',
        location: { index: 1 }
      }
    }))

    const updateUrl = `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`
    await this.callGoogleAPI(updateUrl, 'POST', { requests })

    return docId
  }

  /**
   * 6. GOOGLE FORMS — Retrieve External Form Submissions Feedback
   */
  public async getFormFeedback(formId: string): Promise<any[]> {
    if (this.config.isMockMode) {
      return [{ responseId: 'mock-response-1', answers: {} }]
    }

    const url = `https://forms.googleapis.com/v1/forms/${formId}/responses`
    const res = await this.callGoogleAPI(url)
    return res.responses || []
  }
}

export const googleWorkspaceService = GoogleWorkspaceService.getInstance()
