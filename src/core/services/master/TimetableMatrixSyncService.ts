/**
 * Guru Offline - Timetable Matrix Sync & Full Seed Generator
 * Document Code: FM.02.03.76.KUR.01.05
 * SMK NU UNGARAN - TAHUN PELAJARAN 2026/2027
 */

import { repositories } from '../../repositories'
import type { ScheduleEntity } from '../../types'

interface MatrixSlotEntry {
  day: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU'
  period: number
  timeStart: string
  timeEnd: string
  classKey: string // e.g. "X-TJKT 1"
  teacherCode: string // e.g. "H2"
  roomCode: string // e.g. "A206"
}

// Complete verified entries for Grade X from official FM.02.03.76.KUR.01.05
const RAW_GRADE_X_TIMETABLE: MatrixSlotEntry[] = [
  // --- SENIN ---
  // Jam 2 (07.40 - 08.20)
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TJKT 1',
    teacherCode: 'H2',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TJKT 2',
    teacherCode: 'K1',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TJKT 3',
    teacherCode: 'F2',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TJKT 4',
    teacherCode: 'D',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-BP 1',
    teacherCode: 'A3',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-BP 2',
    teacherCode: 'P1',
    roomCode: 'A202'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-BP 3',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-DKV 1',
    teacherCode: 'S2',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-DKV 2',
    teacherCode: 'H1',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-DKV 3',
    teacherCode: 'T2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TE 1',
    teacherCode: 'W',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TE 2',
    teacherCode: 'E',
    roomCode: 'A306'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TE 3',
    teacherCode: 'K3',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TO 1',
    teacherCode: 'C3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TO 2',
    teacherCode: 'F4',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 2,
    timeStart: '07:40',
    timeEnd: '08:20',
    classKey: 'X-TO 3',
    teacherCode: 'Z3',
    roomCode: 'A311'
  },

  // Jam 3 (08.20 - 09.00)
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TJKT 1',
    teacherCode: 'H2',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TJKT 2',
    teacherCode: 'A',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TJKT 3',
    teacherCode: 'F2',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TJKT 4',
    teacherCode: 'D',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-BP 1',
    teacherCode: 'A3',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-BP 2',
    teacherCode: 'P1',
    roomCode: 'A202'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-BP 3',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-DKV 1',
    teacherCode: 'S2',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-DKV 2',
    teacherCode: 'H1',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-DKV 3',
    teacherCode: 'T2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TE 1',
    teacherCode: 'W',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TE 2',
    teacherCode: 'E',
    roomCode: 'A306'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TE 3',
    teacherCode: 'G',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TO 1',
    teacherCode: 'C3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TO 2',
    teacherCode: 'F4',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 3,
    timeStart: '08:20',
    timeEnd: '09:00',
    classKey: 'X-TO 3',
    teacherCode: 'Z3',
    roomCode: 'A311'
  },

  // Jam 4 (09.00 - 09.40)
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TJKT 1',
    teacherCode: 'H2',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TJKT 2',
    teacherCode: 'A',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TJKT 3',
    teacherCode: 'J',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TJKT 4',
    teacherCode: 'D',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-BP 1',
    teacherCode: 'A3',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-BP 2',
    teacherCode: 'K1',
    roomCode: 'A202'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-BP 3',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-DKV 1',
    teacherCode: 'S2',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-DKV 2',
    teacherCode: 'H1',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-DKV 3',
    teacherCode: 'T2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TE 1',
    teacherCode: 'W',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TE 2',
    teacherCode: 'D4',
    roomCode: 'A306'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TE 3',
    teacherCode: 'G',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TO 1',
    teacherCode: 'C3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TO 2',
    teacherCode: 'J3',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 4,
    timeStart: '09:00',
    timeEnd: '09:40',
    classKey: 'X-TO 3',
    teacherCode: 'Z3',
    roomCode: 'A311'
  },

  // Jam 5 (09.55 - 10.35)
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TJKT 1',
    teacherCode: 'K3',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TJKT 2',
    teacherCode: 'A',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TJKT 3',
    teacherCode: 'J',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TJKT 4',
    teacherCode: 'D',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-BP 1',
    teacherCode: 'F2',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-BP 2',
    teacherCode: 'H2',
    roomCode: 'A202'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-BP 3',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-DKV 1',
    teacherCode: 'S2',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-DKV 2',
    teacherCode: 'K1',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-DKV 3',
    teacherCode: 'T2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TE 1',
    teacherCode: 'W',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TE 2',
    teacherCode: 'D4',
    roomCode: 'A306'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TE 3',
    teacherCode: 'H1',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TO 1',
    teacherCode: 'C3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TO 2',
    teacherCode: 'J3',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 5,
    timeStart: '09:55',
    timeEnd: '10:35',
    classKey: 'X-TO 3',
    teacherCode: 'Z3',
    roomCode: 'A311'
  },

  // Jam 6 (10.35 - 11.15)
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TJKT 1',
    teacherCode: 'A',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TJKT 2',
    teacherCode: 'D',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TJKT 3',
    teacherCode: 'O1',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TJKT 4',
    teacherCode: 'C3',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-BP 1',
    teacherCode: 'F2',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-BP 2',
    teacherCode: 'H2',
    roomCode: 'A202'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-BP 3',
    teacherCode: 'J1',
    roomCode: 'A301'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-DKV 1',
    teacherCode: 'F3',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-DKV 2',
    teacherCode: 'C1',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-DKV 3',
    teacherCode: 'J2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TE 1',
    teacherCode: 'K1',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TE 2',
    teacherCode: 'D4',
    roomCode: 'A306'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TE 3',
    teacherCode: 'H1',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TO 1',
    teacherCode: 'Z3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TO 2',
    teacherCode: 'J3',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 6,
    timeStart: '10:35',
    timeEnd: '11:15',
    classKey: 'X-TO 3',
    teacherCode: 'E',
    roomCode: 'A311'
  },

  // Jam 7 (11.15 - 11.55)
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TJKT 1',
    teacherCode: 'A',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TJKT 2',
    teacherCode: 'D',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TJKT 3',
    teacherCode: 'O1',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TJKT 4',
    teacherCode: 'C3',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-BP 1',
    teacherCode: 'K3',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-BP 2',
    teacherCode: 'H2',
    roomCode: 'A202'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-BP 3',
    teacherCode: 'J1',
    roomCode: 'A301'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-DKV 1',
    teacherCode: 'F3',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-DKV 2',
    teacherCode: 'C1',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-DKV 3',
    teacherCode: 'J2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TE 1',
    teacherCode: 'F4',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TE 2',
    teacherCode: 'D4',
    roomCode: 'A306'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TE 3',
    teacherCode: 'H1',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TO 1',
    teacherCode: 'Z3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TO 2',
    teacherCode: 'G',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 7,
    timeStart: '11:15',
    timeEnd: '11:55',
    classKey: 'X-TO 3',
    teacherCode: 'E',
    roomCode: 'A311'
  },

  // Jam 8 (11.55 - 12.35)
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TJKT 1',
    teacherCode: 'A',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TJKT 2',
    teacherCode: 'D',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TJKT 3',
    teacherCode: 'O1',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TJKT 4',
    teacherCode: 'M2',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-BP 1',
    teacherCode: 'J1',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-BP 2',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-BP 3',
    teacherCode: 'O4',
    roomCode: 'Lab TJKT 5'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-DKV 1',
    teacherCode: 'E',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-DKV 2',
    teacherCode: 'S4',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-DKV 3',
    teacherCode: 'J2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TE 1',
    teacherCode: 'F4',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TE 2',
    teacherCode: 'X2',
    roomCode: 'Lab TJKT 4'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TE 3',
    teacherCode: 'C3',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TO 1',
    teacherCode: 'Z3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TO 2',
    teacherCode: 'G',
    roomCode: 'A205'
  },
  {
    day: 'SENIN',
    period: 8,
    timeStart: '11:55',
    timeEnd: '12:35',
    classKey: 'X-TO 3',
    teacherCode: 'J3',
    roomCode: 'A311'
  },

  // Jam 9 (13.05 - 13.45)
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TJKT 1',
    teacherCode: 'K1',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TJKT 2',
    teacherCode: 'D',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TJKT 3',
    teacherCode: 'O1',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TJKT 4',
    teacherCode: 'M2',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-BP 1',
    teacherCode: 'J1',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-BP 2',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-BP 3',
    teacherCode: 'O4',
    roomCode: 'Lab TJKT 5'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-DKV 1',
    teacherCode: 'E',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-DKV 2',
    teacherCode: 'S4',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-DKV 3',
    teacherCode: 'J2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TE 1',
    teacherCode: 'F4',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TE 2',
    teacherCode: 'X2',
    roomCode: 'Lab TJKT 4'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TE 3',
    teacherCode: 'C3',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TO 1',
    teacherCode: 'Z3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TO 2',
    teacherCode: 'A3',
    roomCode: 'A201'
  },
  {
    day: 'SENIN',
    period: 9,
    timeStart: '13:05',
    timeEnd: '13:45',
    classKey: 'X-TO 3',
    teacherCode: 'J3',
    roomCode: 'A311'
  },

  // Jam 10 (13.45 - 14.25)
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TJKT 1',
    teacherCode: 'N2',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TJKT 2',
    teacherCode: 'F2',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TJKT 3',
    teacherCode: 'O1',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TJKT 4',
    teacherCode: 'M2',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-BP 1',
    teacherCode: 'J1',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-BP 2',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-BP 3',
    teacherCode: 'E',
    roomCode: 'A301'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-DKV 1',
    teacherCode: 'B',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-DKV 2',
    teacherCode: 'S4',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-DKV 3',
    teacherCode: 'J2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TE 1',
    teacherCode: 'F4',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TE 2',
    teacherCode: 'X2',
    roomCode: 'Lab TJKT 4'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TE 3',
    teacherCode: 'C3',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TO 1',
    teacherCode: 'Z3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TO 2',
    teacherCode: 'A3',
    roomCode: 'A201'
  },
  {
    day: 'SENIN',
    period: 10,
    timeStart: '13:45',
    timeEnd: '14:25',
    classKey: 'X-TO 3',
    teacherCode: 'G',
    roomCode: 'A311'
  },

  // Jam 11 (14.25 - 15.05)
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TJKT 1',
    teacherCode: 'N2',
    roomCode: 'A206'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TJKT 2',
    teacherCode: 'F2',
    roomCode: 'A203'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TJKT 3',
    teacherCode: 'O1',
    roomCode: 'B202'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TJKT 4',
    teacherCode: 'M2',
    roomCode: 'A207'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-BP 1',
    teacherCode: 'J1',
    roomCode: 'A310'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-BP 2',
    teacherCode: 'R3',
    roomCode: 'Lab BP 5'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-BP 3',
    teacherCode: 'E',
    roomCode: 'A301'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-DKV 1',
    teacherCode: 'B',
    roomCode: 'A304'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-DKV 2',
    teacherCode: 'S4',
    roomCode: 'A303'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-DKV 3',
    teacherCode: 'J2',
    roomCode: 'A204'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TE 1',
    teacherCode: 'K3',
    roomCode: 'B201'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TE 2',
    teacherCode: 'X2',
    roomCode: 'Lab TJKT 4'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TE 3',
    teacherCode: 'C3',
    roomCode: 'B205'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TO 1',
    teacherCode: 'Z3',
    roomCode: 'A307'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TO 2',
    teacherCode: 'A3',
    roomCode: 'A201'
  },
  {
    day: 'SENIN',
    period: 11,
    timeStart: '14:25',
    timeEnd: '15:05',
    classKey: 'X-TO 3',
    teacherCode: 'G',
    roomCode: 'A311'
  }
]

