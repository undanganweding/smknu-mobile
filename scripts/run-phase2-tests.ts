/**
 * Runner for Phase 2 Auth & RBAC Tests in Node.js
 */
import 'fake-indexeddb/auto'

if (typeof window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

if (!globalThis.navigator) {
  ;(globalThis as any).navigator = { onLine: true }
} else {
  ;(globalThis as any).navigator.onLine = true
}

// Provide minimal localStorage shim for Node environment
if (!globalThis.localStorage) {
  const store: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      for (const k in store) delete store[k]
    },
    key: (i: number) => Object.keys(store)[i] || null,
    length: Object.keys(store).length
  } as any
}

import { connectivityManager } from '../src/core/services/sync/ConnectivityManager'
import { runPhase2Tests } from '../src/core/tests/phase2-auth.test'

async function main() {
  connectivityManager.isOnline.value = true
  const result = await runPhase2Tests()
  if (result.failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
