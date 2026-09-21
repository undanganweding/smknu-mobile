/**
 * Runner for Phase 11 PWA Hardening Tests
 */

import { runPwaTests } from '../src/core/tests/phase11-pwa.test'

runPwaTests()
  .then(() => {
    console.log('Phase 11 PWA tests completed successfully.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Phase 11 PWA tests failed:', err)
    process.exit(1)
  })
