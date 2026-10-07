# TASK: Audit & Polish `open-vpn-web` agar tampil profesional

Dibuat dari audit kode pada 2026-10-07. Dikerjakan oleh agen eksekutor, bukan oleh penulis dokumen ini.
Cakupan: security, layout, content (copywriting), dan detail UI (teks peringatan, loading, pop up, tombol, dll).

Semua temuan di bawah dibaca langsung dari kode. Yang bertanda **[TERVERIFIKASI]** sudah dijalankan dan terbukti.

---

## 0. Aturan kerja (wajib)

1. Baca `AGENTS.md` dulu. Next.js di repo ini versi 16.3.8 dan berbeda dari pengetahuan umum. Sebelum memakai API Next (`loading.tsx`, `error.tsx`, `not-found.tsx`, `generateMetadata`, `robots.ts`, `proxy.ts`, `headers()`, `usePathname`), baca panduannya di `node_modules/next/dist/docs/01-app/` (jalankan `npm ci` lebih dulu).
2. Buat branch `audit/professional-polish`. **Satu commit per fase.** Jangan push ke `main`. Buka PR jika akses tersedia.
3. Setelah tiap fase jalankan gate cepat: `npm run lint && npx tsc --noEmit && npm test && npm run build`. Jangan lanjut ke fase berikutnya bila merah.
4. **Jangan diubah:**
   - kontrak upstream: `GET /v1/services`, `GET /v1/status`, `POST /v1/accounts`, header `X-API-Key`, header `Idempotency-Key`;
   - rahasia tidak boleh berawalan `NEXT_PUBLIC_`;
   - kredensial akun (password, isi `.ovpn`, link koneksi) tidak boleh masuk log, Firestore, atau error message;
   - seluruh teks UI tetap Bahasa Indonesia;
   - pendekatan CSP berbasis nonce di `src/proxy.ts`;
   - palet warna merek (primary/sky/cyan/warm). Ini polish, bukan redesign total.
5. **Tanpa dependency runtime baru.** Satu-satunya tambahan: `prettier` (devDependency). Ikon memakai `lucide-react` yang sudah ada. Modal, toast, dan skeleton ditulis sendiri.
6. Kode baru harus rapi dan terformat. Jangan menulis satu baris panjang seperti `AccountForm.tsx`, `Portal.tsx`, `proxy.ts`, dan `page.tsx` saat ini.
7. Bila sebuah temuan ternyata tidak cocok dengan kode terkini, catat di PR dan lewati. Jangan memaksa.
8. Setiap item punya ID (mis. `S-3`). Centang `[x]` saat selesai dan semua "Selesai jika" terpenuhi.

---

## 1. Baseline (hasil audit, sebelum perubahan)

| Pemeriksaan | Hasil |
|---|---|
| `npm run lint` | lolos |
| `npx tsc --noEmit` | lolos |
| `npm test` | 8 test lolos |
| `npm run check:contrast` | semua lolos |
| `npm run build` | lolos |
| `npm audit` | 8 moderate, semuanya transitif lewat `firebase-admin` → `uuid <11.1.1` (GHSA-w5hq-g745-h8pq). Perbaikan otomatis memaksa `firebase-admin@14` (breaking) |
| App tanpa `FIREBASE_*` | `/`, `/api/meta`, dan `POST /api/accounts` semuanya **HTTP 500** "Firestore is not configured" **[TERVERIFIKASI]** |
| App dengan konfigurasi e2e (`FIREBASE_PRIVATE_KEY=test`) | `/` dan `/api/meta` **HTTP 500** "Failed to parse private key" **[TERVERIFIKASI]** |
| `POST /api/accounts` dengan `Content-Type: text/plain` | body JSON tetap diterima dan diproses sampai tahap Firestore **[TERVERIFIKASI]** |
| Header respons | tidak ada HSTS, COOP, CORP **[TERVERIFIKASI]** |

Playwright (e2e) belum dijalankan saat audit karena browser belum terpasang. Jalankan `npx playwright install chromium` lalu catat hasil baseline e2e sebelum mulai (lihat F-1).

---

## 2. Keputusan default yang sudah diambil

Pemilik proyek boleh mengubahnya. Jika tidak ada instruksi lain, ikuti ini.

1. **Hasil akun tetap disimpan di `sessionStorage`** agar tidak hilang saat refresh, tetapi dengan TTL 30 menit, validasi bentuk data saat dibaca, dihapus saat pengguna menutup hasil, dan teks UI/README dibuat jujur (S-8).
2. **Store kuota**: bila `FIREBASE_*` kosong, pakai store in-memory dengan peringatan di production (F-1).
3. **Batas harian per IP per layanan = 3** (env baru `PER_IP_CREATE_LIMIT_PER_DAY`), selain batas per jam yang sudah ada (S-2).
4. Menu mobile dipakai sampai lebar 1023px (sebelumnya 767px), karena enam layanan + merek tidak muat di tablet.
5. `robots`: izinkan `/`, larang `/api/`.
6. Tidak ada dark mode pada tugas ini.
7. Halaman Ketentuan dan Privasi ditulis oleh agen sebagai draf. Pemilik proyek wajib meninjau isinya sebelum rilis (agen bukan penasihat hukum).

---

## FASE 1: Bug yang merusak (kerjakan lebih dulu)

### F-1 [ ] Store kuota wajib bisa jalan tanpa Firebase, dan kegagalan store tidak boleh menjadi 500
- **Lokasi:** `src/lib/firestore.ts`, `src/lib/initialMeta.ts`, `src/app/api/meta/route.ts`, `src/app/api/accounts/route.ts`, `playwright.config.ts`
- **Masalah:**
  - `getStore()` mengembalikan `null` saat `FIREBASE_*` kosong, lalu semua fungsi melempar error. README menyebut Firestore opsional dan `firestoreEnabled()` tidak dipakai di mana pun.
  - Konfigurasi e2e memakai private key palsu sehingga `cert()` melempar error.
  - `storePromise` yang gagal (rejected) ter-cache selamanya, jadi satu kegagalan init sementara menjatuhkan app sampai restart.
  - `initialMeta()` dan `/api/meta` tidak menangkap error store, jadi halaman utama crash saat Firestore bermasalah.
  - Handler `POST` tidak punya `try/catch` di sekitar `reserveCreateAttempt`/`reserveQuota`, jadi error keluar sebagai halaman HTML 500 dan klien menampilkan pesan mentah "Unexpected token…" (lihat F-6).
