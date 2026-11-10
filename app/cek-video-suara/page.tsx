'use client';

import React, { useState, useMemo } from 'react';
import { KotakPrivasi } from '@/components/shared/KotakPrivasi';
import { TATA_CEK } from '@/components/shared/tata-letak-cek';
import {
  TombolContoh,
  type SkenarioContoh,
  type SkenarioVideo,
} from '@/components/input/TombolContoh';
import { WizardVideoSuara } from '@/components/input/WizardVideoSuara';
import { PemeriksaMediaAI } from '@/components/input/PemeriksaMediaAI';
import { KomponenHasil, type CrossLink } from '@/components/hasil/KomponenHasil';
import {
  generateHasilVideoLokal,
  type JawabanWizardVideo,
} from '@/lib/aturan/video-rules';
import type { FormatDataHasil } from '@/lib/hasil';

export default function CekVideoSuaraPage(): React.JSX.Element {
  const [hasil, setHasil] = useState<FormatDataHasil | null>(null);

  const [initialJawaban, setInitialJawaban] = useState<
    Partial<JawabanWizardVideo> | undefined
  >(undefined);

  const [wizardKey, setWizardKey] = useState<number>(0);

  const [mode, setMode] = useState<'ai' | 'kuis'>('ai');

  const [framePratinjau, setFramePratinjau] = useState<string[]>([]);

  const handleHasilReady = (hasilBaru: FormatDataHasil) => {
    setFramePratinjau([]);
    setHasil(hasilBaru);
  };

  const handleHasilMedia = (hasilBaru: FormatDataHasil, frames: string[]) => {
    setFramePratinjau(frames);
    setHasil(hasilBaru);
  };

  const handlePilihContoh = (contoh: SkenarioContoh) => {
    const skenario = contoh as SkenarioVideo;
    const jawabanLengkap: JawabanWizardVideo = {
      situasi: skenario.situasi,
      ...skenario.jawaban,
    };

    setInitialJawaban(jawabanLengkap);
    setMode('kuis');
    setFramePratinjau([]);

    const hasilLokal = generateHasilVideoLokal(jawabanLengkap);
    setHasil(hasilLokal);
  };

  const handleCekLagi = () => {
    setHasil(null);
    setInitialJawaban(undefined);
    setFramePratinjau([]);
    setWizardKey((prev) => prev + 1);
  };

  const crossLinks: CrossLink[] = useMemo(() => {
    if (!hasil) return [];
    const links: CrossLink[] = [];

    if (
      hasil.situasi_darurat.includes('klik_link') ||
      hasil.temuan.some(
        (t) =>
          t.judul.toLowerCase().includes('link') ||
          t.judul.toLowerCase().includes('apk') ||
          t.penjelasan.toLowerCase().includes('link')
      )
    ) {
      links.push({
        label: 'Cek Tautan di Cek Link',
        href: '/cek-link',
        deskripsi: 'Periksa URL atau link mencurigakan tanpa membukanya',
      });
    }

    if (hasil.halaman === 'video') {
      links.push({
        label: 'Periksa Teks di Cek Chat',
        href: '/cek-chat',
        deskripsi: 'Periksa isi pesan chat atau tangkapan layar',
      });
    }

    return links;
  }, [hasil]);

  return (
    <main
      data-testid="halaman-cek-video-suara"
      className="w-full max-w-4xl lg:max-w-none mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4"
    >
      {/* ===== HEADER HALAMAN CEK VIDEO & SUARA ===== */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              data-testid="judul-halaman-video"
              className="text-gray-900"
            >
              Cek Video & Suara
            </h1>
            <p
              data-testid="deskripsi-halaman-video"
              className="text-base text-gray-600 mt-2 max-w-[70ch] leading-relaxed"
            >
              Unggah video, voice note, atau screenshot video call yang mencurigakan. AI memeriksa
              tanda wajah dan suara buatan AI, lalu mencocokkan isi ucapannya dengan pola penipuan.
            </p>
          </div>

          {/* ===== TOMBOL COBA CONTOH FIKTIF ===== */}
          <div className="flex-shrink-0">
            <TombolContoh
              halaman="video"
              onPilihContoh={handlePilihContoh}
              onContohDipilih={handlePilihContoh}
            />
          </div>
        </div>

      </header>

      <div className={hasil ? TATA_CEK.bertumpuk : TATA_CEK.wadah}>
      {/* ===== KOTAK PRIVASI ===== */}
      {!hasil && <KotakPrivasi halaman="video" className={TATA_CEK.samping} />}

      {!hasil ? (
        <section
          data-testid="area-wizard-video"
          aria-label="Pemeriksaan Video dan Suara"
          className={`${TATA_CEK.utama} space-y-4`}
        >
          <div
            role="tablist"
            aria-label="Cara memeriksa"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'ai'}
              data-testid="tab-mode-ai"
              onClick={() => setMode('ai')}
              className={`px-3 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-colors ${
                mode === 'ai' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Punya file? Cek dengan AI
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'kuis'}
              data-testid="tab-mode-kuis"
              onClick={() => setMode('kuis')}
              className={`px-3 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] transition-colors ${
                mode === 'kuis' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tanpa rekaman? Jawab pertanyaan
            </button>
          </div>

          {mode === 'ai' ? (
            <PemeriksaMediaAI onHasilReady={handleHasilMedia} />
          ) : (
            <WizardVideoSuara
              key={wizardKey}
              initialJawaban={initialJawaban}
              onHasilReady={handleHasilReady}
            />
          )}
        </section>
      ) : (
        <section
          data-testid="area-hasil-video"
          aria-label="Hasil Pemeriksaan Video dan Suara"
          className="space-y-6"
        >
          <KomponenHasil
            hasil={hasil}
            onCekLagi={handleCekLagi}
            crossLinks={crossLinks}
            framePratinjau={framePratinjau}
          />
        </section>
      )}
      </div>
    </main>
  );
}
