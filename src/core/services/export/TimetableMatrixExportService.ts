/**
 * Guru Offline - Official Timetable Matrix Export & Generation Service
 * Document Code: FM.02.03.76.KUR.01.05
 * SMK NU UNGARAN - TAHUN PELAJARAN 2026/2027
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { repositories } from '../../repositories'
import {
  OFFICIAL_TIMETABLE_TEMPLATES,
  getStandardClassesByLevel,
  type ClassColumnDef
} from '../master/ScheduleTemplateService'

export interface MatrixCellData {
  teacherCode: string
  roomCode: string
  subjectName?: string
  teacherName?: string
}

export interface DayMatrixRow {
  period: number | string
  timeLabel: string
  type: string
  title?: string
  cells: Record<string, MatrixCellData> // keyed by classKey, e.g. "X-TJKT 1"
}

export class TimetableMatrixExportService {
  /**
   * Resolve Matrix Data for a specific level ('X' | 'XI' | 'XII')
   */
  public async getResolvedMatrixData(level: 'X' | 'XI' | 'XII'): Promise<{
    classes: ClassColumnDef[]
    days: Record<string, DayMatrixRow[]>
    academicYearName: string
  }> {
    const classes = getStandardClassesByLevel(level)
    const activeAy = await repositories.academicYears.findActive()
    const ayName = activeAy ? activeAy.name : '2026/2027'

    const [allSchedules, allAssignments, allTeachers, allSubjects, allRooms, allClasses] =
      await Promise.all([
        repositories.schedules.findAll(),
        repositories.teacherAssignments.findAll(),
        repositories.teachers.findAll(),
        repositories.subjects.findAll(),
        repositories.rooms.findAll(),
        repositories.classes.findAll()
      ])

    const classEntityMap = new Map<string, string>() // normalized name -> id
    allClasses.forEach((c) => classEntityMap.set(c.name.toUpperCase().replace(/\s+/g, '-'), c.id))

    const assignmentMap = new Map(allAssignments.map((a) => [a.id, a]))
    const teacherMap = new Map(allTeachers.map((t) => [t.id, t]))
    const subjectMap = new Map(allSubjects.map((s) => [s.id, s]))
    const roomMap = new Map(allRooms.map((r) => [r.id, r]))

    // Build day matrices
    const daysData: Record<string, DayMatrixRow[]> = {}

    for (const [dayKey, template] of Object.entries(OFFICIAL_TIMETABLE_TEMPLATES)) {
      const rows: DayMatrixRow[] = []

      for (const slot of template.slots) {
        const rowCells: Record<string, MatrixCellData> = {}

        if (slot.type === 'LESSON') {
          const slotPeriodNum = Number(slot.period)

          for (const col of classes) {
            const normalizedClassName = col.className.toUpperCase().replace(/\s+/g, '-')
            const targetClassId = classEntityMap.get(normalizedClassName)

            // Find matching schedule
            const schedule = allSchedules.find((s) => {
              if (s.dayOfWeek !== dayKey) return false
              if (targetClassId && s.classId === targetClassId) {
                return slotPeriodNum >= s.periodStart && slotPeriodNum <= s.periodEnd
              }
              return false
            })

            if (schedule) {
              const asg = assignmentMap.get(schedule.teacherAssignmentId)
              const teacher = asg ? teacherMap.get(asg.teacherId) : null
              const subject = asg ? subjectMap.get(asg.subjectId) : null
              const room = roomMap.get(schedule.roomId)

              rowCells[col.classKey] = {
                teacherCode: asg?.code || '-',
                roomCode: room?.code || '-',
                subjectName: subject?.name,
                teacherName: teacher?.name
              }
            } else {
              rowCells[col.classKey] = {
                teacherCode: '',
                roomCode: ''
              }
            }
          }
        }

        rows.push({
          period: slot.period,
          timeLabel: slot.timeLabel,
          type: slot.type,
          title: slot.title,
          cells: rowCells
        })
      }

      daysData[dayKey] = rows
    }

    return {
      classes,
      days: daysData,
      academicYearName: ayName
    }
  }

  /**
   * Export Official PDF Timetable Matrix (Landscape multi-page, matching FM.02.03.76.KUR.01.05)
   */
  public async exportToPdf(level: 'X' | 'XI' | 'XII' = 'X'): Promise<void> {
    const matrix = await this.getResolvedMatrixData(level)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const school = await repositories.schoolIdentity.getIdentity()
    const principalName = school?.principalName || 'Dr. H. Ahmad Hanik, M.Pd.'
    const wks1Name = school?.wks1Name || 'Budi Setiarjo, S.Pd.'
    const docCode = school?.isoDocCode || 'FM.02.03.76.KUR.01.05'

    // Helper to render Day table
    const renderDaySection = (dayKey: string, startY: number, titleExtra = '') => {
      const dayData = matrix.days[dayKey]
      if (!dayData) return startY

      // Header 1: Major groups
      // Jam Ke | Pukul | TJKT (4 classes * 2 = 8 cols) | BP (3 * 2 = 6) | DKV (6) | TE (6) | TO (6)
      const headRow1: any[] = [
        { content: 'Jam ke', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Pukul', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'TJKT', colSpan: 8, styles: { halign: 'center' } },
        { content: 'BP', colSpan: 6, styles: { halign: 'center' } },
        { content: 'DKV', colSpan: 6, styles: { halign: 'center' } },
        { content: 'TE', colSpan: 6, styles: { halign: 'center' } },
        { content: 'TO', colSpan: 6, styles: { halign: 'center' } }
      ]

      // Header 2: Class Names & Ruang subheaders
      const headRow2: any[] = []
      matrix.classes.forEach((c) => {
        headRow2.push({ content: c.className, styles: { halign: 'center' } })
        headRow2.push({ content: 'Ruang', styles: { halign: 'center' } })
      })

      // Table Body
      const bodyRows: any[] = []

      for (const row of dayData) {
        if (row.type !== 'LESSON') {
          // Banner row
          bodyRows.push([
            { content: String(row.period), styles: { halign: 'center', fontStyle: 'bold' } },
            { content: row.timeLabel, styles: { halign: 'center', fontStyle: 'bold' } },
            {
              content: row.title || row.type,
              colSpan: matrix.classes.length * 2,
              styles: {
                halign: 'center',
                fontStyle: 'bold',
                fillColor:
                  row.type === 'DHUHA' || row.type === 'DHUHUR' || row.type === 'MUJAHADAH'
                    ? [240, 249, 255]
                    : row.type === 'BREAK'
                      ? [254, 242, 242]
                      : [243, 244, 246]
              }
            }
          ])
        } else {
          // Regular lesson row
          const lessonRow: any[] = [
            { content: String(row.period), styles: { halign: 'center', fontStyle: 'bold' } },
            { content: row.timeLabel, styles: { halign: 'center' } }
          ]

          matrix.classes.forEach((c) => {
            const cell = row.cells[c.classKey] || { teacherCode: '', roomCode: '' }
            lessonRow.push({
              content: cell.teacherCode,
              styles: { halign: 'center', fontStyle: 'bold' }
            })
            lessonRow.push({
              content: cell.roomCode,
              styles: { halign: 'center', fontSize: 6 }
            })
          })

          bodyRows.push(lessonRow)
        }
      }

      // Render Day banner on the right/center
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(dayKey + (titleExtra ? ` ${titleExtra}` : ''), 148, startY - 2, { align: 'center' })

      autoTable(doc, {
        startY,
        head: [headRow1, headRow2],
        body: bodyRows,
        theme: 'grid',
        styles: {
          fontSize: 6.5,
          cellPadding: 0.8,
          textColor: [30, 41, 59],
          lineColor: [100, 116, 139],
          lineWidth: 0.15
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          lineWidth: 0.2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' }
        },
        margin: { left: 8, right: 8 }
      })

      return (doc as any).lastAutoTable.finalY + 8
    }

    // --- PAGE 1: SENIN & SELASA ---
    // Header
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('JADWAL PELAJARAN SMK NU UNGARAN', 148, 12, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`TAHUN PELAJARAN ${matrix.academicYearName}`, 148, 17, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(docCode, 280, 20, { align: 'right' })

    let currentY = 24
    currentY = renderDaySection('SENIN', currentY)
    currentY = renderDaySection('SELASA', currentY + 4)

    // --- PAGE 2: RABU & KAMIS ---
    doc.addPage('a4', 'landscape')
    doc.setFontSize(7)
    doc.text(docCode, 280, 12, { align: 'right' })
    currentY = 16
    currentY = renderDaySection('RABU', currentY)
    currentY = renderDaySection('KAMIS', currentY + 4)

    // --- PAGE 3: JUM'AT & SABTU + SIGNATURE ---
    doc.addPage('a4', 'landscape')
    doc.setFontSize(7)
    doc.text(docCode, 280, 12, { align: 'right' })
    currentY = 16
    currentY = renderDaySection('JUMAT', currentY)
    currentY = renderDaySection('SABTU', currentY + 4)

    // Signature Block
    const sigY = Math.min(160, currentY + 6)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Ungaran, 13 Juli 2026', 220, sigY)

    doc.text('Mengetahui,', 40, sigY + 5)
    doc.text('Kepala SMK NU Ungaran', 40, sigY + 9)
    doc.text('WKS 1', 220, sigY + 9)

    doc.setFont('helvetica', 'bold')
    doc.text(principalName, 40, sigY + 28)
    doc.text(wks1Name, 220, sigY + 28)

    doc.save(
      `Jadwal_Pelajaran_Kelas_${level}_SMK_NU_Ungaran_${matrix.academicYearName.replace('/', '_')}.pdf`
    )
  }

  /**
   * Export Official Excel Timetable Matrix (.xlsx)
   */
  public async exportToXlsx(level: 'X' | 'XI' | 'XII' = 'X'): Promise<void> {
    const matrix = await this.getResolvedMatrixData(level)
    const wb = XLSX.utils.book_new()

    for (const [dayKey, dayRows] of Object.entries(matrix.days)) {
      const sheetData: any[][] = []

      // Title
      sheetData.push(['JADWAL PELAJARAN SMK NU UNGARAN'])
      sheetData.push([
        `TAHUN PELAJARAN ${matrix.academicYearName} - HARI ${dayKey} (KELAS ${level})`
      ])
      sheetData.push(['Form Code: FM.02.03.76.KUR.01.05'])
      sheetData.push([])

      // Header 1 (Majors)
      const h1: string[] = ['Jam ke', 'Pukul']
      matrix.classes.forEach((c) => {
        h1.push(c.className, 'Ruang')
      })
      sheetData.push(h1)

      // Rows
      for (const row of dayRows) {
        if (row.type !== 'LESSON') {
          const bRow: string[] = [String(row.period), row.timeLabel]
          for (let i = 0; i < matrix.classes.length * 2; i++) {
            bRow.push(i === 0 ? row.title || row.type : '')
          }
          sheetData.push(bRow)
        } else {
          const lRow: string[] = [String(row.period), row.timeLabel]
          matrix.classes.forEach((c) => {
            const cell = row.cells[c.classKey] || { teacherCode: '', roomCode: '' }
            lRow.push(cell.teacherCode, cell.roomCode)
          })
          sheetData.push(lRow)
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      XLSX.utils.book_append_sheet(wb, ws, dayKey)
    }

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(
      blob,
      `Jadwal_Matriks_Kelas_${level}_SMK_NU_Ungaran_${matrix.academicYearName.replace('/', '_')}.xlsx`
    )
  }

  /**
   * Generate Template for Timetable Matrix (Empty or Pre-filled with standard bell schedule)
   */
  public generateTemplate(format: 'XLSX' | 'CSV', level: 'X' | 'XI' | 'XII' = 'X'): void {
    const classes = getStandardClassesByLevel(level)
    const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
    const wb = XLSX.utils.book_new()

    for (const day of days) {
      const template = OFFICIAL_TIMETABLE_TEMPLATES[day]
      const rows: any[][] = []

      // Headers
      const header: string[] = ['HARI', 'JAM_KE', 'PUKUL', 'TIPE', 'KETERANGAN_KEGIATAN']
      classes.forEach((c) => {
        header.push(`${c.className}_KODE_GURU`, `${c.className}_RUANG`)
      })
      rows.push(header)

      // Slots
      for (const slot of template.slots) {
        const row: string[] = [
          day,
          String(slot.period),
          slot.timeLabel,
          slot.type,
          slot.title || (slot.type === 'LESSON' ? 'KBM' : '')
        ]
        classes.forEach(() => {
          row.push('', '')
        })
        rows.push(row)
      }

      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, day)
    }

    if (format === 'CSV') {
      const firstWs = wb.Sheets['SENIN']
      const csvStr = XLSX.utils.sheet_to_csv(firstWs)
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `Template_Jadwal_Matriks_${level}_SENIN.csv`)
    } else {
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(blob, `Template_Jadwal_Matriks_Kelas_${level}_Lengkap.xlsx`)
    }
  }
}

export const timetableMatrixExportService = new TimetableMatrixExportService()
