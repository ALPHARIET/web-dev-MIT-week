// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import Home, { metadata } from './page';

describe('app/page.tsx — Halaman Beranda (Task 6.1)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Metadata Halaman Beranda', () => {
    it('mengekspor metadata dengan title dan description yang sesuai', () => {
      expect(metadata.title).toBe(
        'Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan'
      );
      expect(metadata.description).toBeDefined();
      expect(typeof metadata.description).toBe('string');
      expect(metadata.description).toContain('Cek dulu di sini');
      expect(metadata.description).toContain('tanpa login');
    });
  });

  describe('Bagian 1: Panel Panduan (Hero) (Requirements 2.1, 2.2, 2.3, 2.4, 27.1)', () => {
    it('merender panel panduan (hero) langsung tanpa memerlukan klik (Requirements 2.1, 2.2)', () => {
      render(<Home />);
      const heroSection = screen.getByTestId('hero-panduan');
      expect(heroSection).toBeDefined();
    });

    it('merender judul sambutan yang sesuai spesifikasi (Requirement 2.1)', () => {
      render(<Home />);
      const judul = screen.getByTestId('hero-judul');
      expect(judul.tagName.toLowerCase()).toBe('h1');
      expect(judul.textContent).toBe(
        'Ragu sama chat, link, atau video call yang kamu terima? Cek dulu di sini.'
      );
    });

    it('merender sambutan dan tujuan aplikasi (Requirement 2.1)', () => {
      render(<Home />);
      const tujuan = screen.getByTestId('hero-tujuan');
      expect(tujuan.textContent).toContain('potensi penipuan digital');
      expect(tujuan.textContent).toContain('secara mandiri');
      expect(tujuan.textContent).toContain('tingkat kewaspadaan');
      expect(tujuan.textContent).toContain('langkah tindakan');
    });

    it('merender 4 langkah cara pakai secara berurutan dan lengkap (Requirement 2.1)', () => {
      render(<Home />);
      const langkahContainer = screen.getByTestId('hero-langkah-list');
      expect(langkahContainer.children).toHaveLength(4);

      // Langkah 1
      const langkah1 = screen.getByTestId('hero-langkah-1');
      expect(langkah1.textContent).toContain('1');
      expect(langkah1.textContent).toContain('Pilih yang mau dicek');
      expect(langkah1.textContent).toContain('pesan chat, tautan web, atau panggilan video dan suara');

      // Langkah 2
      const langkah2 = screen.getByTestId('hero-langkah-2');
      expect(langkah2.textContent).toContain('2');
      expect(langkah2.textContent).toContain('Tempel isinya atau jawab beberapa pertanyaan');

      // Langkah 3
      const langkah3 = screen.getByTestId('hero-langkah-3');
      expect(langkah3.textContent).toContain('3');
      expect(langkah3.textContent).toContain('Lihat tanda bahaya dan alasannya');

      // Langkah 4
      const langkah4 = screen.getByTestId('hero-langkah-4');
      expect(langkah4.textContent).toContain('4');
      expect(langkah4.textContent).toContain('Ikuti langkah yang disarankan');
    });

    it('merender catatan privasi dengan poin wajib: tanpa login, tidak menyimpan isi, transparansi pihak ketiga, dan bukan keputusan akhir (Requirement 2.3)', () => {
      render(<Home />);
      const catatanPrivasi = screen.getByTestId('hero-catatan-privasi');
      const text = catatanPrivasi.textContent || '';

      expect(text).toContain('Tanpa login');
      expect(text).toContain('Kami tidak menyimpan isi yang kamu periksa');
      expect(text).toContain('Sebagian pengecekan dikirim ke layanan pihak ketiga');
      expect(text).toContain('selalu disebutkan sebelum menekan tombol Periksa');
      expect(text).toContain('membantu kamu menilai, bukan keputusan akhir');
    });

    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai janji hasil pada teks hero (Requirements 2.4, 30.1)', () => {
      render(<Home />);
      const heroSection = screen.getByTestId('hero-panduan');
      const text = (heroSection.textContent || '').toLowerCase();

      // Memeriksa kata terlarang
      expect(text).not.toContain('pasti aman');
      expect(text).not.toContain('terbukti aman');
      expect(text).not.toContain('100%');
      expect(text).not.toContain('terbukti');
      expect(text).not.toContain('dijamin');
      expect(/\bpasti\b/i.test(text)).toBe(false);
      expect(/\baman\b/i.test(text)).toBe(false);
    });
  });

  describe('Bagian 2: Tiga Kartu Menu Bertumpuk Vertikal (Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 27.2)', () => {
    it('merender tepat tiga kartu menu di dalam container (Requirement 3.1)', () => {
      render(<Home />);
      const menuContainer = screen.getByTestId('menu-kartu-container');
      const kartuList = within(menuContainer).getAllByTestId('kartu-menu');
      expect(kartuList).toHaveLength(3);
    });

    it('merender Kartu 1: Cek Chat yang mengarah ke /cek-chat (Requirements 3.1, 3.2, 3.3)', () => {
      render(<Home />);
      const menuContainer = screen.getByTestId('menu-kartu-container');
      const kartuList = within(menuContainer).getAllByTestId('kartu-menu');
      const kartuChat = kartuList[0];

      expect(kartuChat.getAttribute('href')).toBe('/cek-chat');
      expect(kartuChat.textContent).toContain('Cek Chat');
      expect(kartuChat.textContent).toContain('Tempel isi chat atau unggah screenshot');
      expect(kartuChat.textContent).toContain('1');
    });

    it('merender Kartu 2: Cek Link yang mengarah ke /cek-link (Requirements 3.1, 3.2, 3.4)', () => {
      render(<Home />);
      const menuContainer = screen.getByTestId('menu-kartu-container');
      const kartuList = within(menuContainer).getAllByTestId('kartu-menu');
      const kartuLink = kartuList[1];

      expect(kartuLink.getAttribute('href')).toBe('/cek-link');
      expect(kartuLink.textContent).toContain('Cek Link');
      expect(kartuLink.textContent).toContain('Periksa alamat link tanpa membukanya');
      expect(kartuLink.textContent).toContain('2');
    });

    it('merender Kartu 3: Cek Video & Suara yang mengarah ke /cek-video-suara (Requirements 3.1, 3.2, 3.5)', () => {
      render(<Home />);
      const menuContainer = screen.getByTestId('menu-kartu-container');
      const kartuList = within(menuContainer).getAllByTestId('kartu-menu');
      const kartuVideo = kartuList[2];

      expect(kartuVideo.getAttribute('href')).toBe('/cek-video-suara');
      expect(kartuVideo.textContent).toContain('Cek Video & Suara');
      expect(kartuVideo.textContent).toContain('Jawab beberapa pertanyaan tentang video call');
      expect(kartuVideo.textContent).toContain('3');
    });

    it('memastikan semua kartu menu memiliki ukuran target sentuh minimal 44px (Requirement 27.2)', () => {
      render(<Home />);
      const menuContainer = screen.getByTestId('menu-kartu-container');
      const kartuList = within(menuContainer).getAllByTestId('kartu-menu');

      kartuList.forEach((kartu) => {
        expect(kartu.className).toContain('min-h-[44px]');
      });
    });
  });

  describe('Bagian 3: Akordeon "Cara kerja dan batasan" (Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 30.1)', () => {
    it('merender section akordeon dengan id="cara-kerja" di bawah kartu menu (Requirement 4.1)', () => {
      render(<Home />);
      const sectionCaraKerja = screen.getByTestId('section-cara-kerja');
      expect(sectionCaraKerja.getAttribute('id')).toBe('cara-kerja');

      const judul = screen.getByTestId('cara-kerja-judul');
      expect(judul.textContent).toContain('Cara kerja dan batasan');
    });

    it('memuat minimal 3 item akordeon (Requirements 4.1, 4.2, 4.3, 4.4)', () => {
      render(<Home />);
      const headerPenilaian = screen.getByTestId('akordeon-header-cara-penilaian');
      const headerBatasan = screen.getByTestId('akordeon-header-batasan-deteksi');
      const headerData = screen.getByTestId('akordeon-header-data-dan-privasi');

      expect(headerPenilaian).toBeDefined();
      expect(headerBatasan).toBeDefined();
      expect(headerData).toBeDefined();

      const allHeaders = screen.getAllByTestId(/^akordeon-header-/);
      expect(allHeaders.length).toBeGreaterThanOrEqual(3);
    });

    it('menjelaskan cara penilaian tiap halaman cek di item akordeon 1 (Requirement 4.2)', () => {
      render(<Home />);
      const headerPenilaian = screen.getByTestId('akordeon-header-cara-penilaian');
      fireEvent.click(headerPenilaian);

      const konten = screen.getByTestId('akordeon-konten-cara-penilaian');
      const text = konten.textContent || '';

      // Aturan lokal di browser
      expect(text).toContain('Aturan lokal di browser');
      // AI Gemini
      expect(text).toContain('AI Gemini');
      // Google Safe Browsing
      expect(text).toContain('Google Safe Browsing');
      // Layanan Data Domain (RDAP)
      expect(text).toContain('Layanan Data Domain (RDAP)');
      // Skor ambang batas dan 3 tingkat kewaspadaan
      expect(text).toContain('ambang batas');
      expect(text).toContain('Waspada tinggi');
      expect(text).toContain('Perlu hati-hati');
      expect(text).toContain('Tidak ditemukan tanda bahaya');
    });

    it('menjelaskan batasan deteksi di item akordeon 2 (Requirement 4.3)', () => {
      render(<Home />);
      const headerBatasan = screen.getByTestId('akordeon-header-batasan-deteksi');
      fireEvent.click(headerBatasan);

      const konten = screen.getByTestId('akordeon-konten-batasan-deteksi');
      const text = konten.textContent || '';

      // Hal yang tidak bisa dideteksi
      expect(text).toContain('Hal-hal yang tidak bisa dideteksi');
      expect(text).toContain('rekening bank asli');
      // Bukan jaminan mutlak
      expect(text).toContain('Bukan jaminan mutlak');
      // False positive & negative
      expect(text).toContain('positif palsu');
      expect(text).toContain('negatif palsu');
    });

    it('menjelaskan data apa yang dikirim ke mana di item akordeon 3 (Requirement 4.4)', () => {
      render(<Home />);
      const headerData = screen.getByTestId('akordeon-header-data-dan-privasi');
      fireEvent.click(headerData);

      const konten = screen.getByTestId('akordeon-konten-data-dan-privasi');
      const text = konten.textContent || '';

      // Sensor otomatis
      expect(text).toContain('Sensor otomatis di browser');
      expect(text).toContain('[disensor]');
      // Tanpa login
      expect(text).toContain('Tanpa login');
      // Layanan pihak ketiga
      expect(text).toContain('Google Gemini');
      expect(text).toContain('Google Safe Browsing');
      expect(text).toContain('RDAP');
    });

    it('membuka dan menutup isi akordeon saat judul diklik (Requirement 4.5)', () => {
      render(<Home />);
      const headerPenilaian = screen.getByTestId('akordeon-header-cara-penilaian');
      const kontenPenilaian = screen.getByTestId('akordeon-konten-cara-penilaian');

      // Awalnya tertutup
      expect(headerPenilaian.getAttribute('aria-expanded')).toBe('false');
      expect(kontenPenilaian.hasAttribute('hidden')).toBe(true);

      // Klik 1: Terbuka
      fireEvent.click(headerPenilaian);
      expect(headerPenilaian.getAttribute('aria-expanded')).toBe('true');
      expect(kontenPenilaian.hasAttribute('hidden')).toBe(false);

      // Klik 2: Tertutup kembali
      fireEvent.click(headerPenilaian);
      expect(headerPenilaian.getAttribute('aria-expanded')).toBe('false');
      expect(kontenPenilaian.hasAttribute('hidden')).toBe(true);
    });

    it('memastikan teks akordeon bebas kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan (Requirement 4.1, 30.1)', () => {
      render(<Home />);
      const sectionCaraKerja = screen.getByTestId('section-cara-kerja');
      const text = (sectionCaraKerja.textContent || '').toLowerCase();

      // Verifikasi kata terlarang tidak muncul sebagai klaim/kesimpulan
      expect(text).not.toContain('pasti aman');
      expect(text).not.toContain('terbukti aman');
      expect(text).not.toContain('100%');
      expect(text).not.toContain('terbukti');
      expect(text).not.toContain('dijamin');
      expect(/\bpasti\b/i.test(text)).toBe(false);
      // Kecuali Safe Browsing (frasa bahasa Inggris)
      const nonSafeBrowsingText = text.replace(/safe browsing/g, '');
      expect(/\baman\b/i.test(nonSafeBrowsingText)).toBe(false);
    });
  });

  describe('Responsivitas Layout (Requirement 27.1)', () => {
    it('menggunakan struktur responsif untuk mendukung lebar 360px hingga desktop', () => {
      const { container } = render(<Home />);
      const outerWrapper = container.firstElementChild as HTMLElement;

      expect(outerWrapper).toBeDefined();
      expect(outerWrapper.classList.contains('w-full')).toBe(true);
      expect(outerWrapper.classList.contains('space-y-8')).toBe(true);
    });
  });
});
