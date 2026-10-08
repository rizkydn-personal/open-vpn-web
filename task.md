# task.md: Open VPN Web, UI dan konten, stabilitas, loading, 404, portal admin

Dokumen kerja untuk Codex. Baca seluruhnya sebelum mengubah apa pun. Kerjakan berurutan per fase. Ubah `[ ]` menjadi `[x]` hanya setelah hasilnya terverifikasi dengan menjalankan kodenya, bukan dari membaca saja.

---

## 1. Konteks

- Repo: https://github.com/rizkydn-personal/open-vpn-web
- Produksi: https://openvpn.brutalx.my.id/
- Fungsi: portal publik untuk membuat akun VPN gratis. Web hanya memanggil `GET /v1/services`, `GET /v1/status`, dan `POST /v1/accounts` pada API VPN. API key hanya dipakai di server. Detail akun tampil sekali di browser dan tidak disimpan di database, local storage, maupun log.
- Stack (dari README repo): Next.js + TypeScript, Tailwind, Firebase Admin SDK + Firestore (kuota global per layanan), Vitest, Playwright, ESLint, `mock-api/`, `scripts/`. Produksi dijalankan sebagai proses Node.js (systemd atau PM2) di belakang reverse proxy TLS.
- Perintah pemeriksaan yang sudah ada dan wajib hijau di akhir tiap fase:

```
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run test:security
npm run check:contrast
npm run build
```

### Keputusan yang sudah final (jangan diubah)

- Kuota 10 akun per hari per layanan, global untuk semua pengunjung, reset 00.00 WIB.
- Pilihan durasi 1, 3, dan 7 hari.
- Semua layanan tampil di navbar (dropdown di mobile). Daftar layanan mengikuti `GET /v1/services`, tidak ditulis keras di kode.
- Ikon memakai Lucide.
- Kontrak API tidak berubah. Jangan menambah endpoint upstream.
- Kredensial akun tidak pernah disimpan atau dicatat di log.

### Temuan awal dari produksi (dicek 2026-10-08)

Gunakan sebagai titik awal, verifikasi ulang sendiri di kode dan di browser.

1. Panel status menampilkan "Offline" dan pesan "Server sedang tidak dapat dihubungi", tetapi baris layanan di bawahnya tetap menulis "Running" dan "Tersedia". Pesannya saling bertentangan. Data lama harus diberi label umur datanya.
2. Hitung mundur reset kuota tampil sebagai `--:--:--` di HTML awal. Hitung dari waktu server agar tidak ada kedipan.
3. Halaman beranda menumpuk tiga blok dengan komposisi serupa (status, jumlah user, kuota). Ritme halaman datar.
4. Kalimat hero ("Koneksi yang lebih sederhana dimulai di sini", "Privat sejak langkah pertama") umum dan belum spesifik. Klaim privasi harus cocok dengan perilaku kode yang sebenarnya (lihat R-36).
5. Belum ada pengelolaan penutupan atau maintenance. Saat API mati, pengunjung hanya melihat panel error kecil.

---

## 2. Aturan kerja

### 2.1 Anti Slop (acuan: https://github.com/miqdadbadjuber/anti-slop)

Semua pekerjaan UI, teks, dan komentar kode mengikuti `antislop.md` (38 aturan R-01 sampai R-38, tiga tingkat: Hard Gate, Purpose-Gate, Quality Locks) dan skill-nya: `antislop-ui`, `antislop-copywriting`, `antislop-human`, `antislop-layoutmobile`, `antislop-code`.

Jawaban untuk pertanyaan yang biasanya diajukan skill (jangan bertanya ulang):

- Mode penggunaan: **DURING** untuk komponen dan halaman baru. Untuk halaman yang sudah ada, jalankan **AFTER** satu kali di Fase 1. Pemilik proyek sudah menyetujui perbaikan semua temuan prioritas HIGH dan MEDIUM. Temuan LOW dikerjakan bila murah, sisanya dicatat.
- Arah desain: ada, lihat bagian 4. Tulis ke `DESIGN.md` apa adanya. Jangan menambahkan identitas, logo, foto orang, atau konten yang tidak tertulis di sini (R-23, R-37).
- Pemasangan skill dilakukan manusia sebelum sesi (lihat bagian 3). Agen tidak mengunduh skill sendiri.

