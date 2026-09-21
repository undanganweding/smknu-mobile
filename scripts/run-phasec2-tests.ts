/**
 * Runner for Phase C2 Academic Ledger Tests in Node.js
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

import { runPhaseC2Tests } from '../src/core/tests/phase-c2-academic-ledger.test'

runPhaseC2Tests()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase C2 Tests Failed:', err)
    process.exit(1)
  })
