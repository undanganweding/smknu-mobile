/**
 * Runner for Phase 5 Real Google Sheets / Apps Script Integration Tests in Node.js
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

import { runPhase5Tests } from '../src/core/tests/phase5-cloud-sync.test'

runPhase5Tests()
  .then(() => {
    console.log('Phase 5 test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 5 tests failed:', err)
    process.exit(1)
  })
