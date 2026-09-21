# Panduan Penyebaran & Konfigurasi Produksi (Production Deployment & Configuration Guide)

## Guru Offline — SMK NU Ungaran

Sistem Informasi Akademik & Pengajaran **Guru Offline SMK NU Ungaran** dirancang sebagai aplikasi web progresif (PWA) luring-pertama (_offline-first_) yang tangguh. Aplikasi ini menggunakan **IndexedDB** sebagai pangkalan data utama di perangkat lokal dan mendukung sinkronisasi otomatis dua-arah secara aman dengan **Google Workspace REST API** (Google Sheets & Google Drive).

Dokumen ini memandu administrator sekolah atau teknisi IT dalam melakukan penyebaran (_deployment_), mengonfigurasi API Google Cloud, serta mematangkan sistem untuk penggunaan operasional harian.

---

## 1. Persyaratan Sistem (Requirements)

### Perangkat Lunak Server & Lingkungan Build

- **Node.js**: Versi `v20.19.0` atau yang lebih baru (disarankan LTS).
- **Pengelola Paket (Package Manager)**: `npm` (bawaan Node.js) atau `yarn` / `pnpm`.
- **HTTPS**: Wajib diaktifkan di server produksi. PWA (Progressive Web App) dan sistem Google OAuth Popup memerlukan enkripsi HTTPS yang aman agar dapat berfungsi di peramban pengguna (kecuali pada alamat pengujian `localhost`).

### Persyaratan Peramban Pengguna (Client Browsers)

Aplikasi beroperasi penuh di sisi klien menggunakan penyimpanan browser terisolasi. Browser yang digunakan oleh guru harus mendukung teknologi berikut:

- **IndexedDB API** (Didukung oleh semua browser modern: Google Chrome, Microsoft Edge, Safari, Mozilla Firefox versi terbaru).
- **Service Workers & PWA Installation** (Disarankan Google Chrome atau Microsoft Edge untuk pengalaman instalasi aplikasi desktop/tablet terbaik).
- **Pop-up Permission**: Izinkan pop-up dari domain aplikasi untuk keperluan otentikasi Google Sign-In dan pencetakan dokumen laporan.

### Prasyarat Google Cloud API

Untuk menghubungkan sinkronisasi awan, sekolah harus memiliki proyek aktif di **Google Cloud Console** dengan API berikut yang diaktifkan:

1.  **Google Sheets API** (Untuk sinkronisasi transaksional presensi dan jurnal).
2.  **Google Drive API** (Untuk mengunggah file cadangan otomatis `.json` dan template dokumen).
3.  **Gmail API** (Untuk pengiriman surat pemberitahuan/alert kehadiran).
4.  **Google Calendar API** (Untuk pembuatan agenda jadwal kelas).
5.  **Google Docs API** (Untuk pembuatan template laporan otomatis).
6.  **Google Forms API** (Untuk membaca umpan balik/feedback).

---

## 2. Langkah Instalasi & Penyebaran (Installation & Build)

### Langkah 1: Kloning & Pemasangan Dependensi

Unduh kode sumber aplikasi ke server lokal atau cloud, lalu pasang dependensi pihak ketiga:

```bash
# Masuk ke direktori aplikasi
cd guru-offline

# Pasang dependensi npm secara bersih
npm install
```

### Langkah 2: Konfigurasi Lingkungan (Environment Variables)

Salin contoh konfigurasi lingkungan yang disediakan, lalu sesuaikan isinya:

```bash
cp .env.example .env
```

Isi file `.env` untuk mode produksi standar:

```env
VITE_PORT=3000
VITE_BASE_URL=/
VITE_ACCESS_MODE=frontend
VITE_VERSION=1.0.0
```

_Catatan: Seluruh data kredensial rahasia (seperti Token OAuth) disimpan secara dinamis di memori browser dan IndexedDB pribadi masing-masing pengguna setelah otentikasi. Tidak ada kunci rahasia (*API Secret*) yang ditulis di dalam file konfigurasi atau repositori kode untuk mencegah kebocoran data._

