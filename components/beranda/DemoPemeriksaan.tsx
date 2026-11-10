'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

interface Tanda {
  frasa: string;
  label: string;
  alasan: string;
}

interface Skenario {
  id: string;
  tab: string;
  pengantar: string;
  teks: string;
  tanda: Tanda[];
  judulHasil: string;
  warnaHasil: string;
  saran: string;
  href: string;
  ajakan: string;
}

/** Semua isi di sini fiktif, termasuk nama bank dan alamat link. */
const SKENARIO: Skenario[] = [
  {
    id: 'chat',
    tab: 'Chat',
    pengantar: 'Pesan WhatsApp dari nomor tak dikenal',
    teks: 'Halo Kak, kami dari CS Bank Sejahtera. Akun Kakak diblokir hari ini. Kirim kode OTP sekarang supaya bisa dibuka lagi.',
    tanda: [
      { frasa: 'dari CS Bank Sejahtera', label: 'Mengaku dari bank', alasan: 'Siapa saja bisa mengaku CS. Cek lewat nomor yang tertulis di kartu ATM kamu.' },
      { frasa: 'diblokir hari ini', label: 'Menakut-nakuti', alasan: 'Ancaman dengan batas waktu dibuat supaya kamu tidak sempat berpikir.' },
      { frasa: 'Kirim kode OTP', label: 'Minta OTP', alasan: 'Kode OTP adalah kunci akunmu. Jangan berikan ke siapa pun.' },
    ],
    judulHasil: 'Waspada tinggi',
    warnaHasil: 'bg-ember',
    saran: 'Jangan kirim kodenya. Hubungi bank lewat nomor resmi.',
    href: '/cek-chat',
    ajakan: 'Cek chat kamu',
  },
  {
    id: 'link',
    tab: 'Link',
    pengantar: 'Link yang dikirim di grup keluarga',
    teks: 'http://bank-sejahtera.hadiah-poin.xyz/klaim?poin=500rb',
    tanda: [
      { frasa: 'bank-sejahtera', label: 'Nama bank di depan', alasan: 'Bagian depan bisa diisi apa saja. Pemilik aslinya ada di domain utama.' },
      { frasa: 'hadiah-poin.xyz', label: 'Domain tidak resmi', alasan: 'Ini domain utamanya, dan tidak ada hubungannya dengan nama bank tadi.' },
      { frasa: '/klaim', label: 'Pancingan hadiah', alasan: 'Kata klaim atau hadiah sering dipakai supaya link-nya langsung diklik.' },
    ],
    judulHasil: 'Perlu hati-hati',
    warnaHasil: 'bg-sulfur',
    saran: 'Jangan dibuka dulu. Bandingkan alamatnya dengan situs resmi.',
    href: '/cek-link',
    ajakan: 'Cek link kamu',
  },
  {
    id: 'video',
    tab: 'Video call',
    pengantar: 'Video call yang baru saja kamu terima',
    teks: 'Video call dari nomor baru, wajahnya mirip Om Budi. Dia minta transfer Rp5 juta dan bilang jangan cerita ke siapa-siapa.',
    tanda: [
      { frasa: 'nomor baru', label: 'Nomor tak dikenal', alasan: 'Telepon balik ke nomor lama yang sudah kamu simpan.' },
      { frasa: 'minta transfer', label: 'Minta uang', alasan: 'Wajah dan suara bisa ditiru AI. Permintaan uang tetap harus dicek dulu.' },
      { frasa: 'jangan cerita', label: 'Diminta rahasia', alasan: 'Kamu dijauhkan dari orang yang bisa membantu mengecek.' },
    ],
    judulHasil: 'Waspada tinggi',
    warnaHasil: 'bg-ember',
    saran: 'Tutup dulu, lalu telepon balik ke nomor yang kamu simpan.',
    href: '/cek-video-suara',
    ajakan: 'Cek video call kamu',
  },
];

const MS_PER_HURUF = 24;
const JEDA_TANDA_MS = 750;
const JEDA_GANTI_MS = 6000;

