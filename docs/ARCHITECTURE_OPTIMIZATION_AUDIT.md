# Laporan Optimasi Arsitektur & Isolasi Modul Demo/Template

## Guru Offline — SMK NU Ungaran

Dokumen ini mendokumentasikan hasil audit arsitektur, isolasi modul demo/template bawaan Art Design Pro, dan optimasi performa produksi aplikasi **Guru Offline — SMK NU Ungaran**.

---

## 1. Baseline vs Final Inspection

| Metrik | Baseline (Pra-Optimasi) | Final (Pasca-Optimasi) | Perubahan / Efisiensi |
| :-- | :-- | :-- | :-- |
| **Ukuran Direktori `dist/`** | 9.6 MB | 4.8 MB | **-50.0% (Hemat 4.8 MB)** |
| **Total JavaScript Chunks** | 236 chunks | 86 chunks | **-150 chunks (-63.5%)** |
| **ECharts Bundle di Produksi** | 800 kB (Termuat di bundle) | 0 kB (Eliminated) | **100% Tree-shaken out** |
| **Route Registration Produksi** | 12 modul (campur template) | 2 modul (ADMIN & GURU saja) | **Isolasi 100%** |
| **Header Bar Demo Features** | FastEnter & Chat aktif | Dinonaktifkan | **Beban startup berkurang** |
| **Global Shell Components** | 6 komponen eager-loaded | Asynchronous & demo off | **Tidak memblokir layout chunk** |
| **Test Suite Regresi** | 92 passed, 0 failed | 92 passed, 0 failed | **100% PASS (Zero Regression)** |
| **TypeScript / ESLint** | Clean | Clean (0 errors, 0 warnings) | **PASS** |

---

## 2. Modul yang Dinonaktifkan / Diisolasi

### A. Route Registration (`src/router/modules/index.ts`)

- Modul rute produksi murni:
  - `adminRoutes` (`/admin/*`) — Akses authoritative untuk peran `ADMIN`.
  - `teacherRoutes` (`/teacher/*`) — Akses operasional harian untuk peran `GURU`.
- Modul rute demo yang **dikeluarkan dari registrasi produksi**:
  - `dashboardRoutes` (`/dashboard/console`, `/dashboard/analysis`)
  - `templateRoutes` (Data Table, Charts, Map, Forms, Stepper, Editors, dll.)
  - `widgetsRoutes` (Card Widgets, Chart Widgets, List Widgets, dll.)
  - `examplesRoutes` (UI Component Showcase, Form Examples, Tables)
  - `systemRoutes` (Template User/Role/Dept management bawaan Art Design Pro)
  - `articleRoutes` (Demo CMS Article list, detail, comment)
  - `resultRoutes` (Result success, fail, info, warning demos)
  - `exceptionRoutes` (Demo 403, 404, 500 showcase; rute exception sistem riil tetap ada di `staticRoutes.ts`)
  - `safeguardRoutes` (Demo Server Error, Maintenance, Account Freeze)
  - `helpRoutes` (Demo Document, Help Center)

### B. Header Bar & Shell Features (`src/config/modules/headerBar.ts`, `src/config/setting.ts`)

- **Fast Enter (`fastEnter: false`)**: Menghilangkan tombol popup aplikasi demo (yang sebelumnya mengarah ke Bilibili, Fireworks, Demo Chat, Console, dll.).
- **Chat Window (`chat: false`)**: Menghilangkan popup simulasi bot chat template.
- **Festival Text & Fireworks Effect (`enabled: false`)**: Efek kembang api dan teks ucapan festival bawaan template tidak lagi memicu background interval.

### C. Global Component Architecture (`src/config/modules/component.ts`)

- Komponen shell (`ArtSettingsPanel`, `ArtGlobalSearch`, `ArtScreenLock`) diubah dari import sinkron menjadi `defineAsyncComponent`.
- Komponen demo `chat-window`, `fireworks-effect`, dan `watermark` diset `enabled: false`.
- Komponen tidak dieksekusi atau diparse sebelum pengguna secara eksplisit membuka fiturnya (misal menekan `Ctrl+K` untuk search).

---

## 3. Daftar SAFE_TO_DELETE (File Demo/Template Siap Hapus)

Berikut adalah inventaris lengkap file template/demo bawaan Art Design Pro yang **sudah sepenuhnya diisolasi** dari proses build, router, navigasi, dan runtime produksi. Sesuai instruksi, file-file ini belum dihapus secara fisik agar aman dari dependensi tak terduga, tetapi berada dalam status `SAFE_TO_DELETE` untuk fase pembersihan fisik berikutnya.

### Kategori A: Route Modules (`src/router/modules/`)