### Langkah 3: Membuat Build Produksi

Kompilasi kode sumber TypeScript dan Vue 3 menjadi file statis teroptimasi:

```bash
npm run build
```

Proses ini akan menghasilkan direktori `/dist` yang berisi seluruh aset statis, file HTML, manifest PWA, dan Service Worker (`sw.js`).

### Langkah 4: Menjalankan Hasil Build (Preview)

Untuk menguji hasil kompilasi produksi di lingkungan lokal:

```bash
npm run serve
```

Aplikasi akan berjalan secara mandiri di port `3000`. Untuk penyebaran publik, Anda cukup mengunggah seluruh isi folder `/dist` ke penyedia hosting statis pilihan Anda (seperti Netlify, Vercel, Firebase Hosting, Cloudflare Pages, atau server Nginx internal sekolah).

---

## 3. Konfigurasi Konsol Google Cloud & Firebase

Integrasi awan menggunakan model otentikasi **Firebase Auth (Google Sign-In)** berbasis klien. Ikuti panduan berikut untuk mendaftarkan aplikasi sekolah Anda:

### Bagian A: Membuat Proyek Google Cloud

1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Buat proyek baru, misalnya bernama `siakad-smk-nu-ungaran`.
3.  Masuk ke **API & Services > Library**, cari dan aktifkan keenam API Google Workspace yang tertera di bagian Persyaratan Sistem.

### Bagian B: Mengonfigurasi Layar Persetujuan OAuth (OAuth Consent Screen)

1.  Masuk ke **API & Services > OAuth Consent Screen**.
2.  Pilih jenis pengguna **Internal** (jika menggunakan akun Google Workspace sekolah `@smknuungaran.sch.id`) atau **External** (jika menggunakan Gmail umum).
3.  Isi informasi wajib: Nama Aplikasi (`Guru Offline SMK NU Ungaran`), Email dukungan, dan Kontak developer.
4.  Tambahkan scopes berikut sesuai fungsionalitas aplikasi:
    - `.../auth/spreadsheets`
    - `.../auth/drive`
    - `.../auth/gmail.send`
    - `.../auth/calendar`
    - `.../auth/documents`
    - `.../auth/forms.responses.readonly`

### Bagian C: Mengatur Firebase Authentication

Otentikasi Google didukung secara aman menggunakan Firebase Auth SDK.

