/**
 * Guru Offline - IndexedDB Database Infrastructure
 * Database: guru_offline_db
 * Version: 1
 * Source of Truth: DATABASE_SCHEMA.md, ARCHITECTURE.md
 */

export const DB_NAME = 'guru_offline_db'
export const DB_VERSION = 4

export interface StoreIndexConfig {
  name: string
  keyPath: string | string[]
  unique?: boolean
  multiEntry?: boolean
}

export interface StoreSchemaConfig {
  name: string
  keyPath: string
  autoIncrement?: boolean
  indexes: StoreIndexConfig[]
}

/**
 * All official Store Schemas for guru_offline_db Version 1
 */
export const STORE_SCHEMAS: StoreSchemaConfig[] = [
  {
    name: 'users',
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username', unique: true },
      { name: 'role', keyPath: 'role', unique: false },
      { name: 'teacherId', keyPath: 'teacherId', unique: false },
      { name: 'status', keyPath: 'status', unique: false }
    ]
  },
  {
    name: 'teachers',
    keyPath: 'id',
    indexes: [
      { name: 'nip', keyPath: 'nip', unique: false },
      { name: 'nuptk', keyPath: 'nuptk', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'name', keyPath: 'name', unique: false }
    ]
  },
  {
    name: 'teacher_assignments',
    keyPath: 'id',
    indexes: [
      { name: 'teacherId', keyPath: 'teacherId', unique: false },
      { name: 'code', keyPath: 'code', unique: false },
      { name: 'subjectId', keyPath: 'subjectId', unique: false },
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false },
      { name: 'teacher_academic', keyPath: ['teacherId', 'academicYearId'], unique: false }
    ]
  },
  {
    name: 'academic_years',
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name', unique: false },
      { name: 'isActive', keyPath: 'isActive', unique: false }
    ]
  },
  {
    name: 'majors',
    keyPath: 'id',
    indexes: [
      { name: 'code', keyPath: 'code', unique: true },
      { name: 'status', keyPath: 'status', unique: false }
    ]
  },
  {
    name: 'classes',
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name', unique: false },
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false },
      { name: 'majorId', keyPath: 'majorId', unique: false },
      { name: 'homeroomTeacherId', keyPath: 'homeroomTeacherId', unique: false },
      { name: 'level', keyPath: 'level', unique: false }
    ]
  },
  {
    name: 'subjects',
    keyPath: 'id',
    indexes: [
      { name: 'code', keyPath: 'code', unique: false },
      { name: 'name', keyPath: 'name', unique: false },
      { name: 'status', keyPath: 'status', unique: false }
    ]
  },
  {
    name: 'rooms',
    keyPath: 'id',
    indexes: [
      { name: 'code', keyPath: 'code', unique: true },
      { name: 'type', keyPath: 'type', unique: false },
      { name: 'status', keyPath: 'status', unique: false }
    ]
  },
  {
    name: 'students',
    keyPath: 'id',
    indexes: [
      { name: 'nis', keyPath: 'nis', unique: false },
      { name: 'nisn', keyPath: 'nisn', unique: false },
      { name: 'classId', keyPath: 'classId', unique: false },
      { name: 'gender', keyPath: 'gender', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'class_status', keyPath: ['classId', 'status'], unique: false }
    ]
  },
  {
    name: 'schedules',
    keyPath: 'id',
    indexes: [
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false },
      { name: 'classId', keyPath: 'classId', unique: false },
      { name: 'teacherAssignmentId', keyPath: 'teacherAssignmentId', unique: false },
      { name: 'dayOfWeek', keyPath: 'dayOfWeek', unique: false },
      { name: 'roomId', keyPath: 'roomId', unique: false },
      { name: 'class_day', keyPath: ['classId', 'dayOfWeek'], unique: false },
      { name: 'assignment_day', keyPath: ['teacherAssignmentId', 'dayOfWeek'], unique: false }
    ]
  },
  {
    name: 'attendances',
    keyPath: 'id',
    indexes: [
      { name: 'scheduleId', keyPath: 'scheduleId', unique: false },
      { name: 'classId', keyPath: 'classId', unique: false },
      { name: 'teacherAssignmentId', keyPath: 'teacherAssignmentId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false },
      { name: 'schedule_date', keyPath: ['scheduleId', 'date'], unique: true },
      { name: 'class_date', keyPath: ['classId', 'date'], unique: false }
    ]
  },
  {
    name: 'journals',
    keyPath: 'id',
    indexes: [
      { name: 'scheduleId', keyPath: 'scheduleId', unique: false },
      { name: 'classId', keyPath: 'classId', unique: false },
      { name: 'teacherAssignmentId', keyPath: 'teacherAssignmentId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false }
    ]
  },
  {
    name: 'assessments',
    keyPath: 'id',
    indexes: [
      { name: 'classId', keyPath: 'classId', unique: false },
      { name: 'subjectId', keyPath: 'subjectId', unique: false },
      { name: 'teacherAssignmentId', keyPath: 'teacherAssignmentId', unique: false },
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false },
      { name: 'type', keyPath: 'type', unique: false },
      { name: 'class_subject', keyPath: ['classId', 'subjectId'], unique: false }
    ]
  },
  {
    name: 'discipline_notes',
    keyPath: 'id',
    indexes: [
      { name: 'studentId', keyPath: 'studentId', unique: false },
      { name: 'teacherId', keyPath: 'teacherId', unique: false },
      { name: 'classId', keyPath: 'classId', unique: false },
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'type', keyPath: 'type', unique: false }
    ]
  },
  {
    name: 'announcements',
    keyPath: 'id',
    indexes: [
      { name: 'published', keyPath: 'published', unique: false },
      { name: 'pinned', keyPath: 'pinned', unique: false },
      { name: 'targetRole', keyPath: 'targetRole', unique: false },
      { name: 'priority', keyPath: 'priority', unique: false }
    ]
  },
  {
    name: 'school_identity',
    keyPath: 'id',
    indexes: [{ name: 'npsn', keyPath: 'npsn', unique: false }]
  },
  {
    name: 'sync_queue',
    keyPath: 'id',
    indexes: [
      { name: 'entityType', keyPath: 'entityType', unique: false },
      { name: 'entityId', keyPath: 'entityId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'queuedAt', keyPath: 'queuedAt', unique: false }
    ]
  },
  {
    name: 'import_history',
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'entityType', keyPath: 'entityType', unique: false },
      { name: 'status', keyPath: 'status', unique: false }
    ]
  },
  {
    name: 'audit_logs',
    keyPath: 'id',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'action', keyPath: 'action', unique: false },
      { name: 'actor', keyPath: 'actor', unique: false },
      { name: 'entityType', keyPath: 'entityType', unique: false }
    ]
  },
  {
    name: 'academic_periods',
    keyPath: 'id',
    indexes: [
      { name: 'academicYearId', keyPath: 'academicYearId', unique: false },
      { name: 'periodType', keyPath: 'periodType', unique: false },
      { name: 'semester', keyPath: 'semester', unique: false },
      { name: 'isLocked', keyPath: 'isLocked', unique: false }
    ]
  },
  {
    name: 'submissions',
    keyPath: 'id',
    indexes: [
      { name: 'teacherId', keyPath: 'teacherId', unique: false },
      { name: 'academicPeriodId', keyPath: 'academicPeriodId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'teacher_period', keyPath: ['teacherId', 'academicPeriodId'], unique: true }
    ]
  },
  {
    name: 'school_agendas',
    keyPath: 'id',
    indexes: [
      { name: 'startDate', keyPath: 'startDate', unique: false },
      { name: 'category', keyPath: 'category', unique: false },
      { name: 'targetRole', keyPath: 'targetRole', unique: false }
    ]
  },
  {
    name: 'pending_mutations',
    keyPath: 'id',
    indexes: [
      { name: 'entity', keyPath: 'entity', unique: false },
      { name: 'entityId', keyPath: 'entityId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false }
    ]
  },
  {
    name: 'conflicts',
    keyPath: 'id',
    indexes: [
      { name: 'entity', keyPath: 'entity', unique: false },
      { name: 'entityId', keyPath: 'entityId', unique: false },
      { name: 'resolved', keyPath: 'resolved', unique: false }
    ]
  }
]

class IndexedDbManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  public async getDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const idb =
        typeof window !== 'undefined' && window.indexedDB
          ? window.indexedDB
          : typeof indexedDB !== 'undefined'
            ? indexedDB
            : (globalThis as any).indexedDB

      if (!idb) {
        reject(new Error('IndexedDB is not supported in this environment.'))
        return
      }

      const request = idb.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result
        const oldVersion = event.oldVersion
        console.log(`[IndexedDB] Upgrading schema from version ${oldVersion} to ${DB_VERSION}`)

        STORE_SCHEMAS.forEach((schema) => {
          let store: IDBObjectStore
          if (!db.objectStoreNames.contains(schema.name)) {
            store = db.createObjectStore(schema.name, {
              keyPath: schema.keyPath,
              autoIncrement: schema.autoIncrement ?? false
            })
          } else {
            store = request.transaction!.objectStore(schema.name)
          }

          // Ensure indices
          schema.indexes.forEach((idx) => {
            if (!store.indexNames.contains(idx.name)) {
              store.createIndex(idx.name, idx.keyPath, {
                unique: idx.unique ?? false,
                multiEntry: idx.multiEntry ?? false
              })
            }
          })
        })
      }

      request.onsuccess = () => {
        const db = request.result
        this.db = db
        db.onversionchange = () => {
          this.db?.close()
          this.db = null
          this.initPromise = null
          console.warn('[IndexedDB] Database version changed elsewhere; closed connection.')
        }
        resolve(db)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error)
        reject(request.error || new Error('Unknown IndexedDB open error'))
      }

      request.onblocked = () => {
        console.warn('[IndexedDB] Database open blocked. Please close other open tabs.')
      }
    })

    return this.initPromise
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }

  public async deleteDatabase(): Promise<void> {
    await this.close()
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(DB_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => {
        console.warn('[IndexedDB] Delete database blocked.')
      }
    })
  }
}

export const dbManager = new IndexedDbManager()
export const indexedDb = dbManager
