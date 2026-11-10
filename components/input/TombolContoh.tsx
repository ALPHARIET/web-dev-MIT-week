'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { FormatDataHasil, Temuan } from '../../lib/hasil';
import chatContohData from '../../data/contoh/chat-contoh.json';
import linkContohData from '../../data/contoh/link-contoh.json';
import videoContohData from '../../data/contoh/video-contoh.json';

export type HalamanContoh = 'chat' | 'link' | 'video';

export interface SkenarioChat {
  id: string;
  judul: string;
  teks: string;
  konteks?: string;
  hasilSimulasi: FormatDataHasil;
}

export interface SkenarioLink {
  id: string;
  judul: string;
  url: string;
  responsSimulasi: {
    safeBrowsing: {
      ditemukan: boolean;
      ancaman: string[];
    };
    rdap: {
      tersedia: boolean;
      tanggalRegistrasi?: string;
      umurHari?: number;
    };
    leksikal: Temuan[];
  };
  hasilSimulasi: FormatDataHasil;
}

export interface SkenarioVideo {
  id: string;
  judul: string;
  situasi: 'video_call' | 'rekaman' | 'tokoh';
  jawaban: Record<string, string | boolean>;
  hasilSimulasi: FormatDataHasil;
}

export type SkenarioContoh = SkenarioChat | SkenarioLink | SkenarioVideo;

export interface TombolContohProps {
  halaman: HalamanContoh;
  onPilihContoh?: (contoh: SkenarioContoh) => void;
  onContohDipilih?: (contoh: SkenarioContoh) => void;
  className?: string;
}

export function getDaftarContoh(halaman: HalamanContoh): SkenarioContoh[] {
  switch (halaman) {
    case 'chat':
      return (chatContohData.skenario as SkenarioChat[]) || [];
    case 'link':
      return (linkContohData.skenario as SkenarioLink[]) || [];
    case 'video':
      return (videoContohData.skenario as SkenarioVideo[]) || [];
    default:
      return [];
  }
}

export function TombolContoh({
  halaman,
  onPilihContoh,
  onContohDipilih,
  className = '',
}: TombolContohProps): React.JSX.Element {
  const skenarioList = useMemo(() => getDaftarContoh(halaman), [halaman]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setCurrentIndex(null);
    setIsOpen(false);
  }, [halaman]);

  const triggerPilihSkenario = (scenario: SkenarioContoh, index: number) => {
    setCurrentIndex(index);
    setIsOpen(false);
    onPilihContoh?.(scenario);
    onContohDipilih?.(scenario);
  };

  const handleCycleNext = () => {
    if (skenarioList.length === 0) return;
    const nextIndex =
      currentIndex === null || currentIndex >= skenarioList.length - 1
        ? 0
        : currentIndex + 1;
    triggerPilihSkenario(skenarioList[nextIndex], nextIndex);
  };

  const handleSelectOption = (index: number) => {
    if (skenarioList[index]) {
      triggerPilihSkenario(skenarioList[index], index);
    }
  };

  const handleReset = () => {
    setCurrentIndex(null);
  };

  const currentScenario =
    currentIndex !== null && skenarioList[currentIndex]
      ? skenarioList[currentIndex]
      : null;

  return (
    <div
      ref={containerRef}
      data-testid="tombol-contoh-wrapper"
      className={`relative inline-flex flex-col gap-2 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* ===== TOMBOL UTAMA: COBA CONTOH ===== */}
        <button
          type="button"
          onClick={handleCycleNext}
          data-testid="tombol-coba-contoh"
          className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:bg-blue-200 transition-colors shadow-sm"
          aria-label="Coba contoh skenario fiktif"
        >
          <svg
            className="w-4 h-4 text-blue-600 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
          <span>Coba contoh</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-testid="tombol-pilih-dropdown"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Pilih skenario contoh dari daftar"
          title="Pilih skenario contoh dari daftar"
          className="inline-flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:bg-blue-200 transition-colors shadow-sm"
        >
          <svg
            className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {currentScenario && (
        <div
          data-testid="skenario-aktif"
          className="inline-flex items-center justify-between gap-2 px-3 py-2 bg-blue-50/80 border border-blue-200 rounded-lg text-xs sm:text-sm text-blue-900 shadow-xs animate-fadeIn"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-blue-600 flex-shrink-0">
              Contoh ({currentIndex! + 1}/{skenarioList.length}):
            </span>
            <span
              data-testid="skenario-aktif-judul"
              className="font-medium text-gray-900 truncate"
            >
              {currentScenario.judul}
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            data-testid="tombol-reset-contoh"
            aria-label="Hapus tanda contoh aktif"
            title="Hapus tanda contoh aktif"
            className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ===== MENU DROPDOWN PILIHAN SKENARIO ===== */}
      {isOpen && (
        <div
          data-testid="menu-skenario"
          role="menu"
          aria-label="Daftar skenario contoh fiktif"
          className="absolute left-0 top-full mt-1.5 w-72 sm:w-84 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-30 text-sm overflow-hidden"
        >
          <div className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
            Pilih Skenario Contoh
          </div>

          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {skenarioList.map((item, index) => {
              const isSelected = currentIndex === index;

              let subtext = '';
              if ('konteks' in item && item.konteks) {
                subtext = item.konteks;
              } else if ('url' in item && item.url) {
                subtext = item.url;
              } else if ('situasi' in item && item.situasi) {
                subtext = `Situasi: ${item.situasi.replace('_', ' ')}`;
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  data-testid={`opsi-skenario-${item.id}`}
                  onClick={() => handleSelectOption(index)}
                  className={`w-full text-left px-3.5 py-2.5 min-h-[44px] flex flex-col justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-inset ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="leading-snug">{item.judul}</span>
                    {isSelected && (
                      <span
                        data-testid="indikator-terpilih"
                        className="text-xs text-blue-600 font-bold flex-shrink-0"
                        aria-label="Skenario saat ini"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  {subtext && (
                    <span className="text-xs text-gray-500 font-normal truncate mt-0.5 max-w-full">
                      {subtext}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TombolContoh;
