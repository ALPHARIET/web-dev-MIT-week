import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TingkatKewaspadaan,
  KONFIGURASI_LEVEL,
  ShieldAlertIcon,
  AlertTriangleIcon,
  InfoShieldIcon,
} from './TingkatKewaspadaan';
import { TingkatLevel } from '@/lib/hasil';

describe('TingkatKewaspadaan', () => {
  describe('Level: tinggi (Requirement 6.2)', () => {
    it('harus merender label "Waspada tinggi"', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="tinggi" />);
      expect(html).toContain('Waspada tinggi');
    });

    it('harus merender kalimat pembuka resmi untuk level tinggi', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="tinggi" />);
      expect(html).toContain(
        'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.'
      );
    });

    it('harus menerapkan class merah: bg-red-50, text-red-700, border-red-300', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="tinggi" />);
      expect(html).toContain('bg-red-50');
      expect(html).toContain('text-red-700');
      expect(html).toContain('border-red-300');
    });

    it('harus merender ikon peringatan ShieldAlert dengan data-testid="icon-tinggi"', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="tinggi" />);
      expect(html).toContain('data-testid="icon-tinggi"');
      expect(html).not.toContain('data-testid="icon-sedang"');
      expect(html).not.toContain('data-testid="icon-tidak_ditemukan"');
    });
  });

  describe('Level: sedang (Requirement 6.3)', () => {
    it('harus merender label "Perlu hati-hati"', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="sedang" />);
      expect(html).toContain('Perlu hati-hati');
    });

    it('harus merender kalimat pembuka resmi untuk level sedang', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="sedang" />);
      expect(html).toContain(
        'Ada tanda yang perlu kamu cek dulu sebelum lanjut.'
      );
    });

    it('harus menerapkan class oranye: bg-orange-50, text-orange-700, border-orange-300', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="sedang" />);
      expect(html).toContain('bg-orange-50');
      expect(html).toContain('text-orange-700');
      expect(html).toContain('border-orange-300');
    });

    it('harus merender ikon AlertTriangle dengan data-testid="icon-sedang"', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="sedang" />);
      expect(html).toContain('data-testid="icon-sedang"');
      expect(html).not.toContain('data-testid="icon-tinggi"');
      expect(html).not.toContain('data-testid="icon-tidak_ditemukan"');
    });
  });

  describe('Level: tidak_ditemukan (Requirement 6.4)', () => {
    it('harus merender label "Tidak ditemukan tanda bahaya"', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="tidak_ditemukan" />
      );
      expect(html).toContain('Tidak ditemukan tanda bahaya');
    });

    it('harus merender kalimat pembuka resmi untuk level tidak_ditemukan', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="tidak_ditemukan" />
      );
      expect(html).toContain(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );
    });

    it('harus menerapkan class abu-abu: bg-gray-50, text-gray-700, border-gray-300 (bukan hijau)', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="tidak_ditemukan" />
      );
      expect(html).toContain('bg-gray-50');
      expect(html).toContain('text-gray-700');
      expect(html).toContain('border-gray-300');

      // Memastikan bukan warna hijau (false sense of security)
      expect(html).not.toContain('bg-green');
      expect(html).not.toContain('text-green');
      expect(html).not.toContain('border-green');
    });

    it('harus merender ikon Info dengan data-testid="icon-tidak_ditemukan"', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="tidak_ditemukan" />
      );
      expect(html).toContain('data-testid="icon-tidak_ditemukan"');
      expect(html).not.toContain('data-testid="icon-tinggi"');
      expect(html).not.toContain('data-testid="icon-sedang"');
    });
  });

  describe('Aksesibilitas dan pembedaan level (Requirement 6.5)', () => {
    const levels: TingkatLevel[] = ['tinggi', 'sedang', 'tidak_ditemukan'];

    it('setiap level harus memiliki teks label yang unik dan berbeda', () => {
      const labels = levels.map((lvl) => KONFIGURASI_LEVEL[lvl].label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(levels.length);
    });

    it('setiap level harus memiliki ikon yang berbeda', () => {
      const iconTinggi = renderToStaticMarkup(<ShieldAlertIcon />);
      const iconSedang = renderToStaticMarkup(<AlertTriangleIcon />);
      const iconTidakDitemukan = renderToStaticMarkup(<InfoShieldIcon />);

      expect(iconTinggi).toContain('data-testid="icon-tinggi"');
      expect(iconSedang).toContain('data-testid="icon-sedang"');
      expect(iconTidakDitemukan).toContain('data-testid="icon-tidak_ditemukan"');

      expect(iconTinggi).not.toEqual(iconSedang);
      expect(iconSedang).not.toEqual(iconTidakDitemukan);
      expect(iconTinggi).not.toEqual(iconTidakDitemukan);
    });

    it('memiliki role="status" dan aria-label yang deskriptif untuk pembaca layar', () => {
      levels.forEach((lvl) => {
        const html = renderToStaticMarkup(<TingkatKewaspadaan level={lvl} />);
        expect(html).toContain('role="status"');
        expect(html).toContain(`aria-label="Tingkat kewaspadaan: ${KONFIGURASI_LEVEL[lvl].label}"`);
        expect(html).toContain(`data-level="${lvl}"`);
      });
    });

    it('semua ikon SVG memiliki aria-hidden="true" untuk aksesibilitas', () => {
      levels.forEach((lvl) => {
        const html = renderToStaticMarkup(<TingkatKewaspadaan level={lvl} />);
        expect(html).toContain('aria-hidden="true"');
      });
    });
  });

  describe('Prop ringkasan opsional', () => {
    it('harus menampilkan teks ringkasan jika prop ringkasan diberikan', () => {
      const ringkasan = 'Pesan mengandung permintaan OTP dari nomor asing.';
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="tinggi" ringkasan={ringkasan} />
      );
      expect(html).toContain(ringkasan);
      expect(html).toContain('data-testid="ringkasan-teks"');
    });

    it('tidak boleh merender elemen ringkasan jika prop ringkasan tidak diberikan', () => {
      const html = renderToStaticMarkup(<TingkatKewaspadaan level="tinggi" />);
      expect(html).not.toContain('data-testid="ringkasan-teks"');
    });

    it('tidak boleh merender elemen ringkasan jika string kosong atau hanya spasi', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="tinggi" ringkasan="   " />
      );
      expect(html).not.toContain('data-testid="ringkasan-teks"');
    });
  });

  describe('Prop className kustom', () => {
    it('harus menggabungkan className kustom dengan class container', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level="sedang" className="my-custom-class shadow-lg" />
      );
      expect(html).toContain('my-custom-class');
      expect(html).toContain('shadow-lg');
      expect(html).toContain('bg-orange-50');
    });
  });

  describe('Fallback level tidak valid', () => {
    it('harus fallback dengan aman ke "tidak_ditemukan" jika level tidak dikenal', () => {
      const html = renderToStaticMarkup(
        <TingkatKewaspadaan level={'unknown' as TingkatLevel} />
      );
      expect(html).toContain('Tidak ditemukan tanda bahaya');
      expect(html).toContain('bg-gray-50');
    });
  });
});