- **Tindakan:**
  1. Buat `src/lib/store/` dengan interface `QuotaStore` (`reserve`, `release`, `snapshot`, `reserveIp`) dan dua implementasi: `memoryStore` (Map, entri kedaluwarsa dibersihkan) dan `firestoreStore` (kode yang ada, dipindah).
  2. Pilih lewat env `QUOTA_STORE` (`firestore` | `memory`). Default: `firestore` bila ketiga `FIREBASE_*` terisi, selain itu `memory`.
  3. `NODE_ENV=production` + `memory` → `console.warn` sekali: "kuota tidak dibagi antar proses dan hilang saat restart".
  4. `QUOTA_STORE=firestore` dengan kredensial tidak lengkap atau tidak valid → error konfigurasi yang jelas dan singkat, bukan stack trace Firebase.
  5. Jangan cache promise yang gagal: reset `storePromise` saat reject.
  6. `initialMeta()` dan `/api/meta`: tangkap kegagalan store, kembalikan `quota: {}` dan `quotaUnavailable: true`. UI menampilkan "Kuota belum dapat dimuat" (bukan angka palsu).
  7. `POST`: bungkus seluruh handler dengan `try/catch`. Kegagalan store → **fail closed** dengan JSON `503 {error:{code:"store_unavailable"}}`. Error tak terduga → JSON `500 {error:{code:"internal_error"}}`. Tidak pernah HTML.
  8. `playwright.config.ts`: hapus `FIREBASE_*` palsu, set `QUOTA_STORE=memory`.
- **Selesai jika:** app jalan tanpa `FIREBASE_*` (`/` dan `/api/meta` 200); simulasi store gagal menghasilkan halaman tetap tampil dan POST mengembalikan JSON 503; unit test memory store (reserve sampai batas, release, snapshot, limit IP) hijau.

### F-2 [ ] `/s/[service]` menampilkan 404 padahal upstream sedang mati
- **Lokasi:** `src/app/s/[service]/page.tsx`
- **Masalah:** saat upstream gagal, `meta.services` kosong sehingga `notFound()` dipanggil untuk layanan yang sebenarnya valid. Pengguna melihat "tidak ditemukan", bukan "server tidak dapat dihubungi".
- **Tindakan:** panggil `notFound()` hanya bila katalog berhasil dimuat (`!meta.unavailable` atau `services.length > 0`) **dan** id tidak ada. Bila katalog kosong karena upstream gagal, render halaman layanan dengan state "tidak dapat dihubungi" (Alert + tombol "Coba lagi").
- **Selesai jika:** dengan upstream mati, `/s/ssh` menampilkan state gangguan (bukan 404) dan `/s/tidak-ada` tetap 404 saat katalog sehat. Ada test e2e untuk keduanya.

### F-3 [ ] Navigasi tidak pernah menandai halaman aktif
- **Lokasi:** `src/app/layout.tsx` (`<Navbar />` tanpa prop `current`), `src/components/Navbar.tsx`, `src/components/ServiceMenu.tsx`
- **Masalah:** `current` tidak pernah diisi, jadi "Beranda" selalu `is-current` dan `aria-current="page"` di **semua** halaman, termasuk `/s/ssh`.
- **Tindakan:** pisahkan tautan ke client component `NavLinks` yang memakai `usePathname()`. Hapus plumbing prop `current` (termasuk `<span className="sr-only">{current ?? ""}</span>` di `ServiceMenu` yang tidak berguna). Beranda aktif hanya saat path `/`; layanan aktif saat path `/s/<id>`.
- **Selesai jika:** di `/s/vmess` hanya VMess yang `aria-current="page"` (desktop dan menu mobile). Ada test e2e.

### F-4 [ ] Data meta basi saat berpindah antar layanan
- **Lokasi:** `src/components/Portal.tsx` (`useState(initial)`), `src/app/s/[service]/page.tsx`
- **Masalah:** pindah `/s/ssh` → `/s/vmess` lewat `Link` memakai ulang instance `Portal`, sehingga `useState(initial)` mengabaikan `initial` baru dan kuota yang tampil basi.
- **Tindakan:** beri `key={service}` pada `<Portal>` di halaman layanan, atau sinkronkan state dari props. Setelah refactor di Fase 5, pastikan perilaku ini tetap benar.
- **Selesai jika:** setelah membuat akun SSH lalu pindah ke VMess, kuota VMess sesuai data server terbaru.

### F-5 [ ] `.env.example` dirujuk README tetapi tidak ada, dan di-ignore
- **Masalah:** README menyuruh `cp .env.example .env.local`, tetapi file tidak ada di repo dan `.gitignore` memuat `.env*`.
- **Tindakan:** tambahkan `!.env.example` di `.gitignore`, buat `.env.example` berisi semua variabel yang relevan dengan nilai contoh aman (tanpa rahasia asli) dan komentar singkat per variabel.
- **Selesai jika:** `git ls-files` memuat `.env.example`; mengikuti README dari nol (`npm ci`, copy env, `npm run mock`, `npm run dev`) berhasil.

### F-6 [ ] Pesan error mentah bocor ke pengguna
- **Lokasi:** `src/components/AccountForm.tsx` (fungsi `submit`)
- **Masalah:** `await response.json()` pada respons non-JSON memunculkan "Unexpected token '<'…", dan kegagalan jaringan memunculkan "Failed to fetch" (Inggris) langsung di UI.
- **Tindakan:** buat `src/lib/clientErrors.ts` (fungsi murni, ber-test) yang memetakan `(status, code, kondisi jaringan/timeout)` ke pesan Indonesia dengan tabel di §F-6.1. Klien memetakan berdasarkan `code` lebih dulu. Pesan server hanya cadangan. Pasang `AbortController` dengan batas 45 detik.
- **Selesai jika:** tidak ada jalur yang menampilkan `e.message` mentah ke pengguna. Unit test mencakup semua baris tabel.

**§F-6.1 Tabel pesan error**

| Kondisi | Pesan |
|---|---|
| Jaringan putus / `fetch` gagal | "Tidak dapat terhubung ke internet. Periksa koneksi Anda lalu coba lagi." |
| Timeout klien (45 dtk) | "Permintaan memakan waktu terlalu lama. Akun mungkin sudah dibuat. Tunggu 2–3 menit sebelum mencoba lagi." |
| 422 `invalid_request` | "Layanan atau durasi tidak tersedia. Muat ulang halaman lalu pilih lagi." |
| 422 `verification_failed` | "Verifikasi keamanan belum berhasil. Selesaikan verifikasi lalu coba lagi." |
| 403 `forbidden_origin` / 415 / 413 | "Permintaan ditolak. Muat ulang halaman lalu coba lagi." |
| 429 `rate_limited` | "Terlalu banyak percobaan. Coba lagi sekitar {n} menit lagi." |
| 409 `quota_exhausted` | "Kuota {layanan} hari ini sudah habis. Kuota direset pukul 00.00 WIB." (juga refresh meta) |
| 409 `conflict` | "Akun tidak dapat dibuat saat ini. Silakan coba lagi." |
| 503 `service_unavailable` / `store_unavailable` | "Layanan sedang sibuk atau tidak dapat dihubungi. Coba lagi sebentar lagi." |
| 504 `creation_unknown` | "Status pembuatan akun tidak pasti. Jangan klik berulang kali. Tunggu beberapa menit lalu coba lagi." (tombol cooldown 30 dtk) |
| 5xx lain / respons bukan JSON | "Terjadi kesalahan di server. Silakan coba lagi." |

