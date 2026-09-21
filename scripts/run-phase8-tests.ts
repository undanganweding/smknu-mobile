/**
 * Runner for Phase 8 Reporting & Operational Administration Tests in Node.js
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

import { runPhase8Tests } from '../src/core/tests/phase8-reporting.test'

runPhase8Tests()
  .then(() => {
    console.log('Phase 8 test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 8 tests failed:', err)
    process.exit(1)
  })
