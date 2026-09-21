/**
 * Guru Offline - Academic Year & School Identity Service
 * Handles active school years, semester dates, and official school identity metadata
 */

import { repositories } from '../../repositories'
import type { AcademicYearEntity, SchoolIdentityEntity, SemesterType } from '../../types'

export interface UpdateSchoolIdentityDTO {
  npsn: string
  name: string
  address: string
  principalName: string
  principalNip?: string
  wks1Name: string
  wks1Nip?: string
  logoUrl?: string
  contact: string
  isoDocCode?: string
}

export interface CreateAcademicYearDTO {
  name: string
  semester: SemesterType
  isActive: boolean
  startDate: string
  endDate: string
}

export class AcademicService {
  async getSchoolIdentity(): Promise<SchoolIdentityEntity | null> {
    return await repositories.schoolIdentity.getIdentity()
  }

  async updateSchoolIdentity(data: UpdateSchoolIdentityDTO): Promise<SchoolIdentityEntity> {
    const identity = await repositories.schoolIdentity.getIdentity()
    const now = new Date().toISOString()

    if (!identity) {
      const newIdentity: SchoolIdentityEntity = {
        id: 'sch_smknu_ungaran',
        npsn: data.npsn.trim(),
        name: data.name.trim(),
        address: data.address.trim(),
        principalName: data.principalName.trim(),
        principalNip: data.principalNip?.trim() || '-',
        wks1Name: data.wks1Name.trim(),
        wks1Nip: data.wks1Nip?.trim() || '-',
        logoUrl: data.logoUrl?.trim(),
        contact: data.contact.trim(),
        isoDocCode: data.isoDocCode?.trim() || 'FM.02.03.76.KUR.01.05',
        createdAt: now,
        updatedAt: now
      }
      return await repositories.schoolIdentity.create(newIdentity)
    }

    return await repositories.schoolIdentity.update(identity.id, {
      ...data,
      updatedAt: now
    })
  }

  async getAllAcademicYears(): Promise<AcademicYearEntity[]> {
    return await repositories.academicYears.findAll()
  }

  async getActiveAcademicYear(): Promise<AcademicYearEntity | null> {
    return await repositories.academicYears.findActive()
  }

  async setActiveAcademicYear(id: string): Promise<AcademicYearEntity> {
    const all = await repositories.academicYears.findAll()
    const now = new Date().toISOString()

    // Deactivate all others
    for (const ay of all) {
      if (ay.id === id) {
        await repositories.academicYears.update(ay.id, { isActive: true, updatedAt: now })
      } else if (ay.isActive) {
        await repositories.academicYears.update(ay.id, { isActive: false, updatedAt: now })
      }
    }

    const updated = await repositories.academicYears.findById(id)
    if (!updated) throw new Error('Tahun pelajaran tidak ditemukan.')
    return updated
  }

  async createAcademicYear(data: CreateAcademicYearDTO): Promise<AcademicYearEntity> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Nama tahun pelajaran wajib diisi (misal: 2026/2027).')
    }

    const now = new Date().toISOString()
    const newAy: AcademicYearEntity = {
      id: `ay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      semester: data.semester,
      isActive: data.isActive,
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: now,
      updatedAt: now
    }

    if (data.isActive) {
      const all = await repositories.academicYears.findAll()
      for (const ay of all) {
        if (ay.isActive) {
          await repositories.academicYears.update(ay.id, { isActive: false, updatedAt: now })
        }
      }
    }

    return await repositories.academicYears.create(newAy)
  }
}

export const academicService = new AcademicService()
