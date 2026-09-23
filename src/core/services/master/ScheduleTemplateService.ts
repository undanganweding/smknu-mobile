/**
 * Guru Offline - Timetable Template & Standard Bell Schedule Definitions
 * Official Reference: FM.02.03.76.KUR.01.05
 * SMK NU UNGARAN - TAHUN PELAJARAN 2026/2027
 */

export interface PeriodSlot {
  period: number | string
  timeStart: string
  timeEnd: string
  timeLabel: string
  type: 'LESSON' | 'DHUHA' | 'UPACARA' | 'BREAK' | 'DHUHUR' | 'MUJAHADAH' | 'PRAMUKA' | 'EKSTRA'
  title?: string
}

export interface DayScheduleTemplate {
  day: 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU'
  dayLabel: string
  slots: PeriodSlot[]
}

export interface ClassColumnDef {
  classKey: string
  className: string
  majorCode: 'TJKT' | 'BP' | 'DKV' | 'TE' | 'TO'
  rombel: number
}

/**
 * Standard 16 Classes per Grade level (X, XI, XII)
 */
export function getStandardClassesByLevel(level: 'X' | 'XI' | 'XII'): ClassColumnDef[] {
  return [
    // TJKT
    { classKey: `${level}-TJKT 1`, className: `${level}-TJKT 1`, majorCode: 'TJKT', rombel: 1 },
    { classKey: `${level}-TJKT 2`, className: `${level}-TJKT 2`, majorCode: 'TJKT', rombel: 2 },
    { classKey: `${level}-TJKT 3`, className: `${level}-TJKT 3`, majorCode: 'TJKT', rombel: 3 },
    { classKey: `${level}-TJKT 4`, className: `${level}-TJKT 4`, majorCode: 'TJKT', rombel: 4 },
    // BP
    { classKey: `${level}-BP 1`, className: `${level}-BP 1`, majorCode: 'BP', rombel: 1 },
    { classKey: `${level}-BP 2`, className: `${level}-BP 2`, majorCode: 'BP', rombel: 2 },
    { classKey: `${level}-BP 3`, className: `${level}-BP 3`, majorCode: 'BP', rombel: 3 },
    // DKV
    { classKey: `${level}-DKV 1`, className: `${level}-DKV 1`, majorCode: 'DKV', rombel: 1 },
    { classKey: `${level}-DKV 2`, className: `${level}-DKV 2`, majorCode: 'DKV', rombel: 2 },
    { classKey: `${level}-DKV 3`, className: `${level}-DKV 3`, majorCode: 'DKV', rombel: 3 },
    // TE
    { classKey: `${level}-TE 1`, className: `${level}-TE 1`, majorCode: 'TE', rombel: 1 },
    { classKey: `${level}-TE 2`, className: `${level}-TE 2`, majorCode: 'TE', rombel: 2 },
    { classKey: `${level}-TE 3`, className: `${level}-TE 3`, majorCode: 'TE', rombel: 3 },
    // TO
    { classKey: `${level}-TO 1`, className: `${level}-TO 1`, majorCode: 'TO', rombel: 1 },
    { classKey: `${level}-TO 2`, className: `${level}-TO 2`, majorCode: 'TO', rombel: 2 },
    { classKey: `${level}-TO 3`, className: `${level}-TO 3`, majorCode: 'TO', rombel: 3 }
  ]
}

/**
 * Standard Master Bell Schedule & Break Patterns (FM.02.03.76.KUR.01.05)
 */