---

## FASE 2: Security

### S-1 [ ] Tutup celah CSRF / permintaan lintas-origin pada `POST /api/accounts`
- **Lokasi:** `src/app/api/accounts/route.ts`
- **Masalah:** `request.json()` tidak memeriksa `Content-Type` dan tidak ada pemeriksaan Origin. Form lintas-situs bisa mengirim `text/plain` berisi JSON tanpa preflight, sehingga situs lain dapat menghabiskan kuota dan jatah IP dari browser pengunjung **[TERVERIFIKASI]**. Tidak ada batas ukuran body.
- **Tindakan:**
  1. Wajib `Content-Type: application/json` (selain itu 415 JSON).
  2. Tolak bila `Sec-Fetch-Site` ada dan bukan `same-origin`. Bila tidak ada, bandingkan header `Origin` dengan host permintaan (403 JSON `forbidden_origin`). Bila keduanya tidak ada, izinkan hanya jika bukan production atau permintaan non-browser yang jelas; putuskan dan dokumentasikan di kode.
  3. Batasi body 2 KB: periksa `Content-Length` dan panjang teks aktual (413 JSON `payload_too_large`).
  4. Pisahkan ke helper `src/lib/requestGuard.ts` agar bisa di-unit-test.
- **Selesai jika:** `curl -H "Content-Type: text/plain"` → 415; permintaan dengan `Origin: https://evil.example` → 403; body besar → 413; e2e flow normal tetap lolos.

### S-2 [ ] Rate limit per-IP: normalisasi, IP hilang, dan batas harian
- **Lokasi:** `src/lib/rateLimit.ts`, `src/lib/firestore.ts` (`reserveIpQuota`)
- **Masalah:**
  - Bila `X-Real-IP` tidak ada di production, semua orang memakai hash `"unknown"` → satu bucket bersama (5/jam untuk seluruh dunia = layanan mati, atau bypass bila diganti-ganti).
  - IPv6 tidak dinormalisasi; satu pengguna dengan /64 punya jutaan alamat.
  - Parameter `service` pada `reserveIpQuota` tidak dipakai. Batas hanya per jam, sehingga satu IP bisa menghabiskan kuota global harian sebuah layanan (default 10) dalam 2 jam.
  - `finishIpQuota`/`finishCreateAttempt` tidak melakukan apa pun (dead code).
- **Tindakan:**
  1. Normalisasi: IPv4 apa adanya; IPv6 dipotong ke prefix /64; buang port/zona; tolak string yang bukan IP valid (`node:net` `isIP`).
  2. IP tidak ada/tidak valid di production: log event `ip_missing` (maks 1 per menit) dan pakai bucket bersama dengan limit lebih ketat; jangan diam-diam gabungkan dengan IP valid.
  3. Tambah env `PER_IP_CREATE_LIMIT_PER_DAY` (default 3), dihitung per `(hari WIB, ipHash, service)` memakai parameter `service` yang selama ini terabaikan. Batas per jam tetap ada.
  4. Hapus `finishIpQuota`/`finishCreateAttempt` dan plumbing `logId` bila tetap tidak berfungsi, atau implementasikan refund untuk kegagalan upstream definitif (pilih satu, jelaskan di PR).
  5. `Retry-After` dihitung sampai batas jam/hari berikutnya, bukan konstanta `3600`.
- **Selesai jika:** unit test untuk normalisasi IPv4/IPv6, IP hilang, batas harian dan jam; respons 429 membawa `Retry-After` yang masuk akal.

### S-3 [ ] Turnstile: peringatan production dan penanganan skrip gagal
- **Lokasi:** `src/lib/env.ts`, `src/components/AccountForm.tsx`
- **Masalah:** tanpa Turnstile, perlindungan hanya rate limit per-IP yang mudah diputar. Bila skrip Turnstile diblokir (adblock/jaringan), pengguna menunggu tanpa penjelasan dan tombol tampak aktif. `cleanup` memanggil `reset` alih-alih `remove`.
- **Tindakan:**
  - Bila `NODE_ENV=production` dan Turnstile tidak dikonfigurasi, `console.warn` sekali saat startup (jangan hard-fail).
  - Klien: tombol "Buat Akun" disabled sampai token ada, dengan teks bantu "Selesaikan verifikasi keamanan di atas." Jika skrip gagal dimuat atau tidak siap dalam 10 detik, tampilkan Alert "Verifikasi keamanan gagal dimuat. Nonaktifkan pemblokir iklan atau muat ulang halaman." plus tombol "Muat ulang verifikasi".
  - Cleanup memakai `turnstile.remove(widgetId)`.
- **Selesai jika:** simulasi skrip diblokir (Playwright `route.abort`) menampilkan Alert dan tombol tidak bisa dikirim.

### S-4 [ ] Header keamanan tambahan
- **Lokasi:** `next.config.ts`, `src/proxy.ts`
- **Tindakan:**
  - Tambah `Strict-Transport-Security: max-age=31536000; includeSubDomains` (hanya bila `NODE_ENV=production`), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`.
  - `Permissions-Policy` diperluas (`payment=(), usb=(), interest-cohort=()` selain yang ada).
  - `poweredByHeader: false`.
  - CSP tambahkan `manifest-src 'self'`. Pastikan tidak ada inline style yang melanggar `style-src` (komponen baru tidak boleh memakai atribut `style={…}` statis; gunakan class atau CSS variable lewat class).
  - Format ulang `proxy.ts` agar terbaca.
- **Selesai jika:** `curl -I` menampilkan header baru (HSTS hanya di production build); e2e menangkap `console` dan gagal bila ada pelanggaran CSP.

### S-5 [ ] Validasi env lebih ketat
- **Lokasi:** `src/lib/env.ts`
- **Tindakan:**
  - `VPN_API_BASE_URL` dan `baseUrl` di `VPN_API_SERVERS` harus `https://`, kecuali host loopback (`127.0.0.1`, `localhost`, `[::1]`). Selain itu error konfigurasi (API key tidak boleh lewat HTTP polos).
  - `SUPPORT_URL` harus URL `http(s)` valid; bila tidak, abaikan dengan `console.warn` (jangan render `javascript:`/`data:`).
  - `IP_HASH_SALT` minimal 16 karakter.
  - Hapus `APP_TIMEZONE` (tidak dipakai; README sendiri menyebut selalu WIB) dari skema dan README.
  - Memoize `getEnv()` (saat ini di-parse ulang di setiap pemanggilan).
  - `serviceSchema.id` di `vpnApi.ts` dibatasi regex `^[a-z0-9][a-z0-9-]{0,40}$` karena dipakai sebagai bagian ID dokumen Firestore (id berisi `/` akan merusak path).
  - Env baru: `QUOTA_STORE`, `PER_IP_CREATE_LIMIT_PER_DAY`, `SITE_URL` (opsional, untuk `metadataBase`/canonical).
