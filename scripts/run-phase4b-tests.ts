/**
 * Runner for Phase 4 Reporting, Governance & Academic Closing Tests in Node.js
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

import { runPhase4ReportingAndClosingTests } from '../src/core/tests/phase4-reporting-closing.test'

runPhase4ReportingAndClosingTests()
  .then(() => {
    console.log('Phase 4b test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 4b tests failed:', err)
    process.exit(1)
  })
