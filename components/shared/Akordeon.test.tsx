// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Akordeon, type ItemAkordeon } from './Akordeon';

describe('components/shared/Akordeon.tsx (Task 4.10)', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleItems: ItemAkordeon[] = [
    {
      id: 'cara-penilaian',
      judul: 'Bagaimana aplikasi menilai pesan atau link?',
      konten: (
        <div>
          <p>Aplikasi menggabungkan aturan lokal dan analisis AI Gemini.</p>
          <ul className="list-disc list-inside">
            <li>Aturan lokal mendeteksi pola cepat seperti kata mendesak.</li>
            <li>AI Gemini menganalisis konteks pesan lebih mendalam.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'batasan-deteksi',
      judul: 'Apa saja yang tidak bisa dideteksi aplikasi?',
      konten: (
        <p>Aplikasi tidak bisa menjamin 100% dan tidak memeriksa rekening bank asli.</p>
      ),
    },
    {
      id: 'privasi-data',
      judul: 'Data apa yang dikirim ke mana?',
      konten: (
        <p>Teks chat disensor terlebih dahulu sebelum dikirim ke Google Gemini.</p>
      ),
    },
  ];

  describe('Rendering Dasar & Struktur Komponen', () => {
    it('merender semua judul item akordeon', () => {
      render(<Akordeon items={sampleItems} />);
      expect(
        screen.getByText('Bagaimana aplikasi menilai pesan atau link?')
      ).toBeDefined();
      expect(
        screen.getByText('Apa saja yang tidak bisa dideteksi aplikasi?')
      ).toBeDefined();
      expect(
        screen.getByText('Data apa yang dikirim ke mana?')
      ).toBeDefined();
    });

    it('secara bawaan semua item dalam keadaan tertutup jika defaultOpenIds tidak diberikan', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        expect(button.getAttribute('aria-expanded')).toBe('false');

        const konten = screen.getByTestId(`akordeon-konten-${item.id}`);
        expect(konten.hasAttribute('hidden')).toBe(true);
        expect(konten.classList.contains('hidden')).toBe(true);

        const chevron = screen.getByTestId(`akordeon-chevron-${item.id}`);
        expect(chevron.classList.contains('rotate-0')).toBe(true);
        expect(chevron.classList.contains('rotate-180')).toBe(false);
      });
    });

    it('merender kontainer kosong tanpa error saat items kosong', () => {
      render(<Akordeon items={[]} />);
      const container = screen.getByTestId('akordeon-kosong');
      expect(container).toBeDefined();
    });

    it('menerapkan className kustom ke kontainer utama', () => {
      render(<Akordeon items={sampleItems} className="custom-akordeon-class my-8" />);
      const container = screen.getByTestId('akordeon-container');
      expect(container.classList.contains('custom-akordeon-class')).toBe(true);
      expect(container.classList.contains('my-8')).toBe(true);
    });
  });

  describe('Interaktivitas Klik & Toggle (Requirement 4.5)', () => {
    it('membuka item saat judul diklik dan memutar chevron 180 derajat', () => {
      render(<Akordeon items={sampleItems} />);
      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const konten1 = screen.getByTestId('akordeon-konten-cara-penilaian');
      const chevron1 = screen.getByTestId('akordeon-chevron-cara-penilaian');

      // Sebelum diklik: tertutup
      expect(button1.getAttribute('aria-expanded')).toBe('false');
      expect(konten1.hasAttribute('hidden')).toBe(true);
      expect(chevron1.classList.contains('rotate-0')).toBe(true);

      // Klik untuk membuka
      fireEvent.click(button1);

      // Setelah diklik: terbuka
      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(konten1.hasAttribute('hidden')).toBe(false);
      expect(konten1.classList.contains('hidden')).toBe(false);
      expect(chevron1.classList.contains('rotate-180')).toBe(true);
      expect(
        screen.getByText('Aplikasi menggabungkan aturan lokal dan analisis AI Gemini.')
      ).toBeDefined();
    });

    it('menutup kembali item saat judul yang terbuka diklik ulang', () => {
      render(<Akordeon items={sampleItems} defaultOpenIds={['cara-penilaian']} />);
      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const konten1 = screen.getByTestId('akordeon-konten-cara-penilaian');
      const chevron1 = screen.getByTestId('akordeon-chevron-cara-penilaian');

      // Awalnya terbuka
      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(konten1.hasAttribute('hidden')).toBe(false);

      // Klik untuk menutup
      fireEvent.click(button1);

      // Sekarang tertutup
      expect(button1.getAttribute('aria-expanded')).toBe('false');
      expect(konten1.hasAttribute('hidden')).toBe(true);
      expect(chevron1.classList.contains('rotate-0')).toBe(true);
    });
  });

  describe('Interaktivitas Navigasi Keyboard (Enter & Spasi)', () => {
    it('membuka dan menutup item dengan menekan tombol Enter', () => {
      render(<Akordeon items={sampleItems} />);
      const button2 = screen.getByTestId('akordeon-header-batasan-deteksi');
      const konten2 = screen.getByTestId('akordeon-konten-batasan-deteksi');

      // Tekan Enter untuk membuka
      fireEvent.keyDown(button2, { key: 'Enter' });
      expect(button2.getAttribute('aria-expanded')).toBe('true');
      expect(konten2.hasAttribute('hidden')).toBe(false);

      // Tekan Enter lagi untuk menutup
      fireEvent.keyDown(button2, { key: 'Enter' });
      expect(button2.getAttribute('aria-expanded')).toBe('false');
      expect(konten2.hasAttribute('hidden')).toBe(true);
    });

    it('membuka dan menutup item dengan menekan tombol Spasi', () => {
      render(<Akordeon items={sampleItems} />);
      const button3 = screen.getByTestId('akordeon-header-privasi-data');
      const konten3 = screen.getByTestId('akordeon-konten-privasi-data');

      // Tekan Spasi (' ') untuk membuka
      fireEvent.keyDown(button3, { key: ' ' });
      expect(button3.getAttribute('aria-expanded')).toBe('true');
      expect(konten3.hasAttribute('hidden')).toBe(false);

      // Tekan Spasi lagi untuk menutup
      fireEvent.keyDown(button3, { key: ' ' });
      expect(button3.getAttribute('aria-expanded')).toBe('false');
      expect(konten3.hasAttribute('hidden')).toBe(true);
    });

    it('mendukung key "Spacebar" (nama legacy tombol spasi)', () => {
      render(<Akordeon items={sampleItems} />);
      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const konten1 = screen.getByTestId('akordeon-konten-cara-penilaian');

      fireEvent.keyDown(button1, { key: 'Spacebar' });
      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(konten1.hasAttribute('hidden')).toBe(false);
    });

    it('tidak mengubah state jika tombol keyboard lain (misal Tab / Panah) ditekan', () => {
      render(<Akordeon items={sampleItems} />);
      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');

      fireEvent.keyDown(button1, { key: 'ArrowDown' });
      expect(button1.getAttribute('aria-expanded')).toBe('false');

      fireEvent.keyDown(button1, { key: 'Tab' });
      expect(button1.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Perilaku Single Accordion (allowMultiple: false, default)', () => {
    it('hanya mengizinkan satu item terbuka dan menutup item sebelumnya ketika item lain dibuka', () => {
      render(<Akordeon items={sampleItems} allowMultiple={false} />);
      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const konten1 = screen.getByTestId('akordeon-konten-cara-penilaian');

      const button2 = screen.getByTestId('akordeon-header-batasan-deteksi');
      const konten2 = screen.getByTestId('akordeon-konten-batasan-deteksi');

      // Buka item 1
      fireEvent.click(button1);
      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(konten1.hasAttribute('hidden')).toBe(false);
      expect(button2.getAttribute('aria-expanded')).toBe('false');
      expect(konten2.hasAttribute('hidden')).toBe(true);

      // Buka item 2 -> item 1 harus otomatis tertutup
      fireEvent.click(button2);
      expect(button1.getAttribute('aria-expanded')).toBe('false');
      expect(konten1.hasAttribute('hidden')).toBe(true);
      expect(button2.getAttribute('aria-expanded')).toBe('true');
      expect(konten2.hasAttribute('hidden')).toBe(false);
    });

    it('hanya mengambil item pertama dari defaultOpenIds jika allowMultiple false', () => {
      render(
        <Akordeon
          items={sampleItems}
          allowMultiple={false}
          defaultOpenIds={['cara-penilaian', 'batasan-deteksi']}
        />
      );

      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const button2 = screen.getByTestId('akordeon-header-batasan-deteksi');

      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(button2.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Perilaku Multiple Accordion (allowMultiple: true)', () => {
    it('mengizinkan beberapa item terbuka secara bersamaan saat allowMultiple bernilai true', () => {
      render(<Akordeon items={sampleItems} allowMultiple={true} />);
      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const konten1 = screen.getByTestId('akordeon-konten-cara-penilaian');

      const button2 = screen.getByTestId('akordeon-header-batasan-deteksi');
      const konten2 = screen.getByTestId('akordeon-konten-batasan-deteksi');

      // Buka item 1
      fireEvent.click(button1);
      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(konten1.hasAttribute('hidden')).toBe(false);

      // Buka item 2 -> keduanya harus tetap terbuka
      fireEvent.click(button2);
      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(konten1.hasAttribute('hidden')).toBe(false);
      expect(button2.getAttribute('aria-expanded')).toBe('true');
      expect(konten2.hasAttribute('hidden')).toBe(false);

      // Tutup item 1 -> item 2 tetap terbuka
      fireEvent.click(button1);
      expect(button1.getAttribute('aria-expanded')).toBe('false');
      expect(konten1.hasAttribute('hidden')).toBe(true);
      expect(button2.getAttribute('aria-expanded')).toBe('true');
      expect(konten2.hasAttribute('hidden')).toBe(false);
    });

    it('membuka semua id yang ditentukan di defaultOpenIds saat allowMultiple true', () => {
      render(
        <Akordeon
          items={sampleItems}
          allowMultiple={true}
          defaultOpenIds={['cara-penilaian', 'privasi-data']}
        />
      );

      const button1 = screen.getByTestId('akordeon-header-cara-penilaian');
      const button2 = screen.getByTestId('akordeon-header-batasan-deteksi');
      const button3 = screen.getByTestId('akordeon-header-privasi-data');

      expect(button1.getAttribute('aria-expanded')).toBe('true');
      expect(button2.getAttribute('aria-expanded')).toBe('false');
      expect(button3.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Aksesibilitas & Standar W3C ARIA', () => {
    it('memastikan setiap tombol header memiliki aria-controls yang merujuk id konten yang sesuai', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        const contentId = `akordeon-konten-${item.id}`;
        expect(button.getAttribute('aria-controls')).toBe(contentId);

        const konten = screen.getByTestId(contentId);
        expect(konten.getAttribute('id')).toBe(contentId);
      });
    });

    it('memastikan setiap panel konten memiliki role="region" dan aria-labelledby merujuk id header', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const headerId = `akordeon-header-${item.id}`;
        const konten = screen.getByTestId(`akordeon-konten-${item.id}`);

        expect(konten.getAttribute('role')).toBe('region');
        expect(konten.getAttribute('aria-labelledby')).toBe(headerId);
      });
    });

    it('menyediakan elemen tombol interaktif semantik (<button type="button">)', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        expect(button.tagName.toLowerCase()).toBe('button');
        expect(button.getAttribute('type')).toBe('button');
      });
    });

    it('membungkus tombol header dalam elemen heading (h3) untuk navigasi screen reader yang tepat', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        expect(button.parentElement?.tagName.toLowerCase()).toBe('h3');
      });
    });

    it('menyembunyikan ikon chevron dari accessibility tree (aria-hidden="true")', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const chevron = screen.getByTestId(`akordeon-chevron-${item.id}`);
        expect(chevron.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  describe('Target Sentuh & Responsivitas (Requirement 27.2)', () => {
    it('memiliki tinggi minimal 44px (min-h-[44px]) pada tombol trigger sesuai Requirement 27.2', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        expect(button.classList.contains('min-h-[44px]')).toBe(true);
      });
    });

    it('memiliki lebar penuh (w-full) dan padding yang nyaman untuk interaksi sentuh', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        expect(button.classList.contains('w-full')).toBe(true);
        expect(button.classList.contains('p-4')).toBe(true);
      });
    });

    it('memiliki focus ring yang jelas untuk navigasi keyboard (focus-visible)', () => {
      render(<Akordeon items={sampleItems} />);

      sampleItems.forEach((item) => {
        const button = screen.getByTestId(`akordeon-header-${item.id}`);
        expect(button.classList.contains('focus-visible:ring-2')).toBe(true);
        expect(button.classList.contains('focus-visible:ring-blue-600')).toBe(true);
      });
    });
  });
});