- **Selesai jika:** unit test env untuk semua aturan di atas.

### S-6 [ ] `/api/meta` dan render halaman memicu baca Firestore tanpa batas
- **Lokasi:** `src/app/api/meta/route.ts`, `src/lib/initialMeta.ts`, `src/lib/firestore.ts`
- **Masalah:** endpoint publik tanpa autentikasi; cache upstream 10 detik, tetapi `quotaSnapshot` melakukan satu pembacaan Firestore per layanan di **setiap** request (biaya dan amplifikasi DoS).
- **Tindakan:** cache in-process untuk snapshot kuota (TTL 5 detik) dengan dedupe in-flight, dipakai bersama oleh `/api/meta` dan `initialMeta`. Invalidate cache segera setelah `reserve`/`release` sukses di proses yang sama.
- **Selesai jika:** 50 request paralel ke `/api/meta` hanya memicu satu putaran baca store per jendela 5 detik (unit test dengan store palsu yang menghitung panggilan).

### S-7 [ ] Failover `POST` bisa membuat akun ganda
- **Lokasi:** `src/lib/vpnApi.ts` (`request`)
- **Masalah:** loop failover mencoba server berikutnya untuk timeout dan 5xx. Untuk `POST /v1/accounts`, timeout atau 5xx berarti akun mungkin sudah dibuat di server pertama. Mencoba server kedua bisa menghasilkan akun ganda dan memakai kapasitas dua kali (idempotency key tidak dibagi lintas server).
- **Tindakan:** untuk `POST`, failover hanya bila kegagalan terjadi **sebelum** upstream menerima permintaan (gagal koneksi/DNS/TLS, bukan abort timeout dan bukan respons 5xx). `GET` tetap boleh failover seperti sekarang. Tambah unit test di `tests/vpnApi.test.ts`.
- **Selesai jika:** test membuktikan POST yang timeout atau 5xx tidak menyentuh server kedua, sementara koneksi ditolak (`ECONNREFUSED`) boleh.

### S-8 [ ] Kredensial di `sessionStorage` harus dikelola dan dijelaskan jujur
- **Lokasi:** `src/components/AccountForm.tsx`, `README.md`
- **Masalah:** hasil akun lengkap (password, isi `.ovpn`) ditulis ke `sessionStorage` tanpa kedaluwarsa dan tanpa validasi bentuk saat dibaca, padahal README dan UI berkata data "tidak disimpan".
- **Tindakan:** simpan sebagai `{savedAt, data}`; abaikan dan hapus bila lebih dari 30 menit atau bila `expires_at` sudah lewat; validasi bentuk dengan skema ringan (username string, expires_at string, connection objek) sebelum dipakai; hapus saat pengguna menutup hasil (lewat konfirmasi di U-6). Ubah teks UI dan README menjadi: "tidak disimpan di server; salinan sementara tersimpan di tab ini selama 30 menit atau sampai Anda menutup hasil."
- **Selesai jika:** unit test untuk fungsi baca/tulis storage (data rusak, kedaluwarsa); teks UI dan README konsisten dengan perilaku.

### S-9 [ ] Sanitasi nama berkas unduhan dan tampilan data upstream
- **Lokasi:** `src/components/AccountForm.tsx` (`Connection`)
- **Tindakan:** `filename` dari upstream dibersihkan (ambil basename, buang karakter selain `[A-Za-z0-9._-]`, batasi panjang 80, wajib berekstensi `.ovpn`, fallback `config.ovpn`). Nilai objek tidak boleh ditampilkan sebagai `JSON.stringify` mentah tanpa batas panjang; potong dan beri tombol salin.
- **Selesai jika:** unit test untuk fungsi sanitasi (`../../etc/passwd`, nama kosong, karakter kontrol).

### S-10 [ ] Hygiene Firestore (data tidak pernah dibersihkan)
- **Lokasi:** `src/lib/store/firestoreStore.ts` (hasil F-1), `PRODUCTION_SETUP.md`
- **Masalah:** dokumen `vpn_web_ip_limits` dan `vpn_web_quota` tidak pernah dihapus (pertumbuhan tak terbatas, dan hash IP tersimpan selamanya).
- **Tindakan:** tulis field `expireAt` (Timestamp) pada setiap dokumen (limit IP: +2 jam; limit harian: +2 hari; kuota: +3 hari). Dokumentasikan perintah TTL di `PRODUCTION_SETUP.md`: `gcloud firestore fields ttls update expireAt --collection-group=vpn_web_ip_limits --enable-ttl` (dan untuk `vpn_web_quota`). `firestore.rules` sudah benar (tolak semua), jangan diubah.
- **Selesai jika:** dokumen baru berisi `expireAt`; panduan TTL ada di dokumen produksi.

### S-11 [ ] Dependensi dan otomatisasi
- **Tindakan:**
  1. Jangan jalankan `npm audit fix --force`. Coba `npm update firebase-admin` dalam rentang `^13`. Bila `uuid` transitif masih rentan, coba `overrides` hanya untuk `uuid` dan buktikan `npm test` serta `npm run build` tetap lolos. Bila tidak aman, biarkan dan catat di PR: kerentanan hanya terpicu saat argumen `buf` diberikan ke uuid v3/v5/v6, yang tidak dipakai kode ini.
  2. Tambah `.github/dependabot.yml` (npm + github-actions, mingguan).
  3. Tambah `.github/workflows/ci.yml`: Node 22, `npm ci`, lint, typecheck, test, `test:security` setelah build, build. Job e2e terpisah (install chromium, `npm run test:e2e`).
- **Selesai jika:** CI hijau pada PR; hasil `npm audit` terdokumentasi.

### S-12 [ ] Konfigurasi produksi aman
- **Lokasi:** `PRODUCTION_SETUP.md`, `README.md`
- **Masalah:**
  - `PRODUCTION_SETUP.md` memuat hostname API nyata (`api.vm1.brutalx.my.id`) di repo publik.
  - Server standalone Next mendengarkan semua interface secara default. Bila port 3000 terbuka, penyerang bisa memalsukan `X-Real-IP` dan melewati rate limit. Contoh systemd tidak mengatur `HOSTNAME`.
- **Tindakan:**
  - Ganti hostname nyata dengan `https://api.example.com` di seluruh dokumen.
  - Tambahkan `HOSTNAME=127.0.0.1` dan `PORT=3000` pada contoh env dan systemd.
  - Perkuat unit systemd: `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict`, `ProtectHome=true`, `ReadWritePaths=` seperlunya.
  - Tambahkan contoh blok Nginx lengkap: TLS, `proxy_set_header X-Real-IP $remote_addr;`, `proxy_set_header X-Forwarded-For $remote_addr;`, `client_max_body_size 4k;`, `limit_req` untuk `/api/accounts`, HSTS.
  - Tambah bagian "Checklist keamanan produksi" (Turnstile direkomendasikan, TTL Firestore, HOSTNAME loopback, env `0600`).
