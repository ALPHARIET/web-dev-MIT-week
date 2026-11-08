// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Footer from './Footer';

describe('components/layout/Footer.tsx (Requirement 1.3, 1.4, 27.2)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Rendering Dasar & Konten (Requirement 1.3)', () => {
    it('merender elemen footer semantik role="contentinfo"', () => {
      render(<Footer />);
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeDefined();
    });

    it('memuat tautan ke bagian "Cara kerja dan batasan" di Beranda (/#cara-kerja)', () => {
      render(<Footer />);
      const caraKerjaLink = screen.getByRole('link', { name: /cara kerja dan batasan deteksi/i });
      expect(caraKerjaLink).toBeDefined();
      expect(caraKerjaLink.getAttribute('href')).toBe('/#cara-kerja');
    });

    it('memuat catatan "untuk pengguna 18 tahun ke atas" secara eksplisit', () => {
      render(<Footer />);
      expect(screen.getByText(/18 tahun ke atas/i)).toBeDefined();
    });

    it('memuat daftar layanan pihak ketiga lengkap (Google Gemini, Google Safe Browsing, RDAP)', () => {
      render(<Footer />);
      expect(screen.getByText(/Google Gemini/i)).toBeDefined();
      expect(screen.getByText(/Google Safe Browsing/i)).toBeDefined();
      expect(screen.getByText(/RDAP/i)).toBeDefined();
    });

    it('memuat navigasi tautan ke ketiga halaman cek', () => {
      render(<Footer />);
      const chatLink = screen.getByRole('link', { name: /pesan chat mencurigakan/i });
      const linkCheck = screen.getByRole('link', { name: /tautan \(link \/ url\)/i });
      const videoLink = screen.getByRole('link', { name: /panggilan video & suara/i });

      expect(chatLink.getAttribute('href')).toBe('/cek-chat');
      expect(linkCheck.getAttribute('href')).toBe('/cek-link');
      expect(videoLink.getAttribute('href')).toBe('/cek-video-suara');
    });

    it('tidak menggunakan kata-kata terlarang ("aman", "pasti", "terbukti", "100%") sebagai janji hasil (Requirement 2.4)', () => {
      const { container } = render(<Footer />);
      const text = container.textContent?.toLowerCase() || '';

      // Periksa bahwa kata tidak dipakai sembarangan
      expect(text).not.toContain('pasti aman');
      expect(text).not.toContain('terbukti aman');
      expect(text).not.toContain('100%');
    });
  });

  describe('Aksesibilitas & Target Sentuh (Requirement 1.5, 27.2)', () => {
    it('memiliki target sentuh minimal 44px pada setiap tautan interaktif', () => {
      render(<Footer />);
      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        expect(link.classList.contains('min-h-[44px]')).toBe(true);
      });
    });

    it('memiliki focus ring yang jelas untuk navigasi keyboard', () => {
      render(<Footer />);
      const links = screen.getAllByRole('link');

      links.forEach((link) => {
        expect(link.classList.contains('focus:ring-2')).toBe(true);
      });
    });
  });
});
