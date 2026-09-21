# PRIVATE INTERNAL DEPLOYMENT GUIDE

## GURU OFFLINE — SMK NU UNGARAN

Panduan operasional teknis ini ditujukan bagi **Operator / Pemilik Deployment** untuk menyiapkan, mengonfigurasi, dan memverifikasi deployment privat (_Private / Internal Deployment_) aplikasi **Guru Offline — SMK NU Ungaran** dengan integrasi Google Cloud dan Firebase.

---

## 0. TUJUAN

Tujuan dari panduan ini adalah:

1. Menyediakan prosedur deployment **privat / internal mandiri** yang dikendalikan penuh oleh operator/pemilik aplikasi.
2. Membangun integrasi Google Cloud dan Firebase resmi milik operator tanpa ketergantungan pada domain, DNS, email, Google Workspace Organization, ataupun infrastruktur TI eksternal sekolah.
3. Memastikan alur Google OAuth 2.0 (Google Sign-In Popup) dan 6 REST API Google Workspace dapat berfungsi secara nyata dan aman untuk akun-akun Google yang diizinkan (_authorized test users_).
4. Menegakkan pemisahan tegas antara otentikasi Google dan otorisasi lokal (_Role-Based Access Control / RBAC_), perlindungan data luring (_offline-first_), serta pencegahan kebocoran kredensial rahasia (_zero secret exposure_).

> **CATATAN IDENTITAS APLIKASI:**  
> Nama aplikasi tetap **Guru Offline — SMK NU Ungaran**. Nama ini adalah identitas jenjang akademik dan data sekolah di dalam sistem aplikasi, **BUKAN** prasyarat bahwa hosting atau infrastruktur cloud harus berada di bawah domain atau organisasi Google Workspace sekolah.

---

## 1. ARSITEKTUR DEPLOYMENT

### 1.1 Definisi "Private / Internal Deployment"

Dalam konteks aplikasi Guru Offline:

- **Private / Internal** berarti aplikasi digunakan secara terbatas oleh operator dan personil yang secara eksplisit dipilih dan diberi izin oleh operator.
- Akses aplikasi dilindungi oleh otentikasi akun serta otorisasi lokal (RBAC: ADMIN dan GURU).
- Google Cloud Project dan Firebase Project sepenuhnya dibuat, dimiliki, dan dikendalikan oleh operator/pemilik deployment.
- **PERBEDAAN FUNDAMENTAL:**  
  Istilah _Private Application_ (aplikasi dengan akses privat/terbatas) **TIDAK SAMA** dengan setelan Google OAuth Consent Screen _User Type = Internal_.
  - _OAuth User Type: Internal_ hanya tersedia jika Google Cloud Project bernaung di dalam Google Workspace Organization resmi berbayar.
  - Untuk proyek Google Cloud mandiri (tanpa Google Workspace Organization / _"No organization"_), opsi yang tersedia di konsol adalah **External**. Dalam opsi _External_, privasi aplikasi ditegakkan melalui status **Testing** dengan pembatasan daftar **Test Users** (maksimal 100 akun terdaftar).

### 1.2 Topologi Infrastruktur Klien & Cloud

```text
+-----------------------------------------------------------------------------------+
|                        PERAMBAN PENGGUNA (BROWSER / PWA)                         |
|                                                                                   |
|  [ Guru Offline Frontend ] <------- Client-side REST APIs (Bearer Token) ------+  |
|         |                                                                      |  |
|         |-- 1. Inisialisasi Auth Popup (signInWithPopup)                       |  |
|         |-- 2. Manajemen Database Lokal (IndexedDB)                            |  |
|         |-- 3. Antrian Sinkronisasi Luring (SyncQueue)                         |  |
|         +------------------------------------------------------------------+   |  |
+----------------------------------------------------------------------------|---+--+
                                  |                                          |      |
                                  v                                          |      |
                 +---------------------------------+                         |      |
                 |      FIREBASE AUTHENTICATION    |                         |      |
                 |                                 |                         |      |
                 | - Google Sign-In Provider       |                         |      |
                 | - Token Handshake & Exchange    |                         |      |
                 | - Origin & Domain Whitelisting  |                         |      |
                 +---------------------------------+                         |      |
                                  |                                          |      |
                                  v                                          |      |
                 +---------------------------------+                         |      |
                 |       GOOGLE CLOUD PLATFORM     |                         |      |
                 |                                 |                         |      |
                 | - OAuth 2.0 Web Client          |                         |      |
                 | - OAuth Consent Screen (Test)   |<------------------------+      |
                 | - REST APIs Engine              |                                |
                 |   • Sheets API v4   • Docs API  |                                |
                 |   • Drive API v3    • Forms API |                                |
                 |   • Gmail API v1    • Calendar  |                                |
                 +---------------------------------+                                |
                                  |                                                 |
                                  +-------------------------------------------------+
```

### 1.3 Karakteristik Alur Otentikasi

1. **Frontend-Only Token Acquisition:** Otentikasi Google menggunakan Firebase Auth Web SDK v11 (`signInWithPopup`).
2. **Short-Lived Memory-Only Access Token:** Access token disimpan murni di memori JavaScript runtime (`GoogleWorkspaceService`). Token **tidak pernah** disimpan di `localStorage`, `sessionStorage`, `IndexedDB`, ataupun cookies.
3. **No Refresh Token / No Server Secret:** Frontend browser tidak mengelola refresh token dan tidak membutuhkan `clientSecret`. Jika token habis masa berlakunya (1 jam), request akan mengembalikan HTTP 401 dan peramban cukup melakukan autentikasi ulang via popup.
4. **Direct REST Call via Bearer Token:** Setiap panggilan ke Google Sheets, Drive, Gmail, Calendar, Docs, dan Forms dilakukan langsung dari browser pengguna ke endpoint resmi `https://www.googleapis.com/...` dengan header `Authorization: Bearer <token>`.

---

## 2. PRASYARAT

Sebelum memulai provisioning, pastikan operator memiliki:

1. **Satu Akun Google Pengelola:** Akun Google pribadi maupun akun berbayar yang dimiliki operator (misal: `operator.deployment@gmail.com`) untuk mengelola konsol Google Cloud dan Firebase.
2. **Daftar Akun Pengguna yang Diizinkan:** 1 s.d. 100 alamat email Google yang akan menggunakan aplikasi (misal: akun Google pribadi masing-masing guru/staf).
3. **Akses Browser Modern:** Chrome, Edge, Firefox, atau Safari versi terkini untuk mengakses konsol dan menjalankan aplikasi.
4. **Node.js LTS (v20+) & Git:** Untuk melakukan kompilasi bundel produksi (`npm run build`).

---

## 3. GOOGLE CLOUD PROJECT

Operator membuat proyek Google Cloud mandiri sebagai pondasi API dan OAuth.

### ACTION

1. Buka browser dan kunjungi **Google Cloud Console**: `https://console.cloud.google.com/`.
2. Di bar navigasi atas, klik pemilih proyek (_Project Selector_) > Klik **NEW PROJECT**.
3. Masukkan data proyek:
   - **Project Name:** `Guru Offline Private` (atau nama lain yang mudah dikenali).
   - **Organization:** Pilih **No organization** (jika menggunakan akun Google standar) atau organisasi privat Anda jika tersedia.
4. Klik **CREATE**.
5. Tunggu hingga proyek selesai dibuat, lalu alihkan konsol ke proyek baru tersebut.
6. Catat **Project ID** (contoh: `guru-offline-priv-98213`) dan **Project Number**.

