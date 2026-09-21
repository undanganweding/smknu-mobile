# Daftar Periksa Kesiapan Produksi (Production Readiness Checklist)

## Guru Offline — SMK NU Ungaran

Panduan daftar periksa operasional bagi administrator IT sekolah sebelum, saat, dan sesudah melakukan penyebaran aplikasi secara langsung di lingkungan sekolah **SMK NU Ungaran**.

---

## 1. Tahap Pra-Penyebaran (Before Deployment)

### Lingkungan & Keamanan Klien

- [ ] **HTTPS Diaktifkan**: Sertifikat SSL/TLS terpasang dan aktif pada domain penyebaran sekolah (`https://...`).
- [ ] **Variabel Lingkungan Aman**: Tidak ada variabel kredensial sensitif, token OAuth rahasia, atau kunci privat (_API Secret Keys_) yang tertulis keras (_hardcoded_) di dalam kode sumber front-end atau file `.env`.
- [ ] **Peramban Klien Terverifikasi**: Browser sasaran pada laptop/gawai guru minimal menggunakan versi Chrome 100+ atau Edge 100+ yang mendukung penuh PWA, Service Worker, dan kuota penyimpanan IndexedDB yang memadai.

### Integrasi Google Cloud & Firebase

- [ ] **Proyek Google Cloud Terkonfigurasi**: Proyek cloud resmi aktif dan dihubungkan dengan Firebase Console sekolah.
- [ ] **Aktifkan Google REST API**: Keenam API Workspace utama (Drive, Sheets, Gmail, Calendar, Docs, Forms) diaktifkan secara resmi di Google Cloud Console.
- [ ] **Konfigurasi OAuth Consent**: Informasi layar persetujuan OAuth lengkap, diletakkan dalam status "Production", dan menyantumkan seluruh cakupan cakrawala (_OAuth scopes_) yang diperlukan.
- [ ] **Authorized JavaScript Origins**: Domain hosting statis resmi sekolah terdaftar dalam daftar asal yang diizinkan di Google Credentials.
- [ ] **Konfigurasi Firebase Auth Terpasang**: Nilai konfigurasi autentikasi dalam berkas `/firebase-applet-config.json` telah diganti dengan kredensial rilis resmi milik proyek Firebase sekolah.

### Validasi Desain & Metadata

- [ ] **Identitas Dasar Sekolah Terverifikasi**: File `metadata.json` dan judul HTML utama disinkronkan menggunakan nama resmi `Guru Offline - SMK NU Ungaran`.
- [ ] **Icon PWA & Peta Manifest**: Berkas `manifest.json` merujuk ke logo resmi sekolah dengan format dan ukuran gambar yang sesuai.
- [ ] **Service Worker Aktif**: File Service Worker `sw.js` diletakkan di direktori akar (`/public` dan `/dist`) dengan caching shell static yang berfungsi dengan baik.

---

## 2. Tahap Penyebaran Perdana (First Deployment)

### Setup Awal Administrator (Admin First Setup)

- [ ] **Identitas Akademik Sekolah**: Konfigurasi identitas resmi (Nama Sekolah, NPSN, Alamat, Kepala Sekolah, Waka Kurikulum, Kode ISO) disimpan dengan benar ke IndexedDB melalui menu Pengaturan Admin.
- [ ] **Pemilihan Tahun Pelajaran**: Tahun Pelajaran `2026/2027` telah didaftarkan dan ditandai sebagai tahun akademik aktif.
- [ ] **Impor Data Master**: Data master Guru, Siswa, Rombel, Ruang, Mata Pelajaran, SK Mengajar, dan Jadwal Timetable terunggah lengkap dari file template Excel/CSV bebas kesalahan.
- [ ] **Pemberian Akun Guru & Hubungan Peran**: Akun pengguna guru dibuat sesuai perannya (`GURU`) dan ditautkan dengan master ID guru yang bersangkutan demi keamanan isolasi data mengajar.

### Integrasi Google Workspace (Source of Truth)

