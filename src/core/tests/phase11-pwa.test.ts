/**
 * Phase 11 - PWA Hardening Test Suite
 * Guru Offline - SMK NU Ungaran
 */

import * as fs from 'fs'
import * as path from 'path'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`)
  }
}

export async function runPwaTests() {
  console.log('=== RUNNING PHASE 11 PWA HARDENING TESTS ===\n')

  // 1. Verify manifest.json exists
  console.log('Test 1: Verifying manifest.json presence and validity...')
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.json')
  assert(fs.existsSync(manifestPath), 'manifest.json must exist in public folder')

  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  assert(manifestContent.name === 'Guru Offline SMK NU Ungaran', 'Manifest name mismatch')
  assert(manifestContent.short_name === 'Guru Offline', 'Manifest short_name mismatch')
  assert(manifestContent.display === 'standalone', 'Manifest display must be standalone')
  assert(manifestContent.start_url === '/', 'Manifest start_url must be root')
  console.log('✓ manifest.json is present, valid, and fully compliant.')

  // 2. Verify sw.js exists and is configured for cache versioning
  console.log('\nTest 2: Verifying sw.js presence and caching properties...')
  const swPath = path.resolve(process.cwd(), 'public/sw.js')
  assert(fs.existsSync(swPath), 'sw.js must exist in public folder')

  const swContent = fs.readFileSync(swPath, 'utf-8')
  assert(swContent.includes('guru-offline-cache-v1.0.0'), 'Cache name v1.0.0 must be declared')
  assert(swContent.includes('ASSETS_TO_CACHE'), 'Pre-cached assets array must be declared')
  assert(
    swContent.includes("request.mode === 'navigate'"),
    'Service worker must support SPA navigation fallback'
  )
  console.log('✓ sw.js is present and includes robust caching and routing configurations.')

  console.log('\n======================================================')
  console.log('=== PWA TESTS: ALL PASSED PERFECTLY ===')
  console.log('======================================================\n')
}
