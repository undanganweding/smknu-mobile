/**
 * Guru Offline - Teacher Schedule Notification & Reminder Service
 * Handles schedule awareness alerts:
 * 1. X minutes before class starts (lead time, default 5m)
 * 2. When class session starts (on start)
 * 3. 10 minutes before class ends (wrap-up warning)
 * 4. 5 minutes before next upcoming class
 *
 * Supports browser Notifications (if granted) + In-App Notification events (fallback).
 */

import type { TeacherResolvedScheduleItem } from '../master/ScheduleService'

export interface ScheduleNotificationSettings {
  enabled: boolean
  leadTimeMinutes: number // e.g. 5
  notifyOnStart: boolean
  notifyBeforeEndMinutes: number // e.g. 10
  notifyNextClassMinutes: number // e.g. 5
  soundEnabled: boolean
}

export type ScheduleAlertType =
  'STARTING_SOON' | 'SESSION_STARTED' | 'ENDING_SOON' | 'NEXT_CLASS_REMINDER'

export interface ScheduleAlert {
  id: string
  type: ScheduleAlertType
  title: string
  message: string
  scheduleId: string
  className: string
  subjectName: string
  roomName: string
  timeStart: string
  timeEnd: string
  minutesRemaining?: number
  timestamp: string
}

const SETTINGS_KEY = 'guru_schedule_notification_settings'

export class TeacherScheduleNotificationService {
  private static instance: TeacherScheduleNotificationService | null = null
  private listeners: Set<(alert: ScheduleAlert) => void> = new Set()
  private sentAlertIds: Set<string> = new Set()

  public static getInstance(): TeacherScheduleNotificationService {
    if (!TeacherScheduleNotificationService.instance) {
      TeacherScheduleNotificationService.instance = new TeacherScheduleNotificationService()
    }
    return TeacherScheduleNotificationService.instance
  }

  public getSettings(): ScheduleNotificationSettings {
    const defaultSettings: ScheduleNotificationSettings = {
      enabled: true,
      leadTimeMinutes: 5,
      notifyOnStart: true,
      notifyBeforeEndMinutes: 10,
      notifyNextClassMinutes: 5,
      soundEnabled: false
    }

    if (typeof localStorage === 'undefined') return defaultSettings

    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch {
      // Fallback
    }

    return defaultSettings
  }

