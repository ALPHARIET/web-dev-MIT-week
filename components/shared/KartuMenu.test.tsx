import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { KartuMenu, type KartuMenuProps } from './KartuMenu';

describe('components/shared/KartuMenu.tsx (Task 4.11)', () => {
  const sampleCard1: KartuMenuProps = {
    nomor: 1,
    judul: 'Cek Chat',
    deskripsi:
      'Tempel isi chat atau unggah screenshot. Untuk tawaran kerja, permintaan OTP, atau pesan yang mengaku dari bank.',
    href: '/cek-chat',
  };

  const sampleCard2: KartuMenuProps = {
    nomor: 2,
    judul: 'Cek Link',
    deskripsi:
      'Periksa alamat link tanpa membukanya. Untuk link hadiah, verifikasi akun, atau link pendek.',
    href: '/cek-link',
  };

  const sampleCard3: KartuMenuProps = {
    nomor: 3,
    judul: 'Cek Video & Suara',
    deskripsi:
      'Jawab beberapa pertanyaan tentang video call, voice note, atau video tokoh yang kamu terima.',
    href: '/cek-video-suara',
  };

  describe('Rendering Tiga Kartu Menu Beranda (Requirements 3.1, 3.2, 3.3, 3.4, 3.5)', () => {
    it('merender Kartu 1: Cek Chat dengan judul, deskripsi, dan href="/cek-chat" (Requirement 3.3)', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('href="/cek-chat"');
      expect(html).toContain('Cek Chat');
      expect(html).toContain(
        'Tempel isi chat atau unggah screenshot. Untuk tawaran kerja, permintaan OTP, atau pesan yang mengaku dari bank.'
      );
      expect(html).toContain('data-testid="kartu-menu-nomor"');
      expect(html).toContain('1');
    });

    it('merender Kartu 2: Cek Link dengan judul, deskripsi, dan href="/cek-link" (Requirement 3.4)', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard2} />);
      expect(html).toContain('href="/cek-link"');
      expect(html).toContain('Cek Link');
      expect(html).toContain(
        'Periksa alamat link tanpa membukanya. Untuk link hadiah, verifikasi akun, atau link pendek.'
      );
      expect(html).toContain('2');
    });

    it('merender Kartu 3: Cek Video & Suara dengan judul, deskripsi, dan href="/cek-video-suara" (Requirement 3.5)', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard3} />);
      expect(html).toContain('href="/cek-video-suara"');
      expect(html).toContain('Cek Video &amp; Suara');
      expect(html).toContain(
        'Jawab beberapa pertanyaan tentang video call, voice note, atau video tokoh yang kamu terima.'
      );
      expect(html).toContain('3');
    });
  });

  describe('Props: nomor, judul, deskripsi, href', () => {
    it('mendukung nomor dalam bentuk string', () => {
      const html = renderToStaticMarkup(
        <KartuMenu
          nomor="01"
          judul="Cek Chat"
          deskripsi="Deskripsi uji coba"
          href="/cek-chat"
        />
      );
      expect(html).toContain('01');
      expect(html).toContain('aria-label="Menu 01: Cek Chat"');
    });

    it('merender judul di dalam elemen heading (h3) yang menonjol', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toMatch(/<h3[^>]*>Cek Chat<\/h3>/);
      expect(html).toContain('font-bold');
      expect(html).toContain('text-gray-900');
    });

    it('merender deskripsi dalam paragraf dengan teks yang mudah dibaca', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('<p');
      expect(html).toContain('text-gray-600');
      expect(html).toContain(sampleCard1.deskripsi);
    });

    it('menghubungkan tautan ke alamat href yang ditentukan', () => {
      const html = renderToStaticMarkup(
        <KartuMenu
          nomor="X"
          judul="Tautan Khusus"
          deskripsi="Deskripsi"
          href="/jalur-khusus"
        />
      );
      expect(html).toContain('href="/jalur-khusus"');
    });
  });

  describe('Props Opsional: ikon dan badge', () => {
    it('merender ikon kustom saat prop ikon diberikan', () => {
      const customIcon = <span data-testid="test-icon">IkonKustom</span>;
      const html = renderToStaticMarkup(
        <KartuMenu {...sampleCard1} ikon={customIcon} />
      );
      expect(html).toContain('data-testid="kartu-menu-ikon"');
      expect(html).toContain('data-testid="test-icon"');
      expect(html).toContain('IkonKustom');
      // Nomor tetap dirender saat ikon disertakan
      expect(html).toContain('data-testid="kartu-menu-nomor"');
      expect(html).toContain('1');
    });

    it('tidak merender kontainer ikon jika prop ikon tidak diberikan', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).not.toContain('data-testid="kartu-menu-ikon"');
      expect(html).toContain('data-testid="kartu-menu-nomor"');
    });

    it('merender badge saat prop badge diberikan', () => {
      const html = renderToStaticMarkup(
        <KartuMenu {...sampleCard1} badge="Populer" />
      );
      expect(html).toContain('data-testid="kartu-menu-badge"');
      expect(html).toContain('Populer');
    });

    it('tidak merender elemen badge saat prop badge tidak diberikan', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).not.toContain('data-testid="kartu-menu-badge"');
      expect(html).not.toContain('Populer');
    });
  });

  describe('Kustomisasi className', () => {
    it('menggabungkan className kustom ke elemen link utama', () => {
      const html = renderToStaticMarkup(
        <KartuMenu {...sampleCard1} className="my-custom-card border-purple-500" />
      );
      expect(html).toContain('my-custom-card');
      expect(html).toContain('border-purple-500');
      expect(html).toContain('data-testid="kartu-menu"');
    });
  });

  describe('Responsivitas & Target Sentuh (Requirements 3.1, 27.1, 27.2)', () => {
    it('memiliki kelas full-width (w-full) agar stackable secara vertikal', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('w-full');
      expect(html).toContain('block');
    });

    it('menyediakan target sentuh minimal 44px (min-h-[44px]) sesuai Requirement 27.2', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('min-h-[44px]');
    });

    it('menggunakan padding responsif untuk layar mobile 360px hingga desktop', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('p-4');
      expect(html).toContain('sm:p-6');
    });
  });

  describe('Aksesibilitas & Keyboard Navigation', () => {
    it('merender sebagai elemen tautan anchor semantik (a)', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toMatch(/^<a[\s>]/);
    });

    it('menyertakan aria-label deskriptif untuk pembaca layar', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('aria-label="Menu 1: Cek Chat"');
    });

    it('menerapkan kelas focus-visible styling untuk navigasi keyboard yang ramah pengguna', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('focus-visible:ring-2');
      expect(html).toContain('focus-visible:ring-blue-600');
      expect(html).toContain('focus-visible:ring-offset-2');
    });

    it('menerapkan efek hover visual yang jelas', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('hover:border-blue-400');
      expect(html).toContain('hover:shadow-md');
    });

    it('merender panah navigasi yang disembunyikan dari pembaca layar (aria-hidden="true")', () => {
      const html = renderToStaticMarkup(<KartuMenu {...sampleCard1} />);
      expect(html).toContain('data-testid="kartu-menu-panah"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('<svg');
    });
  });
});
