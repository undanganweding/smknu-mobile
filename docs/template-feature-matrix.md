# Art Design Pro UI/UX Template Feature Matrix & Audit

This document details the complete template inventory of **Art Design Pro** capabilities within the Guru Offline school management system, along with feature utilization status and page compliance classification.

---

## 1. Template Feature Inventory & Utilization Matrix

| Category | Template Feature / Component | Description | Status | Application Integration |
| :-- | :-- | :-- | :-- | :-- |
| **Layout** | `ArtSidebarMenu` | Collapsible multi-level role-aware navigation sidebar | USED | Primary navigation frame for Admin & Teacher routes |
| **Layout** | `ArtHeaderBar` | Header bar with breadcrumbs, quick actions, user avatar, & sync status | USED | App header across all authenticated views |
| **Layout** | `ArtPageContent` | Router-view container with transition animations | USED | Primary content viewport |
| **Layout** | `ArtWorkTab` | Tab bar for open pages with fixed tabs & context menu | USED | Navigation tab bar in header layout |
| **Layout** | `ArtBreadcrumb` | Dynamic breadcrumb path indicator | NEWLY_INTEGRATED | Explicitly bound to router meta titles on headers |
| **Layout** | `ArtGlobalSearch` | Command palette modal (Ctrl+K / Cmd+K) for quick navigation & search | NEWLY_INTEGRATED | Global search across Teachers, Students, Classes, Subjects, Rooms, & Schedules |
| **Layout** | `ArtNotification` | Notification popover / drawer for system events, sync queue, & alerts | NEWLY_INTEGRATED | Integrated in header with real offline sync & audit event notifications |
| **Cards** | `ArtStatsCard` | Metric summary card with icon, percentage change, and trend indicator | USED | Admin & Teacher dashboards for key operational metrics |
| **Cards** | `ArtProgressCard` | Metric card with progress bar indicator | NEWLY_INTEGRATED | Attendance submission rates & KKM pass rates |
| **Cards** | `ArtDataListCard` | Itemized list card for activities, schedules, and recent logs | USED | Today's schedule & recent administrative audit logs |
| **Cards** | `ArtTimelineListCard` | Vertical timeline list component | KEEP | Available for administrative activity streams |
| **Cards** | `ArtBarChartCard` | Card container embedding ECharts bar chart | USED | Grade distributions & teaching hours per major |
| **Cards** | `ArtLineChartCard` | Card container embedding ECharts line chart | USED | Weekly attendance trends & journal completion logs |
| **Tables** | `ArtTable` | Unified table component with selection, pagination, and empty state | USED | Standard table component across all master data views |
| **Tables** | `ArtTableHeader` | Standardized table header with search, filters, refresh, & column toggles | USED | Integrated above master data & report tables |
| **Forms** | `ArtSearchBar` | Collapsible/expandable filter form grid for complex table queries | PARTIALLY_USED | Data filter panels across reports & data management |
| **Forms** | `ArtExcelImport` | Drag-and-drop Excel/CSV file upload dropzone | NEWLY_INTEGRATED | Integrated in Admin Data Management import pipeline |
| **Forms** | `ArtExcelExport` | Export trigger button with CSV/XLSX format options | NEWLY_INTEGRATED | Integrated in Master Data tables & Report exports |
| **Forms** | `ArtButtonMore` | Dropdown trigger button for overflow table row actions | USED | Table row action dropdowns |
| **Forms** | `ArtButtonTable` | Icon action button inside table cells | USED | Quick table cell action triggers |
| **Feedback** | `ElNotification` / `ElMessage` | Toast notifications & alerts styled via Art Design Pro theme | USED | System-wide feedback for operations, sync, and import |
| **Feedback** | `ElSkeleton` / `ElEmpty` | Standardized loading skeletons & empty state placeholders | NEWLY_INTEGRATED | Uniform loading & empty state visuals across all views |
| **Overlays** | `ElDialog` / `ElDrawer` | Art Design Pro styled drawers and modal dialogs | USED | Detail drawers, edit modals, and import preview drawers |

_Legend for Status:_