  public saveSettings(
    settings: Partial<ScheduleNotificationSettings>
  ): ScheduleNotificationSettings {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
    }
    return updated
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }
    try {
      const perm = await Notification.requestPermission()
      return perm === 'granted'
    } catch {
      return false
    }
  }

  public hasNotificationPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    return Notification.permission === 'granted'
  }

  public onInAppAlert(listener: (alert: ScheduleAlert) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Helper to parse "HH:MM" into minutes from midnight
   */
  public parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10))
    return (h || 0) * 60 + (m || 0)
  }

  /**
   * Evaluate schedule alerts for the given schedules and time
   */
  public evaluateScheduleAlerts(
    schedules: TeacherResolvedScheduleItem[],
    now = new Date()
  ): ScheduleAlert[] {
    const settings = this.getSettings()
    if (!settings.enabled) return []

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dateStr = now.toISOString().split('T')[0]
    const alerts: ScheduleAlert[] = []

    for (const s of schedules) {
      const startMin = this.parseTimeToMinutes(s.timeStart)
      const endMin = this.parseTimeToMinutes(s.timeEnd)

      // 1. Lead time alert (e.g. 5 minutes before start)
      const leadTimeDiff = startMin - currentMinutes
      if (leadTimeDiff > 0 && leadTimeDiff <= settings.leadTimeMinutes) {
        const alertId = `${dateStr}_${s.id}_STARTING_SOON_${leadTimeDiff}`
        if (!this.sentAlertIds.has(alertId)) {
          alerts.push({
            id: alertId,
            type: 'STARTING_SOON',
            title: `Persiapan Kelas: ${s.className}`,
            message: `Kelas ${s.subjectName} di ${s.roomName} akan dimulai dalam ${leadTimeDiff} menit (${s.timeStart} WIB).`,
            scheduleId: s.id,
            className: s.className,
            subjectName: s.subjectName,
            roomName: s.roomName,
            timeStart: s.timeStart,
            timeEnd: s.timeEnd,
            minutesRemaining: leadTimeDiff,
            timestamp: now.toISOString()
          })
        }
      }

      // 2. On session started
      if (settings.notifyOnStart && currentMinutes >= startMin && currentMinutes < startMin + 3) {
        const alertId = `${dateStr}_${s.id}_SESSION_STARTED`
        if (!this.sentAlertIds.has(alertId)) {
          alerts.push({
            id: alertId,
            type: 'SESSION_STARTED',
            title: `Kelas Dimulai: ${s.className}`,
            message: `Sesi tatap muka ${s.subjectName} di ${s.roomName} sedang berlangsung. Silakan buka presensi siswa.`,
            scheduleId: s.id,
            className: s.className,
            subjectName: s.subjectName,
            roomName: s.roomName,
            timeStart: s.timeStart,
            timeEnd: s.timeEnd,
            timestamp: now.toISOString()
          })
        }
      }

      // 3. Ending soon alert (e.g. 10 minutes before end)
      const endDiff = endMin - currentMinutes
      if (currentMinutes > startMin && endDiff > 0 && endDiff <= settings.notifyBeforeEndMinutes) {
        const alertId = `${dateStr}_${s.id}_ENDING_SOON_${endDiff}`
        if (!this.sentAlertIds.has(alertId)) {
          alerts.push({
            id: alertId,
            type: 'ENDING_SOON',
            title: `Peringatan Akhir Sesi: ${s.className}`,
            message: `Sesi ${s.subjectName} akan berakhir dalam ${endDiff} menit (${s.timeEnd} WIB). Pastikan presensi & jurnal telah terisi.`,
            scheduleId: s.id,
            className: s.className,
            subjectName: s.subjectName,
            roomName: s.roomName,
            timeStart: s.timeStart,
            timeEnd: s.timeEnd,
            minutesRemaining: endDiff,
            timestamp: now.toISOString()
          })
        }
      }
    }

    return alerts
  }

  /**
   * Dispatch alert to browser notification and in-app listeners
   */
  public dispatchAlert(alert: ScheduleAlert): void {
    if (this.sentAlertIds.has(alert.id)) return
    this.sentAlertIds.add(alert.id)

    // In-app listeners
    this.listeners.forEach((listener) => {
      try {
        listener(alert)
      } catch {
        // Ignore listener error
      }
    })

    // Browser Notification
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(alert.title, {
          body: alert.message,
          icon: '/favicon.ico'
        })
      } catch {
        // Fallback silently
      }
    }
  }

  /**
   * Determine timing status and label for next class
   */
  public getTimingStatus(
    timeStart: string,
    timeEnd: string,
    now = new Date()
  ): {
    status: 'COMPLETED' | 'ONGOING' | 'STARTING_SOON' | 'UPCOMING'
    label: string
    minutesToStart: number
    minutesToEnd: number
  } {
    const curMin = now.getHours() * 60 + now.getMinutes()
    const startMin = this.parseTimeToMinutes(timeStart)
    const endMin = this.parseTimeToMinutes(timeEnd)

    if (curMin >= endMin) {
      return {
        status: 'COMPLETED',
        label: 'Selesai',
        minutesToStart: 0,
        minutesToEnd: 0
      }
    }

    if (curMin >= startMin && curMin < endMin) {
      const remaining = endMin - curMin
      return {
        status: 'ONGOING',
        label: remaining <= 10 ? `Selesai dalam ${remaining} mnt` : 'Sedang Berlangsung',
        minutesToStart: 0,
        minutesToEnd: remaining
      }
    }

    const wait = startMin - curMin
    if (wait <= 15) {
      return {
        status: 'STARTING_SOON',
        label: `${wait} menit lagi`,
        minutesToStart: wait,
        minutesToEnd: endMin - curMin
      }
    }

    return {
      status: 'UPCOMING',
      label: `${wait} menit lagi`,
      minutesToStart: wait,
      minutesToEnd: endMin - curMin
    }
  }
}

export const teacherScheduleNotificationService = TeacherScheduleNotificationService.getInstance()
