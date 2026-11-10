'use client';

import React from 'react';
import Link from 'next/link';
import type { FormatDataHasil, HalamanCek, StatusLayanan } from '@/lib/hasil';
import TingkatKewaspadaan from './TingkatKewaspadaan';
import KartuTemuan from './KartuTemuan';
import LangkahDisarankan from './LangkahDisarankan';
import PanelDarurat from './PanelDarurat';
import TanyaLanjut from './TanyaLanjut';
import SorotanTranskrip from './SorotanTranskrip';
import PemecahUrl from './PemecahUrl';
import TemplatPeringatan from './TemplatPeringatan';

export interface CrossLink {
  label: string;
  href?: string;
  onClick?: () => void;
  deskripsi?: string;
}

export interface KomponenHasilProps {
  hasil: FormatDataHasil;
  halamanLain?: Array<{ label: string; href: string }>;
  onCekLagi?: () => void;
  crossLinks?: CrossLink[];
  transkrip?: string;
  url?: string;
  className?: string;
  pertanyaanCepat?: string[];
  tampilkanTanyaLanjut?: boolean;
  tampilkanTemplatPeringatan?: boolean;
}

/**
 * Pemetaan nama teknis layanan pihak ketiga ke label yang mudah dipahami.
 */
export const NAMA_LAYANAN_LABEL: Record<string, string> = {
  gemini: 'Google Gemini (Analisis AI)',
  ai: 'Google Gemini (Analisis AI)',
  safe_browsing: 'Google Safe Browsing',
  rdap: 'Data Domain (RDAP)',
  virustotal: 'VirusTotal',
  reality_defender: 'Reality Defender',
};

/**
 * Konfigurasi badge status layanan pihak ketiga (WCAG AA compliant).
 */
export const STATUS_LAYANAN_CONFIG: Record<
  StatusLayanan,
  { label: string; badgeClasses: string }
