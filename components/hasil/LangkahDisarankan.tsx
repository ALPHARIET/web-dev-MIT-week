'use client';

import React, { useState } from 'react';

/**
 * Daftar langkah pencegahan umum sebagai cadangan (fallback)
 * ketika data langkah kosong atau kurang dari batas minimal 2 langkah.
 * Mematuhi aturan tanpa kata terlarang (aman, pasti, terbukti, 100%).
 */
export const FALLBACK_LANGKAH: string[] = [
  'Jangan terburu-buru mengambil keputusan, mentransfer dana, atau memberikan data pribadi apa pun.',
  'Lakukan verifikasi secara mandiri melalui saluran resmi yang terpisah dan terpercaya sebelum melanjutkan interaksi.',
];

/**
 * Memvalidasi dan memastikan daftar langkah minimal memuat 2 langkah tindakan.
 * Jika kosong atau invalid, mengembalikan langkah pencegahan umum (fallback).
 */
export function validasiLangkah(langkah?: string[]): string[] {
  if (!langkah || !Array.isArray(langkah)) {
    return FALLBACK_LANGKAH;
  }

  const filtered = langkah
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  if (filtered.length === 0) {
    return FALLBACK_LANGKAH;
  }

  if (filtered.length === 1) {
    return [filtered[0], FALLBACK_LANGKAH[1]];
  }

  return filtered;
}

export interface LangkahDisarankanProps {
  /** Daftar instruksi langkah tindakan */
  langkah?: string[];
  /** Kelas CSS tambahan opsional untuk penyesuaian layout */
  className?: string;
  /** Callback opsional saat status centang pada salah satu langkah diubah */
  onToggle?: (index: number, checked: boolean) => void;
}

/**
 * Komponen LangkahDisarankan
 * Menampilkan daftar tindakan praktis yang disarankan dalam format numbered list interaktif
 * dengan indikator progres dinamis, target sentuh WCAG AA (min 44px),
 * serta opsi untuk menyalin rangkuman tindakan.
 *
 * References: Requirements 5.4, 6.1, 27.2, 27.3
 */
export default function LangkahDisarankan({
  langkah,
  className = '',
  onToggle,
}: LangkahDisarankanProps) {
  const items = validasiLangkah(langkah);
  const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});
  const [salinStatus, setSalinStatus] = useState<boolean>(false);

  const completedCount = items.filter((_, idx) => Boolean(checkedState[idx])).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleToggle = (index: number) => {
    setCheckedState((prev) => {
      const nextVal = !prev[index];
      const updated = { ...prev, [index]: nextVal };
      onToggle?.(index, nextVal);
      return updated;
    });
  };

  const handleSalinRingkasan = async () => {
    const lines = items.map((teks, idx) => {
      const status = checkedState[idx] ? '[Selesai]' : '[Belum]';
      return `${status} Langkah ${idx + 1}: ${teks}`;
    });

    const output = `Catatan Tindakan Pencegahan:\n${lines.join('\n')}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(output);
        setSalinStatus(true);
        setTimeout(() => setSalinStatus(false), 2500);
      }
    } catch {
      // Fallback diam jika clipboard tidak didukung
    }
  };

  return (
    <section
      aria-labelledby="langkah-disarankan-title"
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm ${className}`}
      data-testid="langkah-disarankan-section"
    >
      {/* Header Bagian */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Ikon Tindakan / Checklist Header */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-700 shrink-0"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div>
            <h3
              id="langkah-disarankan-title"
              className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight"
            >
              Langkah yang disarankan
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Ikuti tindakan praktis berikut secara berurutan untuk mencegah risiko:
            </p>
          </div>
        </div>

        {/* Status Singkat Selesai */}
        {completedCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            {completedCount} dari {items.length} diselesaikan
          </span>
        )}
      </div>

      {/* Interactive Progress Bar */}
      <div
        className="mb-4 p-3 sm:p-3.5 bg-gray-50 rounded-xl border border-gray-200"
        aria-label="Progres langkah tindakan pencegahan"
      >
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                completedCount === items.length
                  ? 'bg-emerald-600'
                  : completedCount > 0
                  ? 'bg-blue-600'
                  : 'bg-gray-400'
              }`}
              aria-hidden="true"
            />
            <span>
              {completedCount === items.length
                ? 'Semua langkah pencegahan telah ditandai'
                : `${completedCount} dari ${items.length} tindakan selesai`}
            </span>
          </span>
          <span
            className={`font-bold tabular-nums ${
              completedCount === items.length ? 'text-emerald-700' : 'text-blue-700'
            }`}
          >
            {progressPercent}%
          </span>
        </div>

        {/* Progress Track */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progres tindakan: ${progressPercent} persen`}
          className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-300 ease-out rounded-full ${
              completedCount === items.length ? 'bg-emerald-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Numbered List Langkah Tindakan */}
      <ol className="space-y-3" role="list">
        {items.map((teks, index) => {
          const isChecked = Boolean(checkedState[index]);
          const inputId = `langkah-check-${index}`;

          return (
            <li
              key={index}
              data-testid={`langkah-item-${index}`}
              className={`flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border transition-all ${
                isChecked
                  ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Nomor Bulat yang Jelas (1, 2, 3...) */}
              <span
                aria-hidden="true"
                data-testid={`langkah-nomor-${index}`}
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 shadow-sm transition-colors ${
                  isChecked
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-700 text-white'
                }`}
              >
                {index + 1}
              </span>

              {/* Teks Instruksi Praktis (WCAG AA Contrast) */}
              <div className="flex-1 min-w-0 pt-0.5">
                <label
                  htmlFor={inputId}
                  className={`block text-sm sm:text-base leading-relaxed font-medium cursor-pointer select-none transition-colors ${
                    isChecked
                      ? 'text-gray-600 line-through'
                      : 'text-gray-900'
                  }`}
                >
                  <span className="sr-only">Langkah {index + 1}: </span>
                  {teks}
                </label>

                {/* Status Selesai Badge */}
                {isChecked && (
                  <span
                    className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"
                    aria-live="polite"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Sudah dilakukan
                  </span>
                )}
              </div>

              {/* Kotak Checklist Tindakan (Target Sentuh Minimal 44px) */}
              <div className="flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] -m-2">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(index)}
                  aria-label={`Tandai langkah ${index + 1} sudah dilakukan: ${teks}`}
                  className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-2 focus:ring-offset-1 cursor-pointer transition-colors"
                />
              </div>
            </li>
          );
        })}
      </ol>

      {/* Footer Aksi Bermanfaat: Salin Catatan Tindakan */}
      <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-xs text-gray-700">
          Centang tindakan yang telah selesai Anda ambil untuk memantau progres pencegahan.
        </span>

        <button
          type="button"
          onClick={handleSalinRingkasan}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 min-h-[36px]"
          title="Salin daftar status tindakan pencegahan ke clipboard"
        >
          {salinStatus ? (
            <>
              <svg
                className="w-3.5 h-3.5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-700">Tersalin ke Clipboard!</span>
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Salin Catatan Tindakan</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
