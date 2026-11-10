'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KotakPrivasi } from '@/components/shared/KotakPrivasi';
import { KARTU_FORMULIR, TATA_CEK } from '@/components/shared/tata-letak-cek';
import {
  TombolContoh,
  type SkenarioContoh,
  type SkenarioLink,
} from '@/components/input/TombolContoh';
import { InputLink } from '@/components/input/InputLink';
import { PemanduHalaman, usePemanduHalaman } from '@/components/shared/PemanduHalaman';
import { KomponenHasil } from '@/components/hasil/KomponenHasil';
import { generateHasilLinkLokal } from '@/lib/aturan/link-rules';
import type { FormatDataHasil } from '@/lib/hasil';

/**
 * Halaman Cek Link (/cek-link)
 *
 * Komponen client ('use client') untuk memeriksa alamat tautan atau nama domain
 * yang mencurigakan tanpa perlu membukanya.
 *
 * Alur pemeriksaan:
 * 1. Pengguna memasukkan URL / domain (atau memilih dari skenario contoh).
 * 2. Cek URL yang diteruskan dari Cek Chat via sessionStorage.getItem('url_dari_chat') saat mount,
 *    isi otomatis ke input dan bersihkan dari storage.
 * 3. Render KotakPrivasi (halaman="link") sebelum area input.
 * 4. Render TombolContoh (halaman="link") dan InputLink.
 * 5. Jalankan analisis leksikal lokal di browser via generateHasilLinkLokal.
 * 6. Kirim ke API POST /api/cek-link dengan batas timeout 10 detik.
 * 7. Jika API berhasil (200), gunakan FormatDataHasil dari server.
 * 8. Jika API gagal / offline / timeout: gunakan hasil aturan lokal generateHasilLinkLokal (fallback).
 * 9. Render KomponenHasil dengan format seragam.
 * 10. Tampilkan atribusi resmi Google: "Advisory provided by Google" dengan tautan ke Safe Browsing Advisory
 *     dan keterangan kemungkinan false positive dan false negative (Requirement 20.4, 20.5).
 * 11. Tombol "Cek lagi" mengosongkan input dan hasil untuk kembali ke kondisi awal.
 * 12. Dukungan "Coba contoh": jika contoh dipilih dari TombolContoh, gunakan hasilSimulasi langsung
 *     tanpa memanggil API (Requirement 21.1).
 *
 * References: Requirements 8.5, 8.6, 17.2, 17.5, 18.4, 20.4, 20.5, 21.1, 21.2, 21.3, 34.2
 */
