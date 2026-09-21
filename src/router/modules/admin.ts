import { AppRouteRecord } from '@/types/router'

export const adminRoutes: AppRouteRecord = {
  name: 'Admin',
  path: '/admin',
  component: '/index/index',
  meta: {
    title: 'Administrator',
    icon: 'ri:admin-line',
    roles: ['ADMIN']
  },
  children: [
    {
      path: 'dashboard',
      name: 'AdminDashboard',
      component: '/admin/dashboard',
      meta: {
        title: 'Dashboard Admin',
        icon: 'ri:dashboard-line',
        roles: ['ADMIN'],
        keepAlive: false,
        fixedTab: true
      }
    },
    {
      path: 'accounts',
      name: 'AdminAccounts',
      component: '/admin/accounts',
      meta: {
        title: 'Manajemen Akun',
        icon: 'ri:user-settings-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'teachers',
      name: 'AdminTeachers',
      component: '/admin/teachers',
      meta: {
        title: 'Data Guru',
        icon: 'ri:team-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'subjects',
      name: 'AdminSubjects',
      component: '/admin/subjects',
      meta: {
        title: 'Mata Pelajaran',
        icon: 'ri:book-open-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'classes',
      name: 'AdminClasses',
      component: '/admin/classes',
      meta: {
        title: 'Rombongan Belajar',
        icon: 'ri:community-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'rooms',
      name: 'AdminRooms',
      component: '/admin/rooms',
      meta: {
        title: 'Ruang & Fasilitas',
        icon: 'ri:building-4-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'students',
      name: 'AdminStudents',
      component: '/admin/students',
      meta: {
        title: 'Data Siswa',
        icon: 'ri:user-follow-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'assignments',
      name: 'AdminAssignments',
      component: '/admin/assignments',
      meta: {
        title: 'SK Pembagian Tugas',
        icon: 'ri:file-list-3-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'schedules',
      name: 'AdminSchedules',
      component: '/admin/schedules',
      meta: {
        title: 'Jadwal Pelajaran',
        icon: 'ri:calendar-todo-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'reports',
      name: 'AdminReports',
      component: '/admin/reports',
      meta: {
        title: 'Laporan & Rekapitulasi',
        icon: 'ri:file-chart-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'data-management',
      name: 'AdminDataManagement',
      component: '/admin/data-management',
      meta: {
        title: 'Manajemen Data & Import',
        icon: 'ri:database-2-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'sync-monitor',
      name: 'AdminSyncMonitor',
      component: '/admin/sync-monitor',
      meta: {
        title: 'Monitor Sinkronisasi',
        icon: 'ri:refresh-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'academic-ledger',
      name: 'AdminAcademicLedger',
      component: '/admin/academic-ledger',
      meta: {
        title: 'Ledger Akademik',
        icon: 'ri:file-excel-2-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'semester-closing',
      name: 'AdminSemesterClosing',
      component: '/admin/semester-closing',
      meta: {
        title: 'Tutup Semester',
        icon: 'ri:lock-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    },
    {
      path: 'settings',
      name: 'AdminSettings',
      component: '/admin/settings',
      meta: {
        title: 'Pengaturan Sekolah',
        icon: 'ri:settings-4-line',
        roles: ['ADMIN'],
        keepAlive: false
      }
    }
  ]
}