### EXPECTED RESULT

Proyek Google Cloud aktif dan tampil di bilah atas konsol.

### STOP IF

- Pembuatan proyek gagal karena batasan kuota akun Google Anda. Bersihkan proyek yang tidak terpakai atau gunakan akun Google lain.

---

## 4. GOOGLE APIS

Aplikasi Guru Offline berinteraksi secara native dengan tepat **enam (6) Google REST APIs**. Seluruhnya wajib diaktifkan pada proyek Google Cloud aktif.

### DAFTAR 6 REST APIS RESMI:

1. **Google Sheets API** (`sheets.googleapis.com`) — Sinkronisasi cloud dua arah dan single source of truth data akademik.
2. **Google Drive API** (`drive.googleapis.com`) — Pencadangan basis data lokal terenkripsi/JSON ke folder cloud.
3. **Gmail API** (`gmail.googleapis.com`) — Pengiriman notifikasi akademik langsung dari akun pengguna.
4. **Google Calendar API** (`calendar-json.googleapis.com`) — Penjadwalan agenda ujian dan kalender akademik sekolah.
5. **Google Docs API** (`docs.googleapis.com`) — Pembuatan draf dokumen administrasi dan sertifikat kelulusan.
6. **Google Forms API** (`forms.googleapis.com`) — Pembacaan respon instrumen evaluasi pembelajaran.

### ACTION

1. Pada menu navigasi kiri Google Cloud Console, pilih **APIs & Services > Library** (`https://console.cloud.google.com/apis/library`).
2. Cari dan buka masing-masing dari ke-6 API di atas satu per satu.
3. Klik tombol biru **ENABLE** untuk setiap API.
4. Pastikan ke-6 API berstatus aktif di tab **APIs & Services > Enabled APIs & services**.

### EXPECTED RESULT

Ke-6 API di atas tercantum dalam daftar _Enabled APIs and services_.

### STOP IF

- Muncul permintaan penagihan (_billing_) yang memblokir pengaktifan API. Sebagian besar kuota dasar ke-6 API ini gratis untuk volume penggunaan wajar, namun jika Google Cloud meminta aktivasi Billing Account, hubungkan akun penagihan gratis/berbayar operator.

---

## 5. OAUTH CONSENT SCREEN

Halaman persetujuan OAuth (_Consent Screen_) memberitahukan pengguna mengenai identitas aplikasi dan daftar izin yang diminta.

### KETENTUAN USER TYPE: INTERNAL VS EXTERNAL & VERIFIKASI OAUTH

- **Opsi "Internal":** HANYA tersedia jika Google Cloud Project bernaung di dalam Google Workspace Organization resmi berbayar.
- **Opsi "External" (Default Proyek Mandiri):** Merupakan opsi tunggal yang tersedia untuk akun Google biasa / proyek tanpa organisasi (_No organization_).
- **Aturan Verifikasi OAuth Berdasarkan Status:**
  - **Status Testing (Konfigurasi Saat Ini):** Untuk konfigurasi pengujian privat (_current testing configuration_), verifikasi aplikasi (_OAuth App Verification_) oleh Google tidak diwajibkan untuk memanggil API. Namun, Google membatasi akses secara ketat: hanya akun Google yang secara eksplisit didaftarkan pada daftar **Test Users** (batas kuota hingga 100 akun Google) yang diizinkan untuk melakukan otorisasi. Akun yang tidak terdaftar akan langsung ditolak oleh Google (`403: access_denied`).
  - **Status Production:** Jika status diubah ke _In production_, aplikasi yang meminta _Sensitive Scopes_ (seperti Google Sheets, Gmail, Docs, Calendar, Forms) atau _Restricted Scopes_ (seperti Google Drive) **wajib** melalui proses verifikasi resmi dari Google Trust & Safety (termasuk potensi audit keamanan pihak ketiga untuk restricted scope) sebelum dapat diakses oleh publik tanpa batas. Karena aplikasi ini digunakan secara privat dan terbatas, **tetap pertahankan status pada mode TESTING** dengan mendaftarkan akun personil ke Test Users.
  - _Catatan Scope Klasifikasi Resmi Google:_
    - **Restricted Scope (1):** `https://www.googleapis.com/auth/drive` (Google mengklasifikasikan akses penuh Drive sebagai _Restricted Scope_ karena cakupan akses baca/tulis menyeluruh ke Google Drive pengguna).
    - **Sensitive Scopes (5):** `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/gmail.send`, `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/documents`, dan `https://www.googleapis.com/auth/forms.responses.readonly` (Google mengklasifikasikannya sebagai _Sensitive Scopes_ karena mengakses data pribadi pengguna).
    - Keberadaan scope _Sensitive_ dan _Restricted_ ini **tidak memicu pemblokiran** selama status proyek adalah **Testing** dan pengguna telah terdaftar di **Test Users**.

### ACTION 5.1 — KONFIGURASI APLIKASI

1. Buka menu **APIs & Services > OAuth consent screen** (`https://console.cloud.google.com/apis/credentials/consent`).
2. Pilih **User Type**:
   - Jika proyek berada di bawah Google Workspace: Tersedia opsi **Internal** > Klik **CREATE**.
   - Jika proyek mandiri / akun Google standar: Pilih **External** > Klik **CREATE**.
3. Pada formulir **Edit app registration**:
   - **App name:** `Guru Offline — SMK NU Ungaran`
   - **User support email:** Masukkan email operator (misal: `operator@gmail.com`).
   - **App logo:** Biarkan kosong (opsional).
   - **Developer contact information:** Masukkan email operator.
4. Klik **SAVE AND CONTINUE**.

### ACTION 5.2 — PEMILIHAN 6 OAUTH SCOPES

Pada langkah **Scopes**:

1. Klik tombol **ADD OR REMOVE SCOPES**.
2. Filter dan centang tepat **enam (6) scopes** berikut dengan klasifikasi resminya:
   - `https://www.googleapis.com/auth/spreadsheets` (Sensitive — Akses kelola spreadsheet akademik)
   - `https://www.googleapis.com/auth/drive` (Restricted — Akses upload file cadangan database)
   - `https://www.googleapis.com/auth/gmail.send` (Sensitive — Pengiriman notifikasi email mandiri)
   - `https://www.googleapis.com/auth/calendar` (Sensitive — Penjadwalan agenda ujian sekolah)
   - `https://www.googleapis.com/auth/documents` (Sensitive — Pembuatan dokumen draf laporan)
   - `https://www.googleapis.com/auth/forms.responses.readonly` (Sensitive — Pembacaan respon instrumen evaluasi)
3. [SECURITY ENFORCEMENT] **JANGAN MENAMBAHKAN** scope berlebihan seperti `gmail.readonly`, `forms.body`, atau scope full-access lain yang tidak digunakan oleh kode aplikasi.
4. Klik **UPDATE** lalu klik **SAVE AND CONTINUE**.

### ACTION 5.3 — REGISTRASI TEST USERS (WAJIB UNTUK MODE EXTERNAL)

Jika Anda memilih User Type **External**:

1. Pada tahap **Test users**, klik **+ ADD USERS**.
2. Masukkan alamat email Google operator dan personil guru/staf yang diizinkan mengakses aplikasi (Google memberlakukan batas kuota hingga 100 test user terdaftar). Contoh:
   - `operator.personal@gmail.com`
   - `guru.matematika@gmail.com`
   - `guru.kejuruan@gmail.com`
