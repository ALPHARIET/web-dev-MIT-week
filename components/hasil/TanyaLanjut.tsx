'use client';

import React, { useState, useId } from 'react';
import type { FormatDataHasil, HalamanCek } from '@/lib/hasil';

export interface TanyaLanjutProps {
  hasil: FormatDataHasil;
  pertanyaanCepat?: string[];
  className?: string;
  /**
   * Callback kustom untuk pengiriman pertanyaan.
   * Sangat berguna untuk pengujian unit tanpa memerlukan mocking jaringan tingkat global.
   * Jika tidak disediakan, komponen akan melakukan HTTP POST ke '/api/tanya'.
   */
  onKirimPertanyaan?: (pertanyaan: string) => Promise<string>;
}

export interface PesanPercakapan {
  id: string;
  peran: 'pengguna' | 'asisten';
  isi: string;
  waktu?: string;
}

/** Batas maksimal pertanyaan yang diajukan pengguna per sesi (P1) */
export const MAKS_PERTANYAAN_PER_SESI = 10;

/** Batas maksimal karakter untuk satu pertanyaan bebas */
export const MAKS_KARAKTER_PERTANYAAN = 1000;

/**
 * Menghasilkan 2-3 pertanyaan cepat yang relevan dan kontekstual
 * berdasarkan jenis halaman pemeriksaan dan tingkat kewaspadaannya.
 */
export function dapatkanPertanyaanCepatDefault(hasil: FormatDataHasil): string[] {
  const halaman: HalamanCek = hasil.halaman;
  const level = hasil.level;

  if (halaman === 'chat') {
    if (level === 'tinggi') {
      return [
        'Apa tanda paling berbahaya dari chat ini?',
        'Bagaimana cara memblokir dan melaporkan nomor ini?',
        'Apa yang harus saya lakukan jika sudah terlanjur membalas?',
      ];
    }
    if (level === 'sedang') {
      return [
        'Bagaimana cara memverifikasi keaslian pengirim ini?',
        'Apa langkah pencegahan yang harus saya ambil?',
        'Apakah saya sebaiknya mengabaikan saja pesan ini?',
      ];
    }
    return [
      'Mengapa pesan ini belum menunjukkan tanda mencurigakan?',
      'Bagaimana mengenali jika pengirim nanti meminta data pribadi?',
      'Apa tips menjaga keamanan akun pesan saya?',
    ];
  }

  if (halaman === 'link') {
    if (level === 'tinggi') {
      return [
        'Mengapa link ini sangat berisiko?',
        'Apa yang terjadi jika saya tidak sengaja mengeklik link tersebut?',
        'Bagaimana cara mencari website resmi yang sebenarnya?',
      ];
    }
    if (level === 'sedang') {
      return [
        'Mengapa nama domain atau alamat link ini mencurigakan?',
        'Bagaimana cara mengakses layanan resmi tanpa mengeklik link?',
        'Apa tanda utama situs tiruan atau phishing?',
      ];
    }
    return [
      'Bagaimana memastikan link ini benar-benar resmi?',
      'Apa bahaya tautan pemendek URL (shortlink)?',
      'Bagaimana membedakan domain resmi dari tiruan?',
    ];
  }

  // Halaman Cek Video & Suara
  if (level === 'tinggi') {
    return [
      'Bagaimana cara memastikan apakah suara atau video ini deepfake?',
      'Bagaimana cara verifikasi keluarga tanpa menghubungi nomor baru?',
      'Apa yang harus dilakukan jika ada desakan uang mendadak?',
    ];
  }
  if (level === 'sedang') {
    return [
      'Apa saja ciri-ciri manipulasi rekaman suara atau video?',
      'Pertanyaan apa yang efektif untuk menguji keaslian lawan bicara?',
      'Bagaimana mengecek legalitas promosi investasi dari tokoh publik?',
    ];
  }
  return [
    'Bagaimana tips mengenali teknologi voice clone atau deepfake?',
    'Apa metode verifikasi kata sandi rahasia bersama keluarga?',
    'Kenapa video call yang putus-putus bisa menjadi tanda manipulasi?',
  ];
}

