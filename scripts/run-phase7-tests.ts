/**
 * Runner for Phase 7 Admin System & School Management Core Tests in Node.js
 */
import 'fake-indexeddb/auto'

if (typeof window === 'undefined') {
  ;(globalThis as any).window = globalThis
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

import { runPhase7Tests } from '../src/core/tests/phase7-admin.test'

runPhase7Tests()
  .then(() => {
    console.log('Phase 7 test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 7 tests failed:', err)
    process.exit(1)
  })
