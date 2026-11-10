'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import PemanduKursor from '@/components/layout/PemanduKursor';
import logoFinal from './LogoFinal.png';

export interface HeaderProps {
  currentPath?: string;
}

export interface NavItem {
  label: string;
  href: string;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Cek Chat', href: '/cek-chat', id: 'nav-cek-chat' },
  { label: 'Cek Link', href: '/cek-link', id: 'nav-cek-link' },
  { label: 'Cek Video & Suara', href: '/cek-video-suara', id: 'nav-cek-video' },
];

export function Header({ currentPath }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Ambil pathname dari next/navigation atau prop currentPath jika disediakan
  let hookPathname = '';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    hookPathname = usePathname() || '';
  } catch {
    hookPathname = '';
  }
  const activePath = currentPath !== undefined ? currentPath : hookPathname;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full py-3">
      <div className="max-w-5xl lg:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
      <div className="relative">
      <div className="relative z-20 bg-limestone px-3 sm:px-4 rounded-[32px] shadow-xs">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Nama Aplikasi */}
          <div className="flex items-center">
            <div
              className="font-display flex items-center gap-2 text-obsidian text-xl sm:text-2xl"
            >
              <Image
                src={logoFinal}
                alt="Logo Cek Penipuan"
                width={32}
                height={32}
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0"
                priority
              />
              <span>Cek Penipuan</span>
            </div>
          </div>

          {/* Navigasi Desktop (lebar > 640px) */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden sm:flex sm:items-center sm:gap-1 sm:border-l-[1.5px] sm:border-dotted sm:border-obsidian/50 sm:pl-3"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activePath === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full transition-colors min-h-[44px] focus:outline-none ${
                    isActive
                      ? 'bg-ember text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Tombol Hamburger Menu Mobile (≤ 640px) */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] min-w-[44px]"
            >
              <span className="sr-only">
                {isMobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              </span>
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menu Mobile Terbuka */}
        {isMobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Navigasi Menu Mobile"
            className="sm:hidden border-t border-gray-200 py-3 space-y-1"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activePath === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={closeMobileMenu}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center px-4 py-3 text-base font-medium rounded-full transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    isActive
                      ? 'bg-ember text-white'
                      : 'text-obsidian hover:bg-pumice'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <PemanduKursor pathname={activePath} />
      </div>
      </div>
    </header>
  );
}

export default Header;
