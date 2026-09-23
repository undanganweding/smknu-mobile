/**
 * Guru Offline - Canonical Time Slot Master Service
 * Source of Truth: FM.02.03.76.KUR.01.05 (SMK NU Ungaran Schedule Document)
 * Differentiates Teaching Sessions vs School Non-Teaching Agendas
 */

import type { TimeSlotEntity, DayOfWeek } from '../../types'

export class TimeSlotService {
  private static instance: TimeSlotService | null = null

  public static getInstance(): TimeSlotService {
    if (!TimeSlotService.instance) {
      TimeSlotService.instance = new TimeSlotService()
    }
    return TimeSlotService.instance
  }

  /**
   * Standard official bell schedule slots for SMK NU Ungaran
   */
  private readonly defaultSlots: TimeSlotEntity[] = [
    {
      id: 'ts_0_dhuha',
      slotNumber: 0,
      startTime: '06:45',
      endTime: '07:00',
      label: 'Sholat Dhuha',
      type: 'DHUHA',
      description: "Sholat Dhuha Berjamaah & Tadarus Al-Qur'an",
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_1',
      slotNumber: 1,
      startTime: '07:00',
      endTime: '07:45',
      label: 'Jam Ke-1',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-1 / Upacara Senin',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_2',
      slotNumber: 2,
      startTime: '07:45',
      endTime: '08:30',
      label: 'Jam Ke-2',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-2',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_3',
      slotNumber: 3,
      startTime: '08:30',
      endTime: '09:15',
      label: 'Jam Ke-3',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-3',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_break_1',
      slotNumber: 3.5,
      startTime: '09:15',
      endTime: '09:30',
      label: 'Istirahat Pagi',
      type: 'BREAK',
      description: 'Istirahat I (15 Menit)',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_4',
      slotNumber: 4,
      startTime: '09:30',
      endTime: '10:15',
      label: 'Jam Ke-4',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-4',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_5',
      slotNumber: 5,
      startTime: '10:15',
      endTime: '11:00',
      label: 'Jam Ke-5',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-5',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_6',
      slotNumber: 6,
      startTime: '11:00',
      endTime: '11:45',
      label: 'Jam Ke-6',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-6',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_dhuhur',
      slotNumber: 6.5,
      startTime: '11:45',
      endTime: '12:30',
      label: 'Dhuhur Berjamaah',
      type: 'DHUHUR',
      description: 'Istirahat II & Sholat Dhuhur Berjamaah / Sholat Jumat',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_7',
      slotNumber: 7,
      startTime: '12:30',
      endTime: '13:15',
      label: 'Jam Ke-7',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-7',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_8',
      slotNumber: 8,
      startTime: '13:15',
      endTime: '14:00',
      label: 'Jam Ke-8',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-8',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_9',
      slotNumber: 9,
      startTime: '14:00',
      endTime: '14:45',
      label: 'Jam Ke-9',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-9',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_10',
      slotNumber: 10,
      startTime: '14:45',
      endTime: '15:30',
      label: 'Jam Ke-10',
      type: 'TEACHING',
      description: 'Jam Pembelajaran Ke-10 / Mujahadah',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    },
    {
      id: 'ts_mujahadah',
      slotNumber: 10.5,
      startTime: '15:30',
      endTime: '16:00',
      label: 'Mujahadah & Penutupan',
      type: 'MUJAHADAH',
      description: 'Mujahadah & Doa Bersama Akhir Pekan',
      status: 'ACTIVE',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    }
  ]

  /**
   * Get all canonical time slots
   */
  public async getTimeSlots(day?: DayOfWeek): Promise<TimeSlotEntity[]> {
    if (!day) return [...this.defaultSlots]
    return this.defaultSlots.filter((s) => !s.dayOfWeek || s.dayOfWeek === day)
  }

  /**
   * Get only teaching session slots (periods 1 - 10)
   */
  public async getTeachingSlots(): Promise<TimeSlotEntity[]> {
    return this.defaultSlots.filter((s) => s.type === 'TEACHING')
  }

  /**
   * Get only non-teaching agendas (Dhuha, Istirahat, Dhuhur, Mujahadah, etc.)
   */
  public async getNonTeachingAgendas(): Promise<TimeSlotEntity[]> {
    return this.defaultSlots.filter((s) => s.type !== 'TEACHING')
  }

  /**
   * Verify if a period number represents a teaching slot
   */
  public isTeachingSlot(periodNumber: number): boolean {
    const slot = this.defaultSlots.find((s) => s.slotNumber === periodNumber)
    return !!slot && slot.type === 'TEACHING'
  }

  /**
   * Find time slot by period number
   */
  public getTimeSlotForPeriod(periodNumber: number): TimeSlotEntity | undefined {
    return this.defaultSlots.find((s) => s.slotNumber === periodNumber)
  }

  /**
   * Format time range label
   */
  public formatPeriodRange(periodStart: number, periodEnd: number): string {
    const start = this.getTimeSlotForPeriod(periodStart)
    const end = this.getTimeSlotForPeriod(periodEnd)
    if (start && end) {
      return `${start.startTime} - ${end.endTime}`
    }
    return `Jam ${periodStart}-${periodEnd}`
  }
}

export const timeSlotService = TimeSlotService.getInstance()