- **Selesai jika:** `grep -r brutalx .` kosong; dokumen berisi contoh Nginx dan systemd yang diperbarui.

---

## FASE 3: Ketahanan dan loading

### R-1 [ ] Dedupe request upstream dan cache kegagalan singkat
- **Lokasi:** `src/lib/vpnApi.ts` (`cached`, `request`)
- **Masalah:** pada kondisi dingin atau setelah cache kedaluwarsa total, `Navbar` dan halaman memanggil `getServices()` bersamaan tanpa dedupe. Saat upstream mati, tiap render menunggu timeout 8 dtk per server (bisa 16 dtk+) sebelum menampilkan error.
- **Tindakan:** dedupe in-flight untuk jalur dingin; cache negatif 5 detik (render berikutnya langsung gagal cepat); timeout GET khusus render halaman 3 detik (`VPN_API_GET_TIMEOUT_MS` tetap bisa diatur lewat env, tetapi turunkan default menjadi 4000). Pertahankan perilaku stale-while-revalidate yang ada.
- **Selesai jika:** unit test dedupe dan negative-cache; dengan upstream mati, halaman utama menampilkan state gangguan dalam kurang dari 5 detik.

### R-2 [ ] File route state Next yang hilang
- **Tindakan:** tambah `src/app/loading.tsx` (skeleton hero + kartu), `src/app/s/[service]/loading.tsx` (skeleton judul + panel), `src/app/error.tsx` (client component; ikon, judul "Terjadi kesalahan", penjelasan, tombol "Coba lagi" memanggil `reset`, tautan "Kembali ke beranda", tampilkan `error.digest` sebagai "Kode galat"), `src/app/global-error.tsx` (versi minimal mandiri dengan `<html>`), `src/app/not-found.tsx` (404 ramah dengan tombol ke beranda dan daftar layanan). Semua teks Indonesia.
- **Selesai jika:** `/halaman-tidak-ada` menampilkan not-found kustom; memaksa error render menampilkan `error.tsx`; skeleton tampil saat navigasi lambat.

### R-3 [ ] Refresh data berkala dan umpan balik setelah aksi
- **Lokasi:** `src/components/Portal.tsx`
- **Masalah:** data hanya diperbarui saat tab kembali terlihat. Setelah akun dibuat atau kuota habis (respons 409), angka kuota di layar tidak berubah.
- **Tindakan:** hook `useMeta()` yang (a) polling tiap 60 detik hanya saat tab terlihat, (b) refetch saat tab kembali terlihat, (c) menyediakan `refresh()` yang dipanggil setelah sukses/409/429. Simpan `fetchedAt` (dikirim server di `/api/meta` sebagai `generatedAt`) dan tampilkan "Diperbarui HH.mm WIB" kecil di panel status. Jangan menimpa data bagus dengan data `unavailable` (perilaku yang sudah ada, pertahankan) tetapi tampilkan badge "Data tertunda".
- **Selesai jika:** setelah membuat akun, angka kuota naik tanpa reload; tes e2e memverifikasinya.

---

## FASE 4: Design system dan komponen

Letakkan komponen baru di `src/components/ui/`. Semua harus aksesibel (fokus terlihat, label, role yang benar) dan menghormati `prefers-reduced-motion` (aturan global sudah ada).

### U-1 [ ] Token tambahan
- **Lokasi:** `src/styles/tokens.css`, `scripts/check-contrast.mjs`
- **Masalah:** tidak ada warna error/sukses. `.form-error` memakai garis kuning `--warm`, yang terbaca sebagai peringatan, bukan galat.
- **Tindakan:** tambah `--danger`, `--danger-tint`, `--success`, `--success-tint`, `--on-primary`, serta token `--radius-sm/md/lg` dan `--shadow-sm/md`. Tambahkan pasangan kontras baru ke `check-contrast.mjs` (teks `--danger` pada `--danger-tint` dan `--surface` ≥ 4.5:1, dst.). Ganti `color: white` hard-coded pada `.button-primary` dengan `var(--on-primary)`.
- **Selesai jika:** `npm run check:contrast` lolos dengan pasangan baru.

### U-2 [ ] `Alert`
- Varian `info | warning | danger | success`, ikon lucide per varian, prop `title` opsional, `role="alert"` untuk danger/warning yang muncul dinamis dan `role="status"` untuk info/success. Ganti semua pemakaian `.notice`, `.form-error`, dan kotak `unavailable` dengan `Alert`.
- **Selesai jika:** tidak ada lagi `.form-error`/`.notice` di JSX; teks error tidak hanya bergantung pada warna (ada ikon dan judul).

### U-3 [ ] `Button` dan `Spinner`
- Varian `primary | secondary | ghost | danger`, ukuran `md | sm`, prop `loading` (menampilkan `Spinner`, `aria-busy`, tombol non-aktif, lebar tidak berubah), prop `icon`. Selalu `type` eksplisit (`"button"` default, `"submit"` bila diminta). Ganti seluruh `.button-primary`, `.button-secondary`, `.copy-button` di JSX (tombol "Buat lagi" dan "Unduh" saat ini tanpa `type`).
- Keadaan hover, active, disabled, dan fokus konsisten; transisi 150 ms.
- **Selesai jika:** semua tombol memakai komponen ini; tidak ada `<button>` tanpa `type`.

### U-4 [ ] `Skeleton`
- Blok placeholder dengan animasi shimmer halus (nonaktif saat reduced-motion), dipakai di `loading.tsx` dan saat panel menunggu data.

### U-5 [ ] `Toast` (umpan balik non-blokir)
- Provider + `useToast()`. Region `aria-live="polite"` di luar tombol. Varian success/danger/info, tutup otomatis 4 detik (jeda saat hover/fokus), maksimal 3 sekaligus, dapat ditutup manual.
- Dipakai untuk: "Tersalin", "Berkas diunduh", "Gagal menyalin, salin manual", "Data diperbarui".

### U-6 [ ] `ConfirmDialog` (pop up)
- Bangun di atas elemen native `<dialog>` + `showModal()`. Fokus pindah ke dialog saat dibuka dan kembali ke pemicu saat ditutup; `Escape` menutup; klik di luar menutup bila aksi tidak destruktif; `aria-labelledby` dan `aria-describedby`; `body` tidak bisa di-scroll saat terbuka; backdrop dengan blur ringan.
- **Pemakaian wajib:**
  1. Tombol "Buat akun baru" di kartu hasil → dialog: judul "Tutup detail akun ini?", isi "Detail akun hanya ditampilkan di perangkat ini dan tidak dapat dipulihkan setelah ditutup. Pastikan Anda sudah menyalin atau mengunduhnya.", tombol "Batal" dan "Ya, tutup dan buat baru" (varian danger). Menutup hasil juga menghapus `sessionStorage` (S-8).
  2. Dialog informasi saat error `creation_unknown`: jelaskan apa yang harus dilakukan (jangan klik berulang, tunggu beberapa menit).