type Fase = 'ketik' | 'pindai' | 'selesai';

interface Potongan {
  teks: string;
  mulai: number;
  tanda: number | null;
}

function pecahTeks(teks: string, tanda: Tanda[]): Potongan[] {
  const hasil: Potongan[] = [];
  let posisi = 0;
  tanda.forEach((t, i) => {
    const awal = teks.indexOf(t.frasa, posisi);
    if (awal < 0) return;
    if (awal > posisi) hasil.push({ teks: teks.slice(posisi, awal), mulai: posisi, tanda: null });
    hasil.push({ teks: t.frasa, mulai: awal, tanda: i });
    posisi = awal + t.frasa.length;
  });
  if (posisi < teks.length) hasil.push({ teks: teks.slice(posisi), mulai: posisi, tanda: null });
  return hasil;
}

/** Titik halftone yang membesar di dekat kursor dan ikut menyapu saat contoh diperiksa. */
function HalftoneHidup({ fase, diam }: { fase: Fase; diam: boolean }): React.JSX.Element {
  const kanvasRef = useRef<HTMLCanvasElement>(null);
  const faseRef = useRef(fase);

  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  useEffect(() => {
    const kanvas = kanvasRef.current;
    const induk = kanvas?.parentElement;
    if (!kanvas || !induk || typeof ResizeObserver === 'undefined') return;
    const ctx = kanvas.getContext('2d');
    if (!ctx) return;

    const JARAK = 13;
    const PENUH = Math.PI * 2;
    let lebar = 0;
    let tinggi = 0;
    let gradasi: CanvasGradient | null = null;
    let raf = 0;
    let terlihat = true;
    let kursorX = -9999;
    let kursorY = -9999;
    let faseLalu: Fase = faseRef.current;
    let denyutMulai = -9999;

    const gambar = (t: number) => {
      if (!gradasi) return;
      const fase = faseRef.current;
      if (fase !== faseLalu) {
        if (fase === 'selesai') denyutMulai = t;
        faseLalu = fase;
      }
      ctx.fillStyle = gradasi;
      ctx.fillRect(0, 0, lebar, tinggi);

      const sapuY = fase === 'pindai' ? ((t * 0.4) % (tinggi + 160)) - 80 : null;
      const usiaDenyut = t - denyutMulai;
      const jariDenyut = usiaDenyut < 1400 ? usiaDenyut * 0.75 : null;
      const pudarDenyut = jariDenyut === null ? 0 : 1 - usiaDenyut / 1400;
      const tengahX = lebar / 2;
      const tengahY = tinggi / 2;
      const panas: Array<[number, number, number]> = [];

      ctx.beginPath();
      let baris = 0;
      for (let y = 0; y <= tinggi + JARAK; y += JARAK, baris++) {
        for (let x = baris % 2 ? JARAK / 2 : 0; x <= lebar + JARAK; x += JARAK) {
          const dekat = Math.max(0, 1 - Math.hypot(x - kursorX, y - kursorY) / 150);
          const ombak = Math.sin(x * 0.016 + y * 0.011 - t * 0.0011) * 0.5 + 0.5;
          const sapu = sapuY === null ? 0 : Math.max(0, 1 - Math.abs(y - sapuY) / 56);
          const denyut =
            jariDenyut === null
              ? 0
              : Math.max(0, 1 - Math.abs(Math.hypot(x - tengahX, y - tengahY) - jariDenyut) / 70) * pudarDenyut;
          const r = Math.min(6.4, 1.3 + ombak * 2 + dekat * dekat * 5 + sapu * 3.4 + denyut * 3.4);
          if (dekat > 0.3 || sapu > 0.35 || denyut > 0.3) {
            panas.push([x, y, r]);
          } else {
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, PENUH);
          }
        }
      }
      ctx.fillStyle = '#ff7a3d';
      ctx.fill();

      ctx.beginPath();
      for (const [x, y, r] of panas) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, PENUH);
      }
      ctx.fillStyle = '#f5f28e';
      ctx.fill();
    };

    const putar = (t: number) => {
      if (terlihat) gambar(t);
      raf = requestAnimationFrame(putar);
    };

    const ukur = () => {
      const kotak = induk.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lebar = kotak.width;
      tinggi = kotak.height;
      kanvas.width = Math.round(lebar * dpr);
      kanvas.height = Math.round(tinggi * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gradasi = ctx.createLinearGradient(0, tinggi, lebar, 0);
      gradasi.addColorStop(0.08, '#524ae9');
      gradasi.addColorStop(0.82, '#fc5000');
      if (diam) gambar(0);
    };

    const pengamatUkuran = new ResizeObserver(ukur);
    pengamatUkuran.observe(induk);
    ukur();

    if (diam) return () => pengamatUkuran.disconnect();

    const gerak = (e: PointerEvent) => {
      const kotak = induk.getBoundingClientRect();
      kursorX = e.clientX - kotak.left;
      kursorY = e.clientY - kotak.top;
    };
    const keluar = () => {
      kursorX = -9999;
      kursorY = -9999;
    };
    induk.addEventListener('pointermove', gerak);
    induk.addEventListener('pointerleave', keluar);

    let pengamatTerlihat: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      pengamatTerlihat = new IntersectionObserver(([e]) => {
        terlihat = e.isIntersecting;
      });
      pengamatTerlihat.observe(induk);
    }
    raf = requestAnimationFrame(putar);

    return () => {
      cancelAnimationFrame(raf);
      pengamatUkuran.disconnect();
      pengamatTerlihat?.disconnect();
      induk.removeEventListener('pointermove', gerak);
      induk.removeEventListener('pointerleave', keluar);
    };
  }, [diam]);

  return <canvas ref={kanvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}

