'use client';

import React, { useState } from 'react';

export interface ItemAkordeon {
  id: string;
  judul: string;
  konten: React.ReactNode;
}

export interface AkordeonProps {
  items: ItemAkordeon[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
}

/**
 * Komponen Akordeon reusable untuk menampilkan konten ekspandibel.
 * Digunakan pada halaman Beranda untuk bagian "Cara kerja dan batasan",
 * serta bagian informasi lain yang memerlukan pengelompokan konten bertahap.
 *
 * Fitur & Aksesibilitas:
 * - Buka/tutup dengan klik judul atau tombol Enter / Spasi
 * - Ikon panah (chevron) yang berputar saat terbuka (rotate-180)
 * - Accessible: atribut ARIA (`aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby`)
 * - Target sentuh tombol minimal 44px (Requirement 27.2: min-h-[44px])
 * - Dukungan `allowMultiple` untuk membuka lebih dari satu item sekaligus
 * - Dukungan `defaultOpenIds` untuk menentukan item yang terbuka secara bawaan
 *
 * References: Requirements 4.5, 27.2
 */
export function Akordeon({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className = '',
}: AkordeonProps): React.JSX.Element {
  const [openIds, setOpenIds] = useState<string[]>(() => {
    if (!defaultOpenIds || defaultOpenIds.length === 0) return [];
    return allowMultiple ? defaultOpenIds : defaultOpenIds.slice(0, 1);
  });

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.includes(id);
      if (allowMultiple) {
        return isOpen ? prev.filter((itemId) => itemId !== id) : [...prev, id];
      } else {
        return isOpen ? [] : [id];
      }
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    id: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      toggleItem(id);
    }
  };

  if (!items || items.length === 0) {
    return <div data-testid="akordeon-kosong" className={`w-full ${className}`.trim()} />;
  }

  return (
    <div
      data-testid="akordeon-container"
      className={`w-full space-y-3 ${className}`.trim()}
    >
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const headerId = `akordeon-header-${item.id}`;
        const contentId = `akordeon-konten-${item.id}`;

        return (
          <div
            key={item.id}
            data-testid={`akordeon-item-${item.id}`}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-colors duration-200"
          >
            <h3>
              <button
                type="button"
                id={headerId}
                data-testid={`akordeon-header-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => toggleItem(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors duration-200 min-h-[44px]"
              >
                <span className="text-base sm:text-lg font-semibold text-gray-900 pr-3 leading-snug">
                  {item.judul}
                </span>
                <span
                  data-testid={`akordeon-chevron-${item.id}`}
                  className={`flex-shrink-0 text-gray-500 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-600' : 'rotate-0'
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
            </h3>

            <div
              id={contentId}
              role="region"
              aria-labelledby={headerId}
              data-testid={`akordeon-konten-${item.id}`}
              hidden={!isOpen}
              className={`px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-gray-600 text-sm sm:text-base leading-relaxed border-t border-gray-100 ${
                !isOpen ? 'hidden' : ''
              }`}
            >
              {item.konten}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Akordeon;