Aturan yang paling sering dilanggar proyek seperti ini, tegaskan sejak awal:

- Tanpa em dash (`—`) di teks UI maupun dokumen (R-02).
- Tanpa angka, statistik, atau klaim tanpa sumber nyata (R-17, R-36). Semua angka di UI berasal dari API atau Firestore. Bila data tidak ada, tampilkan keadaan kosong yang jujur, bukan angka karangan.
- Tanpa testimoni, logo "dipercaya oleh", atau FAQ template (R-18, R-28).
- Setiap tombol dan link punya perilaku nyata, setiap item navbar punya tujuan nyata (R-24, R-26).
- Setiap tampilan data punya state kosong, memuat, dan galat (R-27).
- Semua bisa dipakai dengan keyboard, fokus terlihat (R-32). Kontras minimal WCAG AA (R-25).
- Mobile sempurna, target sentuh minimal 44px, tanpa overflow horizontal (R-03).
- Tidak ada fitur yang ditambahkan lewat skrip yang menimpa file atau CSS dengan string replace (R-33).
- Aplikasi dijalankan dan dibangun sebelum dinyatakan selesai (R-35).
- Alasan tiap keputusan desain utama ditulis satu baris (R-31) di `DESIGN.md`.

### 2.2 Aturan teknis

- Baca lebih dulu: `AGENTS.md`, `CLAUDE.md`, `README.md`, `PRODUCTION_SETUP.md`, `.env.example`, `firestore.rules`, serta isi `src/`, `tests/`, `mock-api/`, `scripts/`.
- Repo mungkin sudah memiliki `task.md` lama. Jangan hapus diam-diam. Bila ada, rangkum isinya ke bagian "Riwayat" di bagian akhir berkas ini lalu gantikan dengan dokumen ini.
- Tidak ada rahasia dengan prefiks `NEXT_PUBLIC_`. Tidak ada kredensial atau service-account JSON di commit.
- Tambah dependensi hanya bila perlu dan sebutkan alasannya di pesan commit. Utamakan `node:crypto` dan API bawaan Next.js.
- Satu fase, satu commit atau PR kecil dengan pesan yang jelas. Jalankan seluruh perintah pemeriksaan sebelum pindah fase.
- Bahasa antarmuka: Indonesia. Kode, nama variabel, dan komentar: Inggris, dan komentar hanya untuk hal yang tidak jelas dari kodenya (skill `antislop-code`).
- Semua waktu yang tampil ke pengguna memakai WIB (`Asia/Jakarta`).

---

## 3. Prasyarat yang dikerjakan manusia (sebelum menjalankan Codex)

Agen tidak boleh mengunduh skill sendiri, jadi pasang dulu:

```
npx antislop-ai --mode during
npx antislop-ai
```

Pilih semua skill, pasang untuk project ini, dan pilih Codex. Alternatif lewat plugin:

```
codex plugin marketplace add miqdadbadjuber/anti-slop
codex plugin add antislop@anti-slop
```

Mulai sesi Codex baru setelah pemasangan agar skill termuat. Pastikan blok pointer antislop ada di `AGENTS.md`.

Siapkan juga (di server atau `.env.local`, jangan di repo):

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH` (dibuat dengan skrip dari Fase 4)
- `ADMIN_SESSION_SECRET` (acak, minimal 32 byte)

---

## 4. Arah desain (isi `DESIGN.md` dari bagian ini)

Bagian ini adalah arah dari pemilik proyek. Sebagian besar palet sudah ditetapkan sebelumnya. Bagian yang bertanda **usulan** boleh diubah pemilik, jangan dianggap final tanpa konfirmasi.

**Produk dan audiens.** Portal pembuatan akun VPN gratis untuk pengguna umum di Indonesia, sering dibuka dari ponsel dan koneksi yang tidak selalu bagus. Tugas utamanya: pilih layanan, pilih durasi, dapatkan detail koneksi, salin. Semua hal lain mendukung tugas itu.

**Palet (tetap).**

| Peran | Warna | Aturan pakai |
| --- | --- | --- |
| Latar netral | `#F2F2F2` | Latar halaman |
| Permukaan | `#FFFFFF` | Kartu, panel, input |
| Tinta | `#183345` | Teks utama |
| Muted | `#526573` | Teks sekunder, harus lolos 4.5:1 di atas latar |
| Deep blue | `#035AA6` | Aksi utama, data aktif, fokus |
| Sky | `#049DD9` | Aksen grafis dan elemen besar saja |
| Cyan | `#04B2D9` | Token dan tint terbatas |
| Warm yellow | `#F2C438` | Ruang dukungan opsional dan peringatan ringan. Bukan latar untuk teks putih kecil |

