# Open VPN Web

Portal publik untuk membuat akun VPN lewat API server. Aplikasi ini hanya memanggil `GET /v1/services`, `GET /v1/status`, dan `POST /v1/accounts`. API key hanya dipakai oleh server web. Hasil koneksi tampil sekali di browser dan tidak disimpan di database, local storage, atau log.

## Menjalankan mock lokal

Gunakan Node.js 22.12 atau lebih baru.

```sh
npm ci
cp .env.example .env.local
npm run mock
```

Atur `VPN_API_KEY` dan `IP_HASH_SALT` di `.env.local` ke nilai acak lokal, lalu pada terminal lain:

```sh
npm run dev
```

Buka `http://localhost:3000`. Mock mendengarkan hanya di `127.0.0.1:8089`; `MOCK_FAIL=500|409|timeout` dapat dipakai untuk mensimulasikan kegagalan POST.

## Produksi

Jalankan sebagai proses Node.js biasa dengan systemd atau PM2. Isi konfigurasi API, Firebase, `IP_HASH_SALT`, dan limit sesuai kebutuhan. Jangan memberi prefiks `NEXT_PUBLIC_` pada rahasia. Letakkan reverse proxy TLS di depan aplikasi dan pastikan proxy mengganti `X-Real-IP` dengan alamat peer yang tervalidasi. Hanya jika proxy tepercaya mengirim `X-Forwarded-For` yang dibersihkan, set `TRUST_PROXY_HEADERS=1`. Panduan produksi ada di `PRODUCTION_SETUP.md`.

### Variabel konfigurasi

| Variabel | Default | Fungsi |
|---|---:|---|
| `VPN_API_BASE_URL` | `http://127.0.0.1:8089` | Basis URL API VPN utama |
| `VPN_API_SERVERS` | kosong | JSON array server API untuk failover, misalnya `[{"id":"vm1","baseUrl":"https://api.example.com","apiKey":"..."}]` |
| `VPN_API_KEY` | wajib | Kunci untuk API, hanya di server |
| `DAILY_LIMIT_PER_SERVICE` | `10` | Kuota global per layanan per hari |
| `ALLOWED_DAYS` | `1,3,7` | Durasi yang dapat dipilih |
| `APP_TIMEZONE` | `Asia/Jakarta` | Zona waktu reset (fitur selalu WIB) |
| `PER_IP_CREATE_LIMIT_PER_HOUR` | `5` | Batas percobaan per IP ter-hash per jam |
| `IP_HASH_SALT` | wajib | Salt acak untuk menyamarkan IP sebelum disimpan |
| `TRUST_PROXY_HEADERS` | `0` | Percayai X-Forwarded-For hanya di belakang proxy tepercaya |
| `SUPPORT_URL` | kosong | Kartu dukungan opsional |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | kosong | Aktifkan verifikasi Turnstile bila keduanya diisi |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | kosong | Aktifkan Firestore server-side; private key memakai `\\n` untuk baris baru |

Kuota Firestore berlaku global untuk seluruh pengunjung dan tiap layanan memiliki hitungan sendiri. Hitungan direset pada 00.00 WIB. Satu pengunjung dapat menghabiskan kuota global. Rate limit per IP dan Turnstile opsional mengurangi penyalahgunaan. Karena kredensial tidak disimpan, pengguna harus menyalin atau mengunduhnya sebelum meninggalkan halaman.

## Perintah pemeriksaan

```sh
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run test:security
npm run check:contrast
npm run build
```

## Firestore Rules

`firestore.rules` menolak seluruh akses langsung dari browser. Aplikasi memakai Firebase Admin SDK di server; permintaan Admin SDK tidak dibatasi oleh rules. Deploy dari root project:

```sh
firebase login
firebase use PROJECT_ID
firebase deploy --only firestore:rules
```

Jangan commit service-account JSON. Simpan kredensial hanya sebagai environment variables server.
