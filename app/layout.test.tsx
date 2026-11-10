// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import RootLayout, { metadata, viewport } from './layout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next/font/local', () => ({
  default: (options: { variable: string }) => ({
    variable: options.variable,
    className: `mocked-font-${options.variable.replace('--font-', '')}`,
  }),
}));

describe('app/layout.tsx — Root Layout, Header, Footer & Metadata (Task 4.1)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Metadata & Viewport Configuration (Requirements 1.1, 1.3)', () => {
    it('mengekspor metadata dengan title sesuai spesifikasi', () => {
      expect(metadata.title).toBe(
        'Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan'
      );
    });

    it('mengekspor metadata description dalam bahasa Indonesia', () => {
      expect(metadata.description).toBeDefined();
      expect(typeof metadata.description).toBe('string');
      expect(metadata.description).toContain('Cek Penipuan');
      expect(metadata.description).toContain('mencurigakan');
    });

    it('mengekspor metadata openGraph dengan konfigurasi lengkap', () => {
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.title).toBe(
        'Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan'
      );
      expect((metadata.openGraph as Record<string, unknown>)?.type).toBe('website');
      expect(metadata.openGraph?.locale).toBe('id_ID');
      expect(metadata.openGraph?.siteName).toBe('Cek Penipuan');
    });

    it('mengekspor metadata twitter card', () => {
      expect(metadata.twitter).toBeDefined();
      expect((metadata.twitter as Record<string, unknown>)?.card).toBe('summary_large_image');
      expect(metadata.twitter?.title).toBe(
        'Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan'
      );
    });

    it('mengekspor viewport yang mendukung responsivitas mobile (Requirement 1.4)', () => {
      expect(viewport).toBeDefined();
      expect(viewport.width).toBe('device-width');
      expect(viewport.initialScale).toBe(1);
    });
  });

  describe('Rendering Struktur RootLayout', () => {
    it('merender elemen children di dalam tag main', () => {
      render(
        <RootLayout>
          <div data-testid="test-child-content">Konten Pengujian Halaman</div>
        </RootLayout>
      );

      const child = screen.getByTestId('test-child-content');
      expect(child).toBeDefined();
      expect(child.textContent).toBe('Konten Pengujian Halaman');

      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeDefined();
      expect(mainElement.getAttribute('id')).toBe('main-content');
      expect(mainElement.contains(child)).toBe(true);
    });

    it('menyediakan skip link aksesibilitas menuju #main-content', () => {
      render(
        <RootLayout>
          <div>Konten</div>
        </RootLayout>
      );

      const skipLink = screen.getByText('Menuju ke konten utama');
      expect(skipLink).toBeDefined();
      expect(skipLink.getAttribute('href')).toBe('#main-content');
      expect(skipLink.classList.contains('sr-only')).toBe(true);
    });

    it('merender Header navigasi bersama (Requirement 1.1)', () => {
      render(
        <RootLayout>
          <div>Konten</div>
        </RootLayout>
      );

      const headerElement = screen.getByRole('banner');
      expect(headerElement).toBeDefined();

      expect(within(headerElement).getByText('Cek Penipuan')).toBeDefined();

      const navLinks = within(headerElement).getAllByRole('link');
      const hrefs = navLinks.map((link) => link.getAttribute('href'));

      expect(hrefs).toContain('/cek-chat');
      expect(hrefs).toContain('/cek-link');
      expect(hrefs).toContain('/cek-video-suara');
    });

    it('merender Footer bersama dengan tautan cara kerja dan catatan 18+ (Requirement 1.3)', () => {
      render(
        <RootLayout>
          <div>Konten</div>
        </RootLayout>
      );

      const footerElement = screen.getByRole('contentinfo');
      expect(footerElement).toBeDefined();

      const caraKerjaLink = screen.getByRole('link', {
        name: /cara kerja dan batasan/i,
      });
      expect(caraKerjaLink).toBeDefined();
      expect(caraKerjaLink.getAttribute('href')).toBe('/#cara-kerja');

      expect(screen.getByText(/18 tahun ke atas/i)).toBeDefined();

      expect(screen.getByText(/Google Gemini/i)).toBeDefined();
      expect(screen.getByText(/Google Safe Browsing/i)).toBeDefined();
      expect(screen.getByText(/RDAP/i)).toBeDefined();
    });

    it('menerapkan kelas styling responsif untuk mendukung lebar 360px hingga desktop tanpa horizontal scroll (Requirement 1.4)', () => {
      const { container } = render(
        <RootLayout>
          <div>Konten</div>
        </RootLayout>
      );

      const main = container.querySelector('main');
      expect(main).toBeDefined();
      expect(main?.classList.contains('w-full')).toBe(true);
      expect(main?.classList.contains('max-w-5xl')).toBe(true);
      expect(main?.classList.contains('mx-auto')).toBe(true);
      expect(main?.classList.contains('px-4')).toBe(true);

      const body = container.querySelector('body') || container.firstElementChild;
      expect(body?.classList.contains('min-h-screen')).toBe(true);
      expect(body?.classList.contains('flex')).toBe(true);
      expect(body?.classList.contains('flex-col')).toBe(true);
      expect(body?.classList.contains('overflow-x-hidden')).toBe(true);
    });
  });
});
