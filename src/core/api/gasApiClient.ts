/**
 * Guru Offline - Google Apps Script Client API Bridge
 * Handles HTTP dispatch to Google Apps Script Web App or local Mock Server fallback.
 */

import { gasMockServer } from './gasMockServer'
import type { GasSyncRequestPayload, GasSyncResponsePayload } from '../types'

export class GasApiClient {
  private static instance: GasApiClient | null = null
  private forceMock = false

  public static getInstance(): GasApiClient {
    if (!GasApiClient.instance) {
      GasApiClient.instance = new GasApiClient()
    }
    return GasApiClient.instance
  }

  public setForceMock(enabled: boolean): void {
    this.forceMock = enabled
  }

  public getApiUrl(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL
    }
    if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) {
      return process.env.VITE_API_URL
    }
    return ''
  }

  /**
   * Post sync mutation payload to Google Apps Script or Mock Server
   */
  public async sendMutation(payload: GasSyncRequestPayload): Promise<GasSyncResponsePayload> {
    const apiUrl = this.getApiUrl()

    // If forceMock is explicitly enabled (e.g. unit/integration test suites)
    if (this.forceMock) {
      return gasMockServer.handlePost(payload)
    }

    const isValidScriptUrl =
      apiUrl &&
      (apiUrl.startsWith('https://script.google.com/macros/s/') ||
        apiUrl.startsWith('https://script.google.com/'))

    // In production mode, if VITE_API_URL is missing or invalid, return a explicit config error
    if (!isValidScriptUrl) {
      return {
        success: false,
        operationId: payload.operationId,
        entityId: payload.entityId,
        entityType: payload.entityType,
        message:
          'URL Web App Google Apps Script (VITE_API_URL) belum dikonfigurasi di file .env. Silakan pasang URL Web App Google Apps Script yang valid.',
        errorCode: 'CONFIG_ERROR',
        isRetryable: false,
        syncedAt: new Date().toISOString()
      }
    }

    // Real HTTP POST to Google Apps Script Web App
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      })

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()
      let data: GasSyncResponsePayload
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Format respon dari Apps Script tidak valid: ${text.substring(0, 100)}`)
      }

      return data
    } catch (err: any) {
      // Return structured network error payload
      return {
        success: false,
        operationId: payload.operationId,
        entityId: payload.entityId,
        entityType: payload.entityType,
        message: err.message || 'Gagal terhubung ke Google Apps Script backend.',
        errorCode: 'SERVER_ERROR',
        isRetryable: true,
        syncedAt: new Date().toISOString()
      }
    }
  }
}

export const gasApiClient = GasApiClient.getInstance()
