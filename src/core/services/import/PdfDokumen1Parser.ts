/**
 * Guru Offline - Dokumen 1 PDF & XLSX Parser
 * Parses official SMK NU Ungaran Dokumen 1 (Kode Guru & Mata Pelajaran) from PDF and XLSX.
 */

import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'

// Configure pdfjs worker if in browser
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`
  } catch {
    // Ignore worker assignment error fallback
  }
}

export interface Dokumen1Row {
  no: number
  code: string
  teacherName: string
  cleanTeacherName: string
  subjectName: string
  hours: number
  rawText?: string
}

export interface Dokumen1ParseResult {
  success: boolean
  schoolName: string
  academicYear: string
  totalRows: number
  totalHours: number
  rows: Dokumen1Row[]
  rawLines?: string[]
  errors?: string[]
}

/**
 * Parses Dokumen 1 from XLSX/XLS ArrayBuffer
 */
export function parseDokumen1FromXlsx(buffer: ArrayBuffer): Dokumen1ParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert sheet to array of arrays
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    const parsedRows: Dokumen1Row[] = []
    let headerRowIndex = -1
    let colNo = 0
    let colCode = 1
    let colTeacher = 2
    let colSubject = 3
    let colHours = 4

    // Scan for header row
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r].map((cell: any) => String(cell).toUpperCase().trim())
      const noIdx = row.findIndex((c: string) => c === 'NO' || c === 'NOMOR')
      const codeIdx = row.findIndex((c: string) => c === 'KODE' || c === 'KODE GURU')
      const teacherIdx = row.findIndex(
        (c: string) => c.includes('NAMA') || c.includes('GURU') || c === 'NAMA GURU'
      )
      const subjectIdx = row.findIndex(
        (c: string) => c.includes('MAPEL') || c.includes('MATA PELAJARAN') || c === 'PELAJARAN'
      )
      const hoursIdx = row.findIndex(
        (c: string) => c === 'JAM' || c === 'JP' || c.includes('JAM') || c.includes('BEBAN')
      )

      if (codeIdx !== -1 && (teacherIdx !== -1 || subjectIdx !== -1)) {
        headerRowIndex = r
        if (noIdx !== -1) colNo = noIdx
        if (codeIdx !== -1) colCode = codeIdx
        if (teacherIdx !== -1) colTeacher = teacherIdx
        if (subjectIdx !== -1) colSubject = subjectIdx
        if (hoursIdx !== -1) colHours = hoursIdx
        break
      }
    }

    const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r]
      if (!row || row.length === 0) continue

      const rawCode = String(row[colCode] || '').trim()
      const rawTeacher = String(row[colTeacher] || '').trim()
      const rawSubject = String(row[colSubject] || '').trim()
      const rawHours = Number(row[colHours] || 0)
      const rawNo = parseInt(String(row[colNo] || parsedRows.length + 1), 10)

      // Skip header or empty rows or signature rows
      if (
        !rawCode ||
        rawCode.toUpperCase() === 'KODE' ||
        rawTeacher.toUpperCase().includes('KEPALA') ||
        rawTeacher.toUpperCase().includes('MENGETAHUI')
      ) {
        continue
      }

      const cleanTeacherName = rawTeacher.replace(/\.\d+$/, '').trim()

      parsedRows.push({
        no: isNaN(rawNo) ? parsedRows.length + 1 : rawNo,
        code: rawCode,
        teacherName: rawTeacher,
        cleanTeacherName: cleanTeacherName || rawTeacher,
        subjectName: rawSubject,
        hours: isNaN(rawHours) ? 0 : rawHours
      })
    }

    const totalHours = parsedRows.reduce((sum, r) => sum + r.hours, 0)

    return {
      success: parsedRows.length > 0,
      schoolName: 'SMK NU UNGARAN',
      academicYear: '2026/2027',
      totalRows: parsedRows.length,
      totalHours,
      rows: parsedRows
    }
  } catch (err: any) {
    return {
      success: false,
      schoolName: 'SMK NU UNGARAN',
      academicYear: '2026/2027',
      totalRows: 0,
      totalHours: 0,
      rows: [],
      errors: [err.message || 'Gagal membaca format XLSX']
    }
  }
}

/**
 * Parses Dokumen 1 from PDF ArrayBuffer
 */
export async function parseDokumen1FromPdf(buffer: ArrayBuffer): Promise<Dokumen1ParseResult> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      useSystemFonts: true,
      disableFontFace: false
    })
    const pdf = await loadingTask.promise
    const allLines: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Group text items by vertical position (Y coordinate with 4px tolerance)
      const lineMap: Map<number, Array<{ x: number; text: string }>> = new Map()

      for (const item of textContent.items) {
        if (!('str' in item)) continue
        const str = item.str.trim()
        if (!str) continue

        const transform = item.transform
        const x = transform[4]
        const y = Math.round(transform[5])

        // Find closest Y bucket
        let foundY: number | null = null
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - y) <= 4) {
            foundY = existingY
            break
          }
        }

        const bucketY = foundY !== null ? foundY : y
        if (!lineMap.has(bucketY)) {
          lineMap.set(bucketY, [])
        }
        lineMap.get(bucketY)!.push({ x, text: item.str })
      }

      // Sort lines from top (highest Y in PDF coordinate system) to bottom
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a)

      for (const y of sortedY) {
        const itemsInLine = lineMap.get(y)!
        // Sort items left to right
        itemsInLine.sort((a, b) => a.x - b.x)
        const lineText = itemsInLine
          .map((i) => i.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (lineText) {
          allLines.push(lineText)
        }
      }
    }

    // Now parse rows from allLines
    const parsedRows: Dokumen1Row[] = []
    let currentPendingRow: Partial<Dokumen1Row> | null = null

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i]

      // Filter out header and footer noise
      if (
        line.includes('KODE GURU DAN MATA PELAJARAN') ||
        line.includes('SMK NU UNGARAN') ||
        line.includes('TAHUN PELAJARAN') ||
        line.includes('Mengetahui') ||
        line.includes('Kepala SMK') ||
        line.includes('Ungaran,') ||
        line.includes('WKS 1') ||
        line.startsWith('NO KODE NAMA')
      ) {
        continue
      }

      // Regex to match a table row:
      // Pattern: ^(\d+)\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)$
      // Or with suffix like .1, .2
      const strictRowMatch = line.match(/^(\d+)\s+([A-Z][A-Z0-9_-]*)\s+(.+?)\s+(\d+)$/)

      if (strictRowMatch) {
        // If we had a pending row, push it first
        if (currentPendingRow && currentPendingRow.code && currentPendingRow.hours !== undefined) {
          parsedRows.push(currentPendingRow as Dokumen1Row)
          currentPendingRow = null
        }

        const no = parseInt(strictRowMatch[1], 10)
        const code = strictRowMatch[2]
        const middle = strictRowMatch[3].trim()
        const hours = parseInt(strictRowMatch[4], 10)

        // Middle contains teacherName and subjectName.
        // Let's separate them smartly using degree abbreviations or suffixes (.1, .2, S.Pd., S.Kom., etc.)
        const { teacherName, subjectName } = separateTeacherAndSubject(middle)

        const cleanTeacherName = teacherName.replace(/\.\d+$/, '').trim()

        parsedRows.push({
          no,
          code,
          teacherName,
          cleanTeacherName: cleanTeacherName || teacherName,
          subjectName,
          hours,
          rawText: line
        })
        continue
      }

      // Check if line starts a row without ending hours (hours might be on the next line or wrapped)
      const startRowMatch = line.match(/^(\d+)\s+([A-Z][A-Z0-9_-]*)\s+(.+)$/)
      if (startRowMatch) {
        if (currentPendingRow && currentPendingRow.code) {
          parsedRows.push(currentPendingRow as Dokumen1Row)
        }

        const no = parseInt(startRowMatch[1], 10)
        const code = startRowMatch[2]
        const middle = startRowMatch[3].trim()

        const { teacherName, subjectName } = separateTeacherAndSubject(middle)
        const cleanTeacherName = teacherName.replace(/\.\d+$/, '').trim()

        currentPendingRow = {
          no,
          code,
          teacherName,
          cleanTeacherName: cleanTeacherName || teacherName,
          subjectName,
          hours: 0,
          rawText: line
        }
        continue
      }

      // If this is a continuation line for subject or contains trailing hours
      if (currentPendingRow) {
        const trailingHoursMatch = line.match(/^(.*?)\s*(\d+)$/)
        if (trailingHoursMatch) {
          const extraSubject = trailingHoursMatch[1].trim()
          const hours = parseInt(trailingHoursMatch[2], 10)
          if (extraSubject) {
            currentPendingRow.subjectName =
              `${currentPendingRow.subjectName} ${extraSubject}`.trim()
          }
          currentPendingRow.hours = hours
          parsedRows.push(currentPendingRow as Dokumen1Row)
          currentPendingRow = null
        } else {
          // Additional text for subject
          currentPendingRow.subjectName = `${currentPendingRow.subjectName} ${line}`.trim()
        }
      }
    }

    if (currentPendingRow && currentPendingRow.code) {
      parsedRows.push(currentPendingRow as Dokumen1Row)
    }

    const totalHours = parsedRows.reduce((sum, r) => sum + r.hours, 0)

    return {
      success: parsedRows.length > 0,
      schoolName: 'SMK NU UNGARAN',
      academicYear: '2026/2027',
      totalRows: parsedRows.length,
      totalHours,
      rows: parsedRows,
      rawLines: allLines
    }
  } catch (err: any) {
    return {
      success: false,
      schoolName: 'SMK NU UNGARAN',
      academicYear: '2026/2027',
      totalRows: 0,
      totalHours: 0,
      rows: [],
      errors: [err.message || 'Gagal memproses dokumen PDF']
    }
  }
}

/**
 * Smart heuristic to separate Teacher Name and Subject Name from a combined text string
 */
function separateTeacherAndSubject(text: string): { teacherName: string; subjectName: string } {
  // Known teacher titles and suffixes:
  // e.g., "Siti Nur Asiyah, S.Pd.I. Pendidikan Agama dan Budi Pekerti"
  // e.g., "Dyan Nuryahya, S.Kom.1 Koding dan Kecerdasan Artifisial (pilihan XI)"
  // e.g., "NN-PJOK Pendidikan Jasmani, Olahraga, dan Kesehatan"
  // e.g., "Sifa Sirojuddin Anjay Ke-Nu-an"
  // e.g., "Lufita,S.Pd.1 Dasar-dasar Program Keahlian..."
  // e.g., "Andi Krisna Muhammad Ghalib, S.Tr.Anim.1 Projek Kreatif..."

  // Check for NN- codes first (like NN-PJOK, NN-DKV-1)
  if (text.startsWith('NN-')) {
    const spaceIdx = text.indexOf(' ')
    if (spaceIdx > 0) {
      return {
        teacherName: text.substring(0, spaceIdx).trim(),
        subjectName: text.substring(spaceIdx + 1).trim()
      }
    }
  }

  // Regex looking for academic degrees followed by optional index (.1, .2, 1, 2)
  const degreeRegex =
    /(,\s*(?:S\.Pd\.I|S\.Pd|M\.Pd|S\.Ud|S\.Kom|S\.Sn|S\.Ds|S\.Si|S\.Tr\.Anim|S\.S|S\.Psi|M\.Psi|A\.Md\.Kom|A\.Md|Drs|Ir)(?:\.[0-9]+|\s+[0-9]+)?)/i

  const match = text.match(degreeRegex)
  if (match && match.index !== undefined) {
    const cutPos = match.index + match[0].length
    const teacherName = text.substring(0, cutPos).trim()
    const subjectName = text.substring(cutPos).trim()
    return { teacherName, subjectName }
  }

  // Fallback for names without comma titles (e.g. Sifa Sirojuddin Anjay Ke-Nu-an)
  // Split on known subject starting keywords
  const knownSubjectStarts = [
    'Pendidikan',
    'Bahasa',
    'Matematika',
    'Sejarah',
    'Seni',
    'Projek',
    'Koding',
    'Administrasi',
    'Keamanan',
    'Perencanaan',
    'Pemasangan',
    'Teknologi',
    'Dasar-dasar',
    'Editing',
    'Operatorisasi',
    'Perekaman',
    'Digital',
    'Penata',
    'Informatika',
    'Proses',
    'Visual',
    'Perangkat',
    'Menerapkan',
    'Karya',
    'Pembuatan',
    'Pemrograman',
    'Sistem',
    'Penerapan',
    'Pemeliharaan',
    'Pengelasan',
    'Bimbingan',
    'Ke-Nu-an'
  ]

  for (const kw of knownSubjectStarts) {
    const kwIdx = text.indexOf(kw)
    if (kwIdx > 3) {
      return {
        teacherName: text.substring(0, kwIdx).trim(),
        subjectName: text.substring(kwIdx).trim()
      }
    }
  }

  // General fallback: split 2 words teacher, rest subject
  const parts = text.split(' ')
  if (parts.length >= 3) {
    return {
      teacherName: `${parts[0]} ${parts[1]}`,
      subjectName: parts.slice(2).join(' ')
    }
  }

  return {
    teacherName: text,
    subjectName: '-'
  }
}
