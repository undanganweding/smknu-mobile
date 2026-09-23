/**
 * Guru Offline - Dokumen 1 Export Service
 * Exports Dokumen 1 (Kode Guru & Mata Pelajaran) into official PDF and XLSX layout.
 */

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveAs } from 'file-saver'
import { repositories } from '../../repositories'

export interface Dokumen1ExportOptions {
  academicYearName?: string
  semesterName?: string
  schoolName?: string
  principalName?: string
  wks1Name?: string
  dateString?: string
}

export class Dokumen1ExportService {
  /**
   * Fetch current live assignments with teacher and subject details
   */
  public async getDokumen1Data() {
    const [assignments, teachers, subjects, schoolId] = await Promise.all([
      repositories.teacherAssignments.findAll(),
      repositories.teachers.findAll(),
      repositories.subjects.findAll(),
      repositories.schoolIdentity.getIdentity()
    ])

    const teacherMap = new Map(teachers.map((t) => [t.id, t]))
    const subjectMap = new Map(subjects.map((s) => [s.id, s]))

    // Sort assignments logically by ID / code or creation order
    const sortedAssignments = [...assignments].sort((a, b) => {
      // If code starts with letter, sort by numeric code suffix or standard Dokumen 1 order
      return a.id.localeCompare(b.id, undefined, { numeric: true })
    })

    const rows = sortedAssignments.map((asgn, index) => {
      const teacher = teacherMap.get(asgn.teacherId)
      const subject = subjectMap.get(asgn.subjectId)
      return {
        no: index + 1,
        code: asgn.code || '-',
        teacherName: teacher?.name || 'Guru',
        subjectName: subject?.name || 'Mata Pelajaran',
        hours: asgn.hours || 0
      }
    })

    return {
      rows,
      schoolIdentity: schoolId,
      totalHours: rows.reduce((sum, r) => sum + r.hours, 0)
    }
  }

  /**
   * Export Dokumen 1 to PDF with official SMK NU Ungaran layout
   */
  public async exportToPdf(options?: Dokumen1ExportOptions): Promise<void> {
    const { rows, schoolIdentity } = await this.getDokumen1Data()

    const schoolName = options?.schoolName || schoolIdentity?.name || 'SMK NU UNGARAN'
    const academicYear = options?.academicYearName || '2026/2027'
    const principalName =
      options?.principalName || schoolIdentity?.principalName || 'Dr. H. Ahmad Hanik, M.Pd.'
    const wks1Name = options?.wks1Name || schoolIdentity?.wks1Name || 'Budi Setiarjo, S.Pd.'
    const dateString = options?.dateString || 'Ungaran, 13 Juli 2026'

    // Create A4 Portrait PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Title Header Function
    const printHeader = () => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('KODE GURU DAN MATA PELAJARAN', pageWidth / 2, 16, { align: 'center' })
      doc.text(schoolName, pageWidth / 2, 21, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`TAHUN PELAJARAN ${academicYear}`, pageWidth / 2, 26, { align: 'center' })
    }

    printHeader()

    // Prepare table data
    const tableBody = rows.map((r) => [r.no, r.code, r.teacherName, r.subjectName, r.hours])