Catatan kontras: sky dan cyan di atas putih sekitar 3:1, jadi hanya untuk grafik, garis, dan teks besar. Verifikasi semua pasangan dengan `npm run check:contrast` dan tambahkan pasangan baru ke skripnya.

Tema: terang saja. Alasan (tulis di `DESIGN.md`): palet ditetapkan untuk latar terang dan portal dipakai siang hari di ponsel. Tidak perlu toggle tema. Bila toggle kelak ditambahkan, kedua mode wajib berfungsi penuh (R-34).

**Dial antislop (usulan):** ENERGY 2, RHYTHM 3, MOTION 2. Deklarasikan juga satu baris Design Read sebelum membangun, mengikuti format di `antislop.md`.

**Motif identitas (usulan):** satu garis jalur (SVG, satu warna deep blue) yang menghubungkan "perangkat Anda" ke "server" dan bersinggungan dengan titik-titik layanan. Motif ini dipakai berulang di tiga tempat saja: animasi memuat, ilustrasi halaman 404, dan halaman maintenance. Jangan dipakai sebagai dekorasi latar. Alasan: ini adalah cerita produknya (koneksi lewat terowongan), bukan hiasan.

**Tipografi.** Pilih satu keluarga huruf dengan alasan tertulis di `DESIGN.md` (keterbacaan di layar kecil, dukungan karakter Indonesia, ukuran berkas). Hindari monospace besar untuk estetika terminal. Monospace hanya untuk nilai teknis yang memang harus disalin (host, port, UUID, kata sandi).

**Ritme halaman.** Beranda tidak boleh berupa tumpukan kartu seragam. Ubah komposisi antarbagian: satu fokus utama per layar, tabel padat untuk data status, daftar layanan sebagai baris dengan hierarki (bukan grid kartu identik), dan kuota sebagai satu pita ringkas.

---

## 5. Fase kerja

### Fase 0. Baseline dan orientasi

- [ ] Buat cabang kerja, mis. `feat/portal-revamp`.
- [ ] Baca semua berkas di bagian 2.2. Catat struktur `src/` dan cara kuota di Firestore dihitung (apakah memakai transaksi, bagaimana rollback bila `POST /v1/accounts` gagal).
- [ ] Jalankan seluruh perintah pemeriksaan pada kondisi awal. Simpan hasilnya di `docs/baseline.md` (lulus atau gagal, dan penyebab bila gagal).
- [ ] Tulis `DESIGN.md` dari bagian 4, lengkap dengan Design Read dan dial.
- [ ] Jalankan `npm run mock` dan `npm run dev`, buka semua halaman di lebar 360px, 768px, dan 1280px. Catat masalah yang terlihat.

**Selesai bila:** baseline tercatat, `DESIGN.md` ada, tidak ada perubahan perilaku produk.

### Fase 1. Audit antislop pada halaman yang ada (mode AFTER)

- [ ] Audit beranda, halaman layanan `/s/[slug]`, kartu hasil akun, navbar, footer, dan semua state galat.
- [ ] Tulis temuan bernomor di `anti-slop/audit-001-YYYY-MM-DD.md`. Tiap temuan menyebut aturan (R-XX), alasan satu baris, dan prioritas (Hard Gate HIGH, Purpose-Gate MEDIUM, Quality Locks LOW).
- [ ] Perbaiki semua temuan HIGH dan MEDIUM (sudah disetujui pemilik). Buat laporan tindak lanjut.

**Selesai bila:** tidak ada temuan HIGH atau MEDIUM yang terbuka, kecuali yang digantikan oleh fase berikut (catat rujukannya).

### Fase 2. Stabilitas sistem

Tujuan: portal tetap berguna dan jujur saat API, Firestore, atau proses Node bermasalah, dan tidak pernah membuat akun ganda atau menghabiskan kuota secara keliru.

Panggilan ke API VPN:

