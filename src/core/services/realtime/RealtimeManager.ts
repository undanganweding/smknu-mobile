/**
 * Guru Offline - Supabase Realtime Subscription Manager
 * Canonical Target: Granular realtime updates for operational events & alerts.
 * Follows the pattern: Realtime event -> Invalidate/fetch affected data -> Update IndexedDB -> Notify UI
 */

import { getSupabaseClient } from '../../supabase/client'
import { indexedDb } from '../../db/indexedDb'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RealtimeEventHandler = (payload: {
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any
}) => void

export class RealtimeManager {
  private static instance: RealtimeManager
  private channel: RealtimeChannel | null = null
  private handlers: Set<RealtimeEventHandler> = new Set()

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager()
    }
    return RealtimeManager.instance
  }

  /**
   * Initialize Realtime channel for high-priority operational tables
   */
  public init(): void {
    const supabase = getSupabaseClient()
    if (!supabase || this.channel) return

    try {
      this.channel = supabase
        .channel('school_realtime_events')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'announcements' },
          (payload) => this.handleIncomingEvent('announcements', payload)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'school_agendas' },
          (payload) => this.handleIncomingEvent('school_agendas', payload)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) =>
          this.handleIncomingEvent('schedules', payload)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) =>
          this.handleIncomingEvent('submissions', payload)
        )
        .subscribe((status) => {
          console.log('[RealtimeManager] Subscription status:', status)
        })
    } catch (err) {
      console.warn('[RealtimeManager] Failed to subscribe to realtime events:', err)
    }
  }

  /**
   * Subscribe an external component / store to realtime events
   */
  public onEvent(handler: RealtimeEventHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  /**
   * Process event: update local IndexedDB cache and notify UI handlers
   */
  private async handleIncomingEvent(table: string, payload: any): Promise<void> {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
    const newRecord = payload.new
    const oldRecord = payload.old

    console.log(`[RealtimeManager] Event on ${table}: ${eventType}`, newRecord?.id || oldRecord?.id)

    // Update local cache
    try {
      const db = await indexedDb.getDatabase()
      if (db.objectStoreNames.contains(table)) {
        const tx = db.transaction(table, 'readwrite')
        const store = tx.objectStore(table)

        if (eventType === 'DELETE' && oldRecord?.id) {
          store.delete(oldRecord.id)
        } else if (newRecord) {
          store.put(newRecord)
        }
      }
    } catch (err) {
      console.warn('[RealtimeManager] Error updating local cache from realtime:', err)
    }

    // Broadcast to UI subscribers
    this.handlers.forEach((h) => {
      try {
        h({
          table,
          eventType,
          new: newRecord,
          old: oldRecord
        })
      } catch (err) {
        console.error('[RealtimeManager] Handler error:', err)
      }
    })
  }

  public destroy(): void {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.handlers.clear()
  }
}

export const realtimeManager = RealtimeManager.getInstance()
