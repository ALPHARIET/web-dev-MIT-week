import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LangkahDisarankan, {
  FALLBACK_LANGKAH,
  validasiLangkah,
} from './LangkahDisarankan';

describe('components/hasil/LangkahDisarankan', () => {
  describe('validasiLangkah function (Requirement 5.4)', () => {
    it('mengembalikan FALLBACK_LANGKAH ketika input undefined atau null', () => {
      expect(validasiLangkah(undefined)).toEqual(FALLBACK_LANGKAH);
      // @ts-expect-error test invalid parameter
      expect(validasiLangkah(null)).toEqual(FALLBACK_LANGKAH);
    });

    it('mengembalikan FALLBACK_LANGKAH ketika array kosong atau hanya berisi whitespace', () => {
      expect(validasiLangkah([])).toEqual(FALLBACK_LANGKAH);
      expect(validasiLangkah(['', '   ', '\t\n'])).toEqual(FALLBACK_LANGKAH);
    });

    it('memastikan minimal 2 langkah saat hanya diberikan 1 langkah valid', () => {
      const input = ['Jangan transfer uang'];
      const result = validasiLangkah(input);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toBe('Jangan transfer uang');
      expect(result[1]).toBe(FALLBACK_LANGKAH[1]);
    });

    it('mengembalikan semua langkah yang valid jika sudah berjumlah 2 atau lebih', () => {
      const input = [
        'Langkah pertama verifikasi akun',
        'Langkah kedua hubungi bank',
        'Langkah ketiga buat laporan',
      ];
      const result = validasiLangkah(input);
      expect(result).toHaveLength(3);
      expect(result).toEqual(input);
    });

    it('membersihkan whitespace pada setiap butir langkah', () => {
      const input = ['  Langkah 1  ', '   Langkah 2   '];
      const result = validasiLangkah(input);
      expect(result).toEqual(['Langkah 1', 'Langkah 2']);
    });

    it('FALLBACK_LANGKAH memuat minimal 2 langkah dan tidak mengandung kata terlarang', () => {
      expect(FALLBACK_LANGKAH.length).toBeGreaterThanOrEqual(2);
      const forbiddenRegex = /\b(aman|pasti|terbukti|100%)\b/i;
      for (const step of FALLBACK_LANGKAH) {
        expect(step).not.toMatch(forbiddenRegex);
      }
    });
  });

  describe('Component Rendering', () => {
    it('merender judul bagian yang jelas: "Langkah yang disarankan"', () => {
      const html = renderToStaticMarkup(
        <LangkahDisarankan langkah={['Langkah 1', 'Langkah 2']} />
      );

      expect(html).toContain('Langkah yang disarankan');
      expect(html).toContain('id="langkah-disarankan-title"');
      expect(html).toContain('aria-labelledby="langkah-disarankan-title"');
    });

    it('merender daftar langkah yang diberikan dalam format numbered list dengan bulatan angka', () => {
      const langkah = [
        'Tutup panggilan dan jangan berikan kode apa pun.',
        'Hubungi kontak resmi bank terdaftar.',
        'Aktifkan verifikasi dua langkah (2FA).',
      ];

      const html = renderToStaticMarkup(<LangkahDisarankan langkah={langkah} />);

      expect(html).toContain('<ol');
      expect(html).toContain('role="list"');

      for (const item of langkah) {
        expect(html).toContain(item);
      }

      expect(html).toContain('data-testid="langkah-nomor-0"');
      expect(html).toContain('data-testid="langkah-nomor-1"');
      expect(html).toContain('data-testid="langkah-nomor-2"');
      expect(html).toContain('rounded-full');
      expect(html).toContain('>1<');
      expect(html).toContain('>2<');
      expect(html).toContain('>3<');
    });

    it('merender kotak checklist tindakan dengan target sentuh minimal 44px (Requirement 1.5, 27.2)', () => {
      const langkah = ['Periksa URL secara mandiri', 'Blokir nomor telepon'];
      const html = renderToStaticMarkup(<LangkahDisarankan langkah={langkah} />);

      expect(html).toContain('type="checkbox"');
      expect(html).toContain('id="langkah-check-0"');
      expect(html).toContain('id="langkah-check-1"');

      expect(html).toContain('for="langkah-check-0"');
      expect(html).toContain('for="langkah-check-1"');

      expect(html).toContain('min-w-[44px]');
      expect(html).toContain('min-h-[44px]');

      expect(html).toContain('aria-label="Tandai langkah 1 sudah dilakukan: Periksa URL secara mandiri"');
    });

    it('merender fallback langkah pencegahan umum ketika prop langkah kosong (Requirement 5.4)', () => {
      const html = renderToStaticMarkup(<LangkahDisarankan langkah={[]} />);

      expect(html).toContain(FALLBACK_LANGKAH[0]);
      expect(html).toContain(FALLBACK_LANGKAH[1]);
      expect(html).toContain('data-testid="langkah-item-0"');
      expect(html).toContain('data-testid="langkah-item-1"');
    });

    it('merender fallback langkah pencegahan umum ketika prop langkah bernilai undefined', () => {
      const html = renderToStaticMarkup(<LangkahDisarankan />);

      expect(html).toContain(FALLBACK_LANGKAH[0]);
      expect(html).toContain(FALLBACK_LANGKAH[1]);
    });

    it('memastikan minimal 2 langkah saat hanya diberikan 1 langkah', () => {
      const html = renderToStaticMarkup(
        <LangkahDisarankan langkah={['Hanya satu instruksi']} />
      );

      expect(html).toContain('Hanya satu instruksi');
      expect(html).toContain(FALLBACK_LANGKAH[1]);
      expect(html).toContain('>1<');
      expect(html).toContain('>2<');
    });

    it('menerapkan kelas CSS kustom dari prop className', () => {
      const customClass = 'mt-8 border-indigo-500 custom-langkah-box';
      const html = renderToStaticMarkup(
        <LangkahDisarankan
          langkah={['Langkah A', 'Langkah B']}
          className={customClass}
        />
      );

      expect(html).toContain('custom-langkah-box');
      expect(html).toContain('border-indigo-500');
    });

    it('memiliki kontras teks yang memenuhi standar WCAG AA', () => {
      const html = renderToStaticMarkup(
        <LangkahDisarankan langkah={['Tindakan pencegahan pertama', 'Tindakan kedua']} />
      );

      expect(html).toContain('text-gray-900');
      expect(html).toContain('bg-blue-700');
      expect(html).toContain('text-white');
    });

    it('tidak memuat kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan/klaim (Requirement 6.7, 30.1)', () => {
      const html = renderToStaticMarkup(<LangkahDisarankan langkah={[]} />);
      const forbiddenRegex = /\b(aman|pasti|terbukti|100%)\b/i;
      expect(html).not.toMatch(forbiddenRegex);
    });
  });
});
