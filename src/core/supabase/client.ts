/**
 * Supabase Client Singleton
 * Server-Side Source of Truth for Guru Offline - SMK NU Ungaran
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

let supabaseInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance

  const config = getSupabaseConfig()

  if (!config.isConfigured) {
    // When running locally before user supplies Supabase credentials,
    // we return null and fallback gracefully to IndexedDB Local Cache & Mutation Queue
    return null
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    return supabaseInstance
  } catch (error) {
    console.warn('[SupabaseClient] Initialization failed, operating in offline cache mode:', error)
    return null
  }
}

export const supabase = getSupabaseClient()
