'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cariPesan, pesanBawaan, salamWaktu, type PesanPemandu } from '@/lib/pemandu-kursor';

/** Jeda sebelum kembali ke pesan bawaan, supaya teks tidak berkedip di celah antarelemen. */
const JEDA_KEMBALI_MS = 300;

/** Kecepatan efek mengetik. */
const MS_PER_HURUF = 18;

/**
 * Bagian pemandu yang menyatu dengan header. Isinya mengikuti elemen yang sedang
 * ditunjuk kursor, diketuk, atau difokuskan lewat keyboard.
 */
export function PemanduKursor({ pathname }: { pathname: string }): React.JSX.Element {
  const [aktif, setAktif] = useState<PesanPemandu | null>(null);
  const [salam, setSalam] = useState<string | null>(null);
  const [sentuh, setSentuh] = useState(false);
  const [sudahBergerak, setSudahBergerak] = useState(false);
  const [adaHasil, setAdaHasil] = useState(false);
  const [ketikan, setKetikan] = useState({ teks: '', jumlah: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Jam dan jenis perangkat baru diketahui di browser, jadi dibaca setelah mount.
  useEffect(() => {
    setSalam(salamWaktu(new Date().getHours()));
    setSentuh(Boolean(window.matchMedia?.('(hover: none)').matches));
  }, []);

  useEffect(() => {
    setAktif(null);
  }, [pathname]);

  useEffect(() => {
    const cek = () => setAdaHasil(Boolean(document.querySelector('[data-testid="komponen-hasil"]')));
    cek();
    const pengamat = new MutationObserver(cek);
    pengamat.observe(document.body, { childList: true, subtree: true });
    return () => pengamat.disconnect();
  }, [pathname]);

  useEffect(() => {
    const batalkanTimer = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    const kembaliNanti = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        setAktif(null);
      }, JEDA_KEMBALI_MS);
    };

    const tunjuk = (e: Event) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      // Saat kursor berada di pemandu, biarkan pesannya supaya bisa dibaca.
      if (el.closest('[data-pemandu-kursor]')) {
        batalkanTimer();
        return;
      }
      setSudahBergerak(true);
      const hasil = cariPesan(el);
      if (hasil) {
        batalkanTimer();
        setAktif((lama) => (lama?.pesan === hasil.pesan ? lama : hasil));
      } else {
        kembaliNanti();
      }
    };

    const akar = document.documentElement;
    document.addEventListener('pointerover', tunjuk);
    document.addEventListener('focusin', tunjuk);
    akar.addEventListener('pointerleave', kembaliNanti);
    return () => {
      batalkanTimer();
      document.removeEventListener('pointerover', tunjuk);
      document.removeEventListener('focusin', tunjuk);
      akar.removeEventListener('pointerleave', kembaliNanti);
    };
  }, []);

  const tampil = aktif ?? pesanBawaan({ pathname, adaHasil, salam, sentuh, sudahBergerak });
  const teks = tampil.pesan;

  // Efek mengetik: teks muncul per huruf dan mulai lagi setiap pesannya berganti.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setKetikan({ teks, jumlah: teks.length });
      return;
    }
    let jumlah = 0;
    setKetikan({ teks, jumlah });
    const id = setInterval(() => {
      jumlah += 1;
      setKetikan({ teks, jumlah });
      if (jumlah >= teks.length) clearInterval(id);
    }, MS_PER_HURUF);
    return () => clearInterval(id);
  }, [teks]);

  // Dihitung saat render supaya teks baru tidak sempat tampil utuh sebelum diketik.
  const jumlahHuruf = ketikan.teks === teks ? ketikan.jumlah : 0;
  const sedangMengetik = jumlahHuruf < teks.length;

  return (
    <div
      data-pemandu-kursor
      data-testid="pemandu-kursor"
      className="flex min-h-[72px] sm:min-h-[48px] items-center border-t-[1.5px] border-dotted border-obsidian/40 px-2 py-2.5"
    >
      <p aria-live="polite" className="text-[13px] sm:text-sm leading-snug text-obsidian">
        <span data-testid="pemandu-judul" className="mr-2 inline-block rounded-full bg-sulfur px-2.5 py-0.5 text-xs text-obsidian">
          {tampil.judul}
        </span>
        {/* Pembaca layar menerima kalimat utuh, bukan huruf demi huruf. */}
        <span data-testid="pemandu-pesan" className="sr-only">{teks}</span>
        <span aria-hidden="true">
          <span data-testid="pemandu-ketikan">{teks.slice(0, jumlahHuruf)}</span>
          {sedangMengetik && <span data-testid="pemandu-caret" className="pemandu-caret" />}
          {/* Sisa teks tak terlihat menahan posisi baris supaya tulisan tidak melompat. */}
          <span className="invisible">{teks.slice(jumlahHuruf)}</span>
        </span>
      </p>
    </div>
  );
}

export default PemanduKursor;