/**
 * Demo di hero: contoh fiktif yang diketik, ditandai, lalu diberi hasil.
 * Berjalan sendiri sampai pengguna memilih tab; berhenti sementara saat ditunjuk atau difokus.
 */
export function DemoPemeriksaan(): React.JSX.Element {
  const [indeks, setIndeks] = useState(0);
  const [karakter, setKarakter] = useState(0);
  const [ditemukan, setDitemukan] = useState(0);
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [otomatis, setOtomatis] = useState(true);
  const [ditahan, setDitahan] = useState(false);
  const [diam, setDiam] = useState(false);

  const skenario = SKENARIO[indeks];
  const potongan = useMemo(() => pecahTeks(skenario.teks, skenario.tanda), [skenario]);
  const fase: Fase =
    karakter < skenario.teks.length ? 'ketik' : ditemukan < skenario.tanda.length ? 'pindai' : 'selesai';

  const mulai = (i: number, tanpaAnimasi: boolean) => {
    const s = SKENARIO[i];
    setIndeks(i);
    setKarakter(tanpaAnimasi ? s.teks.length : 0);
    setDitemukan(tanpaAnimasi ? s.tanda.length : 0);
    setDipilih(tanpaAnimasi ? 0 : null);
  };

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDiam(true);
      setOtomatis(false);
      mulai(0, true);
    }
  }, []);

  useEffect(() => {
    if (diam) return;
    let id: number | undefined;
    if (fase === 'ketik') {
      id = window.setTimeout(() => setKarakter((k) => k + 1), MS_PER_HURUF);
    } else if (fase === 'pindai') {
      id = window.setTimeout(() => {
        setDipilih(ditemukan);
        setDitemukan((d) => d + 1);
      }, ditemukan === 0 ? 300 : JEDA_TANDA_MS);
    } else if (otomatis && !ditahan) {
      id = window.setTimeout(() => mulai((indeks + 1) % SKENARIO.length, false), JEDA_GANTI_MS);
    }
    return () => window.clearTimeout(id);
  }, [fase, karakter, ditemukan, otomatis, ditahan, diam, indeks]);

  const tandaDipilih = dipilih === null ? null : skenario.tanda[dipilih];

  return (
    <section
      data-testid="demo-pemeriksaan"
      aria-label="Contoh pemeriksaan dengan data fiktif"
      className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-ember p-3 sm:p-6 lg:p-8"
      onPointerEnter={() => setDitahan(true)}
      onPointerLeave={() => setDitahan(false)}
      onFocusCapture={() => setDitahan(true)}
      onBlurCapture={() => setDitahan(false)}
    >
      <HalftoneHidup fase={fase} diam={diam} />

      <div className="relative w-full max-w-[640px] rounded-[28px] bg-limestone p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {SKENARIO.map((s, i) => (
              <button
                key={s.id}
                type="button"
                data-testid="demo-tab"
                aria-pressed={i === indeks}
                onClick={() => {
                  setOtomatis(false);
                  mulai(i, diam);
                }}
                className={`min-h-[44px] rounded-full px-3.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-obsidian ${
                  i === indeks ? 'bg-obsidian text-limestone' : 'text-obsidian hover:bg-pumice'
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-sulfur px-3 py-1 text-xs text-obsidian">Contoh fiktif</span>
        </div>

        <p className="sr-only">
          {skenario.pengantar}: {skenario.teks}. Tanda yang ditemukan: {skenario.tanda.map((t) => t.label).join(', ')}.
          Hasil: {skenario.judulHasil}. {skenario.saran}
        </p>

        <div aria-hidden="true">
          <p className="mt-4 text-sm text-gray-600">{skenario.pengantar}</p>
          <p className="mt-2 min-h-[8.5rem] rounded-3xl bg-pumice p-4 text-base leading-relaxed text-obsidian sm:min-h-[7.25rem] [overflow-wrap:anywhere]">
            {potongan.map((p, i) => {
              const tampil = Math.max(0, Math.min(p.teks.length, karakter - p.mulai));
              const aktif = p.tanda !== null && p.tanda < ditemukan;
              const terpilih = aktif && p.tanda === dipilih;
              const isi = (
                <>
                  {p.teks.slice(0, tampil)}
                  <span className="invisible">{p.teks.slice(tampil)}</span>
                </>
              );
              if (p.tanda === null) return <span key={i}>{isi}</span>;
              return (
                <mark
                  key={i}
                  className={`rounded-md text-obsidian transition-colors duration-300 ${
                    terpilih ? 'bg-ember' : aktif ? 'bg-sulfur' : 'bg-transparent'
                  }`}
                >
                  {isi}
                </mark>
              );
            })}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {skenario.tanda.map((t, i) => (
            <button
              key={t.frasa}
              type="button"
              data-testid="demo-tanda"
              aria-pressed={i === dipilih}
              onClick={() => setDipilih(i)}
              onPointerEnter={() => setDipilih(i)}
              onFocus={() => setDipilih(i)}
              className={`min-h-[44px] rounded-full border-[1.5px] border-obsidian px-3.5 text-sm text-obsidian transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-obsidian ${
                i < ditemukan ? '' : 'invisible'
              } ${i === dipilih ? 'bg-ember' : 'hover:bg-pumice'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="mt-2 min-h-[2.75rem] text-sm leading-snug text-obsidian">{tandaDipilih?.alasan}</p>

        <div
          className={`mt-2 flex flex-col gap-3 rounded-3xl p-4 text-obsidian sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch xl:flex-row xl:items-center ${
            skenario.warnaHasil
          } ${fase === 'selesai' ? '' : 'invisible'}`}
        >
          <div className="min-w-0">
            <p className="font-display text-2xl leading-none">{skenario.judulHasil}</p>
            <p className="mt-1 text-sm leading-snug">{skenario.saran}</p>
          </div>
          <Link
            href={skenario.href}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-obsidian px-5 text-sm text-limestone focus:outline-none focus-visible:ring-2 focus-visible:ring-limestone"
          >
            {skenario.ajakan}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default DemoPemeriksaan;
