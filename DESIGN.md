# Design direction

## Design Read

Design Read: ENERGY 2, RHYTHM 3, MOTION 2. This is an Indonesian VPN account portal used mainly on phones and sometimes on slow connections; the main task is to choose a service, choose a duration, create an account, and save its connection details.

## Design system (2026-10-10 revamp)

Tuning dials: Density 6, Motion 2, Variance 3. Alasan satu baris: portal padat data tapi dipakai di ponsel, jadi ringkas tanpa mengorbankan keterbacaan.

| Part | Keputusan |
|---|---|
| Pattern | Alur tugas berurutan: beranda (daftar server) > halaman server (baris protokol) > halaman layanan (kartu durasi > form buat > kartu hasil). Satu aksi utama per layar. |
| Style | Portal utilitas yang jujur dan tenang. Keywords: jelas, ringkas, cepat, terbaca. |
| Colors | Token rasa referensi (2026-10-10, dari 3 web milik pemilik): latar warm off-white #F7F8F8, permukaan #FFFFFF + tint #EAF3F8, tinta #183345, muted #526573, aksi utama #0866b5 (5.87:1 di atas putih, lolos AA), aksen grafis #049DD9, tint #04B2D9, warm #F2C438 dipakai berani, galat #B42318. Satu aksen: deep blue. Alasan: palet netral lama terbaca sebagai template generik oleh pemilik; arah baru mengikuti selera dari web-webnya sendiri. |
| Typography | Plus Jakarta Sans via next/font/google (400-800, latin, self-hosted saat build) untuk body + heading; monospace hanya untuk nilai teknis yang disalin. Skala: h1 clamp(2rem,5vw,3rem) 800 dengan letter-spacing ketat, h2 seksi 1.2-1.35rem, body 1rem/0.92rem sekunder. Alasan: Plus Jakarta Sans adalah ciri khas di semua web milik pemilik; terbaca hangat dan tidak default. |
| Effects | Border 1px var(--line) (ink 10%), radius 12px / 20px / pill 999px, shadow lembut opacity rendah var(--shadow-soft). Transisi 0.15s warna/border saja. Hover: border primary + tint, tanpa layout shift. Alasan: permukaan lembut + pill adalah bahasa visual web-web milik pemilik. |
| Avoid | Gradien ungu, glassmorphism massal, glow, ikon emoji, tombol raksasa full-width di desktop, hero generik + 3 kolom, fade-up di semua elemen, lencana kapsul tanpa teks. |

## Decisions log

- Shell instan + fetch klien (/api/meta, polling 30 dtk, berhenti saat tab hidden): first paint tidak menunggu upstream; loading.tsx + PathLoader memberi feedback saat navigasi. Alasan: keluhan "loading tidak tampil" dan "lemot" berasal dari server yang menunggu API sebelum mengirim HTML.
- Kartu durasi 1/3/7 hari sebagai radio-card dengan sisa kuota masing-masing: satu pilihan, satu kartu, satu limit. Alasan: permintaan eksplisit pemilik; radio menjaga akses keyboard/pembaca layar.
- Hasil akun dikelompokkan per protokol (SSH: host/kata sandi/port listen; Xray: UUID + tautan TLS/Non-TLS berlabel; OpenVPN: tombol unduh .ovpn): label manusiawi Bahasa Indonesia, bukan key mentah API. Alasan: "detail seperti payload" harus langsung bisa dipakai, bukan ditebak.
- Tombol primer auto-width di desktop, full-width hanya di form pada <=640px. Alasan: tombol raksasa full-width adalah ciri template generik.
- Brand disatukan: navbar "VPN Gratis" + caption "rnpproject", footer "VPN Gratis · rnpproject". Alasan: inkonsistensi brand merusak kepercayaan.
- Hitung mundur kuota diisolasi ke komponen QuotaCountdown: interval 1 detik tidak me-render ulang seluruh halaman. Alasan: menghemat CPU/baterai ponsel.
- 211 baris JSX mati + ~200 baris CSS mati dihapus setelah verifikasi grep tidak ada import. Alasan: kode mati adalah sumber bug dan kebingungan.
- Restyle rasa 2026-10-10 (7 worker paralel): token → warm off-white #F7F8F8, primary #0866b5, Plus Jakarta Sans, radius 12/20/pill, border 1px subtle, shadow lembut. Struktur/alur/fitur tidak berubah. Alasan: pemilik menilai hasil revamp "masih ai slop" dan mengirim 3 web miliknya sebagai referensi selera; analisis CSS asli ketiga web didistilasi ke notes/TASTE.md dan diterapkan.

## Visual system (arah rasa 2026-10-10, dari 3 web milik pemilik — lihat notes/TASTE.md)

- Use the warm light palette: page `#F7F8F8`, surfaces `#FFFFFF` + tint `#EAF3F8`, primary text `#183345`, muted text `#526573`, primary action and focus `#0866b5` (5.87:1 on white, AA), graphic accent `#049DD9`, limited tint `#04B2D9`, warm `#F2C438` used boldly for highlights, not only warnings.
- Use deep red `#B42318` only for form errors, always with a left rule and bold text so meaning does not rely on color. It passes AA on both the page and surface colors (checked by `npm run check:contrast`).
- Show notices (stale data, partial outages) as an ink-on-warm-tint callout with a warm left rule, never as red body text, which fails contrast on the page background.
- Keep the theme light because the specified palette is designed for light backgrounds and the portal is used on phones during the day.
- Use one path line in deep blue to connect a device to a server, touching service points. Repeat it only in loading, 404, and maintenance views because it describes the product's connection tunnel.
- Use Lucide icons only when they identify a service or communicate a real action; avoid decorative icons beside generic headings.
- Use Plus Jakarta Sans (next/font/google, self-hosted at build) for body and headings; it is the signature typeface across the owner's own sites. Use monospace only for connection values that users need to copy.
- Round pills (999px) for chips, badges, and small buttons; 12px/20px radii for cards and panels; 1px subtle borders and low-opacity soft shadows.

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
