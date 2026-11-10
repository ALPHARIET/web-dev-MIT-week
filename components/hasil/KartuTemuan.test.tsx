import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import {
  KartuTemuan,
  SUMBER_TEMUAN_LABEL,
  getLabelSumber,
} from './KartuTemuan';
import type { Temuan, SumberTemuan } from '@/lib/hasil';

describe('components/hasil/KartuTemuan.tsx', () => {
  const sampleTemuan: Temuan = {
    judul: 'Meminta kode OTP',
    penjelasan:
      'Pesan mendesak pengguna mengirimkan kode verifikasi. Pihak resmi tidak pernah meminta kode OTP.',
    bukti: 'Kirimkan kode 6 angka yang baru masuk ke SMS Anda sekarang',
    sumber: 'aturan',
  };

  describe('Rendering Konten Dasar', () => {
    it('merender judul temuan di dalam elemen heading', () => {
      const html = renderToStaticMarkup(<KartuTemuan temuan={sampleTemuan} />);
      expect(html).toContain('<h3');
      expect(html).toContain('Meminta kode OTP');
    });

    it('merender penjelasan temuan dengan benar', () => {
      const html = renderToStaticMarkup(<KartuTemuan temuan={sampleTemuan} />);
      expect(html).toContain(
        'Pesan mendesak pengguna mengirimkan kode verifikasi. Pihak resmi tidak pernah meminta kode OTP.'
      );
    });

    it('merender bukti di dalam elemen blockquote dan code', () => {
      const html = renderToStaticMarkup(<KartuTemuan temuan={sampleTemuan} />);
      expect(html).toContain('data-testid="kotak-bukti"');
      expect(html).toContain('<blockquote');
      expect(html).toContain('<code');
      expect(html).toContain(
        'Kirimkan kode 6 angka yang baru masuk ke SMS Anda sekarang'
      );
    });

    it('tidak merender kotak bukti jika temuan.bukti kosong atau hanya whitespace', () => {
      const temuanTanpaBukti: Temuan = {
        ...sampleTemuan,
        bukti: '',
      };
      const htmlKosong = renderToStaticMarkup(
        <KartuTemuan temuan={temuanTanpaBukti} />
      );
      expect(htmlKosong).not.toContain('data-testid="kotak-bukti"');
      expect(htmlKosong).not.toContain('<blockquote');

      const temuanWhitespace: Temuan = {
        ...sampleTemuan,
        bukti: '   ',
      };
      const htmlWhitespace = renderToStaticMarkup(
        <KartuTemuan temuan={temuanWhitespace} />
      );
      expect(htmlWhitespace).not.toContain('data-testid="kotak-bukti"');
    });
  });

  describe('Badge Sumber Temuan (Requirement 6.6)', () => {
    const sumberTestCases: Array<{ sumber: SumberTemuan; expectedLabel: string }> = [
      { sumber: 'aturan', expectedLabel: 'Pola penipuan' },
      { sumber: 'ai', expectedLabel: 'Analisis AI' },
      { sumber: 'safe_browsing', expectedLabel: 'Google Safe Browsing' },
      { sumber: 'rdap', expectedLabel: 'Data Domain (RDAP)' },
      { sumber: 'virustotal', expectedLabel: 'VirusTotal' },
      { sumber: 'reality_defender', expectedLabel: 'Reality Defender' },
    ];

    sumberTestCases.forEach(({ sumber, expectedLabel }) => {
      it(`merender badge "${expectedLabel}" untuk sumber "${sumber}"`, () => {
        const temuan: Temuan = {
          ...sampleTemuan,
          sumber,
        };
        const html = renderToStaticMarkup(<KartuTemuan temuan={temuan} />);
        expect(html).toContain('data-testid="badge-sumber"');
        expect(html).toContain(expectedLabel);
        expect(getLabelSumber(sumber)).toBe(expectedLabel);
        expect(SUMBER_TEMUAN_LABEL[sumber]).toBe(expectedLabel);
      });
    });

    it('menangani sumber yang tidak dikenal secara aman', () => {
      const temuanAneh: Temuan = {
        ...sampleTemuan,
        sumber: 'sumber_lain' as unknown as SumberTemuan,
      };
      const html = renderToStaticMarkup(<KartuTemuan temuan={temuanAneh} />);
      expect(html).toContain('sumber_lain');
    });
  });

  describe('Penomoran Temuan (nomor prop)', () => {
    it('merender nomor temuan jika prop nomor diberikan', () => {
      const html = renderToStaticMarkup(
        <KartuTemuan temuan={sampleTemuan} nomor={1} />
      );
      expect(html).toContain('data-testid="nomor-temuan"');
      expect(html).toContain('#1');
      expect(html).toContain('aria-label="Temuan nomor 1"');
      expect(html).toContain('aria-label="Temuan 1: Meminta kode OTP"');
    });

    it('mendukung nomor temuan multi-digit', () => {
      const html = renderToStaticMarkup(
        <KartuTemuan temuan={sampleTemuan} nomor={12} />
      );
      expect(html).toContain('#12');
      expect(html).toContain('aria-label="Temuan nomor 12"');
    });

    it('tidak merender badge nomor jika prop nomor tidak diberikan', () => {
      const html = renderToStaticMarkup(<KartuTemuan temuan={sampleTemuan} />);
      expect(html).not.toContain('data-testid="nomor-temuan"');
      expect(html).not.toContain('#');
      expect(html).toContain('aria-label="Temuan: Meminta kode OTP"');
    });
  });

  describe('Kustomisasi className', () => {
    it('menggabungkan className khusus ke elemen kontainer utama', () => {
      const html = renderToStaticMarkup(
        <KartuTemuan temuan={sampleTemuan} className="custom-shadow border-red-500" />
      );
      expect(html).toContain('custom-shadow');
      expect(html).toContain('border-red-500');
      expect(html).toContain('data-testid="kartu-temuan"');
    });
  });

  describe('Aksesibilitas dan Semantik HTML (Requirement 27.3)', () => {
    it('menggunakan elemen semantik HTML (article, header, h3, p, blockquote, code)', () => {
      const html = renderToStaticMarkup(
        <KartuTemuan temuan={sampleTemuan} nomor={2} />
      );
      expect(html).toMatch(/^<article[\s>]/);
      expect(html).toContain('<header');
      expect(html).toContain('<h3');
      expect(html).toContain('<p');
      expect(html).toContain('<blockquote');
      expect(html).toContain('<code');
    });

    it('menyertakan atribut aria yang relevan untuk pembaca layar', () => {
      const html = renderToStaticMarkup(
        <KartuTemuan temuan={sampleTemuan} nomor={1} />
      );
      expect(html).toContain('aria-label="Temuan 1: Meminta kode OTP"');
      expect(html).toContain('aria-label="Sumber: Pola penipuan"');
      expect(html).toContain('aria-label="Kutipan bukti temuan"');
    });

    it('menerapkan kelas Tailwind untuk kontras warna teks yang memadai (WCAG AA)', () => {
      const html = renderToStaticMarkup(<KartuTemuan temuan={sampleTemuan} />);
      expect(html).toContain('text-gray-900');
      expect(html).toContain('text-gray-700');
      expect(html).toContain('border-amber-500');
      expect(html).toContain('bg-amber-50');
    });
  });
});
