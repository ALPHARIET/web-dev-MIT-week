'use client';

import React, { useEffect, useRef } from 'react';
import { SENSOR_PLACEHOLDER } from '@/lib/sensor';

export interface PratinjauSensorProps {
  isOpen: boolean;
  teksAsli: string;
  teksTersensor: string;
  jumlahDiganti: number;
  onKonfirmasi: () => void;
  onBatal: () => void;
  isLoading?: boolean;
  adaScreenshot?: boolean;
  className?: string;
}

export function renderTeksDenganHighlight(teks: string): React.ReactNode {
  if (!teks) {
    return <span className="text-gray-400 italic">Tidak ada teks yang dimasukkan.</span>;
  }

  const regex = /(\[disensor\])/g;
  const parts = teks.split(regex);

  return parts.map((part, index) => {
    if (part === SENSOR_PLACEHOLDER || part === '[disensor]') {
      return (
        <mark
          key={`badge-disensor-${index}`}
          data-testid="badge-disensor"
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-950 border border-amber-300 shadow-sm"
          title="Data sensitif telah disamarkan"
        >
          [disensor]
        </mark>
      );
    }
    return <React.Fragment key={`text-part-${index}`}>{part}</React.Fragment>;
  });
}

export function PratinjauSensor({
  isOpen,
  teksAsli,
  teksTersensor,
  jumlahDiganti,
  onKonfirmasi,
  onBatal,
  isLoading = false,
  adaScreenshot = false,
  className = '',
}: PratinjauSensorProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBatal();
        return;
      }

      if (e.key === 'Tab') {
        if (!dialogRef.current) return;

        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onBatal]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="modal-pratinjau-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onBatal();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pratinjau-sensor-title"
        aria-describedby="pratinjau-sensor-desc"
        tabIndex={-1}
        data-testid="modal-pratinjau-dialog"
        className={`relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER MODAL ===== */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/75">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2
                id="pratinjau-sensor-title"
                data-testid="modal-title"
                className="text-base sm:text-lg font-bold text-gray-900 leading-tight"
              >
                Pratinjau Sensor Data Sensitif
              </h2>
              <p className="text-xs text-gray-500">Perlindungan privasi sebelum pengiriman</p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-tutup-modal"
            onClick={onBatal}
            disabled={isLoading}
            aria-label="Tutup dialog"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ===== ISI MODAL ===== */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* ===== RINGKASAN JUMLAH DATA SENSITIF ===== */}
          <div
            data-testid="kotak-ringkasan"
            className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200"
          >
            <svg
              className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <p
                id="pratinjau-sensor-desc"
                data-testid="ringkasan-sensor"
                className="text-sm font-semibold text-blue-900"
              >
                {jumlahDiganti} data sensitif berhasil disensor sebelum dikirim
              </p>
              <p className="mt-0.5 text-xs text-blue-700">
                Data seperti nomor HP, rekening bank, email, dan kode OTP telah diganti dengan{' '}
                <span className="font-semibold text-amber-900 bg-amber-100 px-1 py-0.5 rounded border border-amber-300">
                  [disensor]
                </span>{' '}
                langsung di browser kamu.
              </p>
            </div>
          </div>

          {adaScreenshot && (
            <div
              role="alert"
              data-testid="peringatan-screenshot"
              className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200"
            >
              <svg
                className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Perhatian untuk tangkapan layar (screenshot):
                </p>
                <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                  Gambar tidak bisa disensor otomatis, potong atau tutup data pribadi seperti nama,
                  nomor rekening, atau wajah pada tangkapan layar sebelum dikirim.
                </p>
              </div>
            </div>
          )}

          {/* ===== KOTAK PRATINJAU TEKS TERSENSOR ===== */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pratinjau-konten-teks"
                className="text-xs font-semibold text-gray-700 uppercase tracking-wider"
              >
                Teks yang akan dikirim:
              </label>
              {jumlahDiganti > 0 && (
                <span className="text-xs text-amber-800 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Bagian bertanda kuning disensor
                </span>
              )}
            </div>

            <div
              id="pratinjau-konten-teks"
              data-testid="pratinjau-teks-tersensor"
              tabIndex={0}
              className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-56 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {renderTeksDenganHighlight(teksTersensor)}
            </div>
          </div>

          {teksAsli && (
            <details
              data-testid="detail-teks-asli"
              className="group border border-gray-200 rounded-xl bg-white overflow-hidden text-xs"
            >
              <summary
                data-testid="summary-teks-asli"
                className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 min-h-[44px] select-none transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Lihat perbandingan dengan teks asli
                </span>
                <span
                  data-testid="chevron-teks-asli"
                  className="text-gray-400 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                >
                  ▼
                </span>
              </summary>
              <div
                data-testid="konten-teks-asli"
                className="p-3.5 border-t border-gray-200 bg-gray-50 text-gray-700 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto"
              >
                {teksAsli}
              </div>
            </details>
          )}
        </div>

        {/* ===== FOOTER TOMBOL AKSI ===== */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            data-testid="btn-batal"
            onClick={onBatal}
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2.5 min-h-[44px] rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal / Edit Kembali
          </button>

          <button
            type="button"
            data-testid="btn-lanjut-periksa"
            onClick={onKonfirmasi}
            disabled={isLoading}
            aria-busy={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  data-testid="spinner-loading"
                  className="animate-spin w-4 h-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Lanjut Periksa</span>
                <svg
                  className="w-4 h-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PratinjauSensor;
