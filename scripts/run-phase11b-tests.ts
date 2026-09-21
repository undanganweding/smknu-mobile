/**
 * Runner for Phase 11b Native Google Workspace Integration Tests in Node.js
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

import { runPhase11bTests } from '../src/core/tests/phase11b-native-integration.test'

runPhase11bTests()
  .then(() => {
    console.log('Phase 11b test suite completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 11b tests failed:', err)
    process.exit(1)
  })
