# PHASE C3 — ACADEMIC SNAPSHOT & SEMESTER CLOSING ARCHITECTURE MAP

This document details the read-only audit architecture, data-freezing state-machine, and service-level protections introduced in **Phase C3**.

---

## 1. Lifecycle & Flow Design

```
[User UI Lock Trigger]
         │
         ▼ (Invokes ADMIN role)
[SemesterClosingService.closeSemester]
         │
         ▼ (Saves local NoSQL-style state)
[repositories.academicYears.update] ──► Sets { isLocked: true, isActive: false }
         │
         ▼ (Records permanent trace)
[auditLogService.log] ──► Emits CLOSE_SEMESTER
```

### Mutational Interception Flows
For all subsequent operational writes:
```
[GURU/ADMIN Mutation Action]
         │
         ▼ (Attempts create, update, score, or delete)
[Service Layer (Assessment/Attendance/Journal/Discipline)]
         │
         ▼ (Performs check via AcademicLockGuardService)
[AcademicLockGuardService.enforceLock / enforceDateLock]
         │
         ├───► [If Locked] ──► Throws SemesterLockedError (Transaction Halted)
         │
         └───► [If Unlocked] ─► Proceeds to Repository / IndexedDB Store
```

---

## 2. Sync Conflict Mitigation Flow

When an offline node registers mutations and reconnects to sync:
```
[SyncService.syncAll]
         │
         ▼ (Iterates Pending Items)
[SyncService.syncSingleItem]
         │
         ▼ (Inspects payload.academicYearId or payload.date)
[AcademicLockGuardService.isSemesterLocked / isDateLocked]
         │
         ├───► [Locked] ──► Discards entry, marks status = FAILED (Prevents Sync Contamination)
         │
         └───► [Unlocked] ─► Dispatches payload to external Workspace API / GasApiClient
```

---

## 3. Immutability Verification Matrices

| Module | Verification Source | Lock Vector | Expected Exception |
|---|---|---|---|
| **Assessments** | `AssessmentService` | `academicYearId` checking | `SemesterLockedError` |
| **Attendance** | `AttendanceService` | `academicYearId` checking | `SemesterLockedError` |
| **Teaching Journals** | `JournalService` | `academicYearId` checking | `SemesterLockedError` |
| **Discipline Notes** | `DisciplineService` | Event `date` boundaries | `SemesterLockedError` |

---

AUDIT & CONFIGURATION MAP SECURED — SYSTEM FULLY COMPLIANT WITH LOCK MATRICES.
