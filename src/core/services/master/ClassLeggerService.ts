/**
 * Class Legger & Student Roster Management Service
 * SMK NU UNGARAN - TAHUN PELAJARAN 2026/2027
 */

import { repositories } from '../../repositories'
import type { StudentEntity } from '../../types'
import {
  VERIFIED_GRADE_X_LEGGERS,
  getStandardLeggerRosterByLevel,
  type LeggerStudentItem
} from './ClassLeggerData'

export interface ClassLeggerSummary {
  classId: string
  classKey: string
  className: string
  level: 'X' | 'XI' | 'XII'
  majorName: string
  homeroomTeacherName: string
  maleCount: number
  femaleCount: number
  totalCount: number
  students: LeggerStudentItem[]
}

export interface SchoolLeggerStatistics {
  academicYear: string
  gradeX: {
    male: number
    female: number
    total: number
    classesCount: number
  }
  gradeXI: {
    male: number
    female: number
    total: number
    classesCount: number
  }
  gradeXII: {
    male: number
    female: number
    total: number
    classesCount: number
  }
  grandTotal: {
    male: number
    female: number
    total: number
    classesCount: number
  }
  byMajor: Array<{
    majorName: string
    majorCode: string
    gradeX: { male: number; female: number; total: number; classes: number }
    gradeXI: { male: number; female: number; total: number; classes: number }
    gradeXII: { male: number; female: number; total: number; classes: number }
    total: number
  }>
}