3. Klik **ADD** lalu klik **SAVE AND CONTINUE**.
4. Klik **BACK TO DASHBOARD**.

### EXPECTED RESULT

Publishing status berstatus **Testing** (atau _In production_ jika Internal), dan daftar Test Users memuat akun-akun yang akan digunakan untuk pengujian dan operasional privat.

### STOP IF

- Anda berencana menggunakan akun tertentu namun lupa memasukkannya ke Test Users pada mode External. Akun yang belum terdaftar akan mengalami galat `403: Access blocked: App not verified` saat login.

---

## 6. OAUTH WEB CLIENT

Aplikasi peramban membutuhkan Client ID untuk melakukan handshake otentikasi.

### PENJELASAN ATURAN ASAL (ORIGIN) & REDIRECT URI

Terdapat tiga konsep konfigurasi domain yang sering disalahpahami dan wajib dibedakan dengan jelas:

1. **Authorized JavaScript Origins (Google Cloud Console):**
   - Merupakan URL origin lengkap tempat frontend aplikasi dibuka di peramban (`scheme + host + port tanpa trailing slash atau path`).
   - Contoh: `https://<PROJECT_ID>.web.app`, `https://<YOUR_PRIVATE_DOMAIN>`, atau `http://localhost:3000`.
   - Google Identity mewajibkan origin publik menggunakan protokol **HTTPS**. Pengecualian resmi berlaku untuk pengembangan lokal di mana protokol **HTTP** diizinkan khusus pada host `localhost` (misal: `http://localhost:3000`). Google memblokir otentikasi jika host jaringan/IP publik menggunakan HTTP biasa tanpa HTTPS.
2. **Authorized Redirect URIs (Google Cloud Console):**
   - Merupakan endpoint URL tempat server otorisasi Google mengirimkan respon otorisasi/kode redirect.
   - **Kondisi Penggunaan Firebase Popup:** Aplikasi Guru Offline menggunakan flow popup klien (`signInWithPopup`). Jendela popup berkomunikasi dengan endpoint handler infrastruktur Firebase Auth: `https://<FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`.
   - _Kapan Otomatis vs Perlu Ditambahkan:_
     - Jika OAuth Client ID dibuat secara otomatis oleh Firebase saat mengaktifkan provider Google di Firebase Console, Google Cloud biasanya telah meregistrasikan URI handler Firebase tersebut secara otomatis.
     - Jika operator membuat OAuth Client ID secara manual di Google Cloud Console sebelum Firebase dihubungkan, operator **wajib** memeriksa dan menambahkan URI handler tersebut ke dalam _Authorized redirect URIs_ agar popup tidak mengalami galat `redirect_uri_mismatch`.
   - Frontend Guru Offline **TIDAK MEMILIKI** custom server redirect endpoint (seperti `/api/callback` atau `/oauth/callback`).
3. **Firebase Authorized Domains (Firebase Console):**
   - Merupakan daftar hostname yang diizinkan oleh Firebase Authentication untuk menginisialisasi alur otentikasi (`signInWithPopup` / `signInWithRedirect`).
   - Parameter ini hanya berupa nama host (tanpa skema `https://` atau port), misalnya: `<PROJECT_ID>.firebaseapp.com`, `<PROJECT_ID>.web.app`, `localhost`, atau `app.mycompany.id`.

### ACTION

1. Buka **APIs & Services > Credentials** (`https://console.cloud.google.com/apis/credentials`).
2. Klik tombol **+ CREATE CREDENTIALS** > Pilih **OAuth client ID**.
3. Pada **Application type**, pilih **Web application**.
4. **Name:** `Guru Offline Web Client`.
5. Di bagian **Authorized JavaScript origins**:
   - Klik **+ ADD URI**.
   - Masukkan origin deployment privat yang Anda pilih:
     - Jika menggunakan Firebase Hosting: `https://<PROJECT_ID>.web.app` dan `https://<PROJECT_ID>.firebaseapp.com`
     - Jika menggunakan Private Hosting / VPS ber-HTTPS: `https://<YOUR_PRIVATE_DOMAIN_OR_HOST>`
     - Jika pengujian lokal / LAN development: `http://localhost:3000` (dan/atau `http://localhost:5173`)
6. Di bagian **Authorized redirect URIs**:
   - Masukkan URL handler resmi Firebase Auth proyek Anda: `https://<FIREBASE_PROJECT_ID>.firebaseapp.com/__/auth/handler`
7. Klik tombol biru **CREATE**.
8. Salin **Client ID** yang berakhiran `.apps.googleusercontent.com`.

### EXPECTED RESULT

Muncul dialog _OAuth client created_. Kolom Client ID tersalin dengan benar.

### STOP IF

- Anda tergoda untuk menyalin _Client Secret_ ke konfigurasi aplikasi. Client Secret **TIDAK DIBUTUHKAN** oleh frontend dan **DILARANG KERAS** dimasukkan ke kode sumber!

---

## 7. FIREBASE

Firebase Authentication mengelola alur Google Sign-In popup dan memverifikasi token secara terstruktur.

### ACTION 7.1 — MEMBUAT / MENGAITKAN PROYEK FIREBASE

1. Kunjungi **Firebase Console**: `https://console.firebase.google.com/`.
2. Klik **Add project** (Tambah proyek).
3. **Pilih Proyek Google Cloud yang Ada:** Pilih nama proyek Google Cloud yang telah dibuat pada Bab 3 (`Guru Offline Private`).  
   _Catatan Arsitektur:_ Proyek Firebase dan proyek Google Cloud pada dasarnya adalah entitas sumber daya cloud yang sama di infrastruktur Google. Menautkan ke proyek Google Cloud yang sudah ada memastikan kredensial, API, dan kuota tersinkronisasi secara langsung dalam satu wadah proyek.
4. Klik **Continue**. Google Analytics dapat dinonaktifkan jika tidak diperlukan. Klik **Add Firebase**.

### ACTION 7.2 — AKTIVASI FIREBASE AUTHENTICATION

1. Pada menu navigasi kiri Firebase, klik **Build > Authentication**.
2. Klik tombol **Get started**.
3. Pada tab **Sign-in method**, pilih penyedia **Google**.
4. Aktifkan toggle **Enable**.
5. Isi konfigurasi:
   - **Project public-facing name:** `Guru Offline — SMK NU Ungaran`
   - **Project support email:** Pilih email akun operator.
6. Buka bagian akordeon **Web SDK configuration** (bila muncul):
   - Masukkan _Client ID_ dari Bab 6.
   - Jika konsol menampilkan kolom _Web client secret_, masukkan Client Secret langsung ke form Firebase Console ini.  
     _(Formulir ini disimpan langsung di server Google/Firebase, BUKAN di frontend aplikasi)._
   - _Catatan:_ Jika Firebase otomatis mendeteksi dan menautkan OAuth Client ID tanpa meminta input secret, ikuti konfigurasi otomatis konsol tersebut.
7. Klik **Save**.

### ACTION 7.3 — PEMERIKSAAN & KONFIGURASI FIREBASE AUTHORIZED DOMAINS

Firebase Auth hanya mengizinkan alur popup dari domain yang terdaftar secara eksplisit pada daftar _Authorized domains_.

**Kondisi Default vs Kustom:**

