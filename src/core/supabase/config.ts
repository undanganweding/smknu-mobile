/**
 * Supabase Configuration & Environment Utilities
 * Production Cloud Architecture for Guru Offline - SMK NU Ungaran
 */

export interface SupabaseConfig {
  url: string
  anonKey: string
  isConfigured: boolean
}

export function getSupabaseConfig(): SupabaseConfig {
  const env: any =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env
      : typeof process !== 'undefined' && process.env
        ? process.env
        : {}

  const url = env.VITE_SUPABASE_URL || ''
  const anonKey = env.VITE_SUPABASE_ANON_KEY || ''

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    anonKey.length > 20 &&
    !url.includes('your-project')
  )

  return {
    url,
    anonKey,
    isConfigured
  }
}
