/**
 * Phase 6 Real Production Deployment & Go-Live Test Runner
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
import { runPhase6GoLiveTests } from '../src/core/tests/phase6-golive.test'

async function main() {
  try {
    connectivityManager.isOnline.value = true
    await runPhase6GoLiveTests()
    console.log('Phase 6 test suite completed successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Phase 6 tests failed:', err)
    process.exit(1)
  }
}

main()
