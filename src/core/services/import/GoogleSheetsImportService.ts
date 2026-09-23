/**
 * Guru Offline - Google Sheets Master Data Import Architecture
 * Flow: Sheet URL/CSV -> Fetch -> Validate & Normalize -> Preview -> Admin Confirm -> Supabase / Repository
 * Credentials are never exposed to client-side.
 */

import { repositories } from '../../repositories'
import type { TeacherEntity } from '../../types'

export interface SheetImportPreviewResult<T> {
  entityType: 'TEACHERS' | 'STUDENTS' | 'SUBJECTS' | 'CLASSES'
  totalRows: number
  validRows: T[]
  invalidRows: { rowNumber: number; raw: any; errors: string[] }[]
  duplicates: { rowNumber: number; identifier: string }[]
  canCommit: boolean
}

export class GoogleSheetsImportService {
  private static instance: GoogleSheetsImportService

  public static getInstance(): GoogleSheetsImportService {
    if (!GoogleSheetsImportService.instance) {
      GoogleSheetsImportService.instance = new GoogleSheetsImportService()
    }
    return GoogleSheetsImportService.instance
  }

  /**
   * Convert standard Google Sheet URL to direct CSV export URL
   */
  public normalizeSheetUrl(inputUrl: string): string {
    const trimmed = inputUrl.trim()
    // Match /d/{SHEET_ID}
    const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (match && match[1]) {
      const sheetId = match[1]
      // Extract gid if present
      const gidMatch = trimmed.match(/[#&]gid=([0-9]+)/)
      const gid = gidMatch ? gidMatch[1] : '0'
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
    }
    return trimmed
  }

  /**
   * Fetch and parse CSV content from a URL or raw CSV string
   */
  public async fetchAndParseCsv(urlOrRaw: string): Promise<string[][]> {
    let csvText = urlOrRaw
    if (urlOrRaw.startsWith('http://') || urlOrRaw.startsWith('https://')) {
      const directUrl = this.normalizeSheetUrl(urlOrRaw)
      const resp = await fetch(directUrl)
      if (!resp.ok) {
        throw new Error(
          `Gagal mengambil data dari Google Sheets (HTTP ${resp.status}). Pastikan sheet diset Publik/Dapat Diakses.`
        )
      }
      csvText = await resp.text()
    }
    return this.parseCsvLines(csvText)
  }

  /**
   * Generate Preview for Teachers data
   */
  public async previewTeachers(
    rows: string[][]
  ): Promise<SheetImportPreviewResult<Partial<TeacherEntity>>> {
    if (rows.length < 2) {
      throw new Error('File CSV tidak memiliki data yang cukup (minimal baris header dan 1 data).')
    }

    const header = rows[0].map((h) => h.toLowerCase().trim())
    const nameIdx = header.findIndex((h) => h.includes('nama') || h.includes('name'))
    const nipIdx = header.findIndex((h) => h.includes('nip'))
    const nuptkIdx = header.findIndex((h) => h.includes('nuptk'))
    const genderIdx = header.findIndex(
      (h) => h.includes('jk') || h.includes('gender') || h.includes('l/p')
    )
    const phoneIdx = header.findIndex(
      (h) => h.includes('hp') || h.includes('telepon') || h.includes('phone')
    )

    if (nameIdx === -1) {
      throw new Error('Kolom Nama Guru tidak ditemukan pada file.')
    }

    const validRows: Partial<TeacherEntity>[] = []
    const invalidRows: { rowNumber: number; raw: any; errors: string[] }[] = []
    const duplicates: { rowNumber: number; identifier: string }[] = []
    const seenNip = new Set<string>()

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue

      const name = (row[nameIdx] || '').trim()
      const nip = nipIdx !== -1 ? (row[nipIdx] || '').trim() : undefined
      const nuptk = nuptkIdx !== -1 ? (row[nuptkIdx] || '').trim() : undefined
      const genderRaw = genderIdx !== -1 ? (row[genderIdx] || '').trim().toUpperCase() : 'L'
      const gender = genderRaw.startsWith('P') ? 'P' : 'L'
      const phone = phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : undefined

      const errors: string[] = []
      if (!name) errors.push('Nama guru wajib diisi.')

      if (nip) {
        if (seenNip.has(nip)) {
          duplicates.push({ rowNumber: i + 1, identifier: nip })
          errors.push(`NIP duplicate: ${nip}`)
        } else {
          seenNip.add(nip)
        }
      }

      if (errors.length > 0) {
        invalidRows.push({ rowNumber: i + 1, raw: row, errors })
      } else {
        validRows.push({
          name,
          nip: nip || undefined,
          nuptk: nuptk || undefined,
          gender,
          phone: phone || undefined,
          status: 'ACTIVE'
        })
      }
    }

    return {
      entityType: 'TEACHERS',
      totalRows: rows.length - 1,
      validRows,
      invalidRows,
      duplicates,
      canCommit: validRows.length > 0
    }
  }

  /**
   * Commit verified teachers to Repository and Supabase
   */
  public async commitTeachers(teachers: Partial<TeacherEntity>[]): Promise<number> {
    let committed = 0
    for (const t of teachers) {
      if (!t.name) continue
      const now = new Date().toISOString()
      const entity: TeacherEntity = {
        id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: t.name,
        nip: t.nip,
        nuptk: t.nuptk,
        gender: t.gender || 'L',
        phone: t.phone,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }
      await repositories.teachers.create(entity)
      committed++
    }
    return committed
  }

  private parseCsvLines(text: string): string[][] {
    const lines = text.split(/\r?\n/)
    return lines
      .map((line) => {
        // Simple comma splitter handling basic quotes
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      })
      .filter((cols) => cols.some((c) => c.length > 0))
  }
}

export const googleSheetsImportService = GoogleSheetsImportService.getInstance()