- `USED`: Existing active template component in core views.
- `PARTIALLY_USED`: Used in specific pages, expanded across all relevant views.
- `NEWLY_INTEGRATED`: Newly bound/integrated into application views during UI/UX standardization.
- `KEEP`: Retained template component available in component library.

---

## 2. Application Page Compliance Audit & Classification

| Route / Page | Route Path | Description | Initial Classification | Action Taken |
| :-- | :-- | :-- | :-- | :-- |
| **Admin Dashboard** | `/admin/dashboard` | Metric widgets, operational summary, sync status | B (Partially Compliant) | Refactored with `ArtStatsCard`, `ArtProgressCard`, `ArtDataListCard`, and ECharts |
| **Admin Teachers** | `/admin/teachers` | Teacher master data, status toggle, detail drawer | B (Partially Compliant) | Refactored header, search bar, `ArtTable`, badges, drawer |
| **Admin Students** | `/admin/students` | Student list, class filtering, status mutation | B (Partially Compliant) | Refactored with `ArtTableHeader`, `ArtTable`, status chips |
| **Admin Classes** | `/admin/classes` | Rombel list, homeroom teacher assignment | B (Partially Compliant) | Refactored to Art Design Pro card & table grid |
| **Admin Subjects** | `/admin/subjects` | Subject master data, KKM, category filters | B (Partially Compliant) | Refactored with standard filter bar & `ArtTable` |
| **Admin Rooms** | `/admin/rooms` | Room list, theory/lab type tags, capacity | B (Partially Compliant) | Refactored with status tags & standard table layout |
| **Admin Assignments** | `/admin/assignments` | SK Teaching assignments & teaching hours calculator | B (Partially Compliant) | Refactored table headers, metric badges, edit dialogs |
| **Admin Schedules** | `/admin/schedules` | Timetable grid, clash detection warnings | B (Partially Compliant) | Refactored with timetable slot badges & clash alert banners |
| **Admin Reports** | `/admin/reports` | Attendance, journal, & assessment recaps | B (Partially Compliant) | Refactored filter form, summary metrics, print preview drawer |
| **Admin Data Mgmt** | `/admin/data-management` | Import/Export, Bulk Operations, Audit & Import History | C (Custom UI) | **REBUILT** using `ArtExcelImport`, `ArtExcelExport`, standard tabs, step wizard, preview drawer |
| **Admin Accounts** | `/admin/accounts` | User accounts, role assignment, password reset | B (Partially Compliant) | Refactored with standard search bar, user table, role tags |
| **Admin Settings** | `/admin/settings` | School identity, active academic year | B (Partially Compliant) | Refactored to Art Design Pro form card sections |
| **Teacher Dashboard** | `/teacher/dashboard` | Today's schedule, quick attendance & journal shortcuts | B (Partially Compliant) | Refactored with `ArtStatsCard`, today's schedule card, sync widget |
| **Teacher Schedule** | `/teacher/schedule` | Teaching timetable grid & quick session launch | B (Partially Compliant) | Refactored to Art Design Pro schedule card timeline |
| **Teacher Attendance** | `/teacher/attendance` | Rapid attendance input (HADIR default, exception toggles) | B (Partially Compliant) | Refactored student list card, quick status chips, batch save bar |
| **Teacher Journal** | `/teacher/journal` | Teaching journal entry, topic & notes | B (Partially Compliant) | Refactored form card, schedule picker, history drawer |
| **Teacher Assessment** | `/teacher/assessment` | Student scoring grid & decimal KKM evaluator | A (Compliant - Phase 3C Locked) | Preserved & fine-tuned header/breadcrumbs without altering locked core UI |
| **Teacher Reports** | `/teacher/reports` | Teacher's personal attendance & journal recap | B (Partially Compliant) | Refactored summary cards, filter bar, CSV export trigger |
| **Teacher Profile** | `/teacher/profile` | Teacher profile details & account security | B (Partially Compliant) | Refactored to Art Design Pro user profile card layout |

_Classification System:_

- **A**: TEMPLATE COMPLIANT
- **B**: PARTIALLY COMPLIANT (Refactored to template standard)
- **C**: NON-COMPLIANT CUSTOM UI (Rebuilt completely using Art Design Pro template)