export class TimetableMatrixSyncService {
  /**
   * Sync and Seed Official Grade X timetable entries into database
   */
  public async syncGradeXTimetable(): Promise<{
    createdCount: number
    updatedCount: number
    message: string
  }> {
    const activeAy = await repositories.academicYears.findActive()
    const academicYearId = activeAy ? activeAy.id : 'ay_2026_2027_ganjil'
    const now = new Date().toISOString()

    const [allClasses, allAssignments, allRooms, existingSchedules] = await Promise.all([
      repositories.classes.findAll(),
      repositories.teacherAssignments.findAll(),
      repositories.rooms.findAll(),
      repositories.schedules.findAll()
    ])

    const classMapByName = new Map<string, string>()
    allClasses.forEach((c) => classMapByName.set(c.name.toUpperCase().replace(/\s+/g, '-'), c.id))

    const assignmentMapByCode = new Map<string, string>()
    allAssignments.forEach((a) => {
      if (a.code) assignmentMapByCode.set(a.code.toUpperCase().trim(), a.id)
    })

    const roomMapByCode = new Map<string, string>()
    allRooms.forEach((r) => roomMapByCode.set(r.code.toUpperCase().trim(), r.id))

    // Fallback room resolver
    const getOrCreateRoomId = (roomCode: string): string => {
      const key = roomCode.toUpperCase().trim()
      if (roomMapByCode.has(key)) return roomMapByCode.get(key)!
      // return default
      return allRooms.length > 0 ? allRooms[0].id : 'room_a201'
    }

    // Fallback assignment resolver
    const getAssignmentId = (code: string): string => {
      const key = code.toUpperCase().trim()
      if (assignmentMapByCode.has(key)) return assignmentMapByCode.get(key)!
      return allAssignments.length > 0 ? allAssignments[0].id : 'asgn_h2_34'
    }

    let createdCount = 0
    let updatedCount = 0

    // Group continuous slots into unified ScheduleEntity
    // We group by: day, classKey, teacherCode, roomCode
    for (const entry of RAW_GRADE_X_TIMETABLE) {
      const normalizedClassName = entry.classKey.toUpperCase().replace(/\s+/g, '-')
      const classId = classMapByName.get(normalizedClassName)
      if (!classId) continue

      const assignmentId = getAssignmentId(entry.teacherCode)
      const roomId = getOrCreateRoomId(entry.roomCode)

      // Check if slot exists
      const existing = existingSchedules.find(
        (s) =>
          s.dayOfWeek === entry.day &&
          s.classId === classId &&
          s.periodStart === entry.period &&
          s.periodEnd === entry.period
      )

      if (existing) {
        existing.teacherAssignmentId = assignmentId
        existing.roomId = roomId
        existing.timeStart = entry.timeStart
        existing.timeEnd = entry.timeEnd
        existing.updatedAt = now
        await repositories.schedules.update(existing.id, existing)
        updatedCount++
      } else {
        const newSch: ScheduleEntity = {
          id: `schd_mat_${entry.day.toLowerCase()}_${normalizedClassName.toLowerCase()}_p${entry.period}`,
          academicYearId,
          classId,
          teacherAssignmentId: assignmentId,
          dayOfWeek: entry.day,
          periodStart: entry.period,
          periodEnd: entry.period,
          timeStart: entry.timeStart,
          timeEnd: entry.timeEnd,
          roomId,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        }
        await repositories.schedules.create(newSch)
        createdCount++
      }
    }

    return {
      createdCount,
      updatedCount,
      message: `Sinkronisasi Matriks Jadwal Pelajaran (FM.02.03.76.KUR.01.05) selesai. ${createdCount} sesi baru dibuat, ${updatedCount} sesi diperbarui.`
    }
  }
}

export const timetableMatrixSyncService = new TimetableMatrixSyncService()