- [ ] Semua panggilan upstream punya timeout eksplisit (status dan layanan: pendek, pembuatan akun: lebih panjang) dan membatalkan permintaan dengan `AbortController`.
- [ ] `GET /v1/services` dan `GET /v1/status`: retry terbatas dengan jitter, lalu failover ke server berikutnya di `VPN_API_SERVERS`. Tambahkan circuit breaker sederhana per server agar server mati tidak diuji pada setiap permintaan.
- [ ] `POST /v1/accounts`: **jangan di-retry otomatis** karena tidak idempoten. Failover untuk POST hanya bila kegagalan terjadi sebelum permintaan terkirim (koneksi ditolak). Pelajari perilaku API untuk header idempotensi, dan bila tersedia gunakan.
- [ ] Cache status terakhir yang berhasil di memori proses dengan stempel waktu. Saat semua server gagal, tampilkan data terakhir dengan label umur ("diperbarui 4 menit lalu") dan hapus label "Running/Tersedia" yang menyesatkan. Temuan awal nomor 1 harus hilang.
- [ ] Normalisasi galat upstream ke kode galat internal yang kecil dan terdokumentasi (mis. `UPSTREAM_TIMEOUT`, `UPSTREAM_DOWN`, `QUOTA_EXHAUSTED`, `RATE_LIMITED`, `MAINTENANCE`). UI memetakan kode ke pesan bahasa Indonesia yang spesifik. Tidak ada galat mentah, stack trace, atau URL upstream yang sampai ke browser.

Kuota dan pembuatan akun:

- [ ] Pemesanan kuota bersifat atomik (transaksi Firestore). Urutan: reservasi kuota, panggil API, bila gagal lepaskan reservasi. Pastikan tidak ada kebocoran kuota saat proses mati di tengah jalan (reservasi kedaluwarsa otomatis atau direkonsiliasi).
- [ ] Hitungan kuota dan hitung mundur reset berbasis WIB dihitung dari satu fungsi waktu yang diuji, termasuk batas 23.59 ke 00.00 WIB.
- [ ] Rate limit per IP ter-hash tetap, dengan penanganan benar saat Firestore tidak dapat dijangkau (POST ditolak dengan galat jelas, bukan lolos tanpa batas).
- [ ] Verifikasi Turnstile (bila aktif) punya timeout dan perilaku gagal yang jelas.

Operasional:

- [ ] Endpoint `GET /api/health` untuk pemantau: proses hidup, versi build, status Firestore, status tiap server API, tanpa membocorkan rahasia atau URL internal. Respons ringan dan tidak memicu pembuatan akun.
- [ ] Log terstruktur satu baris per kejadian penting (kode galat, durasi, server upstream, ID permintaan). Tidak ada kredensial akun, API key, IP mentah, atau isi body POST di log. Tambahkan tes keamanan yang memeriksa hal ini.
- [ ] `error.tsx`, `global-error.tsx`, dan penanganan `unhandledRejection` agar satu galat tidak menjatuhkan proses.
- [ ] Header keamanan (CSP yang ketat, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS bila di balik TLS) dan semua respons yang memuat detail akun memakai `Cache-Control: no-store`.
- [ ] Halaman beranda dan layanan dirender cepat tanpa menunggu API (data status dimuat sisi klien dengan polling berjeda dan berhenti saat tab tidak terlihat).

**Selesai bila:** dengan `MOCK_FAIL=500`, `409`, dan `timeout` serta dengan Firestore dimatikan, tidak ada akun ganda, tidak ada kuota bocor, UI menampilkan pesan yang benar, dan semua tes lulus. Tambahkan tes unit dan integrasi untuk tiap kasus.

### Fase 3. Mesin penutupan dan maintenance

Empat mode situs:

| Mode | Perilaku |
| --- | --- |
| `normal` | Situs berjalan biasa |
| `notice` | Situs berjalan, banner pengumuman tampil di semua halaman |
| `maintenance` | Halaman publik menampilkan halaman maintenance dengan status 503 dan `Retry-After`. Ada perkiraan selesai (opsional) |
| `closed` | Penutupan. Halaman publik menampilkan halaman tutup dengan status 503, tanpa perkiraan selesai |

Selain itu, **jeda per layanan**: admin dapat menjeda satu layanan (mis. hanya VMess) tanpa menutup situs. Layanan yang dijeda tetap tampil, tombol buatnya nonaktif dengan alasan yang terlihat, dan `POST /api/...` untuknya ditolak di server.

