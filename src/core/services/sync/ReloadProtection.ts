/**
 * Guru Offline - Reload & Close Protection
 * Canonical Target: Warn users before reloading or closing tab when pending mutations exist.
 * Ensures zero data loss.
 */

import { connectivityManager } from './ConnectivityManager'

export class ReloadProtection {
  private static instance: ReloadProtection
  private isInstalled = false

  public static getInstance(): ReloadProtection {
    if (!ReloadProtection.instance) {
      ReloadProtection.instance = new ReloadProtection()
    }
    return ReloadProtection.instance
  }

  public install(): void {
    if (this.isInstalled || typeof window === 'undefined') return

    window.addEventListener('beforeunload', (event) => {
      const pendingCount = connectivityManager.pendingCount.value
      if (pendingCount > 0) {
        const message = `Terdapat ${pendingCount} perubahan yang belum tersinkronisasi ke server cloud. Menutup atau memuat ulang halaman dapat menunda sinkronisasi.`
        event.preventDefault()
        event.returnValue = message
        return message
      }
    })

    this.isInstalled = true
    console.log('[ReloadProtection] Active: Tab close and reload protection enabled.')
  }
}

export const reloadProtection = ReloadProtection.getInstance()