1. `src/router/modules/dashboard.ts`
2. `src/router/modules/template.ts`
3. `src/router/modules/widgets.ts`
4. `src/router/modules/examples.ts`
5. `src/router/modules/system.ts`
6. `src/router/modules/article.ts`
7. `src/router/modules/result.ts`
8. `src/router/modules/exception.ts`
9. `src/router/modules/safeguard.ts`
10. `src/router/modules/help.ts`

### Kategori B: Views / Halaman Demo (`src/views/`)

1. `src/views/dashboard/` (seluruh isi: `console`, `analysis`)
2. `src/views/template/` (seluruh isi: `charts`, `map`, `forms`, `stepper`, `editor`, `cards`, dll.)
3. `src/views/widgets/` (seluruh isi widgets showcase)
4. `src/views/examples/` (seluruh isi UI showcase & component examples)
5. `src/views/system/` (seluruh isi template role/user/menu manager demo)
6. `src/views/article/` (seluruh isi demo CMS blog/article)
7. `src/views/result/` (seluruh isi demo result pages)
8. `src/views/safeguard/` (seluruh isi demo maintenance/freeze screens)
9. `src/views/help/` (seluruh isi demo docs/help)

### Kategori C: Mock Data Khusus Demo (`src/mock/`)

1. `src/mock/temp/`
2. `src/mock/article/`
3. `src/mock/upgrade/` (catatan rilis Art Design Pro)

### Kategori D: Komponen Khusus Demo Shell (`src/components/core/`)

1. `src/components/core/layouts/art-chat-window/`
2. `src/components/core/layouts/art-fireworks-effect/`
3. `src/components/core/text-effect/art-festival-text-scroll/`

---

## 4. Perubahan Route Loading & Komponen

### A. Restriksi `ComponentLoader` (`src/router/core/ComponentLoader.ts`)

- **Sebelum**:
  ```ts
  this.modules = import.meta.glob('../../views/**/*.vue')
  ```
  Menyebabkan seluruh file `.vue` di bawah `src/views/` (termasuk ratusan demo template) dibaca oleh Vite dan di-generate menjadi file chunk terpisah.
- **Sesudah**:
  ```ts
  this.modules = import.meta.glob([
    '../../views/admin/**/*.vue',
    '../../views/teacher/**/*.vue',
    '../../views/auth/**/*.vue',
    '../../views/exception/**/*.vue',
    '../../views/index/**/*.vue',
    '../../views/outside/**/*.vue'
  ])
  ```
  Hanya direktori yang relevan dengan Guru Offline dan shell sistem yang discan.

### B. Explicit Dynamic Imports pada Route Definitions

Seluruh child route pada `src/router/modules/admin.ts` dan `src/router/modules/teacher.ts` telah dimigrasikan menggunakan lazy dynamic imports murni:

```ts
component: () => import('@/views/admin/dashboard/index.vue')
```

Hal ini menjamin pembagian chunk kode yang bersih (clean chunk-splitting) dan meminimalkan ukuran initial bundle saat pengguna login.

### C. Tree-Shaking Library Berat (`ECharts`)

- Pada baseline, `echarts` masuk ke dalam bundle produksi karena diimpor oleh halaman-halaman demo dashboard/template.
- Dengan mengisolasi demo views dan membatasi `ComponentLoader`, library `echarts` (beserta plugin grafisnya) **otomatis di-tree-shake secara total (0 kB)** dari bundle produksi.
- Library `xlsx` (SheetJS) tetap dipertahankan dan di-chunk secara terisolasi (`dist/assets/xlsx-*.js`) karena digunakan oleh fitur produksi (`ImportService`, `ExportService`, dan komponen data management sekolah).

---

## 5. Hasil Verifikasi & Uji Regresi

1. **Linting & Code Quality**:
   - Perintah: `npm run lint`
   - Hasil: `0 errors, 0 warnings` (PASS).
2. **Type Safety & Build**:
   - Perintah: `npm run build` (`compile_applet`)
   - Hasil: Build berhasil tanpa error.
   - Waktu build turun drastis seiring berkurangnya 150 file chunk yang diproses Rollup.
3. **Automated Integration Tests**:
   - Phase 7 (Admin Master Data & Timetable Engine): 20/20 PASS
   - Phase 8 (Reporting, Rekap & Operational Statistics): 20/20 PASS
   - Phase 9 (Data Onboarding, Import/Export & Bulk Migration): 26/26 PASS
   - Phase 11 (PWA & Offline Service Worker Hardening): ALL PASS
   - Phase 11b (Google Workspace Native Integration & SyncQueue): ALL PASS
   - Total: **92/92 test suite berhasil 100% tanpa regresi**.