- [ ] Simpan keadaan di Firestore: dokumen `site_settings/state` berisi `mode`, `message` (maks 280 karakter), `estimatedEndAt` (opsional), `pausedServices` (daftar slug), `updatedAt`, `updatedBy`. Server membaca dengan cache memori TTL pendek (5 detik) dan **stale-if-error**: bila Firestore gagal, pakai nilai terakhir yang diketahui, bukan membuka atau menutup situs secara acak.
- [ ] Penjaga terpusat di sisi server (layout, route handler, dan semua `POST`). Jangan mengandalkan penyembunyian di UI saja. Route `/admin`, `/api/admin/*`, `/api/health`, dan aset statis tetap dapat diakses saat mode `maintenance` atau `closed`.
- [ ] Saklar darurat lewat environment: `FORCE_MAINTENANCE=1` memaksa mode `maintenance` meski Firestore mati atau admin terkunci. Dokumentasikan di `PRODUCTION_SETUP.md`.
- [ ] Bila keadaan tidak dapat dibaca sama sekali dan belum pernah berhasil dibaca (proses baru, Firestore mati): halaman baca tetap tampil, `POST` pembuatan akun ditolak dengan galat jelas.
- [ ] Banner `notice` dapat ditutup per sesi (state di memori halaman, bukan menyimpan data pengguna) dan tidak menggeser tata letak.
- [ ] Halaman maintenance dan halaman tutup (desain di Fase 5 dan 7) memeriksa ulang status secara berkala. Saat situs kembali normal, halaman memuat ulang sendiri tanpa memaksa pengunjung menekan tombol.
- [ ] Fallback statis di luar aplikasi: `public/maintenance-static.html` (CSS inline, tanpa JavaScript yang wajib) dan contoh konfigurasi reverse proxy di `PRODUCTION_SETUP.md` (`error_page 502 503 504` ke berkas itu) untuk saat proses Node benar-benar mati. Tampilannya mengikuti `DESIGN.md`.

**Selesai bila:** mengubah mode lewat Firestore atau env benar-benar mengubah respons publik dalam waktu TTL, tes e2e untuk keempat mode dan jeda per layanan lulus, dan `POST` tidak dapat dipakai menembus mode `maintenance` atau `closed`.

### Fase 4. Portal admin

Rute: `/admin`. Tidak ditautkan dari navbar atau footer publik. Semua halaman admin mengirim `noindex` (meta dan header `X-Robots-Tag`).

Autentikasi dan keamanan:

- [ ] Satu akun admin dari environment: `ADMIN_USERNAME` dan `ADMIN_PASSWORD_HASH` (scrypt lewat `node:crypto`, dengan salt dan parameter dalam string hash). Tambahkan `npm run admin:hash-password` yang membaca kata sandi dari prompt tanpa menampilkannya dan mencetak hash. Kata sandi tidak pernah ditulis ke berkas atau log.
- [ ] Perbandingan konstan waktu (`timingSafeEqual`), pesan galat login yang sama untuk username atau kata sandi salah.
- [ ] Sesi: cookie `HttpOnly`, `Secure`, `SameSite=Strict`, ditandatangani dengan `ADMIN_SESSION_SECRET` (HMAC), kedaluwarsa 12 jam, ada tombol keluar yang membatalkan sesi.
- [ ] Pembatasan percobaan login: 5 kegagalan per 15 menit per IP ter-hash, lalu kunci sementara dengan pesan jelas. Berlaku juga saat Firestore mati (fallback ke penghitung memori proses).
- [ ] Semua mutasi (`POST`, `PUT`, `DELETE`) memeriksa `Origin` dan token CSRF, serta mewajibkan sesi valid. Tanpa sesi: 401 untuk API, redirect ke login untuk halaman.
- [ ] Log audit di koleksi `admin_audit`: waktu, aksi, nilai sebelum dan sesudah (tanpa rahasia), IP ter-hash. Tidak dapat diubah dari UI.
- [ ] Admin **tidak** dapat melihat kredensial akun yang pernah dibuat (memang tidak disimpan).
- [ ] Tambahkan tes keamanan: akses tanpa sesi, sesi kedaluwarsa, tanda tangan palsu, CSRF, brute force, XSS pada kolom pesan (pesan dirender sebagai teks, bukan HTML).

Fitur (cukup yang berikut, tidak lebih):

