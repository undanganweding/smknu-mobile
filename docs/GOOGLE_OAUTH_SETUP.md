# Panduan Pengaturan Google Workspace REST API & OAuth 2.0

## Guru Offline — SMK NU Ungaran

Sistem **Guru Offline SMK NU Ungaran** menggunakan integrasi client-side Native OAuth 2.0 yang aman untuk mengunggah cadangan data ke Google Drive dan melakukan sinkronisasi dua-arah otomatis dengan Google Sheets secara luring-pertama (_offline-first_).

Dokumen ini memandu administrator IT sekolah dalam mengatur proyek konsol pengembang Google, mengaktifkan API yang diperlukan, mengonfigurasi layar persetujuan OAuth, mendaftarkan asal usul domain yang diizinkan, dan melakukan pengujian asap (_smoke testing_) harian.

---

## 1. Langkah Pengaturan Proyek Google Cloud (GCP)

1.  Buka [Google Cloud Console](https://console.cloud.google.com/).
2.  Masuk dengan akun institusi Google Workspace sekolah Anda (disarankan untuk membatasi akses secara internal).
3.  Buat proyek GCP baru dengan nama yang relevan, misalnya `guru-offline-smk-nu-ungaran`.

---

## 2. API Google Workspace Yang Wajib Diaktifkan

Masuk ke **API & Services > Library** pada proyek Anda, cari dan aktifkan API berikut:

- **Google Sheets API** (Menulis transaksional log presensi, jurnal mengajar, dan nilai siswa).
- **Google Drive API** (Menyimpan dan mengunggah snapshot cadangan database `.json` terenkripsi).
- **Gmail API** (Mengirim notifikasi kehadiran/alert otomatis jika diperlukan).
- **Google Docs API** (Memproses template laporan cetak resmi).
- **Google Calendar API** (Sinkronisasi jadwal mengajar guru ke kalender pribadi).
- **Google Forms API** (Mengambil data masukan umpan balik/feedback).

---

## 3. Konfigurasi Layar Persetujuan OAuth (OAuth Consent Screen)

1.  Masuk ke **API & Services > OAuth Consent Screen**.
2.  Pilih **User Type**:
    - **Internal**: Sangat disarankan jika seluruh akun guru menggunakan domain Workspace sekolah yang sama (misalnya `@smknuungaran.sch.id`). Ini meniadakan perlunya proses verifikasi eksternal oleh Google.
    - **External**: Gunakan tipe ini jika ingin mengizinkan login dari akun `@gmail.com` umum (memerlukan pendaftaran daftar email akun uji (_Test Users_) selama fase testing).
3.  Lengkapi informasi wajib:
    - **App Name**: `Guru Offline - SMK NU Ungaran`
    - **User support email**: Email admin IT sekolah.
    - **Developer contact information**: Email tim pengembang IT sekolah.
4.  Klik **Save and Continue**.

---

## 4. Scopes (Cakupan Izin) Yang Diperlukan

Aplikasi hanya meminta hak akses terbatas (_minimum privileges_) yang benar-benar digunakan untuk sinkronisasi. Tambahkan cakupan izin berikut pada layar konfigurasi scopes:

- `https://www.googleapis.com/auth/spreadsheets` (Akses baca/tulis terbatas spreadsheet database)
- `https://www.googleapis.com/auth/drive` (Akses membuat folder dan mengunggah cadangan database)
- `https://www.googleapis.com/auth/gmail.send` (Hak mengirim email notifikasi presensi)
- `https://www.googleapis.com/auth/calendar` (Mengatur entri agenda jadwal sekolah)
- `https://www.googleapis.com/auth/documents` (Menulis draf dokumen laporan)
- `https://www.googleapis.com/auth/forms.responses.readonly` (Membaca respons formulir evaluasi umpan balik)

---

## 5. Pembuatan Kredensial Klien Web (OAuth Web Client ID)

1.  Masuk ke **API & Services > Credentials**.
2.  Klik **+ Create Credentials** dan pilih **OAuth Client ID**.
3.  Pilih Application Type: **Web Application**.
4.  Beri nama kredensial, misalnya `klien-web-guru-offline`.
5.  **Authorized JavaScript Origins** (Wajib diisi):
    - `http://localhost:3000` (Untuk keperluan testing development lokal)
    - `https://[domain-aplikasi-sekolah]` (Isi dengan domain HTTPS resmi sekolah setelah dideploy)
6.  **Authorized Redirect URIs**:
    - `https://[PROYEK_ID_FIREBASE_SEKOLAH].firebaseapp.com/__/auth/handler` (Sesuai dengan alamat Firebase Auth callback handler yang terdaftar).
7.  Klik **Create**.
8.  Salin nilai **Client ID** yang dihasilkan.
9.  **PERINGATAN KEAMANAN**: Klien Web Google _OAuth Client Secret_ tidak boleh ditulis keras (_hardcoded_) di `.env`, frontend, folder `/public`, atau repositori kode. Nilai secret tersebut murni digunakan oleh handler otentikasi server-to-server dan tidak boleh dibundel ke dalam javascript browser.

---

## 6. Integrasi Firebase Authentication

1.  Buka [Firebase Console](https://console.firebase.google.com/).
2.  Hubungkan dengan proyek Google Cloud yang telah dibuat.
3.  Masuk ke **Build > Authentication > Sign-in Method**.
4.  Aktifkan penyedia **Google**. Masukkan Web Client ID dan Web Client Secret Google Anda di kolom yang tersedia.
5.  Daftarkan aplikasi Web baru di Firebase, lalu unduh berkas konfigurasi klien.
6.  Buka file `/firebase-applet-config.json` di dalam folder proyek, lalu perbarui isinya dengan parameter rilis resmi Anda:

```json
{
  "projectId": "ID_PROYEK_RESMI_SEKOLAH",
  "appId": "ID_APP_RESMI_SEKOLAH",
  "apiKey": "KUNCI_API_WEB_RESMI_SEKOLAH",
  "authDomain": "ID_PROYEK_RESMI_SEKOLAH.firebaseapp.com",
  "storageBucket": "ID_PROYEK_RESMI_SEKOLAH.firebasestorage.app",
  "messagingSenderId": "ID_SENDER_RESMI_SEKOLAH",
  "measurementId": "",
  "oAuthClientId": "ID_KLIEN_OAUTH_RESMI_SEKOLAH.apps.googleusercontent.com",
  "recaptchaSiteKey": ""
}
```

---

## 7. Prosedur Uji Asap Riil Operator (Real Smoke Test Harness)

Setelah kredensial rilis resmi dikonfigurasi, operator IT sekolah wajib melakukan pengujian asap berikut menggunakan akun sekolah asli sebelum menyerahkannya kepada pengguna guru:

| ID Tes | Jenis Pengujian | Langkah Pengujian | Hasil Yang Diharapkan | Status (PASS/FAIL) |
| :-: | :-- | :-- | :-- | :-: |
| **TEST 01** | Google Authentication | Klik tombol 'Sambungkan Google Workspace' | Muncul jendela popup Google Sign-In, berhasil login tanpa error | [ ] |
| **TEST 02** | Access Token | Periksa log otentikasi browser | Token akses diperoleh secara aman di memori, tanpa kebocoran secret | [ ] |
| **TEST 03** | Google Sheets | Jalankan sinkronisasi awal data | Spreadsheet `Guru_Offline_Database_SMK_NU_Ungaran` terbuat otomatis | [ ] |
| **TEST 4** | Google Drive | Klik tombol 'Unggah Cadangan' di menu Admin | Folder cadangan terbuat dan file `.json` database terunggah | [ ] |
| **TEST 05** | Gmail | Kirim log test notifikasi harian | Notifikasi presensi siswa sukses dikirimkan ke email tujuan | [ ] |
| **TEST 06** | Docs | Cetak contoh draf laporan akademik | File salinan Google Docs terbuat dengan format yang sesuai | [ ] |
| **TEST 07** | Calendar | Tambah jadwal mengajar baru di admin | Event jam pelajaran muncul otomatis di Google Calendar guru | [ ] |
| **TEST 08** | Forms | Impor data kuesioner evaluasi | Respons forms berhasil ditarik masuk ke aplikasi lokal | [ ] |
| **TEST 09** | Logout | Klik tombol 'Keluar Akun Google' | Sesi Google dan token cache lokal dihapus sepenuhnya | [ ] |
| **TEST 10** | Re-authentication | Hubungkan kembali setelah logout | Proses otentikasi berjalan lancar tanpa memerlukan persetujuan ulang | [ ] |
| **TEST 11** | Expired Token | Biarkan sesi idle selama 1 jam, lalu sync | Token otomatis diperbarui oleh SDK atau mengulang popup re-auth | [ ] |
| **TEST 12** | Insufficient Scope | Hapus salah satu scope di GCP, lalu test | Sistem memunculkan dialog peringatan meminta persetujuan scope | [ ] |
| **TEST 13** | Offline Recovery | Lakukan perubahan offline, lalu reconnect | Seluruh antrean presensi Sync_Queue sukses terunggah ke Sheets | [ ] |

---

## 8. Pemecahan Masalah (Troubleshooting) & Aturan Keamanan

1.  **Error `400: redirect_uri_mismatch`**:
    - _Penyebab_: Alamat callback domain Firebase Auth (`__/auth/handler`) belum didaftarkan di Google Cloud Authorized Redirect URIs.
    - _Solusi_: Daftarkan redirect URI Firebase rilis resmi Anda di Google Cloud Credentials.
2.  **Error `403: access_denied` atau `insufficient scopes`**:
    - _Penyebab_: Salah satu API Google Workspace belum diaktifkan di GCP Library, atau operator menolak salah satu kotak centang persetujuan izin di layar popup Google.
    - _Solusi_: Aktifkan API bersangkutan dan pastikan pengguna mencentang semua izin scope saat login pertama kali.
3.  **Aturan Keamanan Berkas Cadangan**:
    - Seluruh file database lokal disimpan di IndexedDB peramban pengguna secara terisolasi.
    - Cadangan data `.json` wajib disimpan di folder Google Drive yang terbatas aksesnya (hanya untuk akun admin internal sekolah) untuk menjaga kerahasiaan data siswa dan rekapitulasi nilai.
