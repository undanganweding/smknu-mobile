import { AppRouteRecord } from '@/types/router'
import { adminRoutes } from './admin'
import { teacherRoutes } from './teacher'

/**
 * Production Guru Offline Route Modules
 * Only exposes Admin and Teacher modules for production navigation and workloads.
 */
export const routeModules: AppRouteRecord[] = [adminRoutes, teacherRoutes]