- [ ] **Status situs:** pilihan mode (empat opsi, kontrol radio yang dapat dijangkau keyboard), kolom pesan dengan penghitung karakter, kolom perkiraan selesai dalam WIB dengan validasi (tidak boleh di masa lalu).
- [ ] **Jeda per layanan:** daftar dari `GET /v1/services`, saklar per layanan, alasan singkat opsional.
- [ ] **Konfirmasi** sebelum menerapkan `maintenance` atau `closed`: dialog yang menyebut dampaknya, dapat ditutup dengan Escape, fokus dikelola.
- [ ] **Pratinjau:** tautan membuka halaman maintenance atau tutup dengan data draf, hanya untuk admin yang masuk, tanpa mengubah situs publik.
- [ ] **Ringkasan hari ini (hanya baca):** kuota terpakai per layanan dan status server. Data nyata saja.
- [ ] **Riwayat perubahan:** 50 entri audit terakhir.
- [ ] Opsional, hanya bila logika kuota mengizinkan dengan aman: reset kuota hari ini per layanan, dengan konfirmasi dan catatan audit. Bila tidak aman, lewati dan catat alasannya.
- [ ] State kosong, memuat, dan galat untuk setiap panel (R-27). Penyimpanan gagal harus terlihat jelas dan tidak menyatakan "tersimpan" palsu.
- [ ] Tata letak admin mengikuti `DESIGN.md` (palet sama), padat dan fungsional, bukan dashboard template. Nyaman di ponsel karena admin akan sering menutup situs dari ponsel.

**Selesai bila:** admin dapat masuk, menutup situs, membukanya lagi, menjeda satu layanan, dan melihat jejak audit, semuanya terbukti lewat tes e2e dan uji manual di lebar 360px.

### Fase 5. UI dan konten publik

Tujuan: tampil menarik dan punya karakter sendiri tanpa terlihat seperti template AI. Kerjakan mengikuti `DESIGN.md`.

Beranda:

- [ ] Satu fokus utama di layar pertama: memilih layanan dan membuat akun. Tidak ada hero generik dengan dua CTA dan tangkapan layar palsu.
- [ ] Judul dan teks hero ditulis ulang, spesifik pada apa yang benar-benar dilakukan portal ini (layanan apa, berapa lama aktif, apa yang ditampilkan sekali). Tanpa kata terlarang (R-16), tanpa em dash.
- [ ] Daftar layanan sebagai baris berhierarki yang membawa nama layanan, ketersediaan, sisa kuota hari ini, dan aksi spesifik ("Buat akun SSH", bukan "Mulai"). Ikon Lucide hanya bila relevan dengan layanan (R-04), tulis alasannya di `DESIGN.md`.
- [ ] Status server sebagai blok data padat (uptime, RAM, jumlah user per layanan) dengan label umur data. Angka hanya dari API.
- [ ] Kuota hari ini sebagai pita ringkas satu baris per layanan, dengan hitung mundur reset yang dihitung dari waktu server (tidak ada `--:--:--`).
- [ ] Bagian yang menjelaskan cara memakai detail akun (impor ke aplikasi, apa arti host, port, UUID) hanya bila isinya nyata dan spesifik untuk tiap protokol. Bila tidak ada konten nyata, jangan dibuat (R-38).
- [ ] Ruang dukungan opsional memakai warm yellow, hanya tampil bila `SUPPORT_URL` terisi. Tanpa tekanan dan tanpa teks putih kecil di atas kuning.
- [ ] Footer sederhana, tautan hanya ke halaman yang ada.

Halaman layanan `/s/[slug]`:

- [ ] Alur tiga langkah yang jelas dalam satu layar: durasi (1, 3, 7 hari), verifikasi bila Turnstile aktif, buat. Tombol buat menampilkan keadaan menunggu yang spesifik (Fase 6) dan mencegah klik ganda.
- [ ] Kartu hasil: nilai teknis dalam monospace dengan tombol salin per nilai dan "salin semua", opsi unduh berkas bila API menyediakan formatnya, peringatan jelas bahwa detail hanya tampil sekali. Fokus dipindah ke hasil setelah dibuat, dan hasil diumumkan ke pembaca layar.
- [ ] Semua state galat (kuota habis, rate limit, server tidak dapat dihubungi, layanan dijeda, maintenance) punya pesan spesifik dan tindakan yang masuk akal (mis. waktu reset kuota, layanan lain yang tersedia).
- [ ] Layanan yang tidak ada di API menghasilkan halaman 404 khusus (Fase 7), bukan halaman kosong.

