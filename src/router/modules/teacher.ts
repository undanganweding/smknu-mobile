import { AppRouteRecord } from '@/types/router'

export const teacherRoutes: AppRouteRecord = {
  name: 'Teacher',
  path: '/teacher',
  component: '/index/index',
  meta: {
    title: 'Portal Guru',
    icon: 'ri:user-star-line',
    roles: ['GURU']
  },
  children: [
    {
      path: 'dashboard',
      name: 'TeacherDashboard',
      component: '/teacher/dashboard',
      meta: {
        title: 'Dashboard Guru',
        icon: 'ri:dashboard-line',
        roles: ['GURU'],
        keepAlive: true,
        fixedTab: true
      }
    },
    {
      path: 'schedule',
      name: 'TeacherSchedule',
      component: '/teacher/schedule',
      meta: {
        title: 'Jadwal Mengajar',
        icon: 'ri:calendar-schedule-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'attendance',
      name: 'TeacherAttendance',
      component: '/teacher/attendance',
      meta: {
        title: 'Presensi Siswa',
        icon: 'ri:user-follow-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'journal',
      name: 'TeacherJournal',
      component: '/teacher/journal',
      meta: {
        title: 'Jurnal Mengajar',
        icon: 'ri:book-read-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'assessment',
      name: 'TeacherAssessment',
      component: '/teacher/assessment',
      meta: {
        title: 'Penilaian Siswa',
        icon: 'ri:file-list-3-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'discipline',
      name: 'TeacherDiscipline',
      component: '/teacher/discipline',
      meta: {
        title: 'Buku Pelanggaran & Prestasi',
        icon: 'ri:shield-user-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'reports',
      name: 'TeacherReports',
      component: '/teacher/reports',
      meta: {
        title: 'Rekap & Laporan Saya',
        icon: 'ri:file-chart-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'report-card',
      name: 'TeacherReportCard',
      component: '/teacher/report-card',
      meta: {
        title: 'Cetak Rapor Siswa',
        icon: 'ri:article-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'sync-status',
      name: 'TeacherSyncStatus',
      component: '/teacher/sync-status',
      meta: {
        title: 'Status Sinkronisasi',
        icon: 'ri:refresh-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'announcements',
      name: 'TeacherAnnouncements',
      component: '/teacher/announcements',
      meta: {
        title: 'Pengumuman & Notifikasi',
        icon: 'ri:notification-3-line',
        roles: ['GURU'],
        keepAlive: true
      }
    },
    {
      path: 'profile',
      name: 'TeacherProfile',
      component: '/teacher/profile',
      meta: {
        title: 'Profil & Keamanan',
        icon: 'ri:user-settings-line',
        roles: ['GURU'],
        keepAlive: true
      }
    }
  ]
}
