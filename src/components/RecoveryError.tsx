"use client";

import { useId } from "react";

export function RecoveryError({ retry, digest }: { retry: () => void; digest?: string }) {
  const id = useId()
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  return (
    <section className="recovery-page" aria-labelledby="recovery-title">
      <p className="eyebrow">Terjadi kendala</p>
      <h1 id="recovery-title">Halaman ini belum dapat ditampilkan.</h1>
      <p>Coba muat ulang bagian ini. Jika perlu bantuan, sampaikan kode kejadian berikut.</p>
      <p className="recovery-code">Kode kejadian: {digest?.slice(0, 8) ?? id}</p>
      <button className="button-primary" type="button" onClick={retry}>
        Coba lagi
      </button>
    </section>
  );
}