- Saat proyek Firebase baru dibuat, Firebase umumnya secara otomatis mendaftarkan hostname bawaan: `localhost`, `<PROJECT_ID>.firebaseapp.com`, dan `<PROJECT_ID>.web.app`.
- **Langkah Verifikasi Operator:** Operator **tetap wajib** membuka menu ini untuk memverifikasi bahwa hostname deployment memang telah terdaftar.
- **Hostname Tambahan:** Jika aplikasi dihosting di luar Firebase Hosting (misalnya domain VPS privat, reverse proxy, atau IP tertentu), operator **wajib** menambahkannya secara manual.

**Langkah Operator:**

1. Masih di menu **Authentication**, klik tab **Settings**.
2. Di menu kiri tab Settings, klik **Authorized domains**.
3. Periksa daftar domain yang ada. Pastikan hostname yang Anda gunakan (misal: `localhost` atau `<PROJECT_ID>.web.app`) telah tercantum.
4. Jika menggunakan domain/IP hosting privat mandiri (Option B):
   - Klik **Add domain**.
   - Masukkan nama host atau domain privat Anda (misal: `app.mycompany.id` — tanpa `https://` dan tanpa path).
   - Klik **Add**.

### ACTION 7.4 — PENDAFTARAN WEB APP & PENGAMBILAN KONFIGURASI

1. Klik ikon roda gigi (Settings) di pojok kiri atas > **Project settings**.
2. Pada tab **General**, gulir ke bawah ke bagian _Your apps_.
3. Klik ikon web **</>** untuk menambahkan aplikasi web.
4. Masukkan nama aplikasi: `Guru Offline Web`. Centang _Also set up Firebase Hosting_ jika berencana menggunakan Firebase Hosting. Klik **Register app**.
5. Salin nilai objek konfigurasi `firebaseConfig`:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### EXPECTED RESULT

Penyedia Google Sign-in berstatus _Enabled_, domain deployment terdaftar di _Authorized domains_, dan data konfigurasi web app tersedia.

---

## 8. PUBLIC CONFIGURATION VS SECRET

Keamanan sistem bergantung pada pemisahan mutlak antara parameter publik dan kredensial rahasia.

### 8.1 Klasifikasi Kredensial

| Kategori | Parameter / Berkas | Lokasi yang Diizinkan | Status & Aturan Keamanan |
| :-- | :-- | :-- | :-- |
| **PUBLIC CONFIGURATION** | • Firebase `apiKey`<br>• Firebase `authDomain`<br>• Firebase `projectId`<br>• Firebase `storageBucket`<br>• Firebase `messagingSenderId`<br>• Firebase `appId`<br>• OAuth Web `oAuthClientId` (`.apps.googleusercontent.com`) | • `firebase-applet-config.json`<br>• Bundel produksi `dist/`<br>• Frontend runtime environment | **DIIZINKAN DI FRONTEND**.<br>Parameter ini adalah pengenal publik (_public identifiers_) yang mengarahkan peramban pengguna ke instance cloud yang dituju. |
| **SECRET CREDENTIALS** | • **OAuth Client Secret**<br>• Service Account Private Key (`.json`/`.pem`)<br>• Database Master Password<br>• Deployment SSH / Private Keys<br>• Password Administrator Lokal | • Konsol Resmi Google Cloud / Firebase (Server-side)<br>• Brankas Sandi Pribadi Operator (KeePass, Bitwarden) | **HARAM MASUK KE FRONTEND**.<br>Dilarang keras dimasukkan ke:<br>- `firebase-applet-config.json`<br>- File `.env` / `VITE_*`<br>- Source code (`.ts`, `.vue`, `.js`)<br>- Folder `public/` atau aset statis<br>- Storage peramban (`localStorage`, `sessionStorage`, `IndexedDB`)<br>- Repositori Git atau commit history |

### 8.2 Format Berkas `firebase-applet-config.json`

Operator wajib memperbarui berkas konfigurasi publik di akar repositori dengan kredensial publik proyek operator:

```json
{
  "projectId": "guru-offline-priv-98213",
  "appId": "1:158555569739:web:634958c3d0d3e79e7c17ce",
  "apiKey": "AIzaSyAwP_wRhlKkE6ETm9p_9bK8KTq39mYBRPM",
  "authDomain": "guru-offline-priv-98213.firebaseapp.com",
  "storageBucket": "guru-offline-priv-98213.firebasestorage.app",
  "messagingSenderId": "158555569739",
  "measurementId": "",
  "oAuthClientId": "158555569739-6uscao7lskk3hl7f1lq4vt24g7sb7dli.apps.googleusercontent.com",
  "recaptchaSiteKey": ""
}
```

[SECURITY RULE — ZERO CHAT LEAKAGE]  
**JANGAN PERNAH** membagikan atau mengirimkan OAuth Client Secret, file Service Account Key, atau kredensial rahasia apa pun melalui pesan chat, tiket bantuan, ataupun tangkapan layar publik. Kredensial rahasia murni dikelola langsung oleh operator pada konsol resmi Google/Firebase.

---

## 9. PILIHAN DEPLOYMENT PRIVAT & EKSEKUSI

Aplikasi Guru Offline adalah Single Page Application (SPA) berbasis Vue 3 dan Vite dengan dukungan PWA offline-first. Hasil build menghasilkan berkas statis di folder `dist/`.

### 9.1 Perbandingan Pilihan Deployment

