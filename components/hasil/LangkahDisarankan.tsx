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
 * Menampilkan daftar tindakan praktis yang disarankan dalam format numbered list
 * dengan bulatan angka yang jelas, teks kontras WCAG AA, dan kotak checklist tindakan.
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

  const handleToggle = (index: number) => {
    setCheckedState((prev) => {
      const nextVal = !prev[index];
      const updated = { ...prev, [index]: nextVal };
      onToggle?.(index, nextVal);
      return updated;
    });
  };

  return (
    <section
      aria-labelledby="langkah-disarankan-title"
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm ${className}`}
      data-testid="langkah-disarankan-section"
    >
      {/* Header Bagian */}
      <div className="flex items-center gap-3 mb-3">
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
        <h3
          id="langkah-disarankan-title"
          className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight"
        >
          Langkah yang disarankan
        </h3>
      </div>

      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        Ikuti tindakan praktis berikut secara berurutan untuk mencegah risiko:
      </p>

      {/* Numbered List Langkah Tindakan */}
      <ol className="space-y-3" role="list">
        {items.map((teks, index) => {
          const isChecked = Boolean(checkedState[index]);
          const inputId = `langkah-check-${index}`;

          return (
            <li
              key={index}
              data-testid={`langkah-item-${index}`}
              className={`flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl border transition-colors ${
                isChecked
                  ? 'bg-emerald-50/70 border-emerald-300'
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
    </section>
  );
}