- **Selesai jika:** test e2e: dialog terbuka, fokus terperangkap, `Escape` menutup, konfirmasi menghapus hasil.

### U-7 [ ] `QuotaMeter`, `Countdown`, `StatusBadge`
- `QuotaMeter`: pengganti `<progress>` bergaya konsisten antar-browser; `role="progressbar"` + `aria-valuenow/min/max` + `aria-label`; warna aman (<70%), waspada (70–99%), habis (100%), tidak hanya mengandalkan warna (teks "Sisa N akun").
- `Countdown`: komponen terisolasi yang memegang timer 1 detik sendiri (saat ini `setTick` di `Portal` me-render ulang **seluruh** halaman tiap detik). Memakai `<time dateTime>` dan `aria-hidden` pada angka berdetik, dengan teks statis untuk pembaca layar (mis. "Reset dalam sekitar 3 jam").
- `StatusBadge`: Online / Data tertunda / Tidak dapat dihubungi, dengan ikon dan teks.
- Hapus `<span className="sr-only" aria-live="polite">Status waktu diperbarui</span>` di `Portal.tsx` (hanya berubah sekali, tidak berguna).

### U-8 [ ] Perbaikan CSS dasar
- **Lokasi:** `src/app/globals.css`
- **Tindakan:**
  - `.duration-option input` memakai `position:absolute` tetapi labelnya tidak `position:relative` → beri `position:relative` pada label dan `inset:0` pada input.
  - Hapus CSS mati `.page-note`.
  - Pecah `globals.css` yang padat menjadi bagian terstruktur (atau file per area di `src/styles/`), satu deklarasi per baris.
  - Hapus aset template Next yang tidak dipakai di `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`); verifikasi dengan grep bahwa tidak ada referensi.
  - Hapus `tailwind.config.ts` hanya bila build dan style tetap identik (Tailwind v4 sudah membaca token lewat `@theme`); jika ragu, biarkan.
- **Selesai jika:** build lolos dan tampilan tidak berubah di luar item ini (bandingkan screenshot sebelum/sesudah).

---

## FASE 5: Layout dan halaman

### L-1 [ ] Pecah komponen besar dan rapikan kode
- Pecah `Portal.tsx` menjadi: `Hero`, `ServiceGrid` (L-2), `StatusPanel`, `AccountCountPanel`, `QuotaOverview`, `SupportCard`, `ServiceHeader`. Pecah `AccountForm.tsx` menjadi: `AccountForm`, `DurationPicker`, `ResultCard`, `ConnectionDetails`, `TurnstileWidget`, plus hook `useAccountSubmit`.
- Tambah Prettier: devDependency `prettier`, `.prettierrc` (lebar 100, tanda kutip ganda, titik koma), skrip `format` dan `format:check`, serta skrip `typecheck` (`tsc --noEmit`). Format **seluruh** `src`, `tests`, `scripts`, `mock-api` dalam satu commit terpisah bernama "style: format with prettier" agar diff fungsional tetap mudah ditinjau.
- **Selesai jika:** tidak ada baris lebih dari 120 karakter di `src/`; `npm run format:check` lolos; perilaku tidak berubah (test lama tetap hijau).

### L-2 [ ] Beranda: pemilih layanan dan alur yang jelas
- **Masalah:** beranda tidak punya cara memilih layanan selain menu navigasi. Tidak ada CTA.
- **Tindakan:**
  - Tambah tombol CTA di hero: "Pilih layanan" (scroll ke `#layanan`).
  - Bagian `#layanan`: grid kartu per layanan (ikon, nama, badge Tersedia/Tidak tersedia + alasan terlihat sebagai teks, sisa kuota dengan `QuotaMeter`, seluruh kartu adalah tautan ke `/s/<id>`; kartu tidak tersedia berupa elemen non-tautan dengan alasan).
  - Bagian "Cara kerja" tiga langkah: 1) Pilih layanan, 2) Tentukan masa aktif, 3) Simpan detail koneksi.
  - Gabungkan panel "Kuota hari ini" ke dalam kartu layanan (hapus duplikasi dengan grid kuota terpisah) dan buang fallback palsu `?? 10`.
- **Selesai jika:** pengguna baru bisa sampai ke halaman pembuatan akun dari beranda tanpa memakai navbar.

### L-3 [ ] Panel status server yang akurat
- **Masalah:** label "Offline" muncul saat `unavailable`, padahal `unavailable` juga true untuk data basi yang masih valid; "Uptime: 0 jam" dan "RAM: 0 / 0 MB" tampil saat data tidak ada; `Running/Stopped` berbahasa Inggris.
- **Tindakan:** pakai `StatusBadge` tiga keadaan; uptime diformat ("2 hari 3 jam", "5 jam 12 menit", "kurang dari 1 menit"); RAM sebagai `QuotaMeter` dengan persen dan "420 / 2.048 MB" (format angka `id-ID`); data hilang ditampilkan "—", bukan 0; status layanan "Aktif / Berhenti / Tidak diketahui"; tampilkan "Diperbarui HH.mm WIB".
- **Selesai jika:** unit test untuk `formatUptime` dan pemetaan status; tidak ada teks Inggris tersisa di panel.

### L-4 [ ] Halaman layanan
- **Tindakan:**
  - Breadcrumb "Beranda / {Layanan}".
  - **Filter durasi menurut `service.max_days`.** Saat ini UI menampilkan semua `allowed_days` walau layanan membatasi lebih kecil, sehingga pengguna memilih 7 hari lalu ditolak server dengan pesan umum. Durasi yang melebihi batas tidak ditampilkan (atau ditampilkan nonaktif dengan keterangan "maks. N hari"). Reset pilihan bila daftar berubah.
  - Saat mengirim: tombol dalam state `loading` ("Membuat akun…"), form `aria-busy`, dan setelah 6 detik tampil teks bantu "Masih diproses. Jangan tutup atau muat ulang halaman ini." (pembuatan bisa memakan puluhan detik).
  - Saat kuota 0: tampilkan Alert warning di atas tombol dengan hitung mundur reset, tombol non-aktif.
  - Cooldown 30 detik setelah `creation_unknown` (lihat F-6.1) dengan hitung mundur di tombol.
  - Layanan tidak tersedia: tampilkan alasan sebagai teks (bukan hanya `title`), dan tombol "Kembali ke beranda".
- **Selesai jika:** e2e untuk filter durasi, state loading, dan state kuota habis.

