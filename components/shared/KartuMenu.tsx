import React from 'react';
import Link from 'next/link';

export interface KartuMenuProps {
  nomor: number | string;
  judul: string;
  deskripsi: string;
  href: string;
  ikon?: React.ReactNode;
  badge?: string;
  className?: string;
}

/**
 * Komponen kartu menu navigasi di halaman Beranda.
 * Menghubungkan pengguna ke halaman Cek Chat, Cek Link, atau Cek Video & Suara.
 *
 * Fitur & Aksesibilitas:
 * - Menggunakan Next.js <Link href={href}>
 * - Target sentuh minimal 44px (Requirement 27.2)
 * - Tampilan full-width, stackable vertikal, responsif di layar mobile 360px hingga desktop (Requirement 3.1, 27.1)
 * - Nomor / badge penanda kartu yang jelas (Requirement 3.1)
 * - Judul kartu yang menonjol dan deskripsi singkat (Requirement 3.2)
 * - Tombol aksi / panah navigasi yang jelas
 * - Hover state dan focus-visible styling yang ramah navigasi keyboard (WCAG AA)
 *
 * References: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 27.2
 */
export function KartuMenu({
  nomor,
  judul,
  deskripsi,
  href,
  ikon,
  badge,
  className = '',
}: KartuMenuProps): React.JSX.Element {
  return (
    <Link
      href={href}
      data-testid="kartu-menu"
      aria-label={`Menu ${nomor}: ${judul}`}
      className={`group block w-full rounded-2xl border border-transparent bg-limestone p-4 pl-5 sm:p-6 lg:p-8 transition-colors duration-200 hover:bg-ember hover:border-blue-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-h-[44px] ${className}`.trim()}
    >
      <div className="flex items-start sm:items-center justify-between gap-3.5 sm:gap-5">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 flex-1 min-w-0">
          {/* Penanda Nomor & Ikon Kartu */}
          <div
            data-testid="kartu-menu-penanda"
            className="relative flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-obsidian text-limestone transition-colors duration-200"
            aria-hidden="true"
          >
            {ikon ? (
              <>
                <span
                  data-testid="kartu-menu-ikon"
                  className="w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center transition-colors"
                >
                  {ikon}
                </span>
                <span
                  data-testid="kartu-menu-nomor"
                  className="absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-sulfur text-obsidian text-xs"
                >
                  {nomor}
                </span>
              </>
            ) : (
              <span
                data-testid="kartu-menu-nomor"
                className="font-bold text-lg sm:text-xl"
              >
                {nomor}
              </span>
            )}
          </div>

          {/* Konten Teks: Judul, Badge, dan Deskripsi */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-4xl sm:text-5xl text-gray-900 leading-none">
                {judul}
              </h3>
              {badge && (
                <span
                  data-testid="kartu-menu-badge"
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm sm:text-base text-gray-600 group-hover:text-obsidian leading-relaxed max-w-[60ch]">
              {deskripsi}
            </p>
          </div>
        </div>

        {/* Tombol aksi / panah navigasi */}
        <div
          data-testid="kartu-menu-panah"
          className="flex-shrink-0 self-center text-obsidian group-hover:translate-x-1 transition-transform duration-200 min-w-[24px]"
          aria-hidden="true"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default KartuMenu;
