'use client';

import React, { useState, useMemo } from 'react';
import { KotakPrivasi } from '@/components/shared/KotakPrivasi';
import {
  TombolContoh,
  type SkenarioContoh,
  type SkenarioVideo,
} from '@/components/input/TombolContoh';
import { WizardVideoSuara } from '@/components/input/WizardVideoSuara';
import { KomponenHasil, type CrossLink } from '@/components/hasil/KomponenHasil';
import {
  generateHasilVideoLokal,
  type JawabanWizardVideo,
} from '@/lib/aturan/video-rules';
import type { FormatDataHasil } from '@/lib/hasil';

/**
 * Halaman Cek Video & Suara (`/cek-video-suara`)
 *
 * Alur pemeriksaan P0 berjalan sepenuhnya offline di peramban tanpa panggilan API eksternal:
 * 1. Pengguna menyelesaikan wizard 4 langkah atau memilih skenario fiktif dari TombolContoh.
 * 2. Logika langsung menghitung skor dan menghasilkan FormatDataHasil via generateHasilVideoLokal (< 1 detik).
 * 3. Render KomponenHasil dengan langkah verifikasi per situasi:
 *    - Keluarga/teman: telepon balik nomor lama, kode rahasia keluarga
 *    - Atasan/instansi: konfirmasi lewat jalur resmi kantor
 *    - Tokoh publik/investasi: cek akun resmi & Kontak OJK 157
 *    - Masih tersambung: minta menoleh penuh / lambaikan tangan
 * 4. Tombol "Cek lagi": reset wizard kembali ke kondisi awal (Langkah 1).
 *
 * References: Requirements 24.1, 24.2, 24.3, 24.4, 28.1, 29.1, 34.4, 35.2
 */
export default function CekVideoSuaraPage(): React.JSX.Element {
  // State hasil pemeriksaan (FormatDataHasil atau null)
  const [hasil, setHasil] = useState<FormatDataHasil | null>(null);

  // State nilai awal jawaban wizard (dari tombol contoh)
  const [initialJawaban, setInitialJawaban] = useState<
    Partial<JawabanWizardVideo> | undefined
  >(undefined);

  // Key untuk me-reset instance WizardVideoSuara ke Langkah 1 saat "Cek lagi"
  const [wizardKey, setWizardKey] = useState<number>(0);

  // Handler saat wizard menyelesaikan kalkulasi di Langkah 4
  const handleHasilReady = (hasilBaru: FormatDataHasil) => {
    setHasil(hasilBaru);
  };

  // Handler saat pengguna memilih skenario fiktif dari TombolContoh
  const handlePilihContoh = (contoh: SkenarioContoh) => {
    const skenario = contoh as SkenarioVideo;
    const jawabanLengkap: JawabanWizardVideo = {
      situasi: skenario.situasi,
      ...skenario.jawaban,
    };

    setInitialJawaban(jawabanLengkap);

    // Langsung hitung hasil lokal secara offline (< 1 detik, Requirement 28.1)
    const hasilLokal = generateHasilVideoLokal(jawabanLengkap);
    setHasil(hasilLokal);
  };

  // Handler tombol "Cek lagi": reset wizard kembali ke Langkah 1
  const handleCekLagi = () => {
    setHasil(null);
    setInitialJawaban(undefined);
    setWizardKey((prev) => prev + 1);
  };

  // Tentukan cross-links tambahan jika terdeteksi situasi link atau chat
  const crossLinks: CrossLink[] = useMemo(() => {
    if (!hasil) return [];
    const links: CrossLink[] = [];

    // Jika terdeteksi permintaan klik link atau situasi darurat link
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

    // Jika situasi pesan rekaman suara/chat mencurigakan
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
      className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-6"
    >
      {/* Header Halaman Cek Video & Suara */}
      <header className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              data-testid="judul-halaman-video"
              className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight"
            >
              Cek Video & Suara
            </h1>
            <p
              data-testid="deskripsi-halaman-video"
              className="text-sm sm:text-base text-gray-600 mt-1 max-w-2xl leading-relaxed"
            >
              Periksa panggilan video call, rekaman suara, atau video figur publik mencurigakan
              untuk menilai indikasi rekayasa sosial dan manipulasi AI.
            </p>
          </div>

          {/* Tombol Coba Contoh Fiktif (Requirement 9.1, 9.4) */}
          <div className="flex-shrink-0">
            <TombolContoh
              halaman="video"
              onPilihContoh={handlePilihContoh}
              onContohDipilih={handlePilihContoh}
            />
          </div>
        </div>

        {/* Kotak Privasi (halaman="video") (Requirement 8.1, 8.2, 8.3) */}
        <KotakPrivasi halaman="video" />
      </header>

      {/* Konten Utama: Wizard Pemeriksaan atau Hasil Pemeriksaan */}
      {!hasil ? (
        <section
          data-testid="area-wizard-video"
          aria-label="Wizard Pemeriksaan Video dan Suara"
        >
          <WizardVideoSuara
            key={wizardKey}
            initialJawaban={initialJawaban}
            onHasilReady={handleHasilReady}
          />
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
          />
        </section>
      )}
    </main>
  );
}