export default function CekLinkPage(): React.JSX.Element {
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasil, setHasil] = useState<FormatDataHasil | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  // Pemandu halaman berbasis skrip di Cek Link (Requirement LN-09)
  const {
    pemicu: pemanduPemicu,
    handleFokus: handlePemanduFokus,
    handleSubmitKosong: handlePemanduSubmitKosong,
    handleKetik: handlePemanduKetik,
    handleTutup: handlePemanduTutup,
    resetPemandu,
  } = usePemanduHalaman({
    idleTimeoutMs: 8000,
    enabled: !hasil, // Hanya aktif selama pengguna berada di formulir input
  });

  // Cek URL yang diteruskan dari Cek Chat via sessionStorage saat mount (Requirement 34.2)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const urlDariChat = window.sessionStorage.getItem('url_dari_chat');
        if (urlDariChat) {
          setUrlInput(urlDariChat);
          window.sessionStorage.removeItem('url_dari_chat');
        }
      }
    } catch (_err) {
      // Abaikan jika akses sessionStorage dibatasi oleh peramban
    }
  }, []);

  /**
   * Menangani pemilihan skenario dari TombolContoh.
   * Langsung menggunakan respons API simulasi dari file contoh tanpa memanggil API (Requirement 21.1).
   */
  const handleContohDipilih = useCallback((contoh: SkenarioContoh) => {
    if ('url' in contoh && 'hasilSimulasi' in contoh) {
      const linkContoh = contoh as SkenarioLink;
      setUrlInput(linkContoh.url);
      setHasil(linkContoh.hasilSimulasi);
      setIsFallback(false);
      setIsLoading(false);
      handlePemanduTutup();
    }
  }, [handlePemanduTutup]);

  /**
   * Menangani pengiriman URL untuk diperiksa.
   * Menjalankan analisis leksikal lokal di browser, lalu memanggil API /api/cek-link
   * dengan timeout 10 detik. Jika API gagal/offline, fallback ke hasil lokal.
   */
  const handlePeriksaUrl = async (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setUrlInput(trimmedUrl);
    setIsLoading(true);
    setIsFallback(false);

    // 1. Jalankan analisis leksikal lokal di browser (Requirement 19.1 - 19.11)
    const hasilLokal = generateHasilLinkLokal(trimmedUrl);

    // 2. Kirim ke API POST /api/cek-link dengan batas waktu 10 detik (Requirement 28.2)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const response = await fetch('/api/cek-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: trimmedUrl,
          levelMinimum: hasilLokal.level,
          temuanAturan: hasilLokal.temuan,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: FormatDataHasil = await response.json();
        setHasil(data);
        setIsFallback(false);
      } else {
        // API non-200: fallback ke hasil aturan lokal dengan status layanan gagal
        setIsFallback(true);
        const fallbackHasil: FormatDataHasil = {
          ...hasilLokal,
          pihak_ketiga: Array.from(
            new Set([...(hasilLokal.pihak_ketiga || []), 'safe_browsing', 'rdap', 'ai'])
          ),
          status_layanan: {
            ...hasilLokal.status_layanan,
            safe_browsing: 'gagal',
            rdap: 'gagal',
            ai: 'gagal',
          },
        };
        setHasil(fallbackHasil);
      }
    } catch (_error) {
      clearTimeout(timeoutId);
      // Network error, abort timeout, atau offline: gunakan fallback hasil lokal
      setIsFallback(true);
      const fallbackHasil: FormatDataHasil = {
        ...hasilLokal,
        pihak_ketiga: Array.from(
          new Set([...(hasilLokal.pihak_ketiga || []), 'safe_browsing', 'rdap', 'ai'])
        ),
        status_layanan: {
          ...hasilLokal.status_layanan,
          safe_browsing: 'gagal',
          rdap: 'gagal',
          ai: 'gagal',
        },
      };
      setHasil(fallbackHasil);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mengosongkan kolom input dan hasil pemeriksaan untuk kembali ke kondisi awal.
   */
  const handleCekLagi = useCallback(() => {
    setUrlInput('');
    setHasil(null);
    setIsFallback(false);
    setIsLoading(false);
    resetPemandu();
  }, [resetPemandu]);

  return (
    <div className="w-full max-w-4xl lg:max-w-none mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4">
      {/* Header Halaman Cek Link */}
      <header data-testid="header-cek-link" className="space-y-2">
        <h1
          data-testid="judul-cek-link"
          className="text-gray-900"
        >
          Cek Link Mencurigakan
        </h1>
        <p
          data-testid="deskripsi-cek-link"
          className="text-base text-gray-600 leading-relaxed max-w-[70ch]"
        >
          Periksa alamat link atau nama domain tanpa membukanya. Sistem akan memeriksa reputasi di Google
          Safe Browsing, usia registrasi domain, dan karakteristik penulisan URL.
        </p>
      </header>

      <div className={hasil ? TATA_CEK.bertumpuk : TATA_CEK.wadah}>
      {/* Kotak Privasi: Hanya ditampilkan sebelum hasil keluar (saat di area input) */}
      {!hasil && <KotakPrivasi halaman="link" className={`w-full ${TATA_CEK.samping}`} />}

      {/* Konten Utama: Area Formulir Input vs Area Hasil Pemeriksaan */}
      {!hasil ? (
        <section
          data-testid="area-input-link"
          aria-label="Formulir Pemeriksaan Tautan"
          className={`${KARTU_FORMULIR} ${TATA_CEK.utama} space-y-5`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Masukkan Tautan atau Domain
              </h2>
              <p className="text-xs text-gray-500">
                Tautan tidak akan dibuka atau dikunjungi oleh sistem demi keamanan kamu.
              </p>
            </div>

            {/* Tombol Contoh Fiktif (Requirement 9.1, 9.3, 21.1) */}
            <div className="flex-shrink-0">
              <TombolContoh
                halaman="link"
                onContohDipilih={handleContohDipilih}
                onPilihContoh={handleContohDipilih}
              />
            </div>
          </div>

          {/* Pemandu Halaman Berbasis Skrip (Requirement LN-09) */}
          <PemanduHalaman
            pemicu={pemanduPemicu}
            onTutup={handlePemanduTutup}
            onClose={handlePemanduTutup}
          />

          {/* Input Kolom URL (Requirement 17.1, 17.2, 17.5) */}
          <InputLink
            onSubmit={handlePeriksaUrl}
            isLoading={isLoading}
            initialUrl={urlInput}
            onFocus={handlePemanduFokus}
            onSubmitEmpty={handlePemanduSubmitKosong}
            onTyping={handlePemanduKetik}
          />
        </section>
      ) : (
        <section
          data-testid="area-hasil-link"
          aria-label="Hasil Pemeriksaan Link"
          className="space-y-6 animate-fadeIn"
        >
          {/* Banner Fallback saat API gagal / timeout (Requirement 29.1, 29.3) */}
          {isFallback && (
            <div
              role="alert"
              data-testid="banner-fallback-link"
              className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="text-xs sm:text-sm leading-relaxed">
                  <span className="font-semibold block sm:inline">
                    Pemberitahuan Sistem: Layanan pengecekan server sedang tidak tersedia.
                  </span>{' '}
                  <span>
                    Hasil di bawah ini dihasilkan menggunakan analisis aturan leksikal lokal di perangkat kamu.
                  </span>
                </div>
              </div>

              {/* Tombol Coba Lagi saat API gagal (Requirement 29.1) */}
              <button
                type="button"
                data-testid="tombol-coba-lagi"
                onClick={() => void handlePeriksaUrl(urlInput)}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>Coba lagi</span>
              </button>
            </div>
          )}

          {/* Komponen Hasil Bersama (Requirement 6.1, LN-07) */}
          <KomponenHasil
            hasil={hasil}
            url={urlInput}
            onCekLagi={handleCekLagi}
            className="[&_[data-testid=blok-batasan-layanan]]:hidden"
            halamanLain={[
              { label: 'Cek Chat', href: '/cek-chat' },
              { label: 'Cek Video & Suara', href: '/cek-video-suara' },
            ]}
          />
        </section>
      )}
      </div>
    </div>
  );
}