export class ClassLeggerService {
  /**
   * Helper to build a ClassLeggerSummary in-memory given pre-fetched data
   */
  private buildSummaryFromCache(
    classIdentifier: string,
    allClasses: any[],
    teacherMap: Map<string, string>,
    majorMap: Map<string, any>,
    studentsByClassMap: Map<string, StudentEntity[]>
  ): ClassLeggerSummary | null {
    const targetClass = allClasses.find(
      (c) =>
        c.id === classIdentifier ||
        c.name.toUpperCase().replace(/\s+/g, '-') ===
          classIdentifier.toUpperCase().replace(/\s+/g, '-') ||
        c.name.toUpperCase() === classIdentifier.toUpperCase()
    )

    if (targetClass) {
      const dbStudents = studentsByClassMap.get(targetClass.id) || []
      const major = majorMap.get(targetClass.majorId)

      if (dbStudents.length > 0) {
        const sortedStudents = [...dbStudents].sort((a, b) => a.nis.localeCompare(b.nis))
        const maleCount = sortedStudents.filter((s) => s.gender === 'L').length
        const femaleCount = sortedStudents.filter((s) => s.gender === 'P').length

        return {
          classId: targetClass.id,
          classKey: targetClass.name,
          className: targetClass.name,
          level: targetClass.level as 'X' | 'XI' | 'XII',
          majorName: major?.name || 'Teknik Kejuruan',
          homeroomTeacherName:
            (targetClass.homeroomTeacherId && teacherMap.get(targetClass.homeroomTeacherId)) ||
            'Wali Kelas',
          maleCount,
          femaleCount,
          totalCount: sortedStudents.length,
          students: sortedStudents.map((s, idx) => ({
            no: idx + 1,
            nis: s.nis,
            name: s.name,
            gender: s.gender as 'L' | 'P'
          }))
        }
      }
    }

    const allTemplates = [
      ...VERIFIED_GRADE_X_LEGGERS,
      ...getStandardLeggerRosterByLevel('XI'),
      ...getStandardLeggerRosterByLevel('XII')
    ]

    const matchedTpl = allTemplates.find(
      (t) =>
        t.classKey.toUpperCase().replace(/\s+/g, '-') ===
          classIdentifier.toUpperCase().replace(/\s+/g, '-') ||
        t.className.toUpperCase() === classIdentifier.toUpperCase() ||
        (targetClass &&
          t.className.toUpperCase().replace(/\s+/g, '-') ===
            targetClass.name.toUpperCase().replace(/\s+/g, '-'))
    )

    if (matchedTpl) {
      return {
        classId:
          targetClass?.id || `cls_${matchedTpl.classKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        classKey: matchedTpl.classKey,
        className: matchedTpl.className,
        level: matchedTpl.level,
        majorName: matchedTpl.majorName,
        homeroomTeacherName: matchedTpl.homeroomTeacherName,
        maleCount: matchedTpl.maleCount,
        femaleCount: matchedTpl.femaleCount,
        totalCount: matchedTpl.totalCount,
        students: matchedTpl.students
      }
    }

    return null
  }

  /**
   * Get Legger Data for a specific class (by classId or classKey)
   */
  public async getClassLegger(classIdentifier: string): Promise<ClassLeggerSummary | null> {
    const [allClasses, allTeachers, allMajors, allStudents] = await Promise.all([
      repositories.classes.findAll(),
      repositories.teachers.findAll(),
      repositories.majors.findAll(),
      repositories.students.findAll()
    ])

    const teacherMap = new Map(allTeachers.map((t) => [t.id, t.name]))
    const majorMap = new Map(allMajors.map((m) => [m.id, m]))
    const studentsByClassMap = new Map<string, StudentEntity[]>()

    allStudents.forEach((s) => {
      const list = studentsByClassMap.get(s.classId) || []
      list.push(s)
      studentsByClassMap.set(s.classId, list)
    })

    return this.buildSummaryFromCache(
      classIdentifier,
      allClasses,
      teacherMap,
      majorMap,
      studentsByClassMap
    )
  }

  /**
   * Get all Class Leggers for a given grade level ('X' | 'XI' | 'XII') with pre-fetched bulk queries
   */
  public async getLeggersByLevel(level: 'X' | 'XI' | 'XII'): Promise<ClassLeggerSummary[]> {
    const [allClasses, allTeachers, allMajors, allStudents] = await Promise.all([
      repositories.classes.findAll(),
      repositories.teachers.findAll(),
      repositories.majors.findAll(),
      repositories.students.findAll()
    ])

    const teacherMap = new Map(allTeachers.map((t) => [t.id, t.name]))
    const majorMap = new Map(allMajors.map((m) => [m.id, m]))
    const studentsByClassMap = new Map<string, StudentEntity[]>()

    allStudents.forEach((s) => {
      const list = studentsByClassMap.get(s.classId) || []
      list.push(s)
      studentsByClassMap.set(s.classId, list)
    })

    const templates = getStandardLeggerRosterByLevel(level)
    const results: ClassLeggerSummary[] = []

    for (const tpl of templates) {
      const resolved = this.buildSummaryFromCache(
        tpl.className,
        allClasses,
        teacherMap,
        majorMap,
        studentsByClassMap
      )

      if (resolved) {
        results.push(resolved)
      } else {
        results.push({
          classId: `cls_${tpl.classKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          classKey: tpl.classKey,
          className: tpl.className,
          level: tpl.level,
          majorName: tpl.majorName,
          homeroomTeacherName: tpl.homeroomTeacherName,
          maleCount: tpl.maleCount,
          femaleCount: tpl.femaleCount,
          totalCount: tpl.totalCount,
          students: tpl.students
        })
      }
    }