Halaman maintenance dan halaman tutup:

- [ ] Satu komposisi dengan motif jalur dari bagian 4. Menampilkan pesan admin (sebagai teks), perkiraan selesai dalam WIB bila ada, dan indikator bahwa halaman sedang memeriksa ulang. Tidak ada janji waktu bila admin tidak mengisinya.
- [ ] Halaman tutup memakai nada yang berbeda dari maintenance (tidak menjanjikan kembali) dan tetap menyediakan kanal kontak hanya bila `SUPPORT_URL` ada.

Umum:

- [ ] Tidak ada pola slop dari Part 1 `antislop.md` tanpa alasan tertulis: gradien biru-ungu, glassmorphism di banyak elemen, glow, grid latar, lencana kapsul, panah dekoratif di semua tombol, animasi fade-up di semua elemen, kartu identik.
- [ ] Semua teks melewati `antislop-copywriting`: kalimat polos, spesifik, tanpa buzzword, tanpa statistik karangan.
- [ ] Mobile 360px, 390px, 768px, 1280px: tanpa overflow, target sentuh 44px, navbar dropdown nyaman, semua layanan terjangkau.
- [ ] Tab menjangkau semua kontrol sesuai urutan visual, fokus terlihat, dialog tertutup dengan Escape, tautan "lewati ke konten" tetap berfungsi.
- [ ] Performa: tanpa pustaka animasi berat, gambar dioptimalkan, font dimuat dengan strategi yang tidak memblokir render, tidak ada pergeseran tata letak saat data status masuk.

**Selesai bila:** `npm run check:contrast` dan semua tes lulus, laporan Delivery Gate Blok 1 sampai 4 tidak punya FAIL untuk halaman publik.

### Fase 6. Animasi memuat kustom

Prinsip (R-19): animasi punya tujuan UX yang tertulis di `DESIGN.md`, tidak ada penundaan buatan, dan tidak menghalangi isi.

- [ ] Satu komponen `PathLoader` (SVG inline + CSS, tanpa pustaka): garis jalur menggambar diri dari titik "perangkat" ke titik "server" lalu berdenyut pelan. Ukuran `sm` (di dalam tombol), `md` (panel), `lg` (layar penuh).
- [ ] Dipakai di: `loading.tsx` antar-rute, panel status dan kuota saat data pertama dimuat, tombol "Buat akun" saat `POST` berjalan, dan halaman admin saat menyimpan.
- [ ] Tombol pembuatan akun menampilkan teks yang berubah menurut kemajuan nyata: "Memesan kuota", "Menghubungi server", "Menyiapkan detail". Bila lebih dari 8 detik, tampilkan "Server masih memproses, jangan tutup halaman ini". Teks hanya menggambarkan tahap yang sungguh terjadi.
- [ ] Layar penuh hanya untuk muat rute pertama yang benar-benar menunggu, dan tidak pernah tampil lebih lama dari yang dibutuhkan. Bila data siap dalam kurang dari 300 ms, jangan tampilkan apa pun (hindari kedipan).
- [ ] `prefers-reduced-motion: reduce`: ganti gerak dengan keadaan statis yang tetap informatif (garis penuh, teks status). Diuji di Playwright.
- [ ] Beri peran `role="status"` dan teks alternatif tersembunyi ("Memuat...") agar pembaca layar tahu. Animasi tidak mengandalkan warna saja.
- [ ] Bobot: komponen di bawah 3 KB setelah gzip, tanpa dependensi baru. Animasi memakai `transform` dan `stroke-dashoffset`, bukan properti yang memicu layout.

**Selesai bila:** loader tampil benar di semua titik pakai, tidak ada kedipan pada koneksi cepat, tidak ada animasi saat reduced motion aktif, dan tes e2e mencakup ketiganya.

### Fase 7. Halaman 404 dan galat kustom