export const OFFICIAL_TIMETABLE_TEMPLATES: Record<string, DayScheduleTemplate> = {
  SENIN: {
    day: 'SENIN',
    dayLabel: 'SENIN',
    slots: [
      {
        period: 0,
        timeStart: '06.45',
        timeEnd: '07.00',
        timeLabel: '06.45 - 07.00',
        type: 'DHUHA',
        title: 'Sholat Dhuha Berjamaah'
      },
      {
        period: 1,
        timeStart: '07.00',
        timeEnd: '07.40',
        timeLabel: '07.00 - 07.40',
        type: 'UPACARA',
        title: 'Upacara/ Perwalian'
      },
      {
        period: 2,
        timeStart: '07.40',
        timeEnd: '08.20',
        timeLabel: '07.40 - 08.20',
        type: 'LESSON'
      },
      {
        period: 3,
        timeStart: '08.20',
        timeEnd: '09.00',
        timeLabel: '08.20 - 09.00',
        type: 'LESSON'
      },
      {
        period: 4,
        timeStart: '09.00',
        timeEnd: '09.40',
        timeLabel: '09.00 - 09.40',
        type: 'LESSON'
      },
      {
        period: 'IST-1',
        timeStart: '09.40',
        timeEnd: '09.55',
        timeLabel: '09.40 - 09.55',
        type: 'BREAK',
        title: 'Istirahat'
      },
      {
        period: 5,
        timeStart: '09.55',
        timeEnd: '10.35',
        timeLabel: '09.55 - 10.35',
        type: 'LESSON'
      },
      {
        period: 6,
        timeStart: '10.35',
        timeEnd: '11.15',
        timeLabel: '10.35 - 11.15',
        type: 'LESSON'
      },
      {
        period: 7,
        timeStart: '11.15',
        timeEnd: '11.55',
        timeLabel: '11.15 - 11.55',
        type: 'LESSON'
      },
      {
        period: 8,
        timeStart: '11.55',
        timeEnd: '12.35',
        timeLabel: '11.55 - 12.35',
        type: 'LESSON'
      },
      {
        period: 'DHUHUR',
        timeStart: '12.35',
        timeEnd: '13.05',
        timeLabel: '12.35 - 13.05',
        type: 'DHUHUR',
        title: 'Sholat Dhuhur Berjamaah'
      },
      {
        period: 9,
        timeStart: '13.05',
        timeEnd: '13.45',
        timeLabel: '13.05 - 13.45',
        type: 'LESSON'
      },
      {
        period: 10,
        timeStart: '13.45',
        timeEnd: '14.25',
        timeLabel: '13.45 - 14.25',
        type: 'LESSON'
      },
      {
        period: 11,
        timeStart: '14.25',
        timeEnd: '15.05',
        timeLabel: '14.25 - 15.05',
        type: 'LESSON'
      }
    ]
  },
  SELASA: {
    day: 'SELASA',
    dayLabel: 'SELASA',
    slots: [
      {
        period: 0,
        timeStart: '06.45',
        timeEnd: '07.00',
        timeLabel: '06.45 - 07.00',
        type: 'DHUHA',
        title: 'Sholat Dhuha Berjamaah'
      },
      {
        period: 1,
        timeStart: '07.00',
        timeEnd: '07.40',
        timeLabel: '07.00 - 07.40',
        type: 'LESSON'
      },
      {
        period: 2,
        timeStart: '07.40',
        timeEnd: '08.20',
        timeLabel: '07.40 - 08.20',
        type: 'LESSON'
      },
      {
        period: 3,
        timeStart: '08.20',
        timeEnd: '09.00',
        timeLabel: '08.20 - 09.00',
        type: 'LESSON'
      },
      {
        period: 4,
        timeStart: '09.00',
        timeEnd: '09.40',
        timeLabel: '09.00 - 09.40',
        type: 'LESSON'
      },
      {
        period: 'IST-1',
        timeStart: '09.40',
        timeEnd: '09.55',
        timeLabel: '09.40 - 09.55',
        type: 'BREAK',
        title: 'Istirahat'
      },
      {
        period: 5,
        timeStart: '09.55',
        timeEnd: '10.35',
        timeLabel: '09.55 - 10.35',
        type: 'LESSON'
      },
      {
        period: 6,
        timeStart: '10.35',
        timeEnd: '11.15',
        timeLabel: '10.35 - 11.15',
        type: 'LESSON'
      },
      {
        period: 7,
        timeStart: '11.15',
        timeEnd: '11.55',
        timeLabel: '11.15 - 11.55',
        type: 'LESSON'
      },
      {
        period: 8,
        timeStart: '11.55',
        timeEnd: '12.35',
        timeLabel: '11.55 - 12.35',
        type: 'LESSON'
      },
      {
        period: 'DHUHUR',
        timeStart: '12.35',
        timeEnd: '13.05',
        timeLabel: '12.35 - 13.05',
        type: 'DHUHUR',
        title: 'Sholat Dhuhur Berjamaah'
      },
      {
        period: 9,
        timeStart: '13.05',
        timeEnd: '13.45',
        timeLabel: '13.05 - 13.45',
        type: 'LESSON'
      },
      {
        period: 10,
        timeStart: '13.45',
        timeEnd: '14.25',
        timeLabel: '13.45 - 14.25',
        type: 'LESSON'
      },
      {
        period: 11,
        timeStart: '14.25',
        timeEnd: '15.05',
        timeLabel: '14.25 - 15.05',
        type: 'LESSON'
      },
      {
        period: 12,
        timeStart: '15.05',
        timeEnd: '15.45',
        timeLabel: '15.05 - 15.45',
        type: 'LESSON'
      }
    ]
  },
  RABU: {
    day: 'RABU',
    dayLabel: 'RABU',
    slots: [
      {
        period: 0,
        timeStart: '06.45',
        timeEnd: '07.00',
        timeLabel: '06.45 - 07.00',
        type: 'DHUHA',
        title: 'Sholat Dhuha Berjamaah'
      },
      {
        period: 1,
        timeStart: '07.00',
        timeEnd: '07.40',
        timeLabel: '07.00 - 07.40',
        type: 'LESSON'
      },
      {
        period: 2,
        timeStart: '07.40',
        timeEnd: '08.20',
        timeLabel: '07.40 - 08.20',
        type: 'LESSON'
      },
      {
        period: 3,
        timeStart: '08.20',
        timeEnd: '09.00',
        timeLabel: '08.20 - 09.00',
        type: 'LESSON'
      },
      {
        period: 4,
        timeStart: '09.00',
        timeEnd: '09.40',
        timeLabel: '09.00 - 09.40',
        type: 'LESSON'
      },
      {
        period: 'IST-1',
        timeStart: '09.40',
        timeEnd: '09.55',
        timeLabel: '09.40 - 09.55',
        type: 'BREAK',
        title: 'Istirahat'
      },
      {
        period: 5,
        timeStart: '09.55',
        timeEnd: '10.35',
        timeLabel: '09.55 - 10.35',
        type: 'LESSON'
      },
      {
        period: 6,
        timeStart: '10.35',
        timeEnd: '11.15',
        timeLabel: '10.35 - 11.15',
        type: 'LESSON'
      },
      {
        period: 7,
        timeStart: '11.15',
        timeEnd: '11.55',
        timeLabel: '11.15 - 11.55',
        type: 'LESSON'
      },
      {
        period: 8,
        timeStart: '11.55',
        timeEnd: '12.35',
        timeLabel: '11.55 - 12.35',
        type: 'LESSON'
      },
      {
        period: 'DHUHUR',
        timeStart: '12.35',
        timeEnd: '13.05',
        timeLabel: '12.35 - 13.05',
        type: 'DHUHUR',
        title: 'Sholat Dhuhur Berjamaah'
      },
      {
        period: 9,
        timeStart: '13.05',
        timeEnd: '13.45',
        timeLabel: '13.05 - 13.45',
        type: 'LESSON'
      },
      {
        period: 10,
        timeStart: '13.45',
        timeEnd: '14.25',
        timeLabel: '13.45 - 14.25',
        type: 'LESSON'
      },
      {
        period: 11,
        timeStart: '14.25',
        timeEnd: '15.05',
        timeLabel: '14.25 - 15.05',
        type: 'LESSON'
      },
      {
        period: 12,
        timeStart: '15.05',
        timeEnd: '15.45',
        timeLabel: '15.05 - 15.45',
        type: 'LESSON'
      }
    ]
  },
  KAMIS: {
    day: 'KAMIS',
    dayLabel: 'KAMIS',
    slots: [
      {
        period: 0,
        timeStart: '06.45',
        timeEnd: '07.00',
        timeLabel: '06.45 - 07.00',
        type: 'DHUHA',
        title: 'Sholat Dhuha Berjamaah'
      },
      {
        period: 1,
        timeStart: '07.00',
        timeEnd: '07.40',
        timeLabel: '07.00 - 07.40',
        type: 'LESSON'
      },
      {
        period: 2,
        timeStart: '07.40',
        timeEnd: '08.20',
        timeLabel: '07.40 - 08.20',
        type: 'LESSON'
      },
      {
        period: 3,
        timeStart: '08.20',
        timeEnd: '09.00',
        timeLabel: '08.20 - 09.00',
        type: 'LESSON'
      },
      {
        period: 4,
        timeStart: '09.00',
        timeEnd: '09.40',
        timeLabel: '09.00 - 09.40',
        type: 'LESSON'
      },
      {
        period: 'IST-1',
        timeStart: '09.40',
        timeEnd: '09.55',
        timeLabel: '09.40 - 09.55',
        type: 'BREAK',
        title: 'Istirahat'
      },
      {
        period: 5,
        timeStart: '09.55',
        timeEnd: '10.35',
        timeLabel: '09.55 - 10.35',
        type: 'LESSON'
      },
      {
        period: 6,
        timeStart: '10.35',
        timeEnd: '11.15',
        timeLabel: '10.35 - 11.15',
        type: 'LESSON'
      },
      {
        period: 7,
        timeStart: '11.15',
        timeEnd: '11.55',
        timeLabel: '11.15 - 11.55',
        type: 'LESSON'
      },
      {
        period: 8,
        timeStart: '11.55',
        timeEnd: '12.35',
        timeLabel: '11.55 - 12.35',
        type: 'LESSON'
      },
      {
        period: 'DHUHUR',
        timeStart: '12.35',
        timeEnd: '13.05',
        timeLabel: '12.35 - 13.05',
        type: 'DHUHUR',
        title: 'Sholat Dhuhur Berjamaah'
      },
      {
        period: 9,
        timeStart: '13.05',
        timeEnd: '13.45',
        timeLabel: '13.05 - 13.45',
        type: 'LESSON'
      },
      {
        period: 10,
        timeStart: '13.45',
        timeEnd: '14.25',
        timeLabel: '13.45 - 14.25',
        type: 'LESSON'
      },
      {
        period: 11,
        timeStart: '14.25',
        timeEnd: '15.05',
        timeLabel: '14.25 - 15.05',
        type: 'LESSON'
      },
      {
        period: 12,
        timeStart: '15.05',
        timeEnd: '15.45',
        timeLabel: '15.05 - 15.45',
        type: 'LESSON'
      }
    ]
  },
  JUMAT: {
    day: 'JUMAT',
    dayLabel: "JUM'AT",
    slots: [
      {
        period: 0,
        timeStart: '06.45',
        timeEnd: '08.10',
        timeLabel: '06.45 - 08.10',
        type: 'MUJAHADAH',
        title: 'MUJAHADAH'
      },
      {
        period: 1,
        timeStart: '08.10',
        timeEnd: '08.50',
        timeLabel: '08.10 - 08.50',
        type: 'LESSON'
      },
      {
        period: 2,
        timeStart: '08.50',
        timeEnd: '09.30',
        timeLabel: '08.50 - 09.30',
        type: 'LESSON'
      },
      {
        period: 'IST-1',
        timeStart: '09.30',
        timeEnd: '09.45',
        timeLabel: '09.30 - 09.45',
        type: 'BREAK',
        title: 'Istirahat'
      },
      {
        period: 3,
        timeStart: '09.45',
        timeEnd: '10.25',
        timeLabel: '09.45 - 10.25',
        type: 'LESSON'
      },
      {
        period: 4,
        timeStart: '10.25',
        timeEnd: '11.05',
        timeLabel: '10.25 - 11.05',
        type: 'LESSON'
      },
      {
        period: 5,
        timeStart: '13.00',
        timeEnd: '15.00',
        timeLabel: '13.00 - 15.00',
        type: 'PRAMUKA',
        title: 'Ekstra Pramuka'
      }
    ]
  },
  SABTU: {
    day: 'SABTU',
    dayLabel: 'SABTU',
    slots: [
      {
        period: 1,
        timeStart: '06.45',
        timeEnd: '12.00',
        timeLabel: '06.45 - 12.00',
        type: 'EKSTRA',
        title: 'EKTRAKURIKULER DAN KEGIATAN LAINNYA'
      }
    ]
  }
}
