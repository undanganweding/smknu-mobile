/**
 * Official Class Legger Export & Report Generator
 * Document Code: Dokumen 3 & 4 (Legger Nilai & Daftar Presensi Siswa Per Kelas)
 * SMK NU UNGARAN - TAHUN PELAJARAN 2026/2027
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { classLeggerService, type ClassLeggerSummary } from '../master/ClassLeggerService'
import { repositories } from '../../repositories'

export interface LeggerExportOptions {
  mode: 'DUAL_SLIP' | 'FULL_ASSESSMENT'
  level?: 'X' | 'XI' | 'XII'
  subjectName?: string
  teacherName?: string
}

export class ClassLeggerExportService {
  /**
   * Export PDF for a Single Class or Batch of Classes matching the exact SMK NU Ungaran layout
   */
  public async exportLeggerPdf(
    classes: ClassLeggerSummary[],
    options: LeggerExportOptions = { mode: 'DUAL_SLIP' }
  ): Promise<void> {
    const school = await repositories.schoolIdentity.getIdentity()
    const schoolName = school?.name || 'SMK NU UNGARAN'
    const schoolAddress =
      school?.address || 'Jalan Kaligarang No.9 Ungaran Telp./Fax. (024) 6924034-6922708'

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    if (options.mode === 'DUAL_SLIP') {
      // DUAL SLIP MODE: 2 tables side-by-side per page (Exactly matching pages 1-16 of uploaded PDF)
      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i]
        if (i > 0) doc.addPage('a4', 'portrait')

        this.renderDualSlipPage(doc, cls, schoolName, schoolAddress)
      }
    } else {
      // FULL ASSESSMENT SHEET MODE: 1 comprehensive grading & attendance sheet per page
      for (let i = 0; i < classes.length; i++) {
        const cls = classes[i]
        if (i > 0) doc.addPage('a4', 'portrait')

        this.renderFullAssessmentPage(
          doc,
          cls,
          schoolName,
          schoolAddress,
          options.subjectName,
          options.teacherName
        )
      }
    }

    const titlePrefix =
      classes.length === 1 ? classes[0].className : `Tingkat_${options.level || 'X'}`
    doc.save(`Legger_Nilai_${titlePrefix}_SMK_NU_Ungaran.pdf`)
  }

  /**
   * Render Dual Slip Page (2 Identical/Dual Columns per A4 page)
   */
  private renderDualSlipPage(
    doc: jsPDF,
    cls: ClassLeggerSummary,
    schoolName: string,
    schoolAddress: string
  ): void {
    const slips = [
      { startX: 10, tableWidth: 90 },
      { startX: 110, tableWidth: 90 }
    ]

    slips.forEach((slip) => {
      // Header Kop
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text('SEKOLAH MENENGAH KEJURUAN NAHDLATUL ULAMA', slip.startX + 45, 12, {
        align: 'center'
      })
      doc.setFontSize(8.5)
      doc.text(schoolName, slip.startX + 45, 16, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.5)
      doc.text(schoolAddress, slip.startX + 45, 19.5, { align: 'center' })

      // Class Meta Block
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.text('Kelas', slip.startX, 26)
      doc.text(`: ${cls.className}`, slip.startX + 18, 26)

      doc.text('Jurusan', slip.startX, 29.5)
      doc.setFont('helvetica', 'normal')
      doc.text(`: ${cls.majorName}`, slip.startX + 18, 29.5)

      doc.setFont('helvetica', 'bold')
      doc.text('Wali Kelas', slip.startX, 33)
      doc.setFont('helvetica', 'normal')
      doc.text(`: ${cls.homeroomTeacherName}`, slip.startX + 18, 33)

      // Student Table
      const tableHead = [['No', 'NIS', 'Nama', 'L/P', '', '', '']]
      const tableBody: any[] = []

      // Fill 40 rows
      for (let r = 1; r <= 40; r++) {
        const std = cls.students.find((s) => s.no === r)
        if (std) {
          tableBody.push([String(r), std.nis, std.name, std.gender, '', '', ''])
        } else {
          tableBody.push([String(r), '', '', '', '', '', ''])
        }
      }

      autoTable(doc, {
        startY: 35,
        margin: { left: slip.startX },
        tableWidth: slip.tableWidth,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        styles: {
          fontSize: 5,
          cellPadding: 0.5,
          textColor: [15, 23, 42],
          lineColor: [100, 116, 139],
          lineWidth: 0.12
        },
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 5.5
        },
        columnStyles: {
          0: { cellWidth: 5, halign: 'center' },
          1: { cellWidth: 19, halign: 'left' },
          2: { cellWidth: 38, halign: 'left' },
          3: { cellWidth: 6, halign: 'center' },
          4: { cellWidth: 7, halign: 'center' },
          5: { cellWidth: 7, halign: 'center' },
          6: { cellWidth: 8, halign: 'center' }
        }
      })

      const finalY = (doc as any).lastAutoTable.finalY + 2

      // Putra / Putri / Jumlah Summary Table Box
      autoTable(doc, {
        startY: finalY,
        margin: { left: slip.startX },
        tableWidth: 62,
        body: [
          ['Putra', String(cls.maleCount)],
          ['Putri', String(cls.femaleCount)],
          ['Jumlah', String(cls.totalCount)]
        ],
        theme: 'grid',
        styles: {
          fontSize: 5.5,
          cellPadding: 0.6,
          lineColor: [100, 116, 139],
          lineWidth: 0.12
        },
        columnStyles: {
          0: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 38, halign: 'center', fontStyle: 'bold' }
        }
      })

      // Signature Block
      const sigY = finalY + 18
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text('Guru Mapel', slip.startX + 65, sigY, { align: 'center' })
      doc.text('……………………', slip.startX + 65, sigY + 14, { align: 'center' })
    })
  }

  /**
   * Render Full Assessment Page (Single Wide Table per A4)
   */
  private renderFullAssessmentPage(
    doc: jsPDF,
    cls: ClassLeggerSummary,
    schoolName: string,
    schoolAddress: string,
    subjectName?: string,
    teacherName?: string
  ): void {
    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('SEKOLAH MENENGAH KEJURUAN NAHDLATUL ULAMA', 105, 12, { align: 'center' })
    doc.setFontSize(13)
    doc.text(schoolName, 105, 17, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(schoolAddress, 105, 21, { align: 'center' })

    doc.setLineWidth(0.3)
    doc.line(10, 23, 200, 23)

    // Subheader info
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('DAFTAR NILAI & PRESENSI SISWA PER KELAS', 105, 28, { align: 'center' })

    doc.setFontSize(7.5)
    doc.text(`Kelas: ${cls.className}`, 12, 33)
    doc.text(`Jurusan: ${cls.majorName}`, 12, 37)
    doc.text(`Wali Kelas: ${cls.homeroomTeacherName}`, 12, 41)

    if (subjectName) doc.text(`Mata Pelajaran: ${subjectName}`, 120, 33)
    if (teacherName) doc.text(`Guru Pengampu: ${teacherName}`, 120, 37)
    doc.text(`Tahun Pelajaran: 2026/2027`, 120, 41)

    const tableHead = [
      [
        { content: 'No', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'NIS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama Siswa', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'L/P', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Tugas / Portofolio', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Ulangan Harian', colSpan: 2, styles: { halign: 'center' } },
        { content: 'PTS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'PAS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Akhir', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Presensi', colSpan: 3, styles: { halign: 'center' } }
      ],
      ['T1', 'T2', 'T3', 'UH1', 'UH2', 'S', 'I', 'A']
    ]

    const tableBody: any[] = []
    for (let r = 1; r <= Math.max(cls.totalCount, 36); r++) {
      const std = cls.students.find((s) => s.no === r)
      if (std) {
        tableBody.push([
          String(r),
          std.nis,
          std.name,
          std.gender,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ])
      } else {
        tableBody.push([String(r), '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      }
    }

    autoTable(doc, {
      startY: 44,
      margin: { left: 10, right: 10 },
      head: tableHead as any,
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 6,
        cellPadding: 0.8,
        textColor: [15, 23, 42],
        lineColor: [100, 116, 139],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 22, halign: 'left' },
        2: { cellWidth: 50, halign: 'left' },
        3: { cellWidth: 8, halign: 'center' }
      }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 4

    // Summary Box
    autoTable(doc, {
      startY: finalY,
      margin: { left: 10 },
      tableWidth: 80,
      body: [
        ['Total Siswa Putra (L)', `${cls.maleCount} Siswa`],
        ['Total Siswa Putri (P)', `${cls.femaleCount} Siswa`],
        ['Jumlah Total Kelas', `${cls.totalCount} Siswa`]
      ],
      theme: 'grid',
      styles: {
        fontSize: 6.5,
        cellPadding: 0.8,
        lineColor: [100, 116, 139],
        lineWidth: 0.15
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
      }
    })

    // Signatures
    const sigY = finalY + 6
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Mengetahui,', 145, sigY)
    doc.text('Guru Mata Pelajaran', 145, sigY + 4)
    doc.text(teacherName || '…………………………', 145, sigY + 22)
    doc.setFontSize(6.5)
    doc.text('NIP. -', 145, sigY + 26)
  }

  /**
   * Export School Summary Statistics Report (Page 17 layout)
   */
  public async exportSchoolSummaryPdf(): Promise<void> {
    const stats = await classLeggerService.getSchoolStatistics()
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('REKAPITULASI JUMLAH SISWA DAN ROMBEL', 105, 14, { align: 'center' })
    doc.setFontSize(12)
    doc.text('SMK NU UNGARAN', 105, 19, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`TAHUN PELAJARAN ${stats.academicYear}`, 105, 24, { align: 'center' })

    // Major summary table
    const tableHead = [
      [
        'No',
        'Program Keahlian / Jurusan',
        'Kelas X (L/P/Jml)',
        'Kelas XI (L/P/Jml)',
        'Kelas XII (L/P/Jml)',
        'Total Siswa'
      ]
    ]

    const tableBody = stats.byMajor.map((m, idx) => [
      String(idx + 1),
      `${m.majorName} (${m.majorCode})`,
      `${m.gradeX.male} L / ${m.gradeX.female} P (${m.gradeX.total}) [${m.gradeX.classes} Rombel]`,
      `${m.gradeXI.male} L / ${m.gradeXI.female} P (${m.gradeXI.total}) [${m.gradeXI.classes} Rombel]`,
      `${m.gradeXII.male} L / ${m.gradeXII.female} P (${m.gradeXII.total}) [${m.gradeXII.classes} Rombel]`,
      `${m.total} Siswa`
    ])

    // Total row
    tableBody.push([
      '',
      'TOTAL KESELURUHAN SEKOLAH',
      `${stats.gradeX.male} L / ${stats.gradeX.female} P (${stats.gradeX.total}) [${stats.gradeX.classesCount} Rombel]`,
      `${stats.gradeXI.male} L / ${stats.gradeXI.female} P (${stats.gradeXI.total}) [${stats.gradeXI.classesCount} Rombel]`,
      `${stats.gradeXII.male} L / ${stats.gradeXII.female} P (${stats.gradeXII.total}) [${stats.gradeXII.classesCount} Rombel]`,
      `${stats.grandTotal.total} Siswa (${stats.grandTotal.classesCount} Rombel)`
    ])

    autoTable(doc, {
      startY: 30,
      margin: { left: 10, right: 10 },
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [100, 116, 139],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 50, fontStyle: 'bold' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 27, halign: 'center', fontStyle: 'bold' }
      }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 8

    // Summary Highlight Cards Box
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Grand Total Siswa SMK NU Ungaran:', 12, finalY)
    doc.setFontSize(16)
    doc.setTextColor(16, 185, 129)
    doc.text(`${stats.grandTotal.total} Siswa`, 12, finalY + 7)
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Putra: ${stats.grandTotal.male} | Putri: ${stats.grandTotal.female} | Total Rombel: ${stats.grandTotal.classesCount} Kelas`,
      12,
      finalY + 12
    )

    doc.save(
      `Rekapitulasi_Siswa_Sekolah_SMK_NU_Ungaran_${stats.academicYear.replace('/', '_')}.pdf`
    )
  }

  /**
   * Export Excel Workbook (.xlsx) with multi-sheets per class
   */
  public async exportLeggerXlsx(
    classes: ClassLeggerSummary[],
    level: 'X' | 'XI' | 'XII' = 'X'
  ): Promise<void> {
    const wb = XLSX.utils.book_new()

    for (const cls of classes) {
      const sheetData: any[][] = []

      sheetData.push(['SEKOLAH MENENGAH KEJURUAN NAHDLATUL ULAMA'])
      sheetData.push(['SMK NU UNGARAN'])
      sheetData.push(['Jalan Kaligarang No.9 Ungaran Telp./Fax. (024) 6924034-6922708'])
      sheetData.push([])
      sheetData.push([`Kelas: ${cls.className}`, '', `Jurusan: ${cls.majorName}`])
      sheetData.push([`Wali Kelas: ${cls.homeroomTeacherName}`, '', 'Tahun Pelajaran: 2026/2027'])
      sheetData.push([])

      // Header table
      sheetData.push([
        'No',
        'NIS',
        'Nama Siswa',
        'L/P',
        'Tugas 1',
        'Tugas 2',
        'UH 1',
        'UH 2',
        'PTS',
        'PAS',
        'Nilai Akhir',
        'Sakit',
        'Izin',
        'Alpa'
      ])

      for (let r = 1; r <= Math.max(cls.totalCount, 36); r++) {
        const std = cls.students.find((s) => s.no === r)
        if (std) {
          sheetData.push([r, std.nis, std.name, std.gender, '', '', '', '', '', '', '', '', '', ''])
        } else {
          sheetData.push([r, '', '', '', '', '', '', '', '', '', '', '', '', ''])
        }
      }

      sheetData.push([])
      sheetData.push(['Rekapitulasi Kelas:', '', ''])
      sheetData.push(['Putra (L)', cls.maleCount])
      sheetData.push(['Putri (P)', cls.femaleCount])
      sheetData.push(['Jumlah Total', cls.totalCount])

      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      XLSX.utils.book_append_sheet(wb, ws, cls.className.substring(0, 31))
    }

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    saveAs(blob, `Legger_Siswa_Kelas_${level}_SMK_NU_Ungaran.xlsx`)
  }

  /**
   * Generate Downloadable Blank Legger Template
   */
  public generateTemplate(format: 'XLSX' | 'CSV', level: 'X' | 'XI' | 'XII' = 'X'): void {
    const wb = XLSX.utils.book_new()
    const header = [
      'NO',
      'NIS',
      'NAMA_SISWA',
      'JENIS_KELAMIN (L/P)',
      'KELAS',
      'TUGAS_1',
      'TUGAS_2',
      'UH_1',
      'UH_2',
      'PTS',
      'PAS',
      'SAKIT',
      'IZIN',
      'ALPA'
    ]

    const sampleRows: any[][] = [
      header,
      [
        1,
        `${level === 'X' ? 'TJKT.26' : level === 'XI' ? 'TJKT.25' : 'TJKT.24'}-3114`,
        'Contoh Siswa 1',
        'L',
        `${level}-TJKT-1`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ],
      [
        2,
        `${level === 'X' ? 'TJKT.26' : level === 'XI' ? 'TJKT.25' : 'TJKT.24'}-3115`,
        'Contoh Siswa 2',
        'P',
        `${level}-TJKT-1`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
    ]

    const ws = XLSX.utils.aoa_to_sheet(sampleRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Legger')

    if (format === 'CSV') {
      const csvStr = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `Template_Legger_Kelas_${level}.csv`)
    } else {
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(blob, `Template_Legger_Siswa_Kelas_${level}.xlsx`)
    }
  }
}

export const classLeggerExportService = new ClassLeggerExportService()
