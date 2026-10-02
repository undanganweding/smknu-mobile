/**
 * Guru Offline - Verified School Master Seed Data
 * School: SMK NU UNGARAN (Tahun Pelajaran 2026/2027)
 * Source of Truth: PDF Reference Documents 1, 2, 3, 4
 */

import { repositories } from '../repositories'
import { IndexedDbStudentRepository } from '../repositories/indexeddb/repositories'
import { hashPassword } from '../security/password'
import { getStandardLeggerRosterByLevel } from '../services/master/ClassLeggerData'
import type {
  SchoolIdentityEntity,
  AcademicYearEntity,
  MajorEntity,
  TeacherEntity,
  SubjectEntity,
  TeacherAssignmentEntity,
  ClassEntity,
  RoomEntity,
  StudentEntity,
  ScheduleEntity,
  UserEntity
} from '../types'

export function getVerifiedInitialSchedules(academicYearId: string, now: string): ScheduleEntity[] {
  return [
    // Guru 1: Siti Nur Asiyah, S.Pd.I. (Assignment: asgn_a_1 - Pendidikan Agama dan Budi Pekerti)
    {
      id: 'schd_seed_01',
      academicYearId,
      classId: 'cls_x_tjkt_1',
      teacherAssignmentId: 'asgn_a_1',
      dayOfWeek: 'SENIN',
      periodStart: 1,
      periodEnd: 3,
      timeStart: '07:00',
      timeEnd: '09:15',
      roomId: 'room_a201',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_02',
      academicYearId,
      classId: 'cls_x_tjkt_2',
      teacherAssignmentId: 'asgn_a_1',
      dayOfWeek: 'SELASA',
      periodStart: 4,
      periodEnd: 6,
      timeStart: '09:30',
      timeEnd: '11:45',
      roomId: 'room_a202',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_03',
      academicYearId,
      classId: 'cls_x_bp_1',
      teacherAssignmentId: 'asgn_a_1',
      dayOfWeek: 'RABU',
      periodStart: 1,
      periodEnd: 3,
      timeStart: '07:00',
      timeEnd: '09:15',
      roomId: 'room_a205',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_04',
      academicYearId,
      classId: 'cls_x_dkv_1',
      teacherAssignmentId: 'asgn_a_1',
      dayOfWeek: 'KAMIS',
      periodStart: 7,
      periodEnd: 9,
      timeStart: '12:30',
      timeEnd: '14:45',
      roomId: 'room_a301',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_05',
      academicYearId,
      classId: 'cls_x_te_1',
      teacherAssignmentId: 'asgn_a_1',
      dayOfWeek: 'JUMAT',
      periodStart: 1,
      periodEnd: 3,
      timeStart: '07:00',
      timeEnd: '09:00',
      roomId: 'room_b101',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_06',
      academicYearId,
      classId: 'cls_x_to_1',
      teacherAssignmentId: 'asgn_a_1',
      dayOfWeek: 'SABTU',
      periodStart: 2,
      periodEnd: 4,
      timeStart: '07:45',
      timeEnd: '10:00',
      roomId: 'room_b201',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    // Guru Hidayat Muhtar, A.Md.Kom. (Assignment: asgn_o1_55 - Dasar-dasar Program Keahlian TJKT)
    {
      id: 'schd_seed_07',
      academicYearId,
      classId: 'cls_x_tjkt_1',
      teacherAssignmentId: 'asgn_o1_55',
      dayOfWeek: 'SENIN',
      periodStart: 4,
      periodEnd: 7,
      timeStart: '09:30',
      timeEnd: '12:30',
      roomId: 'room_lab_tjkt_1',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_08',
      academicYearId,
      classId: 'cls_x_tjkt_2',
      teacherAssignmentId: 'asgn_o1_55',
      dayOfWeek: 'RABU',
      periodStart: 4,
      periodEnd: 8,
      timeStart: '09:30',
      timeEnd: '13:15',
      roomId: 'room_lab_tjkt_2',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_09',
      academicYearId,
      classId: 'cls_x_tjkt_3',
      teacherAssignmentId: 'asgn_o1_55',
      dayOfWeek: 'KAMIS',
      periodStart: 1,
      periodEnd: 4,
      timeStart: '07:00',
      timeEnd: '09:40',
      roomId: 'room_lab_tjkt_1',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    // Guru Febri Arianto, S.Kom. (Assignment: asgn_n3_51 - Projek Kreatif dan Kewirausahaan TJKT)
    {
      id: 'schd_seed_10',
      academicYearId,
      classId: 'cls_xi_tjkt_1',
      teacherAssignmentId: 'asgn_n3_51',
      dayOfWeek: 'SENIN',
      periodStart: 1,
      periodEnd: 5,
      timeStart: '07:00',
      timeEnd: '10:45',
      roomId: 'room_lab_tjkt_2',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_11',
      academicYearId,
      classId: 'cls_xi_tjkt_2',
      teacherAssignmentId: 'asgn_n3_51',
      dayOfWeek: 'SELASA',
      periodStart: 6,
      periodEnd: 10,
      timeStart: '11:45',
      timeEnd: '15:30',
      roomId: 'room_lab_tjkt_2',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    // Guru Budi Setiarjo, S.Pd. (Assignment: asgn_d_12 - Matematika)
    {
      id: 'schd_seed_12',
      academicYearId,
      classId: 'cls_x_tjkt_1',
      teacherAssignmentId: 'asgn_d_12',
      dayOfWeek: 'SELASA',
      periodStart: 1,
      periodEnd: 3,
      timeStart: '07:00',
      timeEnd: '09:15',
      roomId: 'room_a201',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'schd_seed_13',
      academicYearId,
      classId: 'cls_x_bp_1',
      teacherAssignmentId: 'asgn_d_12',
      dayOfWeek: 'KAMIS',
      periodStart: 1,
      periodEnd: 3,
      timeStart: '07:00',
      timeEnd: '09:15',
      roomId: 'room_a205',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }
  ]
}

export async function ensureAllClassStudentsExist(): Promise<number> {
  try {
    const allClasses = await repositories.classes.findAll()
    if (allClasses.length === 0) return 0

    const allExistingStudents = await repositories.students.findAll()

    // Audit if existing database contains old dummy data ("Siswa ...") or missing fields
    const hasUnrealisticData = allExistingStudents.some(
      (s) => s.name.startsWith('Siswa ') || !s.nisn || !s.parentPhone || !s.address
    )

    const ALL_SCHOOL_LEGGERS = [
      ...getStandardLeggerRosterByLevel('X'),
      ...getStandardLeggerRosterByLevel('XI'),
      ...getStandardLeggerRosterByLevel('XII')
    ]

    const leggerMap = new Map<string, (typeof ALL_SCHOOL_LEGGERS)[0]>()
    for (const leg of ALL_SCHOOL_LEGGERS) {
      leggerMap.set(leg.className.toUpperCase().replace(/\s+/g, '-'), leg)
      leggerMap.set(leg.classKey.toUpperCase().replace(/\s+/g, '-'), leg)
      leggerMap.set(leg.className.toUpperCase(), leg)
    }

    const now = new Date().toISOString()

    if (hasUnrealisticData || allExistingStudents.length < 500) {
      const localStudentRepo = new IndexedDbStudentRepository()
      await localStudentRepo.clear()

      const newStudentsToCreate: StudentEntity[] = []
      for (const cls of allClasses) {
        const normalizedName = cls.name.toUpperCase().replace(/\s+/g, '-')
        const tpl = leggerMap.get(normalizedName) || leggerMap.get(cls.name.toUpperCase())

        if (tpl && tpl.students && tpl.students.length > 0) {
          for (const s of tpl.students) {
            const cleanNis = s.nis || `${cls.name.replace(/[^a-zA-Z0-9]/g, '')}-${s.no}`
            newStudentsToCreate.push({
              id: `std_${cleanNis.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${cls.id}`,
              nis: cleanNis,
              nisn: s.nisn,
              name: s.name,
              gender: s.gender || 'L',
              birthPlace: s.birthPlace,
              birthDate: s.birthDate,
              parentPhone: s.parentPhone,
              address: s.address,
              classId: cls.id,
              status: 'ACTIVE',
              createdAt: now,
              updatedAt: now
            })
          }
        }
      }

      if (newStudentsToCreate.length > 0) {
        await localStudentRepo.createBatch(newStudentsToCreate)
      }
      return newStudentsToCreate.length
    }

    const classStudentsMap = new Map<string, StudentEntity[]>()
    const usedNisSet = new Set<string>()

    for (const s of allExistingStudents) {
      if (s.nis) usedNisSet.add(s.nis)
      if (!classStudentsMap.has(s.classId)) {
        classStudentsMap.set(s.classId, [])
      }
      classStudentsMap.get(s.classId)!.push(s)
    }

    const newStudentsToCreate: StudentEntity[] = []
    const studentsToUpdate: StudentEntity[] = []

    for (const cls of allClasses) {
      const existingForClass = classStudentsMap.get(cls.id) || []
      const normalizedName = cls.name.toUpperCase().replace(/\s+/g, '-')
      const tpl = leggerMap.get(normalizedName) || leggerMap.get(cls.name.toUpperCase())

      if (existingForClass.length === 0) {
        if (tpl && tpl.students && tpl.students.length > 0) {
          for (const s of tpl.students) {
            let cleanNis = s.nis || `${cls.name.replace(/[^a-zA-Z0-9]/g, '')}-${s.no}`
            if (usedNisSet.has(cleanNis)) {
              cleanNis = `${cleanNis}_${cls.id.slice(-4)}`
            }
            usedNisSet.add(cleanNis)

            newStudentsToCreate.push({
              id: `std_${cleanNis.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${cls.id}`,
              nis: cleanNis,
              nisn: s.nisn,
              name: s.name,
              gender: s.gender || 'L',
              birthPlace: s.birthPlace,
              birthDate: s.birthDate,
              parentPhone: s.parentPhone,
              address: s.address,
              classId: cls.id,
              status: 'ACTIVE',
              createdAt: now,
              updatedAt: now
            })
          }
        }
      } else if (tpl && tpl.students && tpl.students.length > 0) {
        for (let i = 0; i < existingForClass.length; i++) {
          const st = existingForClass[i]
          const matchingTplStudent = tpl.students.find((s) => s.nis === st.nis || s.no === i + 1)
          if (matchingTplStudent && matchingTplStudent.name !== st.name) {
            studentsToUpdate.push({
              ...st,
              name: matchingTplStudent.name,
              nisn: matchingTplStudent.nisn || st.nisn,
              gender: matchingTplStudent.gender || st.gender,
              birthPlace: matchingTplStudent.birthPlace || st.birthPlace,
              birthDate: matchingTplStudent.birthDate || st.birthDate,
              parentPhone: matchingTplStudent.parentPhone || st.parentPhone,
              address: matchingTplStudent.address || st.address,
              updatedAt: now
            })
          }
        }
      }
    }

    const localStudentRepo = new IndexedDbStudentRepository()
    if (newStudentsToCreate.length > 0) {
      await localStudentRepo.createBatch(newStudentsToCreate)
    }
    if (studentsToUpdate.length > 0) {
      for (const st of studentsToUpdate) {
        await localStudentRepo.update(st.id, st)
      }
    }

    return newStudentsToCreate.length + studentsToUpdate.length
  } catch (err) {
    console.error('[seedData] Failed in ensureAllClassStudentsExist:', err)
    return 0
  }
}

export async function seedDatabase(force = false): Promise<{ success: boolean; message: string }> {
  try {
    const existingIdentity = await repositories.schoolIdentity.getIdentity()
    if (existingIdentity && !force) {
      // Ensure sample guru account exists
      const existingGuru = await repositories.users.findByUsername('guru')
      if (!existingGuru) {
        const teachers = await repositories.teachers.findAll()
        if (teachers.length > 0) {
          const guruHash = await hashPassword('guru123')
          await repositories.users.create({
            id: 'usr_guru_sample',
            username: 'guru',
            passwordHash: guruHash,
            role: 'GURU',
            teacherId: teachers[0].id,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
      }

      // Ensure schedules are seeded if empty
      const existingScheduleCount = await repositories.schedules.count()
      if (existingScheduleCount === 0) {
        const activeAy = await repositories.academicYears.findActive()
        if (activeAy) {
          const schedules = getVerifiedInitialSchedules(activeAy.id, new Date().toISOString())
          await repositories.schedules.createBatch(schedules)
        }
      }

      // Ensure all classes have students (auto-repair for existing DBs)
      const repairedCount = await ensureAllClassStudentsExist()

      return {
        success: true,
        message:
          repairedCount > 0
            ? `Database synced: added ${repairedCount} missing student records across classes.`
            : 'Database already initialized with seed data.'
      }
    }

    if (force) {
      // Clear stores
      await Promise.all([
        repositories.users.clear(),
        repositories.teachers.clear(),
        repositories.teacherAssignments.clear(),
        repositories.academicYears.clear(),
        repositories.majors.clear(),
        repositories.classes.clear(),
        repositories.subjects.clear(),
        repositories.rooms.clear(),
        repositories.students.clear(),
        repositories.schedules.clear(),
        repositories.attendances.clear(),
        repositories.journals.clear(),
        repositories.assessments.clear(),
        repositories.disciplineNotes.clear(),
        repositories.announcements.clear(),
        repositories.schoolIdentity.clear()
      ])
    }

    const now = new Date().toISOString()

    // 1. School Identity (From Dokumen 1, 2, 3, 4)
    const schoolIdentity: SchoolIdentityEntity = {
      id: 'sch_smknu_ungaran',
      npsn: '20320256',
      name: 'SMK NU UNGARAN',
      address: 'Jalan Kaligarang No. 9 Ungaran',
      principalName: 'Dr. H. Ahmad Hanik, M.Pd.',
      principalNip: '-',
      wks1Name: 'Budi Setiarjo, S.Pd.',
      wks1Nip: '-',
      contact: 'Telp./Fax. (024) 6924034-6922708',
      isoDocCode: 'FM.02.03.76.KUR.01.05',
      createdAt: now,
      updatedAt: now
    }
    await repositories.schoolIdentity.create(schoolIdentity)

    // 2. Academic Year
    const academicYear: AcademicYearEntity = {
      id: 'ay_2026_2027_ganjil',
      name: '2026/2027',
      semester: 'GANJIL',
      isActive: true,
      startDate: '2026-07-13',
      endDate: '2026-12-19',
      createdAt: now,
      updatedAt: now
    }
    await repositories.academicYears.create(academicYear)

    // 3. Majors
    const majors: MajorEntity[] = [
      {
        id: 'maj_tjkt',
        code: 'TJKT',
        name: 'Teknik Jaringan Komputer dan Telekomunikasi',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'maj_bp',
        code: 'BP',
        name: 'Broadcasting dan Perfilman',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'maj_dkv',
        code: 'DKV',
        name: 'Desain Komunikasi Visual',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'maj_te',
        code: 'TE',
        name: 'Teknik Elektronika',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'maj_to',
        code: 'TO',
        name: 'Teknik Otomotif',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }
    ]
    await repositories.majors.createBatch(majors)

    // 4. Default Admin User
    const adminUser: UserEntity = {
      id: 'usr_admin',
      username: 'admin',
      // Standard local hash identifier for 'admin123'
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }
    await repositories.users.create(adminUser)

    // 5. Rooms (Theory & Labs from Schedule Documents)
    const roomCodes = [
      // Theory rooms
      'A201',
      'A202',
      'A203',
      'A204',
      'A205',
      'A206',
      'A207',
      'A301',
      'A302',
      'A303',
      'A304',
      'A305',
      'A306',
      'A307',
      'A308',
      'A309',
      'A310',
      'A311',
      'B101',
      'B102',
      'B201',
      'B202',
      'B203',
      'B204',
      'B205',
      'B206',
      'B207',
      'C201',
      'C202',
      'C203',
      // Labs & Workshops
      'Lab TJKT 1',
      'Lab TJKT 2',
      'Lab TJKT 3',
      'Lab TJKT 4',
      'Lab TJKT 5',
      'Lab TJKT 6',
      'Lab Telkom',
      'Lab BP 1',
      'Lab BP 2',
      'Lab BP 3',
      'Lab BP 4',
      'Lab BP 5',
      'Lab BP 6',
      'Lab DKV 1',
      'Lab DKV 2',
      'Lab DKV 3',
      'Lab DKV 4',
      'Lab TE 1',
      'Lab TE 2',
      'Lab TE 3',
      'Lab TO 1',
      'Lab TO 2',
      'Lab TO 3',
      'Lab TO 4',
      'Lab Bhs'
    ]

    const rooms: RoomEntity[] = roomCodes.map((code) => ({
      id: `room_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      code,
      name: code.startsWith('Lab') ? code : `Ruang ${code}`,
      type: code.startsWith('Lab') ? 'LAB' : 'THEORY',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    }))
    await repositories.rooms.createBatch(rooms)

    // 6. Real Teachers, Subjects & 117 Assignments (Dokumen 1)
    const rawTeacherData: Array<{
      no: number
      code: string
      name: string
      subject: string
      hours: number
    }> = [
      {
        no: 1,
        code: 'A',
        name: 'Siti Nur Asiyah, S.Pd.I.',
        subject: 'Pendidikan Agama dan Budi Pekerti',
        hours: 33
      },
      {
        no: 2,
        code: 'A1',
        name: 'Latif Mustaghfirin, S.Pd.',
        subject: 'Pendidikan Agama dan Budi Pekerti',
        hours: 33
      },
      {
        no: 3,
        code: 'A2',
        name: 'Much Roisul Mahiruddin, S.Pd.',
        subject: 'Pendidikan Agama dan Budi Pekerti',
        hours: 33
      },
      {
        no: 4,
        code: 'A3',
        name: 'Sulma Samkhaty Maghfiroh, S.Ud.',
        subject: 'Pendidikan Agama dan Budi Pekerti',
        hours: 36
      },
      {
        no: 5,
        code: 'B',
        name: 'Nada Khasnatifani, S.Pd.',
        subject: 'Pendidikan Pancasila',
        hours: 30
      },
      {
        no: 6,
        code: 'B1',
        name: 'Fatkhan Yusuf Anggulian, S.Pd.',
        subject: 'Pendidikan Pancasila',
        hours: 30
      },
      {
        no: 7,
        code: 'B2',
        name: 'Puji Jeli Mahanani, S.Pd.',
        subject: 'Pendidikan Pancasila',
        hours: 30
      },
      { no: 8, code: 'C', name: 'Mujeri, S.Pd.', subject: 'Bahasa Indonesia', hours: 36 },
      {
        no: 9,
        code: 'C1',
        name: 'Agus Pujianto, S.Pd., M.Pd.',
        subject: 'Bahasa Indonesia',
        hours: 38
      },
      {
        no: 10,
        code: 'C2',
        name: 'Ratna Purnamasari, S.Pd.',
        subject: 'Bahasa Indonesia',
        hours: 39
      },
      {
        no: 11,
        code: 'C3',
        name: 'Wahyu Jatiningrum, S.Pd.',
        subject: 'Bahasa Indonesia',
        hours: 38
      },
      { no: 12, code: 'D', name: 'Budi Setiarjo, S.Pd.', subject: 'Matematika', hours: 25 },
      {
        no: 13,
        code: 'D1',
        name: 'Erti Santriyani Amawati, S.Pd.',
        subject: 'Matematika',
        hours: 33
      },
      { no: 14, code: 'D2', name: 'Nur Suciati, S.Pd.', subject: 'Matematika', hours: 30 },
      {
        no: 15,
        code: 'D3',
        name: "Nisa'ul Lathifatul Khoir, S.Pd., M.Pd.",
        subject: 'Matematika',
        hours: 33
      },
      { no: 16, code: 'D4', name: 'Hanindha Adhi Yogama, S.Pd.', subject: 'Matematika', hours: 30 },
      { no: 17, code: 'E', name: 'Rita Rianti, S.Pd.', subject: 'Sejarah', hours: 32 },
      {
        no: 18,
        code: 'F',
        name: 'Muhammad Ulil Rohman, S.Pd.',
        subject: 'Bahasa Inggris',
        hours: 24
      },
      { no: 19, code: 'F1', name: 'Budi Sujiwa, S.Pd.', subject: 'Bahasa Inggris', hours: 28 },
      { no: 20, code: 'F2', name: 'Wakhid Hayim, S.Pd.I.', subject: 'Bahasa Inggris', hours: 28 },
      {
        no: 21,
        code: 'F3',
        name: "Muhammad Faridhul Mu'arif, S.Pd.",
        subject: 'Bahasa Inggris',
        hours: 32
      },
      { no: 22, code: 'F4', name: 'Ratih Wijayanti, S.Pd.', subject: 'Bahasa Inggris', hours: 36 },
      {
        no: 23,
        code: 'F5',
        name: 'Mohammad Nur Rahmad Marzuqi, S.S.',
        subject: 'Bahasa Inggris',
        hours: 32
      },
      {
        no: 24,
        code: 'G',
        name: 'Annisa Cikal Achaddani, S.Pd.',
        subject: 'Seni dan Budaya',
        hours: 32
      },
      {
        no: 25,
        code: 'H',
        name: 'Riko Kurniawan, S.Pd.',
        subject: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
        hours: 24
      },
      {
        no: 26,
        code: 'H1',
        name: 'Bram Shaikul Hadi, S.Pd.',
        subject: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
        hours: 27
      },
      {
        no: 27,
        code: 'H2',
        name: 'NN-PJOK',
        subject: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
        hours: 27
      },
      {
        no: 28,
        code: 'J',
        name: 'Wiwin Ariyanti, S.Pd.',
        subject: 'Projek Ilmu Pengetahuan Alam dan Sosial',
        hours: 24
      },
      { no: 29, code: 'E1', name: 'Wiwin Ariyanti, S.Pd.', subject: 'Sejarah', hours: 6 },
      {
        no: 30,
        code: 'J1',
        name: 'Ika Kurniawati, S.Pd.',
        subject: 'Projek Ilmu Pengetahuan Alam dan Sosial',
        hours: 24
      },
      { no: 31, code: 'E2', name: 'Ika Kurniawati, S.Pd.', subject: 'Sejarah', hours: 10 },
      {
        no: 32,
        code: 'J2',
        name: 'Erna Kristinawati, S.Pd.',
        subject: 'Projek Ilmu Pengetahuan Alam dan Sosial',
        hours: 24
      },
      { no: 33, code: 'E3', name: 'Erna Kristinawati, S.Pd.', subject: 'Sejarah', hours: 6 },
      {
        no: 34,
        code: 'J3',
        name: 'Qonaah Aniyq Adawiah, S.Pd.',
        subject: 'Projek Ilmu Pengetahuan Alam dan Sosial',
        hours: 24
      },
      { no: 35, code: 'E4', name: 'Qonaah Aniyq Adawiah, S.Pd.', subject: 'Sejarah', hours: 8 },
      { no: 36, code: 'K', name: 'Sri Wahyuni, S.Pd.', subject: 'Bahasa Jawa', hours: 31 },
      {
        no: 37,
        code: 'K1',
        name: 'Panggah Adi Putranto, S.Pd., M.Pd.',
        subject: 'Bahasa Jawa',
        hours: 28
      },
      { no: 38, code: 'K2', name: 'Umi Marfuatin, S.Pd.I.', subject: 'Bahasa Arab', hours: 30 },
      { no: 39, code: 'K3', name: 'Sifa Sirojuddin Anjay', subject: 'Ke-Nu-an', hours: 31 },
      {
        no: 40,
        code: 'L',
        name: 'Dyan Nuryahya, S.Kom.',
        subject: 'Koding dan Kecerdasan Artifisial (pilihan XI)',
        hours: 8
      },
      {
        no: 41,
        code: 'L1',
        name: 'Dyan Nuryahya, S.Kom.',
        subject: 'Administrasi Sistem Jaringan (ASJ)',
        hours: 16
      },
      {
        no: 42,
        code: 'L2',
        name: 'Dyan Nuryahya, S.Kom.',
        subject: 'Keamanan Jaringan XII',
        hours: 8
      },
      {
        no: 43,
        code: 'L3',
        name: 'Andi Siswadi, S.Kom.',
        subject: 'Perencanaan Pengalamatan Jaringan',
        hours: 8
      },
      {
        no: 44,
        code: 'L4',
        name: 'Andi Siswadi, S.Kom.',
        subject: 'Pemasangan dan Konfigurasi Perangkat Jaringan',
        hours: 28
      },
      {
        no: 45,
        code: 'M',
        name: 'Nisfu Said Khodri, S.Kom.',
        subject: 'Teknologi Jaringan Kabel dan Nirkabel',
        hours: 40
      },
      {
        no: 46,
        code: 'M1',
        name: 'Sri Maryani, S.Kom.',
        subject: 'Administrasi Sistem Jaringan (ASJ) XII',
        hours: 24
      },
      {
        no: 47,
        code: 'M2',
        name: 'Sri Maryani, S.Kom.',
        subject: 'Dasar-dasar Program Keahlian TJKT',
        hours: 12
      },
      {
        no: 48,
        code: 'N',
        name: 'Amien Sekha, S.Kom.',
        subject: 'Projek Kreatif dan Kewirausahaan TJKT',
        hours: 30
      },
      {
        no: 49,
        code: 'N1',
        name: 'Amien Sekha, S.Kom.',
        subject: 'Koding dan Kecerdasan Artifisial',
        hours: 6
      },
      {
        no: 50,
        code: 'N2',
        name: 'Febri Arianto, S.Kom.',
        subject: 'Dasar-dasar Program Keahlian TJKT',
        hours: 24
      },
      {
        no: 51,
        code: 'N3',
        name: 'Febri Arianto, S.Kom.',
        subject: 'Projek Kreatif dan Kewirausahaan TJKT',
        hours: 10
      },
      {
        no: 52,
        code: 'N4',
        name: 'Muchamad Syarifuddin MR, A.Md.Kom.',
        subject: 'Pemasangan dan Konfigurasi Perangkat Jaringan XII',
        hours: 12
      },
      {
        no: 53,
        code: 'N5',
        name: 'Muchamad Syarifuddin MR, A.Md.Kom.',
        subject: 'Keamanan Jaringan',
        hours: 24
      },
      {
        no: 54,
        code: 'O',
        name: 'Hidayat Muhtar, A.Md.Kom.',
        subject: 'Koding dan Kecerdasan Artifisial',
        hours: 8
      },
      {
        no: 55,
        code: 'O1',
        name: 'Hidayat Muhtar, A.Md.Kom.',
        subject: 'Dasar-dasar Program Keahlian TJKT',
        hours: 12
      },
      {
        no: 56,
        code: 'O2',
        name: 'Hidayat Muhtar, A.Md.Kom.',
        subject: 'Pemrograman (Pil XII)',
        hours: 16
      },
      {
        no: 57,
        code: 'O3',
        name: 'Djarot Nugroho, S.Si., M.Kom.',
        subject: 'Editing Film Televisi XII',
        hours: 8
      },
      {
        no: 58,
        code: 'O4',
        name: 'Djarot Nugroho, S.Si., M.Kom.',
        subject: 'Koding dan Kecerdasan Artifisial X',
        hours: 6
      },
      {
        no: 59,
        code: 'O5',
        name: 'Djarot Nugroho, S.Si., M.Kom.',
        subject: 'Koding dan Kecerdasan Artifisial XI',
        hours: 12
      },
      {
        no: 60,
        code: 'P',
        name: 'Joko Tri Setiyawan, S.Sn.',
        subject: 'Operatorisasi Kamera',
        hours: 36
      },
      {
        no: 61,
        code: 'P1',
        name: 'Alit Kusno Widodo, S.Kom.',
        subject: 'Dasar-dasar Program Keahlian BP',
        hours: 12
      },
      {
        no: 62,
        code: 'P2',
        name: 'Alit Kusno Widodo, S.Kom.',
        subject: 'Editing Film Televisi XI',
        hours: 15
      },
      {
        no: 63,
        code: 'P3',
        name: 'Ahmad Nurman Khoir, S.Kom.',
        subject: 'Editing Film Televisi XII',
        hours: 16
      },
      {
        no: 64,
        code: 'P4',
        name: 'Ahmad Nurman Khoir, S.Kom.',
        subject: 'Perekaman dan Penataan Suara Film XI',
        hours: 9
      },
      {
        no: 65,
        code: 'P5',
        name: 'Ahmad Nurman Khoir, S.Kom.',
        subject: 'Perekaman dan Penataan Suara Film XII',
        hours: 8
      },
      {
        no: 66,
        code: 'Q',
        name: 'Rezky Kurniawan Leksono Adi, M.Kom.',
        subject: 'Projek Kreatif dan Kewirausahaan BP XI',
        hours: 15
      },
      {
        no: 67,
        code: 'Q1',
        name: 'Rezky Kurniawan Leksono Adi, M.Kom.',
        subject: 'Digital Konten Kreator',
        hours: 12
      },
      {
        no: 68,
        code: 'Q2',
        name: 'Faiz Alfan Hidayat, S.Ds.',
        subject: 'Dasar-dasar program keahlian BP',
        hours: 12
      },
      {
        no: 69,
        code: 'Q3',
        name: 'Faiz Alfan Hidayat, S.Ds.',
        subject: 'Projek Kreatif dan Kewirausahaan BP XII',
        hours: 15
      },
      {
        no: 70,
        code: 'Q4',
        name: 'Faiz Alfan Hidayat, S.Ds.',
        subject: 'Perekaman dan Penataan Suara Film XII',
        hours: 4
      },
      {
        no: 71,
        code: 'R',
        name: 'Dewi Anggi Aggraeni Ratnasari, S.Ds.',
        subject: 'Penata Artistik XI',
        hours: 12
      },
      {
        no: 72,
        code: 'R1',
        name: 'Dewi Anggi Aggraeni Ratnasari, S.Ds.',
        subject: 'Penata Artistik XII',
        hours: 12
      },
      {
        no: 73,
        code: 'R2',
        name: 'Dewi Anggi Aggraeni Ratnasari, S.Ds.',
        subject: 'Dasar-dasar program keahlian BP',
        hours: 12
      },
      {
        no: 74,
        code: 'R3',
        name: 'Ira Nur Baity Chasanah, S.Kom.',
        subject: 'Informatika',
        hours: 36
      },
      {
        no: 75,
        code: 'S',
        name: 'Dina Saftitah, S.Ds.',
        subject: 'Proses Produksi Desain',
        hours: 12
      },
      {
        no: 76,
        code: 'S1',
        name: 'Dina Saftitah, S.Ds.',
        subject: 'Visual Branding (pilihan) XII',
        hours: 12
      },
      {
        no: 77,
        code: 'S2',
        name: 'Dina Saftitah, S.Ds.',
        subject: 'Dasar-dasar Program Keahlian DKV',
        hours: 12
      },
      {
        no: 78,
        code: 'S3',
        name: 'Achmad Ali Mahmudi, S.Ds.',
        subject: 'Perangkat Lunak Desain',
        hours: 18
      },
      {
        no: 79,
        code: 'S4',
        name: 'Achmad Ali Mahmudi, S.Ds.',
        subject: 'Dasar-dasar Program Keahlian DKV',
        hours: 12
      },
      {
        no: 80,
        code: 'S5',
        name: 'Achmad Ali Mahmudi, S.Ds.',
        subject: 'Koding dan Kecerdasan Artifisial',
        hours: 6
      },
      {
        no: 81,
        code: 'T',
        name: 'Andi Krisna Muhammad Ghalib, S.Tr.Anim.',
        subject: 'Projek Kreatif dan Kewirausahaan DKV',
        hours: 30
      },
      {
        no: 82,
        code: 'T1',
        name: 'Andi Krisna Muhammad Ghalib, S.Tr.Anim.',
        subject: 'Menerapkan Desain Brief',
        hours: 6
      },
      {
        no: 83,
        code: 'T2',
        name: 'Achmad Zairin, S.Pd., M.Pd.',
        subject: 'Dasar-dasar Program Keahlian DKV',
        hours: 12
      },
      {
        no: 84,
        code: 'T3',
        name: 'Achmad Zairin, S.Pd., M.Pd.',
        subject: 'Menerapkan Desain Brief',
        hours: 24
      },
      { no: 85, code: 'U', name: 'NN-DKV-1', subject: 'Perangkat Lunak Desain', hours: 12 },
      { no: 86, code: 'U1', name: 'NN-DKV-2', subject: 'Proses Produksi Desain', hours: 12 },
      { no: 87, code: 'U2', name: 'NN-DKV-3', subject: 'Karya Desain', hours: 12 },
      {
        no: 88,
        code: 'U3',
        name: 'Wahyu Aji Nugroho, S.I.Kom., M.Pd.',
        subject: 'Menerapkan Desain Brief',
        hours: 6
      },
      {
        no: 89,
        code: 'U4',
        name: 'Wahyu Aji Nugroho, S.I.Kom., M.Pd.',
        subject: 'Informatika DKV',
        hours: 12
      },
      {
        no: 90,
        code: 'U5',
        name: 'Wahyu Aji Nugroho, S.I.Kom., M.Pd.',
        subject: 'Karya Desain',
        hours: 18
      },
      {
        no: 91,
        code: 'V',
        name: 'Maskuri, S.Pd.',
        subject: 'Projek Kreatif dan Kewirausahaan TE XI',
        hours: 10
      },
      {
        no: 92,
        code: 'V1',
        name: 'Maskuri, S.Pd.',
        subject: 'Dasar-dasar Program Keahlian-TE-CP2 (Dasar Listrik dan Instalasi)',
        hours: 12
      },
      {
        no: 93,
        code: 'V2',
        name: 'Maskuri, S.Pd.',
        subject: 'Pembuatan Perbaikan dan Peneliharaan Peralatan Elektronika XII',
        hours: 8
      },
      {
        no: 94,
        code: 'V3',
        name: 'Soulton Arief, S.Pd.',
        subject: 'Pemrograman dan Komunikasi Data',
        hours: 18
      },
      {
        no: 95,
        code: 'V4',
        name: 'Soulton Arief, S.Pd.',
        subject: 'Pembuatan Projek Elektronika (pil XII)',
        hours: 8
      },
      {
        no: 96,
        code: 'V5',
        name: 'Soulton Arief, S.Pd.',
        subject: 'Koding dan Kecerdasan Artifisial',
        hours: 6
      },
      { no: 97, code: 'V6', name: 'Soulton Arief, S.Pd.', subject: 'Informatika TO', hours: 4 },
      {
        no: 98,
        code: 'W',
        name: 'Lufita,S.Pd.',
        subject: 'Dasar-dasar Program Keahlian-TE-CP2 (Dasar Elektronika dan Pengukuran)',
        hours: 12
      },
      {
        no: 99,
        code: 'W1',
        name: 'Lufita,S.Pd.',
        subject: 'Sistem Kendali Industri XI-XII',
        hours: 20
      },
      {
        no: 100,
        code: 'W2',
        name: 'Lufita,S.Pd.',
        subject: 'Koding dan Kecerdasan Artifisial (pilihan XI)',
        hours: 4
      },
      {
        no: 101,
        code: 'W3',
        name: 'Nur Arifah, S.Pd.',
        subject: 'Dasar-dasar Program Keahlian-TE-CP3 (Kerja Bengkel dan Gambar Teknik)',
        hours: 12
      },
      {
        no: 102,
        code: 'W4',
        name: 'Nur Arifah, S.Pd.',
        subject: 'Projek Kreatif dan Kewirausahaan TE XII',
        hours: 10
      },
      {
        no: 103,
        code: 'W5',
        name: 'Nur Arifah, S.Pd.',
        subject: 'Penerapan Rangkaian Elektronika XI-XII',
        hours: 12
      },
      {
        no: 104,
        code: 'X',
        name: 'Ikbal Saputra, S.Pd.',
        subject: 'Sistem Kendali Elektronik XII',
        hours: 12
      },
      {
        no: 105,
        code: 'X1',
        name: 'Ikbal Saputra, S.Pd.',
        subject: 'Pembuatan, Perbaikan dan Pemeliharaan Peralatan Elektronika XI',
        hours: 10
      },
      { no: 106, code: 'X2', name: 'Ikbal Saputra, S.Pd.', subject: 'Informatika TE', hours: 12 },
      {
        no: 107,
        code: 'Y',
        name: 'Yuri Ambarwanto, S.Pd.',
        subject: 'Pemeliharaan Mesin Sepeda Motor',
        hours: 32
      },
      {
        no: 108,
        code: 'Y1',
        name: 'Ii Eldiana, S.Pd.',
        subject: 'Pemeliharaan Kelistrikan Sepeda Motor',
        hours: 34
      },
      {
        no: 109,
        code: 'Y2',
        name: 'Riza Adhitianingsih, S.Pd.',
        subject: 'Pemeliharaan Sasis Sepeda Motor',
        hours: 32
      },
      {
        no: 110,
        code: 'Z',
        name: 'Siti Fatimah, S.Pd.',
        subject: 'Projek Kreatif dan Kewirausahaan TO',
        hours: 25
      },
      {
        no: 111,
        code: 'Z1',
        name: 'Siti Fatimah, S.Pd.',
        subject: 'Koding dan Kecerdasan Artifisial (pilihan X)',
        hours: 6
      },
      {
        no: 112,
        code: 'Z2',
        name: 'Siti Fatimah, S.Pd.',
        subject: 'Pengelasan Dasar (Pilihan XII TO)',
        hours: 8
      },
      {
        no: 113,
        code: 'Z3',
        name: 'Nabila Dian Aryani, S.Pd.',
        subject: 'Dasar-dasar Program Keahlian TO',
        hours: 36
      },
      {
        no: 114,
        code: 'BK1',
        name: 'Wahyu Tri Febriyanti, S.Pd.',
        subject: 'Bimbingan Konseling',
        hours: 0
      },
      {
        no: 115,
        code: 'BK2',
        name: 'Wahyu Ratnawati S.Pd.',
        subject: 'Bimbingan Konseling',
        hours: 0
      },
      {
        no: 116,
        code: 'BK3',
        name: 'Adhystia Nur Hartanti, S.Psi.',
        subject: 'Bimbingan Konseling',
        hours: 0
      },
      {
        no: 117,
        code: 'BK4',
        name: 'Nicko Dharma Pradana, S.Pd., M.Psi.',
        subject: 'Bimbingan Konseling',
        hours: 0
      }
    ]

    // Extract unique teachers
    let tchIdx = 0
    const teacherMap = new Map<string, TeacherEntity>()
    rawTeacherData.forEach((row) => {
      const cleanName = row.name.replace(/\.\d+$/, '').trim()
      const teacherKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      if (!teacherMap.has(teacherKey)) {
        tchIdx++
        const id = `tch_${teacherKey}`
        const nip = `198${(tchIdx % 20) + 70}0${(tchIdx % 9) + 1}${(tchIdx % 28) + 1} 200801 ${(tchIdx % 2) + 1} 00${(tchIdx % 9) + 1}`
        const phone = `0812-${String(1000 + tchIdx * 17).padStart(4, '0')}-${String(5000 + tchIdx * 23).padStart(4, '0')}`
        const email = `${cleanName
          .toLowerCase()
          .split(' ')[0]
          .replace(/[^a-z]/g, '')}@smknuungaran.sch.id`

        teacherMap.set(teacherKey, {
          id,
          name: cleanName,
          nip,
          phone,
          email,
          education:
            cleanName.includes('M.Pd') || cleanName.includes('M.Kom') || cleanName.includes('M.Psi')
              ? 'S2'
              : 'S1',
          address: `Jl. Kaligarang No. ${(tchIdx % 30) + 10}, Ungaran, Kab. Semarang`,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        })
      }
    })
    const teachers = Array.from(teacherMap.values())
    await repositories.teachers.createBatch(teachers)

    // Extract unique subjects
    const subjectMap = new Map<string, SubjectEntity>()
    rawTeacherData.forEach((row) => {
      const cleanSubject = row.subject.trim()
      const subjectKey = cleanSubject.toLowerCase().replace(/[^a-z0-9]/g, '_')
      if (!subjectMap.has(subjectKey)) {
        const id = `sbj_${subjectKey}`
        subjectMap.set(subjectKey, {
          id,
          code: cleanSubject
            .slice(0, 8)
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ''),
          name: cleanSubject,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        })
      }
    })
    const subjects = Array.from(subjectMap.values())
    await repositories.subjects.createBatch(subjects)

    // Create 117 Teacher Assignments
    const assignments: TeacherAssignmentEntity[] = rawTeacherData.map((row) => {
      const cleanName = row.name.replace(/\.\d+$/, '').trim()
      const cleanSubject = row.subject.trim()
      const teacherKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const subjectKey = cleanSubject.toLowerCase().replace(/[^a-z0-9]/g, '_')
      const teacher = teacherMap.get(teacherKey)!
      const subject = subjectMap.get(subjectKey)!

      return {
        id: `asgn_${row.code.toLowerCase()}_${row.no}`,
        teacherId: teacher.id,
        code: row.code,
        subjectId: subject.id,
        hours: row.hours,
        academicYearId: academicYear.id,
        semester: 'GANJIL',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }
    })
    await repositories.teacherAssignments.createBatch(assignments)

    // 7. Real Classes (Dokumen 3 & 4)
    const classConfigs: Array<{
      name: string
      level: 'X' | 'XI' | 'XII'
      majorCode: string
      rombel: number
      waliTeacherName?: string
    }> = [
      // Kelas X
      {
        name: 'X-TJKT-1',
        level: 'X',
        majorCode: 'TJKT',
        rombel: 1,
        waliTeacherName: 'Ratna Purnamasari, S.Pd.'
      },
      {
        name: 'X-TJKT-2',
        level: 'X',
        majorCode: 'TJKT',
        rombel: 2,
        waliTeacherName: 'Agus Pujianto, S.Pd., M.Pd.'
      },
      {
        name: 'X-TJKT-3',
        level: 'X',
        majorCode: 'TJKT',
        rombel: 3,
        waliTeacherName: 'Siti Nur Asiyah, S.Pd.I.'
      },
      {
        name: 'X-TJKT-4',
        level: 'X',
        majorCode: 'TJKT',
        rombel: 4,
        waliTeacherName: 'Wahyu Ratnawati S.Pd.'
      },
      {
        name: 'X-BP-1',
        level: 'X',
        majorCode: 'BP',
        rombel: 1,
        waliTeacherName: 'Dewi Anggi Aggraeni Ratnasari, S.Ds.'
      },
      {
        name: 'X-BP-2',
        level: 'X',
        majorCode: 'BP',
        rombel: 2,
        waliTeacherName: 'Ira Nur Baity Chasanah, S.Kom.'
      },
      {
        name: 'X-BP-3',
        level: 'X',
        majorCode: 'BP',
        rombel: 3,
        waliTeacherName: 'Riko Kurniawan, S.Pd.'
      },
      {
        name: 'X-DKV-1',
        level: 'X',
        majorCode: 'DKV',
        rombel: 1,
        waliTeacherName: "Muhammad Faridhul Mu'arif, S.Pd."
      },
      {
        name: 'X-DKV-2',
        level: 'X',
        majorCode: 'DKV',
        rombel: 2,
        waliTeacherName: 'Erti Santriyani Amawati, S.Pd.'
      },
      {
        name: 'X-DKV-3',
        level: 'X',
        majorCode: 'DKV',
        rombel: 3,
        waliTeacherName: "Nisa'ul Lathifatul Khoir, S.Pd., M.Pd."
      },
      {
        name: 'X-TE-1',
        level: 'X',
        majorCode: 'TE',
        rombel: 1,
        waliTeacherName: 'Much Roisul Mahiruddin, S.Pd.'
      },
      {
        name: 'X-TE-2',
        level: 'X',
        majorCode: 'TE',
        rombel: 2,
        waliTeacherName: 'Ikbal Saputra, S.Pd.'
      },
      {
        name: 'X-TE-3',
        level: 'X',
        majorCode: 'TE',
        rombel: 3,
        waliTeacherName: 'Nur Arifah, S.Pd.'
      },
      {
        name: 'X-TO-1',
        level: 'X',
        majorCode: 'TO',
        rombel: 1,
        waliTeacherName: 'Nur Suciati, S.Pd.'
      },
      {
        name: 'X-TO-2',
        level: 'X',
        majorCode: 'TO',
        rombel: 2,
        waliTeacherName: 'Rita Rianti, S.Pd.'
      },
      {
        name: 'X-TO-3',
        level: 'X',
        majorCode: 'TO',
        rombel: 3,
        waliTeacherName: 'Puji Jeli Mahanani, S.Pd.'
      },
      // Kelas XI
      {
        name: 'XI-TJKT-1',
        level: 'XI',
        majorCode: 'TJKT',
        rombel: 1,
        waliTeacherName: 'Nada Khasnatifani, S.Pd.'
      },
      {
        name: 'XI-TJKT-2',
        level: 'XI',
        majorCode: 'TJKT',
        rombel: 2,
        waliTeacherName: 'Fatkhan Yusuf Anggulian, S.Pd.'
      },
      {
        name: 'XI-TJKT-3',
        level: 'XI',
        majorCode: 'TJKT',
        rombel: 3,
        waliTeacherName: 'Mujeri, S.Pd.'
      },
      {
        name: 'XI-TJKT-4',
        level: 'XI',
        majorCode: 'TJKT',
        rombel: 4,
        waliTeacherName: 'Wahyu Jatiningrum, S.Pd.'
      },
      {
        name: 'XI-BP-1',
        level: 'XI',
        majorCode: 'BP',
        rombel: 1,
        waliTeacherName: 'Annisa Cikal Achaddani, S.Pd.'
      },
      {
        name: 'XI-BP-2',
        level: 'XI',
        majorCode: 'BP',
        rombel: 2,
        waliTeacherName: 'Bram Shaikul Hadi, S.Pd.'
      },
      {
        name: 'XI-BP-3',
        level: 'XI',
        majorCode: 'BP',
        rombel: 3,
        waliTeacherName: 'Wiwin Ariyanti, S.Pd.'
      },
      {
        name: 'XI-DKV-1',
        level: 'XI',
        majorCode: 'DKV',
        rombel: 1,
        waliTeacherName: 'Panggah Adi Putranto, S.Pd., M.Pd.'
      },
      {
        name: 'XI-DKV-2',
        level: 'XI',
        majorCode: 'DKV',
        rombel: 2,
        waliTeacherName: 'Umi Marfuatin, S.Pd.I.'
      },
      {
        name: 'XI-DKV-3',
        level: 'XI',
        majorCode: 'DKV',
        rombel: 3,
        waliTeacherName: 'Sifa Sirojuddin Anjay'
      },
      {
        name: 'XI-TE-1',
        level: 'XI',
        majorCode: 'TE',
        rombel: 1,
        waliTeacherName: 'Dyan Nuryahya, S.Kom.'
      },
      {
        name: 'XI-TE-2',
        level: 'XI',
        majorCode: 'TE',
        rombel: 2,
        waliTeacherName: 'Andi Siswadi, S.Kom.'
      },
      {
        name: 'XI-TO-1',
        level: 'XI',
        majorCode: 'TO',
        rombel: 1,
        waliTeacherName: 'Nisfu Said Khodri, S.Kom.'
      },
      {
        name: 'XI-TO-2',
        level: 'XI',
        majorCode: 'TO',
        rombel: 2,
        waliTeacherName: 'Sri Maryani, S.Kom.'
      },
      {
        name: 'XI-TO-3',
        level: 'XI',
        majorCode: 'TO',
        rombel: 3,
        waliTeacherName: 'Amien Sekha, S.Kom.'
      },
      // Kelas XII
      {
        name: 'XII-TJKT-1',
        level: 'XII',
        majorCode: 'TJKT',
        rombel: 1,
        waliTeacherName: 'Febri Arianto, S.Kom.'
      },
      {
        name: 'XII-TJKT-2',
        level: 'XII',
        majorCode: 'TJKT',
        rombel: 2,
        waliTeacherName: 'Muchamad Syarifuddin MR, A.Md.Kom.'
      },
      {
        name: 'XII-TJKT-3',
        level: 'XII',
        majorCode: 'TJKT',
        rombel: 3,
        waliTeacherName: 'Hidayat Muhtar, A.Md.Kom.'
      },
      {
        name: 'XII-TJKT-4',
        level: 'XII',
        majorCode: 'TJKT',
        rombel: 4,
        waliTeacherName: 'Djarot Nugroho, S.Si., M.Kom.'
      },
      {
        name: 'XII-BP-1',
        level: 'XII',
        majorCode: 'BP',
        rombel: 1,
        waliTeacherName: 'Joko Tri Setiyawan, S.Sn.'
      },
      {
        name: 'XII-BP-2',
        level: 'XII',
        majorCode: 'BP',
        rombel: 2,
        waliTeacherName: 'Alit Kusno Widodo, S.Kom.'
      },
      {
        name: 'XII-BP-3',
        level: 'XII',
        majorCode: 'BP',
        rombel: 3,
        waliTeacherName: 'Ahmad Nurman Khoir, S.Kom.'
      },
      {
        name: 'XII-DKV-1',
        level: 'XII',
        majorCode: 'DKV',
        rombel: 1,
        waliTeacherName: 'Rezky Kurniawan Leksono Adi, M.Kom.'
      },
      {
        name: 'XII-DKV-2',
        level: 'XII',
        majorCode: 'DKV',
        rombel: 2,
        waliTeacherName: 'Faiz Alfan Hidayat, S.Ds.'
      },
      {
        name: 'XII-DKV-3',
        level: 'XII',
        majorCode: 'DKV',
        rombel: 3,
        waliTeacherName: 'Dina Saftitah, S.Ds.'
      },
      {
        name: 'XII-TE-1',
        level: 'XII',
        majorCode: 'TE',
        rombel: 1,
        waliTeacherName: 'Achmad Ali Mahmudi, S.Ds.'
      },
      {
        name: 'XII-TE-2',
        level: 'XII',
        majorCode: 'TE',
        rombel: 2,
        waliTeacherName: 'Andi Krisna Muhammad Ghalib, S.Tr.Anim.'
      },
      {
        name: 'XII-TO-1',
        level: 'XII',
        majorCode: 'TO',
        rombel: 1,
        waliTeacherName: 'Achmad Zairin, S.Pd., M.Pd.'
      },
      {
        name: 'XII-TO-2',
        level: 'XII',
        majorCode: 'TO',
        rombel: 2,
        waliTeacherName: 'Wahyu Aji Nugroho, S.I.Kom., M.Pd.'
      }
    ]

    const classes: ClassEntity[] = classConfigs.map((cfg) => {
      const major = majors.find((m) => m.code === cfg.majorCode)!
      const homeroomTeacher = cfg.waliTeacherName ? teacherMap.get(cfg.waliTeacherName) : undefined
      const id = `cls_${cfg.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`

      return {
        id,
        name: cfg.name,
        level: cfg.level,
        rombel: cfg.rombel,
        academicYearId: academicYear.id,
        majorId: major.id,
        homeroomTeacherId: homeroomTeacher?.id,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      }
    })
    await repositories.classes.createBatch(classes)

    // 8. Real Verified Students with Exact NIS & Gender across Grades X, XI, and XII
    const classMap = new Map(classes.map((c) => [c.name.toUpperCase().replace(/\s+/g, '-'), c.id]))
    classes.forEach((c) => classMap.set(c.name.toUpperCase(), c.id))

    const ALL_INITIAL_LEGGERS = [
      ...getStandardLeggerRosterByLevel('X'),
      ...getStandardLeggerRosterByLevel('XI'),
      ...getStandardLeggerRosterByLevel('XII')
    ]

    const students: StudentEntity[] = []
    for (const clsDef of ALL_INITIAL_LEGGERS) {
      const targetClassId =
        classMap.get(clsDef.className.toUpperCase().replace(/\s+/g, '-')) ||
        classMap.get(clsDef.className.toUpperCase()) ||
        classes[0].id

      for (const s of clsDef.students) {
        const cleanNis = s.nis || `STD-${s.no}`
        students.push({
          id: `std_${cleanNis.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${targetClassId}`,
          nis: cleanNis,
          nisn: s.nisn,
          name: s.name,
          gender: s.gender,
          birthPlace: s.birthPlace,
          birthDate: s.birthDate,
          parentPhone: s.parentPhone,
          address: s.address,
          classId: targetClassId,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now
        })
      }
    }
    await repositories.students.createBatch(students)

    // 9. Verified Timetable Schedules
    const initialSchedules = getVerifiedInitialSchedules(academicYear.id, now)
    await repositories.schedules.createBatch(initialSchedules)

    // Ensure sample active Guru user exists for testing & operations
    const existingGuru = await repositories.users.findByUsername('guru')
    if (!existingGuru && teachers.length > 0) {
      await repositories.users.create({
        id: 'usr_guru_sample',
        username: 'guru',
        passwordHash: await hashPassword('guru123'),
        role: 'GURU',
        teacherId: teachers[0].id,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      })
    }

    return {
      success: true,
      message: `Database successfully initialized: ${teachers.length} teachers, ${subjects.length} subjects, ${assignments.length} assignments, ${classes.length} classes, ${rooms.length} rooms, ${students.length} verified sample students, ${initialSchedules.length} verified timetable schedules, and 1 administrator account.`
    }
  } catch (error) {
    console.error('[SeedData] Error initializing seed data:', error)
    return {
      success: false,
      message: `Seed error: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
