# Design direction

## Design Read

Design Read: ENERGY 2, RHYTHM 3, MOTION 2. This is an Indonesian VPN account portal used mainly on phones and sometimes on slow connections; the main task is to choose a service, choose a duration, create an account, and save its connection details.

## Design system (2026-10-10 revamp)

Tuning dials: Density 6, Motion 2, Variance 3. Alasan satu baris: portal padat data tapi dipakai di ponsel, jadi ringkas tanpa mengorbankan keterbacaan.

| Part | Keputusan |
|---|---|
| Pattern | Alur tugas berurutan: beranda (daftar server) > halaman server (baris protokol) > halaman layanan (kartu durasi > form buat > kartu hasil). Satu aksi utama per layar. |
| Style | Portal utilitas yang jujur dan tenang. Keywords: jelas, ringkas, cepat, terbaca. |
| Colors | Token tetap: latar #F2F2F2, permukaan #FFFFFF, tinta #183345, muted #526573, aksi utama #035AA6, aksen grafis #049DD9, tint #04B2D9, peringatan #F2C438, galat #B42318. Satu aksen: deep blue. Alasan: kontras AA di atas putih dan asosiasi kepercayaan untuk layanan koneksi. |
| Typography | System sans stack, tanpa webfont (nol render-blocking, glif Indonesia dijamin). Monospace hanya untuk nilai teknis yang disalin. Skala: h1 clamp(2rem,5vw,3rem), h2 seksi 1.2-1.35rem, body 1rem/0.92rem sekunder. |
| Effects | Border 1px var(--line), radius 0.55-0.8rem, tanpa shadow kecuali dropdown menu. Transisi 0.15s warna/border saja. Hover: border primary + sky-tint, tanpa layout shift. |
| Avoid | Gradien ungu, glassmorphism massal, glow, ikon emoji, tombol raksasa full-width di desktop, hero generik + 3 kolom, fade-up di semua elemen, lencana kapsul tanpa teks. |

## Decisions log

- Shell instan + fetch klien (/api/meta, polling 30 dtk, berhenti saat tab hidden): first paint tidak menunggu upstream; loading.tsx + PathLoader memberi feedback saat navigasi. Alasan: keluhan "loading tidak tampil" dan "lemot" berasal dari server yang menunggu API sebelum mengirim HTML.
- Kartu durasi 1/3/7 hari sebagai radio-card dengan sisa kuota masing-masing: satu pilihan, satu kartu, satu limit. Alasan: permintaan eksplisit pemilik; radio menjaga akses keyboard/pembaca layar.
- Hasil akun dikelompokkan per protokol (SSH: host/kata sandi/port listen; Xray: UUID + tautan TLS/Non-TLS berlabel; OpenVPN: tombol unduh .ovpn): label manusiawi Bahasa Indonesia, bukan key mentah API. Alasan: "detail seperti payload" harus langsung bisa dipakai, bukan ditebak.
- Tombol primer auto-width di desktop, full-width hanya di form pada <=640px. Alasan: tombol raksasa full-width adalah ciri template generik.
- Brand disatukan: navbar "VPN Gratis" + caption "rnpproject", footer "VPN Gratis · rnpproject". Alasan: inkonsistensi brand merusak kepercayaan.
- Hitung mundur kuota diisolasi ke komponen QuotaCountdown: interval 1 detik tidak me-render ulang seluruh halaman. Alasan: menghemat CPU/baterai ponsel.
- 211 baris JSX mati + ~200 baris CSS mati dihapus setelah verifikasi grep tidak ada import. Alasan: kode mati adalah sumber bug dan kebingungan.

## Visual system

- Use the fixed light palette: page `#F2F2F2`, surfaces `#FFFFFF`, primary text `#183345`, muted text `#526573`, primary action and focus `#035AA6`, graphic accent `#049DD9`, limited tint `#04B2D9`, and optional support or light-warning area `#F2C438`.
- Use deep red `#B42318` only for form errors, always with a left rule and bold text so meaning does not rely on color. It passes AA on both the page and surface colors (checked by `npm run check:contrast`).
- Show notices (stale data, partial outages) as an ink-on-warm-tint callout with a warm left rule, never as red body text, which fails contrast on the page background.
- Keep the theme light because the specified palette is designed for light backgrounds and the portal is used on phones during the day.
- Use one path line in deep blue to connect a device to a server, touching service points. Repeat it only in loading, 404, and maintenance views because it describes the product's connection tunnel.
- Use Lucide icons only when they identify a service or communicate a real action; avoid decorative icons beside generic headings.
- Use the system sans-serif stack to keep Indonesian text readable on small screens without downloading a font. Use monospace only for connection values that users need to copy.

## Page rhythm and behavior

- Give the service selection and account creation one clear first-screen focus.
- Show status as compact data rows, services as a ranked list, and quotas as a narrow summary strip so sections do not repeat the same card grid.
- Keep touch targets at least 44px, show keyboard focus, and maintain WCAG AA contrast for text.
- Keep account details temporary in the current browser tab only; never send them to logs or persistent storage.
- Use motion only to show real loading progress. Reduced-motion preferences receive a static path and status text.
- Use no fabricated counts, testimonials, logos, FAQ, or security claims. Show empty and error states when live data is unavailable.

## Reasons for major choices

- Light-only display follows the fixed light palette and the portal's phone-first daytime use.
- The path motif tells the real product story of a connection tunnel without adding background decoration.
- The system font avoids a network font request and keeps Indonesian glyph support available on user devices.
- Service rows and quota strips make the main task easier to scan on a narrow screen than repeated equal cards.
- The SSH terminal icon identifies shell access, while network route icons identify the other protocol choices; none of these icons claim that a service is faster or more secure.
