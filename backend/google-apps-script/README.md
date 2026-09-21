# Guru Offline - Google Apps Script & Google Sheets Setup Guide

Panduan resmi penyiapan Backend Google Apps Script dan Google Sheets untuk aplikasi **Guru Offline - SMK NU Ungaran**.

---

## 1. Persiapan Google Sheets

1. Buka [Google Sheets](https://sheets.google.com) di browser Anda.
2. Buat Spreadsheet Baru, beri nama misalnya: **`Guru_Offline_Database_SMK_NU_Ungaran`**.
3. _Opsional_: Anda dapat membuat tab (sheet) berikut secara manual, atau **biarkan kosong** karena skrip backend `Code.gs` akan secara otomatis membuat tab yang dibutuhkan apabila belum ada:
   - `Teachers`
   - `TeacherAssignments`
   - `Rombels`
   - `Students`
   - `Schedules`
   - `Attendance`
   - `Journals`
   - `Assessments`
   - `Assessment_Scores`
   - `Sync_Queue`

---

## 2. Pemasangan & Deploy Google Apps Script Web App

1. Pada Google Sheets yang telah dibuat, klik menu **Ekstensi** (`Extensions`) &rarr; **Apps Script**.
2. Hapus seluruh isi skrip default (`Code.gs`), lalu **salin & tempel** seluruh isi dari file `backend/google-apps-script/Code.gs`.
3. Klik ikon **Simpan** (ikon disket) atau tekan `Ctrl + S`.
4. Klik tombol **Terapkan** (`Deploy`) di pojok kanan atas &rarr; pilih **Penerapan Baru** (`New deployment`).
5. Pada bagian **Pilih jenis** (`Select type`), klik ikon roda gigi &rarr; pilih **Aplikasi web** (`Web app`).
6. Isikan konfigurasi berikut:
   - **Deskripsi**: `Guru Offline Production API v1.0`
   - **Jalankan sebagai** (`Execute as`): **Saya** (`Me / email-anda@gmail.com`)
   - **Siapa yang memiliki akses** (`Who has access`): **Siapa saja** (`Anyone`)
7. Klik **Terapkan** (`Deploy`).
8. Jika muncul jendela otorisasi akun Google (`Authorization Required`):
   - Klik **Izin akses** (`Review permissions`).
   - Pilih akun Google Anda.
   - Jika muncul peringatan _"Google hasn't verified this app"_, klik **Advanced** &rarr; klik **Go to Guru Offline (unsafe)**.
   - Klik **Allow** (Izinkan).
9. Salin **URL Aplikasi Web** (`Web App URL`) yang dihasilkan. Format URL biasanya diawali dengan: `https://script.google.com/macros/s/AKfycb.../exec`

---

## 3. Konfigurasi Aplikasi Frontend (Guru Offline)

1. Buka file `.env` di direktori utama project Anda.
2. Masukkan URL Web App yang disalin pada langkah sebelumnya ke variabel `VITE_API_URL`:
   ```env
   VITE_API_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
3. Simpan file `.env` dan jalankan ulang dev server atau lakukan build ulang aplikasi:
   ```bash
   npm run build
   ```

---

## 4. Keamanan & Idempotensi Data

- **Otorisasi**: Semua transaksi diverifikasi berdasarkan NIP/ID Guru yang aktif di master data.
- **Idempotensi**: Setiap mutasi menyertakan `operationId` unik. Transaksi yang dikirim ulang akibat kehilangan koneksi jaringan tidak akan menyebabkan duplikasi data pada Google Sheets.
- **Mode Offline**: Apabila koneksi internet terputus, data tetap tersimpan aman di IndexedDB browser dan secara otomatis disinkronkan saat terhubung kembali.
