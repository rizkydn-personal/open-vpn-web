# Production setup

Project ini dijalankan sebagai proses Node.js biasa dan memakai Firestore sebagai penyimpanan bersama.

## Build dan jalankan

```bash
npm ci
npm run build
NODE_ENV=production npm start
```

Gunakan systemd atau PM2 agar proses otomatis dimulai kembali ketika VM reboot atau proses berhenti. Aplikasi mendengarkan port 3000; tempatkan Nginx di depan aplikasi untuk TLS.

## Environment

Simpan environment di luar repository dengan permission `0600`. Wajib diisi:

```dotenv
VPN_API_SERVERS=[{"id":"vm1","label":"Server 1","baseUrl":"https://api.vm1.brutalx.my.id","apiKey":"..."}]
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
DAILY_LIMIT_PER_SERVICE=10
ALLOWED_DAYS=1,3,7
IP_HASH_SALT=...
TRUST_PROXY_HEADERS=0
```

`VPN_API_SERVERS` dapat memuat beberapa server. Web mencoba server berikutnya jika server sebelumnya timeout atau gagal 5xx. API server harus dapat dijangkau melalui HTTPS dan tetap memakai header API key.

## Firebase

Buat Firestore database pada project Firebase, lalu deploy rules:

```bash
firebase login
firebase use PROJECT_ID
firebase deploy --only firestore:rules
```

Jangan simpan service-account JSON di repository. Salin `project_id`, `client_email`, dan `private_key` ke environment server.

## Systemd contoh

```ini
[Unit]
Description=Open VPN Web
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/open-vpn-web
EnvironmentFile=/etc/open-vpn-web/web.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Simpan sebagai `/etc/systemd/system/open-vpn-web.service`, lalu jalankan `sudo systemctl daemon-reload && sudo systemctl enable --now open-vpn-web`.

## Nginx

Proxy hanya ke `127.0.0.1:3000`, aktifkan TLS, dan set `X-Real-IP`. Jangan membuka port 3000 ke internet.