    return results
  }

  /**
   * Sync and Seed all verified students (Grade X real roster of 573 students) into database
   */
  public async syncAllGradeXStudents(): Promise<{
    createdCount: number
    updatedCount: number
    totalStudents: number
    message: string
  }> {
    const now = new Date().toISOString()
    const [allClasses, allExistingStudents] = await Promise.all([
      repositories.classes.findAll(),
      repositories.students.findAll()
    ])

    const classMap = new Map<string, string>()
    allClasses.forEach((c) => {
      classMap.set(c.name.toUpperCase().replace(/\s+/g, '-'), c.id)
      classMap.set(c.name.toUpperCase(), c.id)
    })

    const existingStudentMapByNis = new Map(allExistingStudents.map((s) => [s.nis, s]))

    const studentsToCreate: StudentEntity[] = []
    const studentsToUpdate: Array<{ id: string; updates: Partial<StudentEntity> }> = []

    for (const classDef of VERIFIED_GRADE_X_LEGGERS) {
      const normalizedName = classDef.className.toUpperCase().replace(/\s+/g, '-')
      let classId = classMap.get(normalizedName) || classMap.get(classDef.className.toUpperCase())

      if (!classId) {
        classId = `cls_${classDef.className.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      }

      for (const std of classDef.students) {
        const existing = existingStudentMapByNis.get(std.nis)
        if (existing) {
          studentsToUpdate.push({
            id: existing.id,
            updates: {
              name: std.name,
              gender: std.gender,
              classId,
              updatedAt: now
            }
          })
        } else {
          studentsToCreate.push({
            id: `std_${std.nis.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            nis: std.nis,
            name: std.name,
            gender: std.gender,
            classId,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now
          })
        }
      }
    }

    if (studentsToUpdate.length > 0) {
      await repositories.students.updateBatch(studentsToUpdate)
    }

    if (studentsToCreate.length > 0) {
      await repositories.students.createBatch(studentsToCreate)
    }

    const createdCount = studentsToCreate.length
    const updatedCount = studentsToUpdate.length

    return {
      createdCount,
      updatedCount,
      totalStudents: createdCount + updatedCount,
      message: `Sinkronisasi Legger Siswa Kelas X berhasil: ${createdCount} siswa baru ditambahkan, ${updatedCount} siswa diperbarui dari total 573 siswa resmi.`
    }
  }

  /**
   * Get Full School Legger Statistics (Matching page 17 of official document)
   */
  public async getSchoolStatistics(): Promise<SchoolLeggerStatistics> {
    const activeAy = await repositories.academicYears.findActive()
    const ayName = activeAy ? activeAy.name : '2026/2027'

    const xLeggers = await this.getLeggersByLevel('X')
    const xiLeggers = await this.getLeggersByLevel('XI')
    const xiiLeggers = await this.getLeggersByLevel('XII')

    const sumGroup = (list: ClassLeggerSummary[]) => ({
      male: list.reduce((acc, c) => acc + c.maleCount, 0),
      female: list.reduce((acc, c) => acc + c.femaleCount, 0),
      total: list.reduce((acc, c) => acc + c.totalCount, 0),
      classesCount: list.length
    })

    const gradeX = sumGroup(xLeggers)
    const gradeXI = sumGroup(xiLeggers)
    const gradeXII = sumGroup(xiiLeggers)

    const majors = [
      {
        code: 'TJKT',
        name: 'Teknik Jaringan Komputer dan Telekomunikasi'
      },
      {
        code: 'BP',
        name: 'Broadcasting dan Perfilman'
      },
      {
        code: 'DKV',
        name: 'Desain Komunikasi Visual'
      },
      {
        code: 'TE',
        name: 'Teknik Elektronika'
      },
      {
        code: 'TO',
        name: 'Teknik Otomotif'
      }
    ]

    const byMajor = majors.map((m) => {
      const getMajStats = (list: ClassLeggerSummary[]) => {
        const filtered = list.filter((c) => c.className.includes(m.code))
        return {
          male: filtered.reduce((acc, c) => acc + c.maleCount, 0),
          female: filtered.reduce((acc, c) => acc + c.femaleCount, 0),
          total: filtered.reduce((acc, c) => acc + c.totalCount, 0),
          classes: filtered.length
        }
      }

      const stX = getMajStats(xLeggers)
      const stXI = getMajStats(xiLeggers)
      const stXII = getMajStats(xiiLeggers)

      return {
        majorCode: m.code,
        majorName: m.name,
        gradeX: stX,
        gradeXI: stXI,
        gradeXII: stXII,
        total: stX.total + stXI.total + stXII.total
      }
    })

    return {
      academicYear: ayName,
      gradeX,
      gradeXI,
      gradeXII,
      grandTotal: {
        male: gradeX.male + gradeXI.male + gradeXII.male,
        female: gradeX.female + gradeXI.female + gradeXII.female,
        total: gradeX.total + gradeXI.total + gradeXII.total,
        classesCount: gradeX.classesCount + gradeXI.classesCount + gradeXII.classesCount
      },
      byMajor
    }
  }
}

export const classLeggerService = new ClassLeggerService()
