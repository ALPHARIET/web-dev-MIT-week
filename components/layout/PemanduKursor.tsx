'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cariPesan, pesanBawaan, salamWaktu, type PesanPemandu } from '@/lib/pemandu-kursor';

/** Jeda sebelum kembali ke pesan bawaan, supaya teks tidak berkedip di celah antarelemen. */
const JEDA_KEMBALI_MS = 300;

/** Jeda tenang setelah scroll berhenti sebelum kursor boleh memicu pop-up lagi. */
const JEDA_SCROLL_MS = 400;

/** Kecepatan efek mengetik. */
const MS_PER_HURUF = 18;

/**
 * Bagian pemandu yang menyatu dengan header.
 * - Sembunyi 100% ketika kursor tidak berada di area target atau saat sedang scroll.
 * - Meluncur turun secara fluid menampilkan murni catatan panduan saat kursor berada di area target.
 */
export function PemanduKursor({ pathname }: { pathname: string }): React.JSX.Element {
  const [aktif, setAktif] = useState<PesanPemandu | null>(null);
  const [diAtasPemandu, setDiAtasPemandu] = useState(false);
  const [sedangScroll, setSedangScroll] = useState(false);
  const [salam, setSalam] = useState<string | null>(null);
  const [sentuh, setSentuh] = useState(false);
  const [sudahBergerak, setSudahBergerak] = useState(false);
  const [adaHasil, setAdaHasil] = useState(false);
  const [ketikan, setKetikan] = useState({ teks: '', jumlah: 0 });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sedangScrollRef = useRef(false);
  const butuhGerakKursorRef = useRef(false);
  const posisiKursorTerakhirRef = useRef<{ x: number; y: number } | null>(null);

  // Jam dan jenis perangkat baru diketahui di browser, jadi dibaca setelah mount.
  useEffect(() => {
    setSalam(salamWaktu(new Date().getHours()));
    setSentuh(Boolean(window.matchMedia?.('(hover: none)').matches));
  }, []);

  useEffect(() => {
    setAktif(null);
    setDiAtasPemandu(false);
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
        setDiAtasPemandu(false);
      }, JEDA_KEMBALI_MS);
    };

    const saatScroll = () => {
      sedangScrollRef.current = true;
      butuhGerakKursorRef.current = true;
      setSedangScroll(true);
      batalkanTimer();
      setAktif(null);
      setDiAtasPemandu(false);

      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
      scrollTimer.current = setTimeout(() => {
        sedangScrollRef.current = false;
        setSedangScroll(false);
        scrollTimer.current = null;
      }, JEDA_SCROLL_MS);
    };

    const saatPointerMove = (e: PointerEvent) => {
      if (sedangScrollRef.current) return;

      const prev = posisiKursorTerakhirRef.current;
      posisiKursorTerakhirRef.current = { x: e.clientX, y: e.clientY };

      if (butuhGerakKursorRef.current) {
        if (!prev) {
          butuhGerakKursorRef.current = false;
        } else {
          const dx = Math.abs(e.clientX - prev.x);
          const dy = Math.abs(e.clientY - prev.y);
          if (dx + dy >= 4) {
            butuhGerakKursorRef.current = false;
          } else {
            return;
          }
        }

        const el = e.target;
        if (el instanceof Element && !el.closest('[data-pemandu-kursor]')) {
          const hasil = cariPesan(el);
          if (hasil) {
            batalkanTimer();
            setAktif((lama) => (lama?.pesan === hasil.pesan ? lama : hasil));
          }
        }
      }
    };

    const tunjuk = (e: Event) => {
      if (e.type === 'pointerover' && (sedangScrollRef.current || butuhGerakKursorRef.current)) {
        return;
      }

      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest('[data-pemandu-kursor]')) {
        batalkanTimer();
        setDiAtasPemandu(true);
        return;
      }
      setDiAtasPemandu(false);
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
    window.addEventListener('scroll', saatScroll, { passive: true, capture: true });
    window.addEventListener('wheel', saatScroll, { passive: true });
    window.addEventListener('touchmove', saatScroll, { passive: true });
    document.addEventListener('pointermove', saatPointerMove, { passive: true });
    document.addEventListener('pointerover', tunjuk);
    document.addEventListener('focusin', tunjuk);
    akar.addEventListener('pointerleave', kembaliNanti);
    return () => {
      batalkanTimer();
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      window.removeEventListener('scroll', saatScroll, true);
      window.removeEventListener('wheel', saatScroll);
      window.removeEventListener('touchmove', saatScroll);
      document.removeEventListener('pointermove', saatPointerMove);
      document.removeEventListener('pointerover', tunjuk);
      document.removeEventListener('focusin', tunjuk);
      akar.removeEventListener('pointerleave', kembaliNanti);
    };
  }, []);

  const tampil = aktif ?? pesanBawaan({ pathname, adaHasil, salam, sentuh, sudahBergerak });
  const teks = tampil.pesan;
  const terbuka = !sedangScroll && (Boolean(aktif) || (diAtasPemandu && Boolean(aktif)));

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

  const jumlahHuruf = ketikan.teks === teks ? ketikan.jumlah : 0;
  const sedangMengetik = jumlahHuruf < teks.length;

  return (
    <div className="relative z-10 h-0 mx-3 sm:mx-8 overflow-visible pointer-events-none">
      <div className="overflow-hidden">
        <div
          data-pemandu-kursor
          data-testid="pemandu-kursor"
          data-terbuka={terbuka ? 'true' : 'false'}
          onMouseEnter={() => {
            if (!sedangScrollRef.current && !butuhGerakKursorRef.current && aktif) {
              setDiAtasPemandu(true);
            }
          }}
          onMouseLeave={() => setDiAtasPemandu(false)}
          className={`mx-auto max-w-3xl flex min-h-[52px] sm:min-h-[44px] items-center rounded-b-[24px] bg-limestone text-obsidian border-x-[1.5px] border-b-[1.5px] border-dotted border-obsidian/40 px-4 sm:px-5 py-2.5 transition-all duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
            terbuka
              ? 'translate-y-0 opacity-100 pointer-events-auto'
              : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <p aria-live="polite" className="text-[13px] sm:text-sm leading-snug text-obsidian">
            <span
              data-testid="pemandu-judul"
              className="mr-2 inline-block rounded-full bg-sulfur px-2.5 py-0.5 text-xs text-obsidian"
            >
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
      </div>
    </div>
  );
}

export default PemanduKursor;
