'use client';

import React, { useState } from 'react';
import type { SituasiDarurat } from '@/lib/hasil';
import langkahDaruratJson from '@/data/langkah-darurat.json';

export interface SituasiItem {
  id: SituasiDarurat;
  label: string;
  langkah: string[];
}

export interface KanalLaporItem {
  nama: string;
  kontak: string;
  keterangan: string;
}

export interface LangkahDaruratData {
  situasi: SituasiItem[];
  kanal_lapor: KanalLaporItem[];
  peringatan: string;
}

export const DEFAULT_LANGKAH_DARURAT: LangkahDaruratData =
  langkahDaruratJson as LangkahDaruratData;

export const DAFTAR_SITUASI_ID: SituasiDarurat[] = [
  'klik_link',
  'isi_data',
  'kirim_otp',
  'transfer',
  'akun_diambil',
];

export const LABEL_RINGKAS_SITUASI: Record<SituasiDarurat, string> = {
  klik_link: 'Klik link',
  isi_data: 'Isi data akun',
  kirim_otp: 'Kirim OTP',
  transfer: 'Sudah transfer',
  akun_diambil: 'Akun diambil alih',
};

export interface PanelDaruratProps {
  situasiAktif?: SituasiDarurat | SituasiDarurat[];
  langkahDarurat?: LangkahDaruratData;
  autoOpen?: boolean;
  className?: string;
  onSelectSituasi?: (situasi: SituasiDarurat) => void;
  onToggleStep?: (
    situasi: SituasiDarurat,
    stepIndex: number,
    checked: boolean
  ) => void;
}

/**
 * Komponen PanelDarurat
 *
 * Menampilkan panduan darurat "Sudah terlanjur?" untuk 5 situasi:
 * 1. klik_link: Sudah klik link, belum mengisi apa pun
 * 2. isi_data: Sudah mengisi password atau data akun
 * 3. kirim_otp: Sudah mengirim OTP
 * 4. transfer: Sudah transfer
 * 5. akun_diambil: Akun diambil alih
 *
 * References: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 27.2
 */