### L-5 [ ] Kartu hasil akun
- **Tindakan:**
  - Header sukses (ikon, "Akun berhasil dibuat", nama layanan) dan Alert warning bertajuk "Simpan detail akun sekarang" (teks di §C).
  - Daftar detail sebagai `<dl>`: label Indonesia berbasis pemetaan (`host`→"Host", `port`→"Port", `password`→"Kata sandi", `proto`→"Protokol", `links`→"Tautan koneksi", `uuid`→"UUID", `path`→"Path", dst.; kunci tak dikenal → huruf kapital awal kata dari kunci). Lihat bentuk data di `mock-api/server.mjs`: ssh `{host,port,password}`, ovpn `{host,port,proto,filename,content}`, lainnya `{host,port,links:{...}}`. Upstream asli bisa punya kunci lain, jadi fallback wajib.
  - **Kata sandi disamarkan** dengan tombol "Tampilkan/Sembunyikan" (`aria-pressed`), dan salinan tetap menyalin nilai asli.
  - Setiap tombol salin punya `aria-label` spesifik ("Salin kata sandi", "Salin host"), bukan "Salin" berulang.
  - Tombol "Salin semua" (format `Label: nilai` per baris, tanpa isi `.ovpn`) dan tombol "Unduh {nama berkas}" dengan ikon.
  - "Berlaku sampai" menampilkan tanggal WIB **dan** sisa waktu ("3 hari lagi").
  - Tombol "Buat akun baru" memakai `ConfirmDialog` (U-6).
- **Selesai jika:** e2e: kata sandi tersamar secara default, tombol tampilkan bekerja, salin semua menghasilkan teks yang diharapkan; axe tanpa pelanggaran pada state hasil.

### L-6 [ ] Navigasi header
- **Tindakan:**
  - Naikkan breakpoint menu mobile ke 1024px (dua media query di `globals.css` dan test e2e yang menyetel lebar).
  - Ganti pola `role="menu"/"menuitem"` pada `ServiceMenu` (salah untuk navigasi situs) dengan pola disclosure: tombol `aria-expanded` + daftar tautan biasa. Fokus ke tautan pertama saat dibuka, `Escape` menutup dan mengembalikan fokus, tutup otomatis saat rute berubah. Hapus listener `ArrowUp/Down` global yang sekarang menempel di `document`.
  - Layanan tidak tersedia: render `<span aria-disabled="true">` (bukan `<a>` yang tetap bisa difokus) dengan alasan terlihat sebagai teks kecil.
  - Perbarui test e2e (`getByRole("menuitem")` menjadi `getByRole("link")`).
- **Selesai jika:** tanpa scroll horizontal pada 360/768/1024/1280 dan header tidak membungkus jadi dua baris pada 1024.

### L-7 [ ] Footer dan halaman legal
- **Tindakan:**
  - Footer: "© {tahun} VPN Gratis", tautan Ketentuan, Privasi, (Dukungan bila `SUPPORT_URL` valid), dan kalimat "Gunakan layanan dengan bertanggung jawab."
  - Buat `src/app/ketentuan/page.tsx` dan `src/app/privasi/page.tsx` (konten statis, Indonesia, dengan "Terakhir diperbarui" bertanggal).
  - **Privasi harus akurat terhadap kode:** tidak menyimpan kredensial di server; log server berisi stempel waktu, layanan, durasi, hash IP bersalt (SHA-256), dan hasil; counter kuota/limit IP di Firestore memakai hash IP dan dihapus otomatis (TTL, S-10); Cloudflare Turnstile bila aktif; salinan sementara hasil di `sessionStorage` tab pengguna (S-8). Jangan menjanjikan hal yang tidak dilakukan kode.
  - **Ketentuan:** layanan gratis apa adanya tanpa jaminan; dilarang penyalahgunaan (spam, serangan, aktivitas ilegal); akun dapat dicabut; batas kuota harian; pengguna bertanggung jawab atas pemakaiannya.
  - Tandai di PR: "Draf konten legal, perlu ditinjau pemilik proyek".
- **Selesai jika:** kedua halaman dapat diakses dari footer, lolos axe, dan isinya sesuai perilaku kode.

### L-8 [ ] Metadata, ikon, dan SEO dasar
- **Tindakan:**
  - `layout.tsx`: `title: { default: "VPN Gratis | Portal Akun VPN", template: "%s | VPN Gratis" }`, deskripsi pada §C, `metadataBase` bila `SITE_URL` ada, `openGraph` dasar (tanpa gambar), `export const viewport` dengan `themeColor` (`#035AA6`).
  - `generateMetadata` di `/s/[service]` (judul memakai nama layanan; jangan memanggil ulang upstream berlebihan, pakai cache yang ada).
  - `src/app/robots.ts` (izinkan `/`, larang `/api/`), `src/app/icon.svg` (ikon perisai sederhana buatan sendiri, mengikuti warna primary).
  - Layout tidak perlu `async` (saat ini `async` tanpa `await`); ubah bila tidak berdampak.
- **Selesai jika:** judul tab berubah per halaman; `/robots.txt` benar.

---

## FASE 6: Detail kecil

### D-1 [ ] `CopyButton`
- **Masalah:** fallback `execCommand("copy")` tidak memeriksa hasil, sehingga selalu menampilkan "Tersalin" walau gagal. `aria-live` berada di dalam `<button>`.
- **Tindakan:** periksa hasil kedua jalur; bila gagal tampilkan toast danger "Tidak dapat menyalin. Pilih dan salin secara manual." dan jangan ubah label. Status "Tersalin" diumumkan lewat region toast/live di luar tombol. Terima prop `ariaLabel`. Hapus textarea sementara walau terjadi error (`finally`).
- **Selesai jika:** unit/e2e untuk jalur gagal.

### D-2 [ ] `DurationPicker`
- Pertahankan radio native (aksesibilitas), tampilkan sebagai segmented control: teks "1 hari / 3 hari / 7 hari", keterangan kecil "maks. N hari" bila relevan, keadaan terpilih jelas tanpa hanya mengandalkan warna (ikon centang kecil), fokus terlihat.

### D-3 [ ] Detail teks dan format
- Format angka dan tanggal konsisten `id-ID`; waktu selalu berlabel "WIB".
- Gunakan "—" (bukan 0 atau 10) untuk data tidak tersedia.
- Ikon dekoratif selalu `aria-hidden`; ikon bermakna punya teks pendamping.
- Tautan eksternal (dukungan): `target="_blank"` dengan `rel="noopener noreferrer"`, ikon "external link", dan teks "(membuka tab baru)" untuk pembaca layar.
- Hero: hilangkan klaim "Privat sejak langkah pertama." (lihat §C), karena situs menyimpan hash IP untuk rate limit.

---

## FASE 7: Pengujian