1.  Buka [Firebase Console](https://console.firebase.google.com/).
2.  Buat proyek baru dan hubungkan dengan Proyek Google Cloud yang telah dibuat sebelumnya.
3.  Masuk ke menu **Build > Authentication > Sign-in Method**.
4.  Aktifkan penyedia **Google**. Di dalam konfigurasi penyedia Google, pastikan untuk menyalin **Web Client ID** dan **Web Client Secret**.
5.  Daftarkan aplikasi Web baru di Firebase, lalu unduh konfigurasi JSON-nya.
6.  Perbarui file `/firebase-applet-config.json` di server dengan konfigurasi rilis resmi Anda:

```json
{
  "projectId": "PROYEK_ID_SEKOLAH",
  "appId": "APP_ID_SEKOLAH",
  "apiKey": "API_KEY_RESMI_SEKOLAH",
  "authDomain": "PROYEK_ID_SEKOLAH.firebaseapp.com",
  "storageBucket": "PROYEK_ID_SEKOLAH.firebasestorage.app",
  "messagingSenderId": "SENDER_ID_SEKOLAH",
  "measurementId": "",
  "oAuthClientId": "CLIENT_ID_OAUTH_SEKOLAH.apps.googleusercontent.com",
  "recaptchaSiteKey": ""
}
```

### Bagian D: Konfigurasi Authorized Domains (Redirect URIs)

Agar peramban mengizinkan komunikasi popup masuk:

1.  Di Google Cloud Console, buka **API & Services > Credentials > OAuth 2.0 Client IDs**.
2.  Sunting kunci klien Web Anda.
3.  Pada **Authorized JavaScript Origins**, tambahkan:
    - `http://localhost:3000` (untuk pengujian)
    - `https://domain-siakad-sekolah.com` (domain HTTPS resmi sekolah Anda)
4.  Pada **Authorized Redirect URIs**, pastikan alamat Firebase Auth OAuth Handler terdaftar:
    - `https://PROYEK_ID_SEKOLAH.firebaseapp.com/__/auth/handler`

---

## 4. Konfigurasi Identitas Sekolah & Data Master

Setelah aplikasi terinstal dan diakses untuk pertama kalinya, jalankan panduan inisialisasi awal berikut:

### Langkah A: Inisialisasi Identitas Resmi Sekolah

1.  Masuk sebagai **Admin** ke dashboard.
2.  Buka menu **Pengaturan** (Settings) pada bilah navigasi kiri.
3.  Pada tab **Identitas Sekolah**, isi rincian resmi berikut:
    - **Nama Resmi**: `SMK NU UNGARAN`
    - **NPSN**: `20320256`
    - **Alamat Resmi**: `Jalan Kaligarang No. 9 Ungaran`
    - **Kontak Resmi**: `Telp./Fax. (024) 6924034-6922708`
    - **Nama Kepala Sekolah**: `Dr. H. Ahmad Hanik, M.Pd.`
    - **NIP Kepala Sekolah**: `-` (atau diisi NIP resmi jika ada)
    - **Waka Kurikulum**: `Budi Setiarjo, S.Pd.`
    - **Kode Dokumen ISO**: `FM.02.03.76.KUR.01.05`
4.  Klik **Simpan Perubahan**. Data ini akan menjadi basis kop surat resmi laporan rekapitulasi presensi dan lembar penilaian cetak harian.

### Langkah B: Mengaktifkan Tahun Pelajaran & Semester

1.  Masih pada menu Pengaturan, beralihlah ke tab **Tahun Pelajaran**.
2.  Klik **Tambah Tahun Pelajaran**.
3.  Masukkan nama: `2026/2027`.
4.  Pilih semester saat ini: `GANJIL` atau `GENAP`.
5.  Tentukan rentang tanggal resmi kalender akademik sekolah.
6.  Centang **Jadikan sebagai tahun pelajaran aktif sekarang**.
7.  Klik **Simpan**.

### Langkah C: Onboarding Data Master Sekolah (Bulk Imports)

Administrator dapat mengunggah ribuan baris data master secara instan menggunakan modul impor bawaan.

1.  Buka menu **Kelola Data** (Data Management) > Tab **Impor Data**.
2.  Unduh contoh template Excel (`.xlsx`) atau CSV untuk masing-masing tipe data berikut:
    - **Guru (Teachers)**: Isi NIP, NUPTK, Nama Guru, dan Status Aktif.
    - **Siswa (Students)**: Isi NIS, NISN, Nama Siswa, Jenis Kelamin, dan Hubungkan ke Kelas/Rombel yang valid.
    - **Kelas / Rombel (Classes)**: Isi tingkat (X, XI, XII), Kode Jurusan, dan tentukan Wali Kelas (homeroom teacher).
    - **Mata Pelajaran (Subjects)**: Isi kode mata pelajaran unik, nama mapel, KKM, dan kelompok (Umum/Kejuruan).
    - **Ruang Kelas (Rooms)**: Isi kode ruang, nama ruang, dan kapasitas.
    - **SK Mengajar (Assignments)**: Petakan guru pengampu ke mata pelajaran dan rombel.
    - **Jadwal Pelajaran (Schedules)**: Isi jadwal mengajar berdasarkan hari, jam pelajaran, ruang kelas, dan tautan SK mengajar.
3.  Unggah berkas data master tersebut ke masing-masing sub-tab pengimpor.
4.  Pilih Mode Impor: **STRICT** (menolak seluruh berkas jika ada satu data duplikat/salah) atau **UPSERT** (memperbarui data lama jika ID cocok, dan membuat data baru jika belum ada).
5.  Sistem akan melakukan pemindaian integritas referensi secara otomatis (misalnya menolak siswa jika kode rombelnya tidak terdaftar di sistem). Klik **Komit Data** untuk menyimpan secara permanen ke IndexedDB lokal.

### Langkah D: Membuat Akun Pengguna & Tautan Guru (RBAC)

1.  Buka menu **Akun Pengguna** (User Accounts).
2.  Buat akun guru baru dengan menuliskan Username, Password standar, serta memilih Peran (`GURU`).
3.  **SANGAT PENTING**: Pada pilihan tautan, hubungkan akun pengguna tersebut ke entitas master Guru yang sesuai. Tautan ini menentukan isolasi keamanan sehingga saat guru login, peramban membatasi hak akses mereka agar hanya dapat melihat jadwal pelajaran pribadi, menulis jurnal mengampu, dan mengisi presensi siswa pada rombel yang ditugaskan kepadanya.

---

## 5. Sinkronisasi Google Sheets & Backup Google Drive

### Langkah Inisialisasi Sinkronisasi oleh Admin:

1.  Buat sebuah berkas Google Sheets kosong di Google Drive sekolah Anda.
2.  Salin string ID unik dari URL spreadsheet tersebut. (Contoh URL: `https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_ANDA/edit`).
3.  Masuk ke menu **Kelola Data** > Tab **Sinkronisasi Cloud**.
4.  Klik **Sambungkan Akun Google** dan ikuti proses login pop-up OAuth. Pastikan menggunakan akun yang memegang hak kepemilikan atas spreadsheet tersebut.
5.  Setelah tersambung, tempelkan ID Spreadsheet pada kolom input **ID Spreadsheet Google Sheets**.
6.  Klik tombol **Inisialisasi**. Sistem secara otomatis akan memeriksa skema sheet dan membuatkan lembar-lembar tabel yang diperlukan (`teachers`, `students`, `classes`, `attendances`, `journals`, `assessments`, `audit_logs`) lengkap dengan baris header baku sebagai Source of Truth.

### Prosedur Pencadangan (Backup / Restore)

- **Pencadangan Manual**: Admin dapat mengunduh berkas fisik `.json` kapan saja melalui tombol **Unduh Cadangan Lokal**. Berkas ini dienkripsi dengan validasi metadata struktur yang mencegah kerusakan data saat pemulihan.
- **Pencadangan Cloud**: Dengan kondisi Google Workspace terhubung, klik tombol **Unggah Cadangan ke Google Drive** untuk menyimpan backup harian di cloud secara aman.
- **Pemulihan Data (Restore)**: Unggah berkas cadangan `.json` di area unggah file, tinjau ringkasan entitas yang terbaca pada preview, lalu klik **Ya, Gantikan Seluruh Data**. Peramban akan otomatis menyegarkan halaman setelah sukses untuk menerapkan struktur pangkalan data yang baru.

---

## 6. Pembaruan Aplikasi PWA & Pemeliharaan (Updates & Offline Maintenance)

Karena aplikasi berjalan 100% luring-pertama, pembaruan aplikasi dilakukan melalui siklus hidup **Service Worker** yang aman:

1.  Saat file rilis baru dideploy ke server statis, peramban pengguna akan mendeteksi perubahan pada file `sw.js` di latar belakang secara otomatis ketika terhubung ke internet.
2.  Service Worker baru akan diunduh dan dipasang dalam kondisi siaga (`waiting`).
3.  Aplikasi akan memberikan instruksi pembaruan atau otomatis memuat ulang (_self-update_) saat seluruh tab aplikasi ditutup dan dibuka kembali oleh guru.
4.  **Keamanan Data Lokal**: Pembaruan file aplikasi static (HTML/JS/CSS) **TIDAK AKAN** menghapus atau mempengaruhi data IndexedDB harian guru yang tersimpan di memori perangkat lokal. Seluruh draf jurnal dan presensi tetap aman dalam perangkat fisik masing-masing guru hingga waktu pembersihan berkas peramban secara sengaja oleh pengguna.