export function PanelDarurat({
  situasiAktif,
  langkahDarurat = DEFAULT_LANGKAH_DARURAT,
  autoOpen = false,
  className = '',
  onSelectSituasi,
  onToggleStep,
}: PanelDaruratProps): React.JSX.Element {
  const normalisasiSituasiAktif: SituasiDarurat[] = Array.isArray(situasiAktif)
    ? situasiAktif
    : situasiAktif
    ? [situasiAktif]
    : [];

  const adaSituasiAktif = normalisasiSituasiAktif.length > 0;
  const defaultSituasi: SituasiDarurat =
    normalisasiSituasiAktif[0] ?? 'klik_link';

  const [isOpen, setIsOpen] = useState<boolean>(
    () => autoOpen || adaSituasiAktif
  );
  const [selectedSituasiId, setSelectedSituasiId] =
    useState<SituasiDarurat>(defaultSituasi);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  const situasiList = langkahDarurat.situasi || [];
  const selectedSituasi =
    situasiList.find((s) => s.id === selectedSituasiId) || situasiList[0];

  const handleSelectTab = (id: SituasiDarurat) => {
    setSelectedSituasiId(id);
    onSelectSituasi?.(id);
  };

  const handleToggleCheck = (stepIndex: number) => {
    const key = `${selectedSituasiId}-${stepIndex}`;
    const nextVal = !checkedState[key];
    setCheckedState((prev) => ({ ...prev, [key]: nextVal }));
    onToggleStep?.(selectedSituasiId, stepIndex, nextVal);
  };

  return (
    <section
      data-testid="panel-darurat-section"
      aria-label="Panel darurat: Sudah terlanjur?"
      className={`rounded-2xl border border-red-300 bg-white shadow-sm overflow-hidden transition-all duration-200 ${className}`.trim()}
    >
      {/* Header Accordion Toggle */}
      <button
        type="button"
        data-testid="panel-darurat-toggle"
        aria-expanded={isOpen}
        aria-controls="panel-darurat-content"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-red-50 to-rose-50 hover:bg-red-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors min-h-[44px] text-left border-b border-red-200"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600 text-white shrink-0 shadow-sm"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-red-950 tracking-tight">
                Sudah Terlanjur?
              </h3>
              {adaSituasiAktif && (
                <span
                  data-testid="badge-darurat-terdeteksi"
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse"
                >
                  Tindakan Terdeteksi
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-red-800 font-medium mt-0.5">
              Panduan penyelamatan cepat jika kamu sudah sempat klik link, kirim OTP, atau transfer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="hidden sm:inline text-xs font-bold text-red-700 uppercase tracking-wider">
            {isOpen ? 'Tutup' : 'Buka'}
          </span>
          <svg
            className={`w-5 h-5 text-red-700 transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Konten Utama Saat Terbuka */}
      {isOpen && (
        <div
          id="panel-darurat-content"
          data-testid="panel-darurat-content"
          className="p-4 sm:p-6 space-y-6 bg-white"
        >
          {/* Banner situasi terdeteksi jika terpicu */}
          {adaSituasiAktif && (
            <div
              data-testid="banner-situasi-terdeteksi"
              className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl text-red-900 text-xs sm:text-sm shadow-sm space-y-1"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-red-600" aria-hidden="true" />
                <span>Peringatan Tindakan Berisiko Terdeteksi:</span>
              </div>
              <p className="leading-relaxed">
                Pemeriksaan mendeteksi indikasi{' '}
                <strong className="font-bold underline">
                  {normalisasiSituasiAktif
                    .map(
                      (id) =>
                        situasiList.find((s) => s.id === id)?.label ||
                        LABEL_RINGKAS_SITUASI[id] ||
                        id
                    )
                    .join(' dan ')}
                </strong>
                . Segera ikuti langkah penyelamatan di bawah tanpa menunda.
              </p>
            </div>
          )}

          {/* Tablist Pemilihan Situasi (Requirement 7.1) */}
          <div>
            <span
              id="label-situasi-tablist"
              className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700 mb-2.5"
            >
              Pilih situasi yang kamu alami:
            </span>
            <div
              role="tablist"
              aria-labelledby="label-situasi-tablist"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
            >
              {DAFTAR_SITUASI_ID.map((situasiId) => {
                const isSelected = situasiId === selectedSituasiId;
                const isDetected = normalisasiSituasiAktif.includes(situasiId);
                const showIndicator = isDetected && !isSelected;
                const ringkas = LABEL_RINGKAS_SITUASI[situasiId];

                return (
                  <button
                    key={situasiId}
                    type="button"
                    role="tab"
                    id={`tab-${situasiId}`}
                    data-testid={`tab-situasi-${situasiId}`}
                    aria-selected={isSelected}
                    aria-controls={`panel-langkah-${situasiId}`}
                    onClick={() => handleSelectTab(situasiId)}
                    className={`relative p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center text-center ${
                      isSelected
                        ? 'bg-red-700 text-white border-red-700 shadow-sm'
                        : isDetected
                        ? 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <span className="leading-tight">{ringkas}</span>
                    {showIndicator && (
                      <span
                        data-testid={`badge-terdeteksi-${situasiId}`}
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm"
                        title="Situasi ini terdeteksi dari pesan"
                      >
                        !
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist Langkah Darurat per Situasi (Requirement 7.2, 7.3) */}
          {selectedSituasi && (
            <div
              id={`panel-langkah-${selectedSituasi.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${selectedSituasi.id}`}
              data-testid={`panel-langkah-${selectedSituasi.id}`}
              className="bg-white rounded-xl border border-red-200 p-4 sm:p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" aria-hidden="true" />
                <h4 className="text-sm sm:text-base font-bold text-gray-900">
                  Langkah Penyelamatan: {selectedSituasi.label}
                </h4>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Lakukan langkah-langkah darurat berikut secara berurutan secepatnya:
              </p>

              <ol className="space-y-2.5 pt-1" role="list">
                {selectedSituasi.langkah.map((teks, idx) => {
                  const checkKey = `${selectedSituasi.id}-${idx}`;
                  const isChecked = Boolean(checkedState[checkKey]);
                  const inputId = `darurat-input-${checkKey}`;

                  return (
                    <li
                      key={idx}
                      data-testid={`darurat-step-${selectedSituasi.id}-${idx}`}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                        isChecked
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] -m-2">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCheck(idx)}
                          aria-label={`Tandai langkah darurat ${idx + 1} sudah dilakukan: ${teks}`}
                          className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer transition-colors"
                        />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <label
                          htmlFor={inputId}
                          className={`block text-xs sm:text-sm leading-relaxed font-semibold cursor-pointer select-none transition-colors ${
                            isChecked
                              ? 'text-gray-500 line-through'
                              : 'text-gray-900'
                          }`}
                        >
                          <span className="sr-only">Langkah {idx + 1}: </span>
                          {teks}
                        </label>
                        {isChecked && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Sudah dilakukan
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Seksi 4 Kanal Lapor Resmi (Requirement 7.4) */}
          <div
            data-testid="seksi-kanal-lapor"
            className="space-y-3 pt-2 border-t border-gray-100"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900">
                Kanal Lapor Resmi:
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. IASC */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Indonesia Anti-Scam Centre (IASC)
                  </h5>
                  <span className="text-[11px] font-mono font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                    iasc.ojk.go.id
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Laporan penipuan keuangan resmi dari OJK dan perbankan. Siapkan identitas korban, kronologi, nomor rekening pelaku, nilai kerugian, dan bukti transaksi. Semakin cepat melapor, semakin besar peluang dana diselamatkan.
                </p>
                <div className="pt-1">
                  <a
                    href="https://iasc.ojk.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Buka situs resmi Indonesia Anti-Scam Centre (IASC) di tab baru"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors min-h-[44px]"
                  >
                    <span>Buka Situs Resmi IASC</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* 2. Kontak OJK 157 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Kontak OJK 157
                  </h5>
                  <span className="text-[11px] font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                    157
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Layanan informasi dan pengaduan konsumen sektor jasa keuangan resmi dari Otoritas Jasa Keuangan.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="tel:157"
                    aria-label="Telepon 157"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 transition-colors min-h-[44px]"
                  >
                    <span>Telepon 157</span>
                  </a>
                  <a
                    href="https://wa.me/6281157157157"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp OJK"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors min-h-[44px]"
                  >
                    <span>WhatsApp OJK</span>
                  </a>
                </div>
              </div>

              {/* 3. Call Center Bank / Dompet Digital */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Call Center Bank / Dompet Digital
                  </h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hubungi call center resmi yang tertera di kartu ATM atau aplikasi mobile banking / dompet digitalmu untuk meminta pemblokiran rekening atau akun.
                </p>
                <div className="text-xs font-semibold text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
                  Nomor resmi di kartu ATM atau aplikasi resmi
                </div>
              </div>

              {/* 4. Fitur Laporkan di Platform Pesan */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Fitur Laporkan di Platform Pesan
                  </h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Gunakan fitur Laporkan (Report) dan Blokir (Block) pada WhatsApp, Telegram, Instagram, TikTok, atau platform tempat pesan diterima.
                </p>
                <div className="text-xs font-semibold text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
                  Fitur Laporkan & Blokir di aplikasi
                </div>
              </div>
            </div>
          </div>

          {/* Peringatan Resmi Mengaku IASC (Requirement 7.5) */}
          <div
            data-testid="peringatan-resmi-iasc"
            className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start gap-3 shadow-sm"
            role="alert"
          >
            <div className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-amber-950">
              <p className="font-bold">Peringatan Penting:</p>
              <p className="leading-relaxed font-medium">
                {langkahDarurat.peringatan}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PanelDarurat;