| Parameter | Opsi A: Localhost / LAN | Opsi B: Private Hosting (VPS/Cloud) | Opsi C: Firebase Hosting (RECOMMENDED) |
| :-- | :-- | :-- | :-- |
| **Deskripsi** | Menjalankan build statis atau dev server di laptop/server lokal. | Menaruh folder `dist/` di server Nginx/Caddy/Apache privat ber-HTTPS. | Memanfaatkan hosting gratis bawaan proyek Firebase ber-HTTPS otomatis. |
| **URL Origin** | `http://localhost:3000` atau `http://192.168.x.x:3000` | `https://app.private-domain.org` | `https://<PROJECT_ID>.web.app` |
| **Dukungan HTTPS** | Terbatas (localhost didukung, IP LAN memerlukan setup sertifikat mandiri). | Wajib disiapkan sertifikat SSL (Let's Encrypt). | **Otomatis & Terkelola Penuh (SSL Gratis bawaan Google).** |
| **OAuth Popup** | Didukung di localhost. Di IP LAN non-HTTPS diblokir oleh Google. | Didukung penuh via HTTPS. | **Didukung penuh secara native.** |
| **Authorized Domains** | `localhost` sudah bawaan Firebase. | Wajib didaftarkan manual di Firebase & Google Cloud. | **Otomatis terdaftar di Firebase & Google Cloud.** |
| **Kesesuaian** | Uji coba mandiri tanpa koneksi luar. | Infrastruktur server mandiri / on-premise. | **SANGAT DIREKOMENDASIKAN (Paling Mudah, Cepat, dan Andal).** |

---

### 9.2 JALUR UTAMA YANG DIREKOMENDASIKAN: PRIVATE APPLICATION ON FIREBASE HOSTING (OPSI C)

Jalur ini dipilih sebagai **DEFAULT UTAMA** karena kemudahan operasional dan integrasi ekosistemnya:

1. Sudah satu ekosistem dengan Firebase Authentication yang digunakan oleh aplikasi.
2. Menyediakan domain HTTPS resmi (`https://<PROJECT_ID>.web.app`) tanpa biaya domain dan tanpa kerumitan konfigurasi sertifikat SSL.
3. Domain tersebut secara umum terdaftar pada daftar Firebase Authorized Domains proyek secara default.
4. Mendukung SPA routing rewrite (`index.html`) dan caching PWA secara sempurna.

> **PENTING — ARSITEKTUR KEAMANAN PRIVATE HOSTING:**  
> Penggunaan Firebase Hosting **TIDAK SECARA OTOMATIS** membuat website tersembunyi dari jaringan internet (URL `*.web.app` tetap dapat dijangkau oleh browser mana pun di internet).  
> **Sifat "Private / Internal" aplikasi ditegakkan sepenuhnya oleh lapisan aplikasi dan otorisasi:**
>
> - **Otorisasi Google OAuth:** Akses dibatasi pada Test Users (maksimal 100 email terdaftar). Orang luar yang mencoba menghubungkan akun Google akan langsung ditolak oleh Google Identity (`403: access_denied`).
> - **Otorisasi Lokal (RBAC Aplikasi):** Meskipun seseorang dapat membuka URL halaman frontend, seluruh data sekolah tersimpan di IndexedDB browser lokal. Pengguna luar tidak memiliki sesi login lokal dan tidak dapat melihat data tanpa akun lokal yang dibuat oleh Administrator di menu Manajemen Pengguna.
> - **Zero Backend Exposure:** Aplikasi tidak membuka REST API endpoint publik tanpa proteksi di server karena seluruh transaksi data bersifat lokal (offline-first) dan panggilan cloud langsung menuju Google APIs dengan Bearer token resmi.

#### LANGKAH OPERATOR (ACTION)

1. **Instalasi Firebase CLI (jika belum ada):**
   ```bash
   npm install -g firebase-tools
   ```
2. **Login ke Akun Google Operator:**
   ```bash
   firebase login
   ```
3. **Inisialisasi Hosting pada Direktori Proyek:**
   ```bash
   firebase init hosting
   ```
   - Pilih: _Use an existing project_ > Pilih proyek yang dibuat di Bab 3.
   - Public directory: `dist`
   - Configure as a single-page app (rewrite all urls to /index.html)?: **Yes**
   - Set up automatic builds and deploys with GitHub?: **No**
   - Overwrite dist/index.html?: **No**
4. **Kompilasi Bundel Produksi:**
   ```bash
   npm run build
   ```
   Pastikan folder `dist/` terbuat tanpa error.
5. **Eksekusi Deployment ke Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```
6. **Catat URL Hosting yang Dihasilkan:** Contoh: `https://guru-offline-priv-98213.web.app`.

#### EXPECTED RESULT

Deployment selesai dengan pesan `✔ Deploy complete!`. Aplikasi dapat dibuka di peramban melalui URL HTTPS tersebut.

#### STOP IF

- Peramban menampilkan halaman putih (_blank screen_). Periksa apakah opsi SPA rewrite disetel ke `index.html` pada berkas `firebase.json`.

---

### 9.3 JALUR ALTERNATIF: PRIVATE HOSTING MANDIRI / VPS (OPSI B)

Jika Anda menggunakan server Linux privat sendiri:

1. Kompilasi aplikasi: `npm run build`.
2. Salin isi folder `dist/` ke web root server (misal: `/var/www/guru-offline`).
3. Pastikan web server (Nginx/Caddy) dikonfigurasi dengan:
   - **HTTPS aktif** (Google OAuth memblokir origin HTTP publik).
   - **SPA Fallback:** `try_files $uri $uri/ /index.html;` agar reload rute tidak menghasilkan 404.
4. Daftarkan domain tersebut ke **Authorized JavaScript Origins** di Google Cloud (Bab 6) dan **Authorized Domains** di Firebase (Bab 7.3).

---

### 9.4 JALUR ALTERNATIF: PENGUJIAN LOKAL (OPSI A)

Untuk keperluan pengujian luring di komputer operator:

1. Jalankan server lokal: `npm run preview` atau `npm run dev`.
2. Akses melalui `http://localhost:3000`.
3. Google OAuth mengizinkan origin `http://localhost` untuk keperluan development/testing tanpa HTTPS.

---

## 10. PROSEDUR UJI COBA LOGIN GOOGLE (REAL GOOGLE LOGIN UAT)

Uji coba dilakukan langsung pada origin deployment privat aktif.

### 10.1 Prosedur Uji Login Positif (Authorized Account)

1. Buka peramban dan akses URL deployment privat (misal: `https://<PROJECT_ID>.web.app`).
2. Masuk ke aplikasi menggunakan akun administrator lokal default (`admin` / sandi administrator).
3. Navigasikan ke menu **Data Management** (`/admin/data-management`), pilih tab **Backup & Restore**.
4. Gulir ke bagian **Integrasi Cloud Native Google Workspace (Sheets & Drive)**.
5. Perhatikan kartu **Koneksi Akun Google**. Status awal harus berlabel **DISCONNECTED**.
6. Klik tombol **Sambungkan Akun Google**.
7. Jendela popup otentikasi Google akan terbuka:
   - Pilih salah satu akun Google yang telah didaftarkan ke daftar **Test Users** (Bab 5.3).
   - Layar consent akan menampilkan permintaan izin untuk ke-6 scopes (Spreadsheets, Drive, Gmail, Calendar, Docs, Forms).
   - Klik **Allow / Izinkan** untuk seluruh izin yang diminta.
8. Jendela popup menutup secara otomatis dan mengembalikan fokus ke aplikasi Guru Offline.
9. **Hasil yang Diharapkan:**
   - Tag status berubah menjadi **CONNECTED** berwarna hijau.
   - Tampil panel informasi: _Tersambung Secara Aman_ disertai nama dan email akun Google pengguna.
   - Tombol **Inisialisasi** Spreadsheet dan tombol **Putuskan Sesi** menjadi aktif.

---

### 10.2 Prosedur Uji Login Negatif & Penanganan Galat

#### Skenario Negatif 1: Akun Belum Terdaftar di Test Users

1. Buka sesi penyamaran (_incognito_).
2. Login lokal dan klik **Sambungkan Akun Google**.
3. Pilih akun Google sembarang yang **TIDAK TERDAFTAR** di daftar Test Users proyek.
4. **Hasil yang Diharapkan:** Google menampilkan layar error: `403: Access blocked: App not verified` / `Error 403: access_denied`. Token tidak dikembalikan ke aplikasi, dan status di aplikasi tetap **DISCONNECTED** secara aman.

#### Skenario Negatif 2: Pembatalan Login oleh Pengguna

1. Klik **Sambungkan Akun Google**.
2. Tutup jendela popup secara manual atau klik tombol Batal (_Cancel_).
3. **Hasil yang Diharapkan:** Aplikasi menangkap pembatalan tanpa crash (`auth/popup-closed-by-user`), menampilkan pesan peringatan yang ramah di UI, dan status tetap **DISCONNECTED**.

#### Skenario Negatif 3: Pemutusan Sesi (Logout)

1. Pada kondisi **CONNECTED**, klik tombol merah **Putuskan Sesi**.
2. **Hasil yang Diharapkan:** Token di memori langsung dihapus, `currentUser` direset ke `null`, status kembali menjadi **DISCONNECTED**, dan seluruh tombol operasional API kembali dinonaktifkan (_disabled_).

---

## 11. PENGUJIAN FUNGSIONAL 6 GOOGLE WORKSPACE APIS (SMOKE TEST)

Seluruh tombol pengujian fungsional API nyata tersedia langsung di antarmuka pengguna pada menu **Data Management** (`/admin/data-management`), tab **Backup & Restore**.

Lakukan pengujian terarah berikut secara berurutan saat status akun Google berada dalam kondisi **CONNECTED**:

```text
========================================================================================
PANEL UJI FUNGSIONAL GOOGLE WORKSPACE (MENU DATA MANAGEMENT > BACKUP & RESTORE)
========================================================================================
[ KARTU 1: SHEETS ]  --> Tombol "Inisialisasi" & "Buka Spreadsheet"
[ KARTU 2: DRIVE  ]  --> Tombol "Unggah Cadangan ke Google Drive"
[ KARTU 3: GMAIL  ]  --> Form Email Tujuan & Tombol "Kirim Uji Coba Email"
[ KARTU 4: CALENDAR] --> Tombol "Buat Agenda Jadwal Ujian"
[ KARTU 5: DOCS   ]  --> Tombol "Buat Dokumen Laporan"
[ KARTU 6: FORMS  ]  --> Form ID Formulir & Tombol "Tarik Respon Evaluasi"
========================================================================================
```

### 11.1 Pengujian 1: Google Sheets API

1. Pada kartu **Koneksi Akun Google**, temukan kolom _ID Spreadsheet Google Sheets (Source of Truth)_.
2. Klik tombol hijau **Inisialisasi**.
3. **Mekanisme Kerja:** Sistem memanggil endpoint REST Google Drive/Sheets untuk mencari file spreadsheet yang sudah ada. Jika belum ada, sistem secara otomatis membuat spreadsheet baru dengan tab `Teachers`, `Students`, `Classes`, `Attendance`, `Journals`, dan `Grades`.
4. **Hasil yang Diharapkan:** Notifikasi sukses muncul: _Integrasi Google Sheets berhasil diinisialisasi sebagai Source of Truth!_, ID spreadsheet terisi otomatis, dan tombol **Buka Spreadsheet** muncul. Klik tombol tersebut untuk memverifikasi bahwa file terbuka di tab baru Google Sheets.

### 11.2 Pengujian 2: Google Drive API

1. Pada kartu **Cadangkan Ke Google Drive**, klik tombol biru **Unggah Cadangan ke Google Drive**.
2. **Mekanisme Kerja:** Sistem membuat snapshot database lokal IndexedDB (JSON), lalu mengunggah berkas tersebut ke root Google Drive akun yang terhubung menggunakan metode multipart upload REST v3.
3. **Hasil yang Diharapkan:** Notifikasi sukses muncul: _Backup database berhasil diunggah ke Google Drive! File ID: [ID_FILE_DRIVE]_. Buka Google Drive Anda untuk memverifikasi keberadaan berkas `guru-offline-drive-backup-...json`.

### 11.3 Pengujian 3: Gmail API

1. Pada kartu **Panel Uji Integrasi Native API Workspace Lainnya**, cari panel **NOTIFIKASI GMAIL**.
2. Masukkan alamat email penerima uji coba pada kolom yang tersedia (misal: email operator sendiri).
3. Klik tombol biru **Kirim Uji Coba Email**.
4. **Mekanisme Kerja:** Sistem merangkai pesan MIME RFC 2822 sederhana, mengonversinya ke Base64 URL-safe, dan mengirimkannya via endpoint REST `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`.
5. **Hasil yang Diharapkan:** Notifikasi sukses muncul: _Email notifikasi berhasil dikirim melalui akun Google Anda!_. Buka inbox email tujuan untuk memastikan email masuk.

### 11.4 Pengujian 4: Google Calendar API

1. Pada panel **ACARA ACADEMIC CALENDAR**, klik tombol merah **Buat Agenda Jadwal Ujian**.
2. **Mekanisme Kerja:** Sistem memanggil REST endpoint `https://www.googleapis.com/calendar/v3/calendars/primary/events` untuk membuat agenda _Jadwal Asesmen Sumatif Bersama (SIAKAD)_ berdurasi 2 jam pada kalender utama pengguna.
3. **Hasil yang Diharapkan:** Notifikasi sukses muncul: _Jadwal ujian berhasil diagendakan di Google Calendar!_. Buka Google Calendar Anda untuk memastikan acara muncul di jadwal hari ini.

### 11.5 Pengujian 5: Google Docs API

1. Pada panel **LAPORAN GOOGLE DOCS**, klik tombol **Buat Dokumen Laporan**.
2. **Mekanisme Kerja:** Sistem memanggil REST endpoint `https://docs.googleapis.com/v1/documents` untuk membuat berkas dokumen baru, kemudian mengirimkan batch request untuk menyisipkan header laporan resmi SIAKAD Guru Offline.
3. **Hasil yang Diharapkan:** Notifikasi sukses muncul: _Dokumen template laporan berhasil dibuat di Google Docs! (ID: [DOC_ID])_. Verifikasi file dokumen baru di Google Drive Anda.

### 11.6 Pengujian 6: Google Forms API

1. Pada panel **RESPON EVALUASI GOOGLE FORMS**, masukkan ID Google Form yang valid (atau gunakan form uji coba).
2. Klik tombol **Tarik Respon Evaluasi**.
3. **Mekanisme Kerja:** Sistem memanggil REST endpoint read-only `https://forms.googleapis.com/v1/forms/{formId}/responses` menggunakan scope `forms.responses.readonly`.
4. **Hasil yang Diharapkan:** Notifikasi sukses muncul: _Berhasil mengambil [N] respon evaluasi siswa!_ (atau pesan bahwa belum ada respon jika form masih kosong).

---

## 12. APPLICATION ROLE-BASED ACCESS CONTROL (RBAC)

Prinsip dasar keamanan Guru Offline:

> **GOOGLE AUTHENTICATION TIDAK SAMA DENGAN APPLICATION AUTHORIZATION**

### 12.1 Isolasi Akun Google vs Akun Lokal

1. **Google Identity Hanyalah Mekanisme Cloud Handshake:** Akun Google digunakan semata-mata untuk mengotorisasi akses ke Google Workspace APIs (Sheets, Drive, Gmail, dll.).
2. **Otorisasi Ditentukan oleh Akun Lokal di IndexedDB:**
   - Hak akses pengguna di dalam aplikasi (ADMIN atau GURU) sepenuhnya ditentukan oleh basis data pengguna lokal (`UserEntity` di IndexedDB) yang dikelola oleh Administrator melalui menu **Manajemen Pengguna**.
   - Berhasil login dengan akun Google **TIDAK PERNAH** otomatis memberikan role ADMIN ataupun mengubah role pengguna di aplikasi.
   - Jika pengguna masuk ke peramban tanpa memiliki akun lokal yang aktif, aplikasi tetap menolak akses ke data sekolah.

### 12.2 Prosedur Uji Isolasi Role (RBAC Negative Test)

1. Buat satu akun pengguna lokal dengan role **GURU** melalui menu Manajemen Pengguna.
2. Login ke aplikasi sebagai user GURU tersebut.
3. Sambungkan akun Google.
4. Coba akses menu administratif: `/admin/users`, `/admin/data-management`, atau `/admin/curriculum`.
5. **Hasil yang Diharapkan:** Router guard dan `AuthorizationService` secara tegas memblokir akses ke rute admin, menampilkan peringatan akses ditolak (_Access Denied_), atau mengarahkan guru ke dashboard operasional harian.

---

## 13. PENGUJIAN OFFLINE & SYNCQUEUE ENGINE

Private deployment tidak boleh menghilangkan sifat utama aplikasi sebagai **aplikasi luring murni (Offline-First)**.

### 13.1 Prosedur Uji Ketahanan Luring (Offline Test)

1. Dalam kondisi peramban terhubung internet dan akun Google berstatus **CONNECTED**:
   - Lakukan satu transaksi data di aplikasi (misalnya: input presensi siswa harian di menu Presensi, atau tambah catatan jurnal mengajar).
2. **Putuskan Koneksi Internet:**
   - Di DevTools peramban (F12 > Network tab), ubah dropdown koneksi menjadi **Offline**, atau matikan koneksi Wi-Fi komputer.
3. Lakukan transaksi data kedua:
   - Tambahkan presensi untuk kelas lain atau ubah status absensi siswa.
4. **Hasil yang Diharapkan:**
   - Aplikasi tidak mengalami macet (_freeze_) atau error crash.
   - Notifikasi lokal mengonfirmasi bahwa data berhasil tersimpan ke basis data lokal (IndexedDB).
   - Di latar belakang, mutasi data dicatat ke dalam antrian sinkronisasi (`SyncQueue`) dengan status `PENDING`.
5. **Sambungkan Kembali Internet:**
   - Nyalakan kembali koneksi Wi-Fi / setel Network ke **No throttling**.
   - Buka menu **Data Management** atau klik tombol sinkronisasi.
6. **Hasil yang Diharapkan:**
   - Worker sinkronisasi (`SyncService`) memproses antrian mutasi yang tertunda.
   - Mutasi data terkirim secara berurutan (_FIFO_) ke tab Google Sheets yang sesuai.
   - Status antrian di `SyncQueue` terupdate dari `PENDING` menjadi `SYNCED`.

---

## 14. KEAMANAN & MANAJEMEN TOKEN

### 14.1 Siklus Hidup Token di Memori (Token Lifecycle)

1. **Penyimpanan:** Token akses OAuth (`accessToken`) disimpan secara eksklusif sebagai variabel privat di dalam instance `GoogleWorkspaceService`.
2. **Durasi Aktif:** Token memiliki masa aktif 3600 detik (1 jam) dari Google.
3. **Pembersihan Otomatis:** Token dibersihkan saat:
   - Pengguna mengklik tombol **Putuskan Sesi**.
   - Pengguna me-refresh tab peramban (token di memori hilang secara alami).
   - Terjadi galat otorisasi HTTP 401 saat memanggil Google API.

### 14.2 Penanganan Galat Token Kedaluwarsa (HTTP 401 Handling)

Aplikasi Guru Offline mengimplementasikan penanganan galat HTTP 401 secara elegan:

- Saat panggilan Google REST API menerima respon `HTTP 401 Unauthorized`:
  ```typescript
  if (!response.ok) {
    if (response.status === 401) {
      this.cachedToken = null
      this.currentUser = null
    }
    // throw structured error
  }
  ```
- Token yang kedaluwarsa langsung dibatalkan dari memori.
- Status koneksi di antarmuka pengguna otomatis kembali ke `DISCONNECTED`.
- Pengguna cukup mengklik tombol **Sambungkan Akun Google** untuk memperoleh token baru melalui popup cepat tanpa kehilangan data lokal di IndexedDB.

---

## 15. PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)

Tabel berikut merangkum solusi teknis terhadap galat yang mungkin ditemui selama proses deployment privat:

| Indikasi Galat | Kemungkinan Penyebab | Tindakan Koreksi Operator |
| :-- | :-- | :-- |
| **Popup login terblokir (_Popup blocked_)** | Peramban memblokir pembukaan jendela sembul otomatis. | Klik ikon pemblokir popup di bilah alamat peramban (URL bar), pilih _Selalu izinkan popup dari origin ini_, lalu ulangi klik tombol. |
| **Error `auth/unauthorized-domain`** | Host atau domain tempat aplikasi dibuka belum terdaftar di Firebase. | Buka **Firebase Console > Authentication > Settings > Authorized domains**, klik **Add domain**, dan masukkan hostname deployment Anda (misal: `my-app.web.app` atau domain VPS Anda). |
| **Error `unauthorized_client`** | Nilai `oAuthClientId` pada `firebase-applet-config.json` salah atau tidak cocok dengan proyek Google Cloud. | Buka **Google Cloud Console > Credentials**, salin Client ID yang benar, dan perbarui nilai `oAuthClientId` pada `firebase-applet-config.json`. |
| **Error `400: redirect_uri_mismatch`** | URI handler Firebase belum tercantum pada OAuth Web Client di Google Cloud. | Buka **Google Cloud Console > Credentials > Edit OAuth Web Client**. Pada kolom _Authorized redirect URIs_, tambahkan: `https://<PROJECT_ID>.firebaseapp.com/__/auth/handler`. |
| **Error `403: access_denied` / `App not verified`** | OAuth Consent Screen berstatus _External (Testing)_ dan email yang digunakan belum terdaftar di Test Users. | Buka **Google Cloud Console > OAuth consent screen > tab Test users**, klik **+ ADD USERS**, masukkan email Google yang bersangkutan, lalu simpan. |
| **Error `403: [API Name] has not been used...`** | Salah satu dari 6 API Google belum diaktifkan pada proyek Google Cloud. | Buka **Google Cloud Console > APIs & Services > Library**, cari API yang tertera pada pesan error (misal: _Gmail API_), lalu klik **ENABLE**. |
| **Error `401 Unauthorized` saat memanggil API** | Token akses Google telah kedaluwarsa (>1 jam) atau izin akses dicabut pengguna. | Klik tombol **Putuskan Sesi** lalu klik **Sambungkan Akun Google** pada tab Backup & Restore untuk memperbarui token sesi. |
| **Bisa login di Localhost tapi gagal di URL Deployment** | Origin deployment belum didaftarkan di Google Cloud OAuth Web Client. | Buka **Google Cloud Console > Credentials > Edit OAuth Web Client**. Pada kolom _Authorized JavaScript origins_, tambahkan origin HTTPS deployment Anda. |
| **Login Google Berhasil Tapi Ditolak di Aplikasi** | Akun Google berhasil tersambung, tetapi akun tersebut belum terdaftar di database lokal aplikasi. | Ini adalah perilaku keamanan yang diharapkan (_RBAC Isolation_). Administrator harus membuatkan akun lokal terlebih dahulu di menu Manajemen Pengguna aplikasi. |

---

## 16. MATRIKS USER ACCEPTANCE TESTING (UAT)

Operator wajib menandai setiap item pengujian berikut setelah memverifikasi perilaku aktual sistem:

| ID | Item Pengujian | Skenario Uji | Kriteria Keberhasilan | Status Uji |
| :-- | :-- | :-- | :-- | :-- |
| **UAT-01** | **Google Cloud Project** | Pembuatan proyek mandiri & aktivasi 6 REST APIs | Ke-6 API berstatus _Enabled_ di konsol Google Cloud | [ ] PASS |
| **UAT-02** | **OAuth Consent Setup** | Konfigurasi App Registration & Scopes | 6 Scopes resmi terpilih, status Testing aktif | [ ] PASS |
| **UAT-03** | **Test Users Enrollment** | Pendaftaran email pengguna ke Test Users | Akun penguji terdaftar di daftar Test Users | [ ] PASS |
| **UAT-04** | **OAuth Web Client** | Registrasi Web Client & Origins | Origin deployment terdaftar di JavaScript Origins | [ ] PASS |
| **UAT-05** | **Firebase Auth Linking** | Aktivasi penyedia Google Sign-in di Firebase | Google provider berstatus _Enabled_ | [ ] PASS |
| **UAT-06** | **Config Sanitation** | Pemeriksaan berkas `firebase-applet-config.json` | Memuat public config saja, **0 secret exposed** | [ ] PASS |
| **UAT-07** | **Production Build** | Eksekusi `npm run build` | Bundel statis terbuat di `dist/` tanpa error | [ ] PASS |
| **UAT-08** | **HTTPS Deployment** | Akses aplikasi melalui origin HTTPS privat | Aplikasi terbuka sempurna melalui koneksi aman | [ ] PASS |
| **UAT-09** | **Real Google Login** | Login dengan akun terdaftar di Test Users | Status CONNECTED, profil Google tampil benar | [ ] PASS |
| **UAT-10** | **Negative Auth Test** | Login dengan akun tidak terdaftar | Akses ditolak Google (403), aplikasi tidak crash | [ ] PASS |
| **UAT-11** | **Sheets Smoke Test** | Klik tombol _Inisialisasi Spreadsheet_ | File Spreadsheet terbuat dengan struktur tab valid | [ ] PASS |
| **UAT-12** | **Drive Smoke Test** | Klik tombol _Unggah Cadangan ke Drive_ | File backup JSON terunggah ke Google Drive | [ ] PASS |
| **UAT-13** | **Gmail Smoke Test** | Klik tombol _Kirim Uji Coba Email_ | Email notifikasi diterima di kotak masuk tujuan | [ ] PASS |
| **UAT-14** | **Calendar Smoke Test** | Klik tombol _Buat Agenda Jadwal Ujian_ | Acara kalender ujian tercatat di Google Calendar | [ ] PASS |
| **UAT-15** | **Docs Smoke Test** | Klik tombol _Buat Dokumen Laporan_ | Berkas dokumen laporan terbuat di Google Docs | [ ] PASS |
| **UAT-16** | **Forms Smoke Test** | Klik tombol _Tarik Respon Evaluasi_ | Respon form terbaca tanpa permission error | [ ] PASS |
| **UAT-17** | **RBAC Independence** | Uji otorisasi user Guru vs Admin | Role ditentukan lokal, Google auth tidak mengelevasi role | [ ] PASS |
| **UAT-18** | **Offline Durability** | Transaksi saat offline & rekonsiliasi online | Data tersimpan lokal, SyncQueue tersinkronisasi saat online | [ ] PASS |
| **UAT-19** | **Session Invalidation** | Klik tombol _Putuskan Sesi_ | Token memori bersih, status kembali DISCONNECTED | [ ] PASS |

---

## 17. GO-LIVE CHECKLIST

Sebelum deployment privat diserahkan untuk penggunaan operasional sehari-hari, pastikan seluruh checklist di bawah ini terpenuhi:

```text
========================================================================================
CHECKLIST KESIAPAN GO-LIVE DEPLOYMENT PRIVAT GURU OFFLINE
========================================================================================

[ ] 1. GOOGLE CLOUD
    [ ] Proyek Google Cloud privat aktif dan dimiliki oleh operator.
    [ ] Tepat 6 REST APIs aktif: Sheets, Drive, Gmail, Calendar, Docs, Forms.
    [ ] OAuth Consent Screen terkonfigurasi (nama aplikasi, email support, 6 scopes).
    [ ] Mode External memuat daftar email pengguna aktif pada tab Test Users.
    [ ] OAuth Web Client memuat origin HTTPS deployment pada Authorized JavaScript origins.
    [ ] Authorized redirect URIs memuat handler Firebase (jika kustom).

[ ] 2. FIREBASE
    [ ] Proyek Firebase tertaut ke proyek Google Cloud yang sesuai.
    [ ] Google Sign-In provider aktif pada Firebase Authentication.
    [ ] Origin/domain deployment terdaftar pada Authorized domains.
    [ ] Konfigurasi publik web app telah diambil.

[ ] 3. FRONTEND & CONFIGURATION
    [ ] File firebase-applet-config.json memuat konfigurasi publik proyek operator.
    [ ] Tidak ada Client Secret, private key, atau password di berkas frontend.
    [ ] Uji regresi otomatis lulus: npm run test:all (92/92 PASS).
    [ ] Linting lulus tanpa error: npm run lint.
    [ ] Kompilasi produksi sukses: npm run build.

[ ] 4. DEPLOYMENT & AKSES
    [ ] Aplikasi ter-hosting di lingkungan ber-HTTPS (Firebase Hosting atau Private Server).
    [ ] Konfigurasi SPA rewrite ke index.html aktif (halaman tidak 404 saat di-refresh).
    [ ] Fitur offline PWA aktif dan Service Worker terpasang.

[ ] 5. UAT & KEAMANAN
    [ ] Alur login Google positif berhasil dan terhubung dengan aman.
    [ ] Alur negatif (akun tidak terdaftar) ditolak dengan benar oleh Google.
    [ ] Seluruh 6 API telah diverifikasi melalui pengujian nyata (Smoke Test).
    [ ] Otorisasi RBAC lokal terbukti independen dari akun Google.
    [ ] Mutasi data saat offline tersimpan di IndexedDB dan tersinkron saat online.
========================================================================================
```

---

## 18. DEFINISI STATUS SISTEM (FINAL STATUS)

Status deployment privat aplikasi Guru Offline diklasifikasikan ke dalam status formal berikut:

| Status Kode | Arti & Kondisi Operasional |
| :-- | :-- |
| **`PRIVATE-DEPLOYMENT-GUIDE-FACT-CHECKED`** | Seluruh klaim Google Cloud dan Firebase pada panduan telah diverifikasi secara faktual terhadap dokumentasi resmi Google/Firebase. |
| **`PRIVATE-DEPLOYMENT-BLOCKED`** | Provisioning belum selesai. Proyek Google Cloud/Firebase belum siap, API belum aktif, atau konfigurasi publik belum diperbarui. |
| **`PRIVATE-DEPLOYMENT-READY`** | Seluruh konfigurasi cloud, kredensial publik, build produksi, dan panduan deployment privat telah selesai diatur dan lolos validasi otomatis. |
| **`REAL-OAUTH-UAT-PENDING`** | Menunggu operator melakukan pengujian login Google dengan akun nyata dan verifikasi 6 Google Workspace APIs pada origin deployment aktif. |
| **`PRIVATE-OAUTH-UAT-PASS`** | Otentikasi Google nyata dan seluruh 6 uji coba API (Smoke Test) telah berhasil diverifikasi pada origin deployment privat. |
| **`PRIVATE-GO-LIVE`** | Seluruh pengujian UAT (Otentikasi, 6 API, RBAC lokal, Offline SyncQueue, dan Audit Keamanan) telah berstatus PASS 100% dan aplikasi resmi digunakan secara privat. |

> **STATUS SISTEM SAAT INI:**  
> Status Dokumentasi: **`PRIVATE-DEPLOYMENT-GUIDE-FACT-CHECKED`**  
> Status Aplikasi: **`PRIVATE-DEPLOYMENT-READY`**  
> Status Real OAuth UAT: **`REAL-OAUTH-UAT-PENDING`**  
> _(Pengujian OAuth nyata menunggu operator menjalankan langkah-langkah di konsol Google Cloud dan Firebase pribadi untuk mencapai status `PRIVATE-GO-LIVE`)._
