import React from 'react';
import type { Temuan, SumberTemuan } from '@/lib/hasil';

export interface KartuTemuanProps {
  temuan: Temuan;
  nomor?: number;
  className?: string;
}

export const SUMBER_TEMUAN_LABEL: Record<SumberTemuan, string> = {
  aturan: 'Pola penipuan',
  ai: 'Analisis AI',
  safe_browsing: 'Google Safe Browsing',
  rdap: 'Data Domain (RDAP)',
  virustotal: 'VirusTotal',
  reality_defender: 'Reality Defender',
};

const SUMBER_BADGE_STYLE: Record<SumberTemuan, string> = {
  aturan: 'bg-blue-50 text-blue-800 border-blue-200',
  ai: 'bg-purple-50 text-purple-800 border-purple-200',
  safe_browsing: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rdap: 'bg-sky-50 text-sky-800 border-sky-200',
  virustotal: 'bg-amber-50 text-amber-800 border-amber-200',
  reality_defender: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

export function getLabelSumber(sumber: SumberTemuan): string {
  return SUMBER_TEMUAN_LABEL[sumber] ?? sumber;
}

export function KartuTemuan({ temuan, nomor, className = '' }: KartuTemuanProps) {
  const labelSumber = getLabelSumber(temuan.sumber);
  const badgeStyle =
    SUMBER_BADGE_STYLE[temuan.sumber] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  const adaBukti = Boolean(temuan.bukti && temuan.bukti.trim().length > 0);

  return (
    <article
      data-testid="kartu-temuan"
      className={`rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm space-y-3 ${className}`.trim()}
      aria-label={
        nomor !== undefined
          ? `Temuan ${nomor}: ${temuan.judul}`
          : `Temuan: ${temuan.judul}`
      }
    >
      {/* ===== HEADER: JUDUL TEMUAN DAN BADGE SUMBER ===== */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {nomor !== undefined && (
            <span
              data-testid="nomor-temuan"
              className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-1.5 rounded-md bg-red-50 text-red-800 border border-red-200 text-xs font-bold shrink-0"
              aria-label={`Temuan nomor ${nomor}`}
            >
              #{nomor}
            </span>
          )}
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
            {temuan.judul}
          </h3>
        </div>

        <span
          data-testid="badge-sumber"
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${badgeStyle}`}
          aria-label={`Sumber: ${labelSumber}`}
        >
          {labelSumber}
        </span>
      </header>

      <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
        {temuan.penjelasan}
      </p>

      {adaBukti && (
        <div className="pt-1" data-testid="kotak-bukti">
          <div className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
              aria-hidden="true"
            />
            <span>Bukti yang terdeteksi:</span>
          </div>
          <blockquote
            className="bg-amber-50/90 border-l-4 border-amber-500 rounded-r-lg p-3 text-xs sm:text-sm text-gray-900 font-mono break-words shadow-sm overflow-x-auto"
            aria-label="Kutipan bukti temuan"
          >
            <code className="text-gray-900 font-mono select-all">
              {temuan.bukti}
            </code>
          </blockquote>
        </div>
      )}
    </article>
  );
}

export default KartuTemuan;