> = {
  ok: {
    label: 'Berjalan normal',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  gagal: {
    label: 'Gagal (menggunakan fallback aturan lokal)',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  tidak_dipakai: {
    label: 'Tidak digunakan',
    badgeClasses: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  tidak_tersedia: {
    label: 'Tidak tersedia',
    badgeClasses: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

/**
 * Halaman cek alternatif default jika prop halamanLain tidak diberikan.
 * Menjamin Requirement 34.4 selalu terpenuhi (menampilkan 2 halaman cek lainnya).
 */
export const HALAMAN_LAIN_DEFAULT: Record<
  HalamanCek,
  Array<{ label: string; href: string }>
> = {
  chat: [
    { label: 'Cek Link', href: '/cek-link' },
    { label: 'Cek Video & Suara', href: '/cek-video-suara' },
  ],
  link: [
    { label: 'Cek Chat', href: '/cek-chat' },
    { label: 'Cek Video & Suara', href: '/cek-video-suara' },
  ],
  video: [
    { label: 'Cek Chat', href: '/cek-chat' },
    { label: 'Cek Link', href: '/cek-link' },
  ],
};

/**
 * KomponenHasil
 *
 * Komponen bersama yang menampilkan hasil pemeriksaan dengan format seragam
 * di seluruh halaman cek (Cek Chat, Cek Link, Cek Video & Suara).
 *
 * Susunan blok wajib (Requirement 6.1):
 * 1. TingkatKewaspadaan + ringkasan
 * 2. Yang perlu diwaspadai (daftar KartuTemuan untuk setiap item di hasil.temuan)
 * 3. Yang tampak wajar (hasil.hal_wajar) jika ada
 * 4. Langkah yang disarankan (LangkahDisarankan dengan hasil.langkah)
 * 5. PanelDarurat (PanelDarurat dengan situasiAktif={hasil.situasi_darurat} dan autoOpen={hasil.situasi_darurat.length > 0})
 * 6. Batasan + layanan pihak ketiga (hasil.batasan, hasil.pihak_ketiga, hasil.status_layanan)
 * 7. Aksi penutup: Tombol "Cek lagi", tautan ke halaman cek lainnya, dan tombol cross-links
 *
 * References: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.6, 34.1, 34.3, 34.4, 35.2
 */
export function KomponenHasil({
  hasil,
  halamanLain,
  onCekLagi,
  crossLinks,
  transkrip,
  url,
  className = '',
  pertanyaanCepat,
  tampilkanTanyaLanjut = true,
  tampilkanTemplatPeringatan = true,
}: KomponenHasilProps): React.JSX.Element {
  // Transkrip yang akan ditampilkan jika ada (prop transkrip atau hasil.transkrip)
  const transkripTampil = transkrip || hasil.transkrip;

  // URL yang akan diurai jika ada (prop url atau hasil.url) (Requirement LN-07)
  const urlTarget = url || hasil.url;

  // Daftar bukti dari semua temuan untuk disorot di transkrip
  const daftarBukti = React.useMemo(() => {
    return (hasil.temuan || [])
      .map((t) => t.bukti)
      .filter((b): b is string => Boolean(b && b.trim().length > 0));
  }, [hasil.temuan]);

  // Tentukan daftar tautan halaman lain (gunakan prop atau fallback otomatis berdasarkan halaman)
  const daftarHalamanLain =
    halamanLain && halamanLain.length > 0
      ? halamanLain
      : HALAMAN_LAIN_DEFAULT[hasil.halaman] || [];

  // Apakah situasi darurat terdeteksi (Requirement 7.6)
  const adaSituasiDarurat = Boolean(
    hasil.situasi_darurat && hasil.situasi_darurat.length > 0
  );

  // Daftar unik layanan yang dipakai atau tercatat di status_layanan (tanpa duplikasi ai / Google Gemini)
  const rawLayanan = Array.from(
    new Set([
      ...(hasil.pihak_ketiga || []),
      ...Object.keys(hasil.status_layanan || {}),
    ])
  );

  const daftarLayanan = rawLayanan.filter((k) => {
    if (k === 'Google Gemini' && rawLayanan.includes('ai')) return false;
    return true;
  });

  return (
    <div
      data-testid="komponen-hasil"
      aria-label="Hasil Pemeriksaan"
      className={`space-y-6 sm:space-y-8 ${className}`.trim()}
    >
      {/* 1. TingkatKewaspadaan + ringkasan (Requirement 6.1, 6.2, 6.3, 6.4, 6.5) */}
      <section data-testid="blok-tingkat-kewaspadaan" aria-label="Tingkat Kewaspadaan">
        <TingkatKewaspadaan
          level={hasil.level}
          ringkasan={hasil.ringkasan}
        />
      </section>

      {/* Pemecahan URL per bagian dengan sorotan (Requirement LN-07) */}
      {urlTarget && urlTarget.trim().length > 0 && (
        <section data-testid="blok-pemecah-url" aria-label="Pemecahan Struktur URL">
          <PemecahUrl url={urlTarget} temuan={hasil.temuan} />
        </section>
      )}

      {/* Tata letak seimbang: Kolom Kiri (Temuan & Analisis), Kolom Kanan (Panduan & Tindakan) */}
      <div className="space-y-6 sm:space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Kolom Kiri: Evaluasi Temuan & Indikator Wajar */}
        <div className="space-y-6 sm:space-y-8">
          {/* 2. Yang perlu diwaspadai (daftar KartuTemuan) (Requirement 6.1, 6.6) */}
          <section
            data-testid="blok-temuan"
            aria-labelledby="judul-blok-temuan"
            className="space-y-3 sm:space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3
                  id="judul-blok-temuan"
                  className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight"
                >
                  Yang Perlu Diwaspadai
                </h3>
                {hasil.temuan && hasil.temuan.length > 0 && (
                  <span
                    data-testid="badge-jumlah-temuan"
                    className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200"
                    aria-label={`${hasil.temuan.length} temuan`}
                  >
                    {hasil.temuan.length}
                  </span>
                )}
              </div>
            </div>

            {/* Sorotan transkrip jika transkrip atau teks asli tersedia (Requirement CH-07) */}
            {transkripTampil && transkripTampil.trim().length > 0 && (
              <SorotanTranskrip
                transkrip={transkripTampil}
                buktiList={daftarBukti}
              />
            )}

            {hasil.temuan && hasil.temuan.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {hasil.temuan.map((item, idx) => (
                  <KartuTemuan
                    key={idx}
                    temuan={item}
                    nomor={idx + 1}
                  />
                ))}
              </div>
            ) : (
              <div
                data-testid="temuan-kosong"
                className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 text-sm sm:text-base text-gray-600 leading-relaxed"
              >
                Tidak ada temuan pola penipuan mencurigakan khusus yang terdeteksi pada pemeriksaan ini.
              </div>
            )}
          </section>

          {/* 3. Yang tampak wajar jika ada (Requirement 6.1) */}
          {hasil.hal_wajar && hasil.hal_wajar.length > 0 && (
            <section
              data-testid="blok-hal-wajar"
              aria-labelledby="judul-hal-wajar"
              className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-600 text-white shrink-0"
                  aria-hidden="true"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.8}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3
                  id="judul-hal-wajar"
                  className="text-base sm:text-lg font-bold text-gray-900 tracking-tight"
                >
                  Yang Tampak Wajar
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Hal-hal berikut terlihat sesuai pola komunikasi atau domain yang wajar:
              </p>

              <ul className="space-y-2 pt-1" role="list">
                {hasil.hal_wajar.map((item, idx) => (
                  <li
                    key={idx}
                    data-testid={`hal-wajar-item-${idx}`}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-800 leading-relaxed font-medium"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Kolom Kanan: Panduan Tindakan, Panel Darurat, & Batasan */}
        <div className="space-y-6 sm:space-y-8">
          {/* 4. Langkah yang disarankan (Requirement 6.1) */}
          <section data-testid="blok-langkah-disarankan" aria-label="Langkah yang Disarankan">
            <LangkahDisarankan langkah={hasil.langkah} />
          </section>

          {/* 5. PanelDarurat (Requirement 6.1, 7.6) */}
          <section data-testid="blok-panel-darurat" aria-label="Panel Darurat">
            <PanelDarurat
              situasiAktif={hasil.situasi_darurat}
              autoOpen={adaSituasiDarurat}
              temuan={hasil.temuan}
              langkah={hasil.langkah}
              ringkasan={hasil.ringkasan}
              halaman={hasil.halaman}
              transkrip={hasil.transkrip || transkrip}
              url={hasil.url || urlTarget}
            />
          </section>

          {/* 6. Batasan + layanan pihak ketiga (Requirement 6.1) */}
          <section
            data-testid="blok-batasan-layanan"
            aria-labelledby="judul-batasan-layanan"
            className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-700 shrink-0"
                aria-hidden="true"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="8" />
                </svg>
              </div>
              <h3
                id="judul-batasan-layanan"
                className="text-base sm:text-lg font-bold text-gray-900 tracking-tight"
              >
                Batasan Pemeriksaan
              </h3>
            </div>

            {/* Keterangan Batasan */}
            {hasil.batasan && hasil.batasan.trim().length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                  Batasan Pemeriksaan:
                </span>
                <p
                  data-testid="teks-batasan"
                  className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-gray-50/80 border border-gray-200 rounded-lg p-3.5"
                >
                  {hasil.batasan}
                </p>
              </div>
            )}

            {/* Layanan Pihak Ketiga & Statusnya (Disembunyikan dari UI visual pengguna) */}
            <div className="sr-only">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                Layanan Pihak Ketiga:
              </span>

              {daftarLayanan.length > 0 ? (
                <div
                  data-testid="daftar-pihak-ketiga"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {daftarLayanan.map((key) => {
                    const namaTampil = NAMA_LAYANAN_LABEL[key] ?? key;
                    const statusLayanan: StatusLayanan =
                      hasil.status_layanan?.[key] ?? (key === 'Google Gemini' ? (hasil.status_layanan?.ai ?? 'ok') : 'tidak_dipakai');
                    const configStatus =
                      STATUS_LAYANAN_CONFIG[statusLayanan] ??
                      STATUS_LAYANAN_CONFIG.tidak_dipakai;

                    return (
                      <div
                        key={key}
                        data-testid={`layanan-item-${key}`}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 text-xs sm:text-sm"
                      >
                        <span className="font-semibold text-gray-900 leading-snug">
                          {namaTampil}
                        </span>
                        <span
                          data-testid={`status-badge-${key}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${configStatus.badgeClasses}`}
                          aria-label={`Status ${namaTampil}: ${configStatus.label}`}
                        >
                          {configStatus.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p
                  data-testid="layanan-pihak-ketiga-kosong"
                  className="text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  Pemeriksaan ini berjalan sepenuhnya menggunakan aturan lokal di perangkat tanpa mengirim data ke layanan pihak ketiga.
                </p>
              )}
            </div>

            {/* Jaminan Privasi & Keamanan Sesi Pengguna */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
                <span>Sesi selesai, data input otomatis dibersihkan</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-500">
                <span>• Tanpa database pengguna</span>
                <span>• Bebas pelacakan pribadi</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Tanya Lanjut (P1 - Requirements 31.5, 32.4) - Full Width di Bawah Grid untuk kenyamanan konsultasi interaktif */}
      {tampilkanTanyaLanjut && (
        <section
          data-testid="blok-tanya-lanjut"
          aria-label="Tanya Lanjut Hasil Pemeriksaan"
        >
          <TanyaLanjut
            hasil={hasil}
            pertanyaanCepat={pertanyaanCepat}
          />
        </section>
      )}

      {/* 7. Aksi penutup: Tombol "Cek lagi", tautan halaman cek lainnya, dan cross-links (Requirements 6.1, 34.1, 34.3, 34.4, 35.2) */}
      <section
        data-testid="blok-aksi-penutup"
        aria-label="Aksi Penutup dan Navigasi"
        className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-5"
      >
        {/* Tombol Cross-links jika tersedia (Requirements 34.1, 34.3) */}
        {crossLinks && crossLinks.length > 0 && (
          <div data-testid="area-cross-links" className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
              Tindakan Lanjutan:
            </span>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
              {crossLinks.map((item, idx) => {
                const buttonContent = (
                  <>
                    <svg
                      className="w-4 h-4 shrink-0 text-blue-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    <span className="font-semibold">{item.label}</span>
                  </>
                );

                if (item.href) {
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      data-testid={`btn-cross-link-${idx}`}
                      onClick={item.onClick}
                      title={item.deskripsi}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-xs sm:text-sm font-semibold hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors min-h-[44px] shadow-sm"
                    >
                      {buttonContent}
                    </Link>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`btn-cross-link-${idx}`}
                    onClick={item.onClick}
                    title={item.deskripsi}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-xs sm:text-sm font-semibold hover:bg-blue-100 hover:border-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors min-h-[44px] shadow-sm"
                  >
                    {buttonContent}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tombol Utama "Cek lagi" dan "Kirim peringatan" (Requirements 35.2, P1, 27.2) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            data-testid="tombol-cek-lagi"
            onClick={() => onCekLagi?.()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm sm:text-base font-semibold hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 shadow-sm transition-colors min-h-[44px]"
          >
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Cek lagi</span>
          </button>

          {tampilkanTemplatPeringatan && (
            <TemplatPeringatan hasil={hasil} />
          )}
        </div>

        {/* Tautan Navigasi ke Halaman Cek Lainnya (Requirement 34.4) */}
        {daftarHalamanLain.length > 0 && (
          <div
            data-testid="area-halaman-lain"
            className="pt-4 border-t border-gray-200 space-y-2.5"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
              Periksa di Halaman Lain:
            </span>
            <div className="flex flex-wrap gap-2.5">
              {daftarHalamanLain.map((h, idx) => (
                <Link
                  key={idx}
                  href={h.href}
                  data-testid={`link-halaman-lain-${idx}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 text-xs sm:text-sm font-semibold hover:bg-gray-100 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 shadow-sm transition-colors min-h-[44px]"
                >
                  <span>{h.label}</span>
                  <svg
                    className="w-3.5 h-3.5 text-gray-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default KomponenHasil;