/**
 * Komponen TanyaLanjut
 *
 * Komponen interaktif tanya jawab berbasis AI untuk konsultasi keamanan digital
 * lanjutan setelah melihat hasil pemeriksaan.
 *
 * Fitur Utama:
 * 1. Tombol 2-3 pertanyaan cepat kontekstual sesuai jenis halaman & temuan.
 * 2. Kolom input teks untuk pertanyaan bebas pengguna (maksimal 1.000 karakter).
 * 3. Riwayat percakapan disimpan HANYA di memori komponen browser (Requirement 31.5).
 * 4. Batas maksimal 10 pertanyaan per sesi dengan counter interaktif (misal "2/10 pertanyaan").
 * 5. Balon percakapan interaktif (pengguna & asisten AI) dengan indikator sedang mengetik.
 * 6. Target sentuh minimal 44px untuk semua elemen interaktif (Requirement 1.5, 27.2).
 *
 * References: Requirements 31.5, 32.4
 */
export function TanyaLanjut({
  hasil,
  pertanyaanCepat,
  className = '',
  onKirimPertanyaan,
}: TanyaLanjutProps): React.JSX.Element {
  const inputId = useId();

  // Daftar pertanyaan cepat (gunakan prop kustom atau default kontekstual)
  const daftarPertanyaanCepat =
    pertanyaanCepat && pertanyaanCepat.length > 0
      ? pertanyaanCepat.slice(0, 3)
      : dapatkanPertanyaanCepatDefault(hasil).slice(0, 3);

  // Riwayat percakapan disimpan HANYA di memori komponen React (Requirement 31.5)
  const [riwayat, setRiwayat] = useState<PesanPercakapan[]>([
    {
      id: 'sambutan-awal',
      peran: 'asisten',
      isi: 'Halo! Ada yang ingin kamu tanyakan lebih lanjut seputar hasil pemeriksaan ini? Kamu bisa memilih salah satu pertanyaan cepat di atas atau mengetik pertanyaanmu sendiri di bawah.',
    },
  ]);

  const [inputTeks, setInputTeks] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hitung jumlah pertanyaan yang telah diajukan pengguna (batas 10 per sesi)
  const jumlahPertanyaanUser = riwayat.filter((p) => p.peran === 'pengguna').length;
  const batasTercapai = jumlahPertanyaanUser >= MAKS_PERTANYAAN_PER_SESI;

  /**
   * Menangani pengiriman pertanyaan (baik dari input bebas maupun tombol pertanyaan cepat).
   */
  const kirimPertanyaan = async (teks: string) => {
    const teksBersih = teks.trim();
    if (!teksBersih || isLoading || batasTercapai) {
      return;
    }

    // Pastikan tidak melebihi 1.000 karakter
    const teksFinal = teksBersih.slice(0, MAKS_KARAKTER_PERTANYAAN);

    // Tambahkan pesan pengguna ke riwayat memori komponen
    const pesanPengguna: PesanPercakapan = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      peran: 'pengguna',
      isi: teksFinal,
    };

    setRiwayat((prev) => [...prev, pesanPengguna]);
    setInputTeks('');
    setIsLoading(true);

    try {
      let jawabanAsisten: string;

      if (onKirimPertanyaan) {
        // Gunakan handler kustom jika diinjeksikan (misal dalam unit test)
        jawabanAsisten = await onKirimPertanyaan(teksFinal);
      } else {
        // Panggil endpoint backend POST /api/tanya (Requirement 32.4)
        const res = await fetch('/api/tanya', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pertanyaan: teksFinal,
            konteksHasil: hasil,
            riwayat: riwayat.map((p) => ({
              peran: p.peran,
              isi: p.isi,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          jawabanAsisten =
            data.jawaban ||
            'Terima kasih atas pertanyaanmu. Tetap berhati-hati dan jangan pernah membagikan data pribadi atau kode rahasia kepada siapa pun.';
        } else {
          // Tangani status error HTTP secara informatif
          let pesanError =
            'Maaf, layanan tanya jawab sedang tidak dapat dihubungi. Silakan coba beberapa saat lagi.';
          try {
            const dataErr = await res.json();
            if (dataErr.jawaban) {
              pesanError = dataErr.jawaban;
            } else if (dataErr.pesan) {
              pesanError = dataErr.pesan;
            }
          } catch {
            // abaikan kegagalan JSON
          }
          jawabanAsisten = pesanError;
        }
      }

      setRiwayat((prev) => [
        ...prev,
        {
          id: `asisten-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          peran: 'asisten',
          isi: jawabanAsisten,
        },
      ]);
    } catch {
      // Tangani kegagalan jaringan atau timeout
      setRiwayat((prev) => [
        ...prev,
        {
          id: `asisten-err-${Date.now()}`,
          peran: 'asisten',
          isi: 'Maaf, terjadi kendala saat mengirim pertanyaanmu. Silakan periksa koneksi internet kamu dan coba lagi.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    void kirimPertanyaan(inputTeks);
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void kirimPertanyaan(inputTeks);
    }
  };

  return (
    <section
      data-testid="komponen-tanya-lanjut"
      aria-labelledby="judul-tanya-lanjut"
      className={`rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-sm space-y-5 ${className}`.trim()}
    >
      {/* Header Bagian Tanya Lanjut & Counter Pertanyaan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <h3
              id="judul-tanya-lanjut"
              className="text-base sm:text-lg font-bold text-gray-900 tracking-tight"
            >
              Tanya Lanjut Seputar Hasil Ini
            </h3>
            <p className="text-xs text-gray-500">
              Konsultasi AI edukatif seputar keamanan dan pencegahan penipuan
            </p>
          </div>
        </div>

        {/* Counter Batas Pertanyaan Per Sesi (Requirement 31.5: memori browser, batas 10) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            data-testid="counter-pertanyaan"
            aria-label={`Jumlah pertanyaan: ${jumlahPertanyaanUser} dari maksimal ${MAKS_PERTANYAAN_PER_SESI} pertanyaan`}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
              batasTercapai
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {jumlahPertanyaanUser}/{MAKS_PERTANYAAN_PER_SESI} pertanyaan
          </span>
        </div>
      </div>

      {/* Tombol Pertanyaan Cepat (2-3 tombol relevan) */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
          Pertanyaan Cepat:
        </span>
        <div
          data-testid="area-pertanyaan-cepat"
          className="flex flex-wrap gap-2"
        >
          {daftarPertanyaanCepat.map((tanya, idx) => (
            <button
              key={idx}
              type="button"
              data-testid={`btn-pertanyaan-cepat-${idx}`}
              onClick={() => void kirimPertanyaan(tanya)}
              disabled={isLoading || batasTercapai}
              className="inline-flex items-center text-left px-3.5 py-2 !rounded-lg border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 text-xs sm:text-sm font-medium transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <span>{tanya}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Area Balon Percakapan Interaktif (Pengguna & Asisten AI) */}
      <div
        data-testid="wadah-balon-chat"
        aria-label="Riwayat percakapan"
        aria-live="polite"
        className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4 max-h-80 sm:max-h-96 overflow-y-auto space-y-3.5 scroll-smooth"
      >
        {riwayat.map((pesan) => {
          const isPengguna = pesan.peran === 'pengguna';
          return (
            <div
              key={pesan.id}
              data-testid={isPengguna ? 'pesan-pengguna' : 'pesan-asisten'}
              className={`flex items-start gap-2.5 ${
                isPengguna ? 'justify-end' : 'justify-start'
              }`}
            >
              {!isPengguna && (
                <div
                  className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
                  aria-hidden="true"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                    <rect x="3" y="10" width="18" height="12" rx="4" />
                    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
                  </svg>
                </div>
              )}

              <div
                className={`p-3 sm:p-3.5 !rounded-xl text-xs sm:text-sm leading-relaxed max-w-[85%] sm:max-w-[80%] whitespace-pre-wrap break-words shadow-2xs ${
                  isPengguna
                    ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-xs'
                }`}
              >
                {!isPengguna && (
                  <span className="text-[11px] font-bold text-blue-700 block mb-1">
                    Asisten Keamanan
                  </span>
                )}
                {pesan.isi}
              </div>

              {isPengguna && (
                <div
                  className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
                  aria-hidden="true"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* Indikator Mengetik / Memuat Asisten AI */}
        {isLoading && (
          <div
            data-testid="balon-loading"
            aria-label="Asisten sedang menganalisis jawaban"
            className="flex items-center gap-2.5 justify-start"
          >
            <div
              className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs"
              aria-hidden="true"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                <rect x="3" y="10" width="18" height="12" rx="4" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="p-3 !rounded-xl rounded-tl-xs bg-white text-gray-700 border border-gray-200 text-xs sm:text-sm flex items-center gap-2 shadow-2xs">
              <svg
                className="w-4 h-4 animate-spin text-blue-600 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>Asisten sedang menulis jawaban...</span>
            </div>
          </div>
        )}
      </div>

      {/* Banner Peringatan jika Batas 10 Pertanyaan Tercapai */}
      {batasTercapai && (
        <div
          data-testid="banner-batas-pertanyaan"
          role="status"
          className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs"
        >
          <svg
            className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <span className="font-bold block sm:inline">
              Batas 10 pertanyaan per sesi telah tercapai.
            </span>{' '}
            <span>
              Untuk mengajukan pertanyaan baru seputar pesan atau link lain, kamu dapat memulai sesi pemeriksaan baru.
            </span>
          </div>
        </div>
      )}

      {/* Form Input Pertanyaan Bebas Pengguna */}
      <form onSubmit={handleSubmitForm} className="space-y-2">
        <label htmlFor={inputId} className="sr-only">
          Ketik pertanyaan lanjutan
        </label>

        <div className="relative">
          <textarea
            id={inputId}
            data-testid="input-tanya-lanjut"
            rows={2}
            value={inputTeks}
            onChange={(e) => setInputTeks(e.target.value.slice(0, MAKS_KARAKTER_PERTANYAAN))}
            onKeyDown={handleKeyDownTextarea}
            placeholder={
              batasTercapai
                ? 'Batas 10 pertanyaan per sesi telah tercapai'
                : 'Tanyakan hal lain seputar keamanan hasil ini... (Enter untuk kirim)'
            }
            disabled={batasTercapai || isLoading}
            maxLength={MAKS_KARAKTER_PERTANYAAN}
            className="w-full rounded-xl border border-gray-300 p-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none transition-colors"
          />
        </div>

        {/* Footer Form: Counter Karakter & Tombol Aksi Submit */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span
            data-testid="counter-karakter"
            className={`text-xs ${
              inputTeks.length >= MAKS_KARAKTER_PERTANYAAN
                ? 'text-amber-700 font-semibold'
                : 'text-gray-500'
            }`}
          >
            {inputTeks.length}/{MAKS_KARAKTER_PERTANYAAN} karakter
          </span>

          <button
            type="submit"
            data-testid="tombol-kirim-pertanyaan"
            disabled={!inputTeks.trim() || isLoading || batasTercapai}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold transition-colors min-h-[44px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Mengirim...</span>
              </>
            ) : (
              <>
                <span>Tanya</span>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export default TanyaLanjut;