- [ ] **Pembuatan Google Sheets SOT**: Berkas spreadsheet khusus dibuat di Google Drive admin sekolah.
- [ ] **Otentikasi Akun Google Admin**: Akun admin sukses masuk lewat popup Google Sign-In pada menu Kelola Data.
- [ ] **Inisialisasi Tabel Sheets**: Memasukkan ID Spreadsheet baru dan sukses mengklik tombol **Inisialisasi** untuk melahirkan tab-tab baris header baku (`teachers`, `students`, dsb) di Google Sheets cloud.
- [ ] **Uji Coba Pengiriman Backup**: Sukses mencadangkan database lokal ke file JSON lokal dan mengunggah salinannya langsung ke Google Drive admin.

### Pengujian Aliran Kerja Guru (Teacher Workflow Trials)

- [ ] **Uji Batasan Akses (RBAC)**: Akun guru masuk dan dipastikan terisolasi hanya bisa melihat jadwal mengajar, rombel asuhan, serta jurnal miliknya sendiri. Guru terverifikasi tidak bisa membuka panel pengaturan admin atau mengedit data master siswa.
- [ ] **Uji Presensi Kehadiran Siswa**: Guru sukses menandai presensi siswa (Hadir, Izin, Sakit, Alpa, Terlambat, Dispensasi) dan menulis draf catatan.
- [ ] **Uji Dynamic Counter**: Angka summary kehadiran di widget atas berubah secara instan ketika tombol radio presensi diubah.
- [ ] **Uji Penjaga Navigasi (Navigation Guard)**: Saat guru mengubah status presensi dan mencoba beralih halaman sebelum mengklik simpan, dialog peringatan pengaman berhasil muncul menahan navigasi.
- [ ] **Uji Pengisian Jurnal Mengajar**: Guru sukses menyimpan jurnal mengajar harian (agenda, materi, tugas, catatan).
- [ ] **Uji Pengisian Buku Nilai (Assessment)**: Guru sukses mendaftarkan kriteria tugas/ulangan baru dan memasukkan nilai angka siswa.

---

## 3. Pengujian Skenario Luring & Pemulihan (Offline & Resiliency Trials)

- [ ] **Simulasi Luring**: Menghapus koneksi internet pada perangkat desktop/tablet penguji.
- [ ] **Operasi Standalone Sukses**: Membuka draf presensi kelas, mengubah status kehadiran siswa, mengisi materi jurnal baru, dan menyimpan data secara luring. Data tersimpan dengan aman ke IndexedDB tanpa adanya hambatan muat (_loader hang_).
- [ ] **Uji browser refresh**: Menyegarkan halaman peramban saat dalam keadaan luring, data draf yang disimpan dipastikan tidak hilang dan termuat kembali secara akurat.
- [ ] **Pemeriksaan Antrean Antarmuka (SyncQueue)**: Perubahan data master/transaksi yang direkam dalam kondisi luring terdaftar dengan rapi di dalam tabel `sync_queue` dengan status `PENDING`.
- [ ] **Simulasi Pemulihan Kegagalan (Failure Recovery)**:
  - [ ] Sengaja membuat kegagalan kirim (misalnya dengan memutuskan koneksi saat menekan sinkronisasi).
  - [ ] Sistem berhasil mengubah status antrean di pangkalan data lokal dari `SYNCING` menjadi `FAILED` lengkap dengan keterangan error (`lastError`).
  - [ ] Indikator status sinkronisasi global di dashboard menampilkan jumlah data gagal kirim dengan warna peringatan yang jelas.
  - [ ] Menyalakan kembali koneksi internet, menekan tombol sinkronisasi ulang, dan dipastikan seluruh antrean sukses terunggah ke Google Sheets awan (status berubah menjadi `SYNCED`).

---

## 4. Tahap Pemeliharaan Pasca-Penyebaran (After Deployment Maintenance)

- [ ] **Verifikasi Log Audit**: Log audit mencatat riwayat aktivitas administratif penting secara berkala.
- [ ] **Keamanan Berkas Cadangan**: Berkas JSON hasil pencadangan manual divalidasi struktur dan versinya sebelum dipulihkan ke komputer lain untuk mencegah korupsi data.
- [ ] **Uji Siklus Hidup PWA**: Pembaruan kode web statis dideploy, dan peramban mendeteksi Service Worker baru serta melakukan pembaharuan secara halus tanpa mengganggu keutuhan data IndexedDB yang disimpan di peranti lokal pengguna.
