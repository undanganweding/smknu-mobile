/**
 * Guru Offline - Global Connectivity & Sync State Manager
 * Canonical Target: Single source of truth for online/offline state and sync status
 */

import { ref } from 'vue'
import type { GlobalSyncStatus } from '../../types/cloud'
import { pendingMutationQueue } from './PendingMutationQueue'

export interface ConnectivityState {
  isOnline: boolean
  syncStatus: GlobalSyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  lastError: string | null
}

export type ConnectivityListener = (state: ConnectivityState) => void

export class ConnectivityManager {
  private static instance: ConnectivityManager

  // Reactive state properties
  public readonly isOnline = ref<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  public readonly syncStatus = ref<GlobalSyncStatus>('ONLINE_SYNCED')
  public readonly pendingCount = ref<number>(0)
  public readonly lastSyncedAt = ref<string | null>(null)
  public readonly lastError = ref<string | null>(null)

  private listeners: Set<ConnectivityListener> = new Set()
  private heartbeatInterval: any = null
  private onOnlineCallback: (() => Promise<void>) | null = null

  public static getInstance(): ConnectivityManager {
    if (!ConnectivityManager.instance) {
      ConnectivityManager.instance = new ConnectivityManager()
    }
    return ConnectivityManager.instance
  }

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    if (typeof window === 'undefined') return

    // Refresh pending count on boot
    await this.refreshPendingCount()

    // Register browser connectivity listeners if supported
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => this.handleNetworkChange(true))
      window.addEventListener('offline', () => this.handleNetworkChange(false))
    }

    // Start background heartbeat every 15s
    this.startHeartbeat()
  }

  /**
   * Set callback to run when reconnection is detected
   */
  public registerAutoSyncHandler(handler: () => Promise<void>): void {
    this.onOnlineCallback = handler
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  public getState(): ConnectivityState {
    return {
      isOnline: this.isOnline.value,
      syncStatus: this.syncStatus.value,
      pendingCount: this.pendingCount.value,
      lastSyncedAt: this.lastSyncedAt.value,
      lastError: this.lastError.value
    }
  }

  /**
   * Refresh pending count directly from IndexedDB
   */
  public async refreshPendingCount(): Promise<number> {
    try {
      const count = await pendingMutationQueue.getPendingCount()
      this.pendingCount.value = count
      this.recalculateStatus()
      return count
    } catch {
      return this.pendingCount.value
    }
  }

  /**
   * Update sync status
   */
  public setSyncStatus(status: GlobalSyncStatus, error?: string): void {
    this.syncStatus.value = status
    if (error) {
      this.lastError.value = error
    }
    if (status === 'ONLINE_SYNCED') {
      this.lastSyncedAt.value = new Date().toISOString()
      this.lastError.value = null
    }
    this.notify()
  }

  private async handleNetworkChange(online: boolean): Promise<void> {
    const wasOffline = !this.isOnline.value
    this.isOnline.value = online

    await this.refreshPendingCount()

    if (online && wasOffline) {
      console.log('[ConnectivityManager] Online detected. Initiating automatic sync...')
      if (this.onOnlineCallback) {
        try {
          await this.onOnlineCallback()
        } catch (err: any) {
          console.error('[ConnectivityManager] Auto-sync failed:', err)
        }
      }
    } else {
      this.recalculateStatus()
    }
  }

  private recalculateStatus(): void {
    if (!this.isOnline.value) {
      this.syncStatus.value = 'OFFLINE_PENDING'
    } else if (this.syncStatus.value === 'ONLINE_SYNCING') {
      // Keep syncing
    } else if (this.pendingCount.value > 0) {
      this.syncStatus.value = 'OFFLINE_PENDING'
    } else {
      this.syncStatus.value = 'ONLINE_SYNCED'
    }
    this.notify()
  }

  private notify(): void {
    const state = this.getState()
    this.listeners.forEach((listener) => {
      try {
        listener(state)
      } catch (err) {
        console.error('[ConnectivityManager] Listener error:', err)
      }
    })
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = setInterval(async () => {
      await this.refreshPendingCount()
    }, 15000)
  }
}

export const connectivityManager = ConnectivityManager.getInstance()