- [ ] `app/not-found.tsx` kustom dengan status HTTP 404 yang benar, `noindex`, dan motif jalur yang terputus di satu titik (cerita: jalur tidak sampai). Teks spesifik, mis. "Halaman ini tidak ada di portal." disertai tujuan nyata: Beranda dan daftar layanan yang tersedia saat ini (diambil dari API, dengan cadangan dari cache bila API mati).
- [ ] 404 khusus untuk `/s/[slug]` yang tidak dikenal: sebut bahwa layanan itu tidak tersedia dan tampilkan layanan yang ada.
- [ ] `error.tsx` (galat segmen) dan `global-error.tsx` (galat akar) dengan tampilan yang sama gayanya, tombol "Coba lagi" yang benar-benar memanggil `reset()`, dan ID permintaan singkat yang dapat dikutip pengguna. Tanpa stack trace.
- [ ] Halaman 403 dan 401 untuk area admin, serta 429 untuk terlalu banyak percobaan, memakai komposisi yang sama dan pesan yang jelas.
- [ ] Seluruh halaman galat ringan, tidak bergantung pada pemanggilan API, dan tetap tampil bila Firestore atau API mati.
- [ ] Tes e2e: URL acak menghasilkan 404 kustom dan kode status 404, `/s/tidak-ada` menghasilkan 404 layanan, galat yang dipaksa menampilkan `error.tsx`, semuanya dapat dipakai dengan keyboard dan tanpa overflow di 360px.

**Selesai bila:** tidak ada halaman bawaan Next.js yang dapat dimunculkan dari rute publik.

### Fase 8. Verifikasi, dokumentasi, dan Delivery Gate

- [ ] Perbarui `.env.example` dengan variabel baru (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `FORCE_MAINTENANCE`, TTL cache) beserta penjelasan satu baris.
- [ ] Perbarui `README.md` (tabel variabel, perintah baru) dan `PRODUCTION_SETUP.md` (membuat hash admin, saklar darurat, fallback statis di reverse proxy, pemantauan `/api/health`, prosedur pemulihan bila admin terkunci).
- [ ] Perbarui `firestore.rules` bila koleksi baru ditambahkan. Aturannya tetap menolak semua akses langsung dari browser. Sebutkan perintah deploy rules yang perlu dijalankan.
- [ ] Jalankan seluruh perintah pemeriksaan, tambah tes baru untuk setiap fase, dan pastikan semuanya lulus.
- [ ] Uji manual di browser nyata: alur buat akun end to end dengan mock, empat mode situs, jeda layanan, login admin, 404, galat terpaksa, reduced motion, 360px.
- [ ] Jalankan skrip kontras antislop-human (`contrast-check.py`) bila terpasang.
- [ ] Tulis `docs/delivery-gate.md`: laporan PASS/FAIL Blok 1 sampai 4 dari `antislop.md`, satu baris per butir, setiap PASS dengan bukti konkret (nama berkas, tes, atau tangkapan layar). Satu FAIL berarti belum boleh dinyatakan selesai.
- [ ] Ringkas semua perubahan di deskripsi PR: apa yang berubah, variabel baru, langkah deploy, dan risiko yang diketahui.

---

## 6. Definisi selesai

Pekerjaan selesai hanya bila semua benar:

1. Seluruh perintah pemeriksaan di bagian 1 lulus.
2. Laporan Delivery Gate tidak memiliki FAIL.
3. Tidak ada kredensial akun, API key, atau IP mentah di log, database, local storage, atau bundel klien (diuji).
4. Admin dapat menutup dan membuka situs serta menjeda satu layanan, dan efeknya terbukti di sisi server, bukan hanya di UI.
5. Saat API mati, Firestore mati, atau proses Node mati, pengunjung melihat pesan yang jujur dan spesifik, tidak pernah halaman kosong atau halaman bawaan framework.
6. Loading, 404, galat, maintenance, dan tutup tampil dengan gaya yang sama dan bekerja di 360px, dengan keyboard, dan dengan reduced motion.
7. Tidak ada angka, klaim keamanan, atau teks yang tidak punya dasar nyata.

## 7. Di luar cakupan

- Mengubah API VPN, menambah endpoint upstream, atau menyimpan kredensial akun.
- Sistem akun pengguna, pembayaran, atau iklan.
- Multi-admin dan manajemen peran (cukup satu admin; TOTP dapat menjadi tugas lanjutan).
- Tema gelap.
- Testimoni, statistik pemasaran, atau konten FAQ yang tidak berdasar pertanyaan nyata pengguna.

## 8. Riwayat

Isi `task.md` lama (bila ada) diringkas di sini sebelum digantikan.

- (kosong)