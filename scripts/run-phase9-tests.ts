/**
 * Runner for Phase 9 Data Onboarding, Import/Export & Bulk Tests in Node.js
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

import { runPhase9Tests } from '../src/core/tests/phase9-import-bulk.test'

runPhase9Tests()
  .then(() => {
    console.log('Phase 9 test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 9 tests failed:', err)
    process.exit(1)
  })