### T-1 [ ] Unit test (vitest) yang wajib ada
`clientIpHash` + normalisasi IPv4/IPv6/IP hilang; `requestGuard` (415/403/413); validasi env (https, `SUPPORT_URL`, salt, `QUOTA_STORE`); memory store (reserve/release/snapshot/limit jam & hari); `vpnApi` (dedupe, negative cache, kebijakan failover POST); `clientErrors` (semua baris F-6.1); `formatUptime`, `formatRemaining`, pemetaan label koneksi, sanitasi nama berkas; baca/tulis `sessionStorage` dengan data rusak/kedaluwarsa.

### T-2 [ ] E2E (Playwright) yang wajib ada atau diperbarui
- Tanpa pelanggaran CSP di console pada semua halaman.
- axe `wcag2a/aa/21a/21aa` **nol pelanggaran** (bukan hanya critical/serious) pada: beranda, halaman layanan, state loading, state error, state hasil, dialog konfirmasi, halaman Ketentuan, Privasi, dan 404.
- `aria-current` hanya pada halaman aktif (F-3); upstream mati → state gangguan bukan 404 (F-2); filter durasi (L-4); kata sandi tersamar (L-5); dialog konfirmasi: fokus, Escape, hapus hasil (U-6); skrip Turnstile diblokir (S-3); tidak ada scroll horizontal pada 360/768/1024/1280.
- Mock `MOCK_FAIL=500|409|timeout` dipetakan ke pesan yang benar (F-6.1).
- Perbarui `playwright.config.ts` (F-1) dan selector lama yang berubah.

### T-3 [ ] Verifikasi visual
Ambil screenshot dengan Playwright pada 360, 768, 1024, 1280 untuk: beranda, layanan (idle, submitting, error, hasil, dialog), 404, Ketentuan, Privasi. Simpan di `test-results/screens/` (sudah di-ignore git). **Buka dan lihat screenshot-nya**, lalu perbaiki yang terlihat rusak (teks terpotong, tumpang tindih, kontras buruk, jarak tidak rata).

---

## FASE 8: Dokumentasi

### X-1 [ ] README dan dokumen produksi
- README: perbarui tabel variabel (hapus `APP_TIMEZONE`; tambah `QUOTA_STORE`, `PER_IP_CREATE_LIMIT_PER_DAY`, `SITE_URL`, serta `VPN_API_GET_TIMEOUT_MS` dan `VPN_API_POST_TIMEOUT_MS` yang ada di kode tetapi belum tercantum); perbaiki klaim privasi (S-8); jelaskan perilaku tanpa Firebase (F-1); tambah skrip `format`, `typecheck`; daftar fitur singkat dan tangkapan layar bila ada.
- `PRODUCTION_SETUP.md`: sesuai S-10 dan S-12.

---

## §C Bahan teks (copywriting) yang harus dipakai

| Lokasi | Sekarang | Ganti menjadi |
|---|---|---|
| Deskripsi meta | "Portal sederhana untuk membuat akun VPN gratis." | "Buat akun VPN gratis dengan kuota harian. Detail koneksi ditampilkan sekali dan tidak disimpan di server." |
| Hero, judul aside | "Privat sejak langkah pertama." | "Detail akun hanya tampil sekali." |
| Hero, isi aside | "Detail akun hanya ditampilkan saat dibuat. Simpan hasilnya di tempat yang aman." | "Kredensial tidak disimpan di server kami. Salin atau unduh sebelum meninggalkan halaman." |
| Hero, label aside | "Akses akun" | "Penting" |
| Peringatan hasil | "Simpan sekarang — data ini tidak disimpan di situs ini." | Judul: "Simpan detail akun sekarang". Isi: "Detail ini tidak disimpan di server dan tidak dapat dipulihkan setelah Anda menutupnya." |
| Tombol hasil | "Buat lagi" | "Buat akun baru" |
| Bantuan form | "Username dibuat otomatis. Kata sandi tidak diperlukan." | "Anda tidak perlu mengisi username atau kata sandi. Keduanya dibuat otomatis." |
| Kuota habis | "Kuota hari ini habis. Reset 00.00 WIB." | "Kuota hari ini habis. Kuota direset pukul 00.00 WIB (dalam {hh:mm:ss})." |
| Gangguan umum | "Server sedang tidak dapat dihubungi." | "Layanan sementara tidak dapat dihubungi. Coba lagi beberapa saat lagi." |
| Status kosong | "Data status belum tersedia." | "Status server belum tersedia." |
| Panel user | "Jumlah User" | "Jumlah Akun" |
| Uptime | "Uptime: 3 jam" | "Aktif selama 3 jam" (lihat format L-3) |
| Status layanan | "Running / Stopped" | "Aktif / Berhenti" |
| Dukungan | "Dukungan & catatan / Dukungan bersifat opsional. / Informasi dukungan" | "Dukungan (opsional)" / "Dukungan bersifat sukarela dan tidak memengaruhi akses Anda." / "Buka halaman dukungan" |
| Footer | "VPN Gratis \| Gunakan layanan dengan bertanggung jawab." | "© {tahun} VPN Gratis. Gunakan layanan dengan bertanggung jawab." + tautan |

Catatan: jika `SUPPORT_URL` ternyata bukan halaman donasi, sesuaikan kalimat dukungan agar tidak menyesatkan, dan catat di PR.

---

## §G Gate akhir (semua wajib hijau sebelum PR dianggap selesai)

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:security
npm run check:contrast
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev      # hasil dicatat; bukan keharusan nol, lihat S-11
```

Lalu verifikasi manual terhadap build produksi:

```sh
node mock-api/server.mjs &     # terminal 1
npm run build && npm start      # terminal 2 (butuh VPN_API_BASE_URL, VPN_API_KEY, IP_HASH_SALT di .env.local)
curl -sI http://127.0.0.1:3000/ | grep -iE "strict-transport|cross-origin|content-security|x-frame"
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: text/plain" -d '{"service":"ssh","days":1}' http://127.0.0.1:3000/api/accounts   # harus 415
```

## Definition of Done

- [ ] Semua item bertanda `[x]` atau punya alasan tertulis di PR mengapa dilewati.
- [ ] Gate §G hijau, dan baseline e2e sebelum/sesudah dicatat.
- [ ] App berjalan penuh tanpa `FIREBASE_*` (mode memory) dan dengan Firestore.
- [ ] Tidak ada teks Inggris atau pesan mentah (`Failed to fetch`, `Unexpected token`) yang sampai ke pengguna.
- [ ] Tidak ada rahasia, hostname API nyata, atau data akun di repo, log, maupun screenshot.
- [ ] Deskripsi PR memuat: tabel `ID | status | catatan`, daftar keputusan default yang diikuti (§2), butir yang butuh tinjauan pemilik (draf legal, makna `SUPPORT_URL`, hasil `npm audit`), dan screenshot sebelum/sesudah.
