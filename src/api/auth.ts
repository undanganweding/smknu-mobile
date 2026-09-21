/**
 * Guru Offline - 100% Offline Auth API Bridge
 * Direct Integration with AuthService and IndexedDB
 */

import { authService } from '@/core/services/auth'

/**
 * Local offline login
 */
export async function fetchLogin(params: Api.Auth.LoginParams): Promise<Api.Auth.LoginResponse> {
  const res = await authService.login(params.userName, params.password)
  if (!res.success || !res.session) {
    throw new Error(res.message || 'Login gagal.')
  }
  return {
    token: res.session.sessionId,
    refreshToken: res.session.sessionId
  }
}

/**
 * Local offline user info retrieval from active session
 */
export async function fetchGetUserInfo(): Promise<Api.Auth.UserInfo> {
  const session = authService.getCurrentSession()
  if (!session) {
    throw new Error('Sesi tidak ditemukan. Silakan login kembali.')
  }

  return {
    userId: session.userId as any,
    userName: session.username,
    email: `${session.username.toLowerCase()}@smknuungaran.sch.id`,
    roles: [session.role],
    buttons: session.role === 'ADMIN' ? ['admin:all'] : ['teacher:all']
  }
}