    // Generate table using autoTable
    autoTable(doc, {
      startY: 30,
      margin: { top: 30, left: 14, right: 14, bottom: 20 },
      head: [['NO', 'KODE', 'NAMA GURU', 'MATA PELAJARAN', 'JAM']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        font: 'helvetica',
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        cellPadding: 1.5,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'left', cellWidth: 65 },
        3: { halign: 'left', cellWidth: 78 },
        4: { halign: 'center', cellWidth: 14 }
      },
      didDrawPage: () => {
        // Page number on footer
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`Halaman ${currentPage}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
      }
    })

    // Add Signature on the last page
    const finalY = (doc as any).lastAutoTable.finalY || 30
    const remainingSpace = pageHeight - finalY

    // If remaining space is too small for signature, add a new page
    if (remainingSpace < 45) {
      doc.addPage()
    }

    const signY = (remainingSpace < 45 ? 20 : finalY) + 12

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    // Date
    doc.text(dateString, pageWidth - 60, signY)

    // Mengetahui
    doc.text('Mengetahui,', 25, signY + 6)
    doc.text('Kepala SMK NU Ungaran', 25, signY + 11)
    doc.text('WKS 1', pageWidth - 60, signY + 11)

    // Names & Titles
    doc.setFont('helvetica', 'bold')
    doc.text(principalName, 25, signY + 34)
    doc.text(wks1Name, pageWidth - 60, signY + 34)

    // Save File
    const fileName = `Dokumen1_Kode_Guru_Mapel_SMK_NU_UNGARAN_${academicYear.replace('/', '-')}.pdf`
    doc.save(fileName)
  }

  /**
   * Export Dokumen 1 to Excel (XLSX)
   */
  public async exportToXlsx(options?: Dokumen1ExportOptions): Promise<void> {
    const { rows, schoolIdentity, totalHours } = await this.getDokumen1Data()

    const schoolName = options?.schoolName || schoolIdentity?.name || 'SMK NU UNGARAN'
    const academicYear = options?.academicYearName || '2026/2027'
    const principalName =
      options?.principalName || schoolIdentity?.principalName || 'Dr. H. Ahmad Hanik, M.Pd.'
    const wks1Name = options?.wks1Name || schoolIdentity?.wks1Name || 'Budi Setiarjo, S.Pd.'
    const dateString = options?.dateString || 'Ungaran, 13 Juli 2026'

    // Build worksheet data
    const wsData: any[][] = [
      ['KODE GURU DAN MATA PELAJARAN'],
      [schoolName],
      [`TAHUN PELAJARAN ${academicYear}`],
      [], // empty row
      ['NO', 'KODE', 'NAMA GURU', 'MATA PELAJARAN', 'JAM']
    ]

    // Push data rows
    rows.forEach((r) => {
      wsData.push([r.no, r.code, r.teacherName, r.subjectName, r.hours])
    })

    // Total Row
    wsData.push(['', '', 'TOTAL ALOKASI JAM', '', totalHours])
    wsData.push([]) // empty row

    // Signature Block
    wsData.push(['', '', '', dateString, ''])
    wsData.push(['Mengetahui,', '', '', '', ''])
    wsData.push(['Kepala SMK NU Ungaran', '', '', 'WKS 1', ''])
    wsData.push([])
    wsData.push([])
    wsData.push([principalName, '', '', wks1Name, ''])

    const worksheet = XLSX.utils.aoa_to_sheet(wsData)

    // Column widths
    worksheet['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 40 }, { wch: 50 }, { wch: 10 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dokumen 1')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const fileName = `Dokumen1_Kode_Guru_Mapel_SMK_NU_UNGARAN_${academicYear.replace('/', '-')}.xlsx`
    saveAs(blob, fileName)
  }

  /**
   * Generates a starter template for Dokumen 1
   */
  public generateTemplate(format: 'XLSX' | 'CSV') {
    const wsData: any[][] = [
      ['KODE GURU DAN MATA PELAJARAN'],
      ['SMK NU UNGARAN'],
      ['TAHUN PELAJARAN 2026/2027'],
      [],
      ['NO', 'KODE', 'NAMA GURU', 'MATA PELAJARAN', 'JAM'],
      [1, 'A', 'Siti Nur Asiyah, S.Pd.I.', 'Pendidikan Agama dan Budi Pekerti', 33],
      [2, 'A1', 'Latif Mustaghfirin, S.Pd.', 'Pendidikan Agama dan Budi Pekerti', 33],
      [3, 'B', 'Nada Khasnatifani, S.Pd.', 'Pendidikan Pancasila', 30],
      [4, 'C', 'Mujeri, S.Pd.', 'Bahasa Indonesia', 36],
      [5, 'D', 'Budi Setiarjo, S.Pd.', 'Matematika', 25]
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(wsData)
    worksheet['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 40 }, { wch: 45 }, { wch: 10 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Dokumen 1')

    if (format === 'XLSX') {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(blob, 'Template_Dokumen1_Kode_Guru_Mapel.xlsx')
    } else {
      const csvData = XLSX.utils.sheet_to_csv(worksheet)
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, 'Template_Dokumen1_Kode_Guru_Mapel.csv')
    }
  }
}

export const dokumen1ExportService = new Dokumen1ExportService()
