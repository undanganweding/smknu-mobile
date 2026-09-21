/**
 * Runner for Phase 3C Assessment Tests in Node.js
 */
import 'fake-indexeddb/auto'

if (typeof window === 'undefined') {
  ;(globalThis as any).window = globalThis
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

import { runPhase3cTests } from '../src/core/tests/phase3c-assessment.test'

runPhase3cTests()
  .then(() => {
    console.log('Phase 3C test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 3C tests failed:', err)
    process.exit(1)
  })
